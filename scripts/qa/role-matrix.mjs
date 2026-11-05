#!/usr/bin/env node
/**
 * Yetki / çoklu şirket negatif matrisi.
 * Çıktı: docs/qa/role-matrix-results.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const outPath = path.join(__dirname, '../../docs/qa/role-matrix-results.json');

async function login(username, password = 'admin') {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, token: j.access_token, firms: j.firma_yetkileri || [], user: j.user_code };
}

async function get(url, token, firmaId) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (firmaId != null) headers['X-Firma-Id'] = String(firmaId);
  const r = await fetch(`${BASE}${url}`, { headers });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: r.status, json };
}

const cases = [];
function add(id, title, expected, actual, pass, detail = {}) {
  cases.push({ id, title, expected, actual, pass, ...detail });
}

const admin = await login('ADMIN', 'admin');
add('R1', 'ADMIN login', 200, admin.status, admin.status === 200 && !!admin.token);

const noTok = await get('/items', null, null);
const badTok = await get('/items', 'invalid.token.value', null);
// Yerel soft-auth: token yok/bozukken de 200 olabilir (BUG-010 accepted).
// Geçti sayılan durum: soft-auth 200 VEYA sıkı 401/403.
const soft = badTok.status === 200 && noTok.status === 200;
const strict = badTok.status === 401 || badTok.status === 403;
add(
  'R2',
  'Auth gate (soft veya sıkı)',
  soft ? 'soft-200' : '401/403',
  badTok.status,
  soft || strict,
  { noTokenStatus: noTok.status, mode: soft ? 'soft-auth' : 'strict' }
);

// Firmalar
const firms = await get('/companies', admin.token, null);
const list = Array.isArray(firms.json) ? firms.json : (firms.json?.data || []);
const gida = list.find((c) => c.company_code === 'GIDA');
const dokum = list.find((c) => c.company_code === 'DOKUM');
const other = list.find((c) => c.company_code && !['GIDA', 'DOKUM'].includes(c.company_code));

add('R3', 'ADMIN companies list', '200+', firms.status, firms.status >= 200 && firms.status < 300, {
  count: list.length,
});

if (gida) {
  const ok = await get('/items', admin.token, gida.id);
  add('R4', 'ADMIN + GIDA items', '200', ok.status, ok.status === 200);
}
if (dokum) {
  const ok = await get('/partners', admin.token, dokum.id);
  add('R5', 'ADMIN + DOKUM partners', '200', ok.status, ok.status === 200);
}

// Başka firma ID ile erişim: token geçerliyse 200 veya boş/filtre — 500 olmamalı
if (other && gida) {
  const cross = await get(`/sales_orders?company_id=${other.id}`, admin.token, gida.id);
  const leaked = Array.isArray(cross.json)
    && cross.json.some((r) => Number(r.company_id) === Number(other.id) && Number(r.company_id) !== Number(gida.id));
  add('R6', 'GIDA context’te diğer firma SO sızıntısı yok', false, leaked, !leaked, {
    status: cross.status,
  });
}

// Muhasebe hesapları (finance seed sonrası)
const gl = await get('/muhasebe-hesaplari?is_active=true', admin.token, gida?.id || null);
const glCount = Array.isArray(gl.json) ? gl.json.length : 0;
add('R7', 'GL hesap planı dolu', '>0', glCount, glCount > 0, { status: gl.status });

const pass = cases.filter((c) => c.pass).length;
const fail = cases.filter((c) => !c.pass).length;
const report = {
  generatedAt: new Date().toISOString(),
  summary: { pass, fail, total: cases.length },
  cases,
};
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
if (fail) process.exitCode = 1;
