/**
 * Yapılandırılabilir özel entegratör REST adaptörü.
 * Uç yolları, kimlik doğrulama türü ve yanıt alan yolları EBELGE_REST_ENDPOINTS (JSON) ile
 * entegratörün API'sine uyarlanır; varsayılanlar `DEFAULT_ENDPOINTS` sözleşmesidir.
 */
const crypto = require('crypto');
const { AdapterError } = require('./contract');
const { mapGibCode } = require('./gibStatusCodes');

const DEFAULT_ENDPOINTS = Object.freeze({
  token: '/auth/token',
  send: '/documents',
  status: '/documents/{uuid}/status',
  cancel: '/documents/{uuid}/cancel',
  checkUser: '/users/{taxId}?kind={documentKind}',
  apiKeyHeader: 'X-API-Key',
  fields: {
    token: 'access_token',
    expiresIn: 'expires_in',
    providerRef: 'id',
    statusCode: 'status.code',
    statusMessage: 'status.message',
    registered: 'registered',
    aliases: 'aliases',
  },
  statusMap: {},
});

function getPath(obj, p) {
  if (!obj || !p) return undefined;
  return String(p).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] == null ? '' : String(vars[k])));
}

function joinUrl(base, p) {
  return `${String(base).replace(/\/+$/, '')}/${String(p).replace(/^\/+/, '')}`;
}

function createRestAdapter({ mode, baseUrl, auth = 'token', credentials = {}, endpoints = null, timeoutMs = 30000, fetchImpl = globalThis.fetch }) {
  if (!baseUrl) throw new AdapterError('REST entegratör adresi tanımlı değil.', { code: 'EBELGE_YAPILANDIRMA' });
  const ep = {
    ...DEFAULT_ENDPOINTS,
    ...(endpoints || {}),
    fields: { ...DEFAULT_ENDPOINTS.fields, ...((endpoints && endpoints.fields) || {}) },
    statusMap: { ...((endpoints && endpoints.statusMap) || {}) },
  };
  let token = null;
  let tokenExpires = 0;

  async function http(method, path, body, { withAuth = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (withAuth) Object.assign(headers, await authHeaders());
    let res;
    try {
      res = await fetchImpl(joinUrl(baseUrl, path), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      const timeout = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      throw new AdapterError(`Entegratöre ulaşılamadı: ${timeout ? 'zaman aşımı' : e.message}`, {
        code: timeout ? 'EBELGE_ZAMAN_ASIMI' : 'EBELGE_AG_HATASI',
        retryable: true,
      });
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (_) {
      json = { raw: text.slice(0, 2000) };
    }
    if (!res.ok) {
      const retryable = res.status >= 500 || res.status === 429 || res.status === 408;
      if (res.status === 401 && withAuth) token = null;
      const msg = getPath(json, ep.fields.statusMessage) || json.message || json.error || `HTTP ${res.status}`;
      throw new AdapterError(`Entegratör hatası (${res.status}): ${msg}`, {
        code: `EBELGE_HTTP_${res.status}`,
        retryable,
        httpStatus: res.status,
        raw: json,
      });
    }
    return json;
  }

  async function authHeaders() {
    if (auth === 'basic') {
      return { Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}` };
    }
    if (auth === 'bearer') return { Authorization: `Bearer ${credentials.apiKey}` };
    if (auth === 'apikey') return { [ep.apiKeyHeader]: credentials.apiKey };
    if (!token || Date.now() > tokenExpires) {
      const r = await http('POST', ep.token, { username: credentials.username, password: credentials.password }, { withAuth: false });
      token = getPath(r, ep.fields.token);
      if (!token) throw new AdapterError('Entegratör erişim anahtarı (token) dönmedi.', { code: 'EBELGE_KIMLIK', raw: r });
      const ttl = Number(getPath(r, ep.fields.expiresIn) || 3600);
      tokenExpires = Date.now() + Math.max(30, ttl - 60) * 1000;
    }
    return { Authorization: `Bearer ${token}` };
  }

  function normalizeStatus(json) {
    const code = getPath(json, ep.fields.statusCode);
    const message = getPath(json, ep.fields.statusMessage);
    const custom = code != null ? ep.statusMap[String(code)] : null;
    const mapped = custom ? { status: custom, retryable: false } : mapGibCode(code);
    return { code: code != null ? String(code) : null, message: message || (mapped && mapped.message) || null, mapped };
  }

  return {
    code: 'REST',
    mode,
    async send(p) {
      const xmlB64 = Buffer.from(p.xml, 'utf8').toString('base64');
      const json = await http('POST', ep.send, {
        documentType: p.documentType,
        profileId: p.profileId,
        uuid: p.uuid,
        documentNumber: p.gibNumber,
        senderAlias: p.senderAlias || null,
        receiverAlias: p.receiverAlias || null,
        senderTaxId: p.sender && p.sender.id,
        receiverTaxId: p.receiver && p.receiver.id,
        fileName: `${p.uuid}.xml`,
        contentType: 'application/xml',
        content: xmlB64,
        sha256: crypto.createHash('sha256').update(p.xml).digest('hex'),
        envelope: p.envelopeXml ? Buffer.from(p.envelopeXml, 'utf8').toString('base64') : null,
      });
      const s = normalizeStatus(json);
      if (s.mapped && s.mapped.status === 'Hata') {
        throw new AdapterError(`GİB/entegratör reddi ${s.code}: ${s.message}`, { code: `GIB_${s.code}`, retryable: s.mapped.retryable, raw: json });
      }
      return {
        status: s.mapped && s.mapped.status === 'Tamamlandi' ? 'Tamamlandi' : 'Gonderildi',
        providerRef: getPath(json, ep.fields.providerRef) != null ? String(getPath(json, ep.fields.providerRef)) : null,
        statusCode: s.code,
        statusMessage: s.message,
        raw: json,
      };
    },
    async queryStatus(p) {
      const json = await http('GET', fill(ep.status, { uuid: p.uuid, providerRef: p.providerRef || '', documentType: p.documentType }));
      const s = normalizeStatus(json);
      if (!s.mapped) {
        return { status: 'Gonderildi', statusCode: s.code, statusMessage: s.message || 'Bilinmeyen durum kodu', final: false, raw: json };
      }
      const st = s.mapped.status;
      const final = st === 'Kabul' || st === 'Red' || (st === 'Hata' && !s.mapped.retryable)
        || (st === 'Tamamlandi' && p.profileId !== 'TICARIFATURA');
      return { status: st, statusCode: s.code, statusMessage: s.message, retryable: Boolean(s.mapped.retryable), final, raw: json };
    },
    async cancel(p) {
      const json = await http('POST', fill(ep.cancel, { uuid: p.uuid, providerRef: p.providerRef || '' }), { reason: p.reason || null });
      const s = normalizeStatus(json);
      return { ok: true, statusCode: s.code, statusMessage: s.message, raw: json };
    },
    async checkUser(p) {
      const json = await http('GET', fill(ep.checkUser, { taxId: p.taxId, documentKind: p.documentKind || 'EFATURA' }));
      const aliases = [].concat(getPath(json, ep.fields.aliases) || []).map((a) => (typeof a === 'string'
        ? { alias: a }
        : { alias: a.alias || a.name, title: a.title || null, registeredAt: a.registeredAt || a.firstCreationTime || null }))
        .filter((a) => a.alias);
      const reg = getPath(json, ep.fields.registered);
      return { registered: reg == null ? aliases.length > 0 : Boolean(reg), aliases, raw: json };
    },
  };
}

module.exports = { createRestAdapter, DEFAULT_ENDPOINTS };
