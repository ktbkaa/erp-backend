/**
 * Test helper — Express app'i dinlemeden require eder.
 * DB: mevcut .env / migrate edilmiş postgres.
 */
require('dotenv').config();

function createApp() {
  // index.js listen eder; test için router-only mini app
  const express = require('express');
  const path = require('path');
  const pool = require('../../db');
  const { authOptional, authRequired } = require('../../src/middleware/authJwt');
  const { auditMiddleware } = require('../../src/services/auditService');

  const app = express();
  app.use(express.json());
  app.use(authOptional);
  app.use(authRequired);

  app.get('/health', (req, res) => res.json({ durum: 'ok' }));
  app.use('/auth', require('../../routes/auth'));
  app.use('/siparisler', require('../../routes/siparisler'));
  app.use('/faturalar', require('../../routes/faturalar'));
  app.use('/stok-bakiyeleri', require('../../routes/stok_bakiyeleri'));
  app.use('/stok-rezervasyonlari', require('../../routes/stok_rezervasyonlari'));
  app.use('/kokpit', require('../../routes/kokpit'));
  app.use('/fatura-kontrolleri', require('../../routes/fatura_kontrolleri'));
  app.use('/cari-hareketleri', require('../../routes/cari_hareketleri'));
  app.use(auditMiddleware(pool));

  const { errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, pool };
}

async function request(app, method, url, { body, headers } = {}) {
  const http = require('http');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
    return { status: res.status, json, text };
  } finally {
    await new Promise((r) => server.close(r));
  }
}

module.exports = { createApp, request };
