#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT, getConfig, saveConfig } = require('./util/config');
const logger = require('./util/logger');
const { runSync, stepBackup, getStatus } = require('./jobs/sync');
const { startScheduler } = require('./scheduler');

const publicDir = path.join(ROOT, 'public');
let busy = null;

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(publicDir, urlPath));
  if (!file.startsWith(publicDir)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': contentType(file) });
  fs.createReadStream(file).pipe(res);
}

async function withBusy(kind, fn) {
  if (busy) {
    const err = new Error(`Şu an başka işlem var: ${busy}`);
    err.status = 409;
    throw err;
  }
  busy = kind;
  try {
    return await fn();
  } finally {
    busy = null;
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;

  if (req.method === 'GET' && p === '/api/status') {
    const status = await getStatus();
    return sendJson(res, 200, { ...status, busy });
  }
  if (req.method === 'GET' && p === '/api/logs') {
    return sendJson(res, 200, { logs: logger.recent(100) });
  }
  if (req.method === 'GET' && p === '/api/config') {
    const cfg = getConfig();
    return sendJson(res, 200, {
      erpRoot: cfg.erpRoot,
      port: cfg.port,
      schedule: cfg.schedule,
      steps: cfg.steps,
      pgDumpPath: cfg.pgDumpPath,
      backupDir: cfg.backupDir,
    });
  }
  if (req.method === 'POST' && p === '/api/config') {
    const body = await readBody(req);
    const saved = saveConfig({
      erpRoot: body.erpRoot,
      pgDumpPath: body.pgDumpPath,
      backupDir: body.backupDir,
      schedule: body.schedule,
      steps: body.steps,
      port: body.port,
    });
    logger.append({ level: 'info', message: 'Config güncellendi' });
    return sendJson(res, 200, { ok: true, config: { erpRoot: saved.erpRoot, schedule: saved.schedule } });
  }
  if (req.method === 'POST' && p === '/api/sync') {
    const result = await withBusy('sync', () => runSync());
    return sendJson(res, 200, result);
  }
  if (req.method === 'POST' && p === '/api/backup') {
    const result = await withBusy('backup', async () => {
      const cfg = getConfig();
      require('./jobs/sync').assertErpRoot(cfg);
      return stepBackup(cfg);
    });
    return sendJson(res, 200, result);
  }
  if (req.method === 'POST' && p === '/api/migrate') {
    const result = await withBusy('migrate', () => runSync({
      steps: { gitPull: false, npmInstall: false, migrate: true, backup: false },
    }));
    return sendJson(res, 200, result);
  }

  sendJson(res, 404, { hata: 'API bulunamadı' });
}

const server = http.createServer(async (req, res) => {
  try {
    if ((req.url || '').startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (err) {
    const status = err.status || 500;
    logger.append({ level: 'error', message: err.message || String(err) });
    sendJson(res, status, { hata: err.message || String(err) });
  }
});

const cfg = getConfig();
const port = Number(cfg.port) || 3920;

server.listen(port, '127.0.0.1', () => {
  logger.append({ level: 'info', message: `Panel http://127.0.0.1:${port}` });
  startScheduler(async () => {
    await withBusy('scheduled-sync', () => runSync()).catch((e) => {
      logger.append({ level: 'error', message: e.message || String(e) });
    });
  });
});
