/**
 * Bağımlılıksız, S3 uyumlu (AWS S3, Cloudflare R2, Backblaze B2, MinIO, Wasabi…)
 * nesne deposu istemcisi — yalnız yedekleme için gereken işlemler:
 * PUT (dosyadan akış), GET (dosyaya akış), LIST (v2, prefix), DELETE.
 * İmza: AWS Signature V4. Tek PUT sınırı 5 GB (multipart yok; daha büyük
 * yedekler için BACKUP_OFFSITE=command + rclone/aws CLI kullanın).
 *
 * Ortam:
 *   BACKUP_S3_BUCKET            (zorunlu)
 *   BACKUP_S3_PREFIX            (varsayılan: erp-backups/)
 *   BACKUP_S3_REGION            (varsayılan: us-east-1; R2 için auto)
 *   BACKUP_S3_ENDPOINT          (AWS dışı: https://<hesap>.r2.cloudflarestorage.com, http://minio:9000 …)
 *   BACKUP_S3_FORCE_PATH_STYLE  1 | 0 (varsayılan: ENDPOINT verilmişse 1)
 *   BACKUP_S3_ACCESS_KEY_ID / BACKUP_S3_SECRET_ACCESS_KEY  (yoksa AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 *   BACKUP_S3_SESSION_TOKEN     (yoksa AWS_SESSION_TOKEN)
 *   BACKUP_S3_SSE               AES256 | aws:kms (opsiyonel, AWS)
 *   BACKUP_S3_STORAGE_CLASS     STANDARD_IA vb. (opsiyonel)
 */
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');

function s3ConfigFromEnv(env = process.env) {
  const bucket = env.BACKUP_S3_BUCKET;
  const accessKeyId = env.BACKUP_S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.BACKUP_S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
  const missing = [];
  if (!bucket) missing.push('BACKUP_S3_BUCKET');
  if (!accessKeyId) missing.push('BACKUP_S3_ACCESS_KEY_ID (veya AWS_ACCESS_KEY_ID)');
  if (!secretAccessKey) missing.push('BACKUP_S3_SECRET_ACCESS_KEY (veya AWS_SECRET_ACCESS_KEY)');
  if (missing.length) throw new Error(`S3 yapılandırması eksik: ${missing.join(', ')}`);
  const placeholders = Object.entries({ BACKUP_S3_BUCKET: bucket, ACCESS_KEY_ID: accessKeyId, SECRET_ACCESS_KEY: secretAccessKey })
    .filter(([, v]) => /^DOLDURUN/i.test(v))
    .map(([k]) => k);
  if (placeholders.length) throw new Error(`S3 yapılandırması yer tutucu değerde (DOLDURUN…): ${placeholders.join(', ')}`);
  const region = env.BACKUP_S3_REGION || env.AWS_REGION || env.AWS_DEFAULT_REGION || 'us-east-1';
  const endpoint = env.BACKUP_S3_ENDPOINT || null;
  const forcePathStyle = env.BACKUP_S3_FORCE_PATH_STYLE != null
    ? env.BACKUP_S3_FORCE_PATH_STYLE === '1'
    : Boolean(endpoint);
  let prefix = env.BACKUP_S3_PREFIX != null ? env.BACKUP_S3_PREFIX : 'erp-backups/';
  if (prefix && !prefix.endsWith('/')) prefix += '/';
  return {
    bucket,
    prefix,
    region,
    endpoint,
    forcePathStyle,
    accessKeyId,
    secretAccessKey,
    sessionToken: env.BACKUP_S3_SESSION_TOKEN || env.AWS_SESSION_TOKEN || null,
    sse: env.BACKUP_S3_SSE || null,
    storageClass: env.BACKUP_S3_STORAGE_CLASS || null,
  };
}

const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

function rfc3986(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeKeyPath(key) {
  return key.split('/').map(rfc3986).join('/');
}

function buildUrl(cfg, key, query) {
  let base;
  let path;
  if (cfg.endpoint) {
    const ep = new URL(cfg.endpoint);
    if (cfg.forcePathStyle) {
      base = `${ep.protocol}//${ep.host}`;
      path = `/${cfg.bucket}${key != null ? `/${encodeKeyPath(key)}` : '/'}`;
    } else {
      base = `${ep.protocol}//${cfg.bucket}.${ep.host}`;
      path = key != null ? `/${encodeKeyPath(key)}` : '/';
    }
  } else if (cfg.forcePathStyle) {
    base = `https://s3.${cfg.region}.amazonaws.com`;
    path = `/${cfg.bucket}${key != null ? `/${encodeKeyPath(key)}` : '/'}`;
  } else {
    base = `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com`;
    path = key != null ? `/${encodeKeyPath(key)}` : '/';
  }
  const qs = Object.keys(query || {})
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(String(query[k]))}`)
    .join('&');
  return { url: new URL(`${base}${path}${qs ? `?${qs}` : ''}`), canonicalUri: path, canonicalQuery: qs };
}

function sign(cfg, method, target, headers, payloadHash) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const all = {
    ...headers,
    host: target.url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (cfg.sessionToken) all['x-amz-security-token'] = cfg.sessionToken;
  const lower = {};
  for (const [k, v] of Object.entries(all)) lower[k.toLowerCase()] = String(v).trim().replace(/\s+/g, ' ');
  const names = Object.keys(lower).sort();
  const canonicalHeaders = names.map((n) => `${n}:${lower[n]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [
    method,
    target.canonicalUri,
    target.canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  lower.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  delete lower.host;
  return lower;
}

function rawRequest(method, url, headers, body) {
  const mod = url.protocol === 'http:' ? http : https;
  return new Promise((resolve, reject) => {
    const req = mod.request(url, { method, headers }, (res) => resolve(res));
    req.on('error', reject);
    req.setTimeout(Number(process.env.BACKUP_S3_TIMEOUT_MS || 10 * 60 * 1000), () => {
      req.destroy(new Error('S3 isteği zaman aşımı'));
    });
    if (body && typeof body.pipe === 'function') body.pipe(req);
    else req.end(body);
  });
}

async function readBody(res) {
  const chunks = [];
  for await (const c of res) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function expectOk(res, what) {
  if (res.statusCode >= 200 && res.statusCode < 300) return;
  const text = await readBody(res).catch(() => '');
  const code = (text.match(/<Code>([^<]+)<\/Code>/) || [])[1];
  const msg = (text.match(/<Message>([^<]+)<\/Message>/) || [])[1];
  const err = new Error(`S3 ${what} başarısız: HTTP ${res.statusCode}${code ? ` ${code}` : ''}${msg ? ` — ${msg}` : ''}`);
  err.statusCode = res.statusCode;
  throw err;
}

async function fileSha256(file) {
  const h = crypto.createHash('sha256');
  for await (const c of fs.createReadStream(file)) h.update(c);
  return h.digest('hex');
}

async function putFile(cfg, key, file, { contentType = 'application/octet-stream', sha256 } = {}) {
  const size = fs.statSync(file).size;
  if (size > 5 * 1024 ** 3) {
    throw new Error('Dosya 5 GB üzerinde: tek PUT desteklenmiyor. BACKUP_OFFSITE=command (rclone/aws s3 cp) kullanın.');
  }
  const payloadHash = sha256 || await fileSha256(file);
  const target = buildUrl(cfg, key);
  const extra = { 'content-type': contentType, 'content-length': String(size) };
  if (cfg.sse) extra['x-amz-server-side-encryption'] = cfg.sse;
  if (cfg.storageClass) extra['x-amz-storage-class'] = cfg.storageClass;
  const headers = sign(cfg, 'PUT', target, extra, payloadHash);
  const res = await rawRequest('PUT', target.url, headers, fs.createReadStream(file));
  await expectOk(res, `PUT ${key}`);
  res.resume();
  return { key, size, sha256: payloadHash, etag: res.headers.etag || null };
}

async function getToFile(cfg, key, file) {
  const target = buildUrl(cfg, key);
  const payloadHash = sha256Hex('');
  const headers = sign(cfg, 'GET', target, {}, payloadHash);
  const res = await rawRequest('GET', target.url, headers);
  await expectOk(res, `GET ${key}`);
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(file);
    res.pipe(out);
    res.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
  });
  return { key, file, size: fs.statSync(file).size };
}

async function getText(cfg, key) {
  const target = buildUrl(cfg, key);
  const headers = sign(cfg, 'GET', target, {}, sha256Hex(''));
  const res = await rawRequest('GET', target.url, headers);
  await expectOk(res, `GET ${key}`);
  return readBody(res);
}

function xmlUnescape(s) {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

async function list(cfg, prefix = cfg.prefix) {
  const out = [];
  let token = null;
  do {
    const query = { 'list-type': '2', prefix };
    if (token) query['continuation-token'] = token;
    const target = buildUrl(cfg, null, query);
    const headers = sign(cfg, 'GET', target, {}, sha256Hex(''));
    const res = await rawRequest('GET', target.url, headers);
    await expectOk(res, 'LIST');
    const xml = await readBody(res);
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = m[1];
      const key = xmlUnescape((block.match(/<Key>([\s\S]*?)<\/Key>/) || [])[1] || '');
      const size = Number((block.match(/<Size>(\d+)<\/Size>/) || [])[1] || 0);
      const lastModified = (block.match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1] || null;
      out.push({ key, size, lastModified });
    }
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    token = truncated ? xmlUnescape((xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/) || [])[1] || '') : null;
  } while (token);
  return out;
}

async function remove(cfg, key) {
  const target = buildUrl(cfg, key);
  const headers = sign(cfg, 'DELETE', target, {}, sha256Hex(''));
  const res = await rawRequest('DELETE', target.url, headers);
  await expectOk(res, `DELETE ${key}`);
  res.resume();
}

module.exports = { s3ConfigFromEnv, putFile, getToFile, getText, list, remove, fileSha256, _buildUrl: buildUrl };
