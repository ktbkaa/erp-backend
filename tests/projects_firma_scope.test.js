/**
 * Proje alt uçları firma kapsamı (IDOR koruması).
 * Credentials: ERP_E2E_USER / ERP_E2E_PASS (env only).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.ERP_E2E_USER || process.env.DEMO_USER || '';
const PASS = process.env.ERP_E2E_PASS || process.env.DEMO_PASS || '';

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!r.ok) throw new Error(`login ${r.status}`);
  return r.json();
}

describe('projects firma scope', { skip: !USER || !PASS }, () => {
  let token;
  let firmaId;
  let otherFirmaId;
  let projectId;

  before(async () => {
    const auth = await login();
    token = auth.access_token || auth.token;
    const fy = auth.firma_yetkileri || [];
    firmaId = auth.company_id || fy[0]?.company_id || fy[0]?.id;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Firma-Id': String(firmaId || 1),
    };
    // Prefer a company id different from the active one (DB lookup via list API or known DEMO/GIDA ids).
    const cos = await fetch(`${BASE}/companies`, { headers }).then((r) => r.json()).catch(() => []);
    const list = Array.isArray(cos) ? cos : [];
    otherFirmaId = list.find((c) => Number(c.id) !== Number(firmaId))?.id;
    if (!otherFirmaId) {
      // Fallback: any other positive id (scope check compares project.company_id vs header).
      otherFirmaId = Number(firmaId) === 1 ? 2 : 1;
    }
    assert.ok(otherFirmaId && Number(otherFirmaId) !== Number(firmaId), 'farklı firma id gerekli');

    const created = await fetch(`${BASE}/prj-projeler`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ project_name: `Scope Test ${Date.now()}` }),
    });
    assert.equal(created.status, 201);
    projectId = (await created.json()).id;
    assert.ok(projectId);
  });

  after(async () => {
    if (!token || !projectId) return;
    await fetch(`${BASE}/prj-projeler/${projectId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Firma-Id': String(firmaId || 1),
      },
    }).catch(() => {});
  });

  it('members POST with wrong firma returns 403', async () => {
    const r = await fetch(`${BASE}/prj-projeler/${projectId}/members`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Firma-Id': String(otherFirmaId),
      },
      body: JSON.stringify({ user_id: 1 }),
    });
    assert.equal(r.status, 403);
  });

  it('archive with wrong firma returns 403', async () => {
    const r = await fetch(`${BASE}/prj-projeler/${projectId}/archive`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Firma-Id': String(otherFirmaId),
      },
    });
    assert.equal(r.status, 403);
  });

  it('delete with wrong firma returns 403', async () => {
    const r = await fetch(`${BASE}/prj-projeler/${projectId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Firma-Id': String(otherFirmaId),
      },
    });
    assert.equal(r.status, 403);
  });
});
