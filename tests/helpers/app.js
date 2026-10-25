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

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/auth', require('../../routes/auth'));
  app.use('/sales_orders', require('../../routes/sales_orders'));
  app.use('/invoices', require('../../routes/invoices'));
  app.use('/stok-bakiyeleri', require('../../routes/stok_bakiyeleri'));
  app.use('/stok-rezervasyonlari', require('../../routes/item_reservations'));
  app.use('/kokpit', require('../../routes/kokpit'));
  app.use('/fatura-kontrolleri', require('../../routes/fatura_kontrolleri'));
  app.use('/cari-hareketleri', require('../../routes/partner_ledger_entries'));
  app.use('/odeme-kosullari', require('../../routes/payment_terms'));
  app.use('/teslimat-kosullari', require('../../routes/delivery_terms'));
  app.use('/languages', require('../../routes/languages'));
  app.use('/banks', require('../../routes/banks'));
  app.use('/doviz-kurlari', require('../../routes/exchange_rates'));
  app.use('/transfer-emirleri', require('../../routes/transfer_orders'));
  app.use('/sayim-belgeleri', require('../../routes/inventory_counts'));
  app.use('/warehouses', require('../../routes/warehouses'));
  app.use('/items', require('../../routes/items'));
  app.use('/audit-log', require('../../routes/audit_logs'));
  app.use('/meta', require('../../routes/meta_ekran'));
  app.use('/sql-console', require('../../routes/sql_console'));
  app.use('/users', require('../../routes/users'));
  app.use('/kullanicilar', require('../../routes/users'));
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
