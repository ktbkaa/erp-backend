/**
 * DOKUM (Anadolu Döküm) — Proje Yönetimi (PRJ) demo sunumu.
 *
 * Üst bardan firma = DOKUM seçerek gezilebilir uçtan uca senaryo:
 * şablon proje → işler → board → sprint → gantt → bütçe/aşım → risk → kapanış
 * + CRM/satıştan bağlanabilir proje kodu örnekleri.
 *
 *   node scripts/demo-dokum-prj.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRMA = 'DOKUM';
const TAG = 'DOKUM-PRJ';

const summary = {
  firma: null,
  tag: TAG,
  project: null,
  work_items: [],
  board: null,
  sprint: null,
  gantt: null,
  budget: null,
  risk: null,
  close: null,
  how_to: {
    ui: 'Üst bar → Firma Profil = Anadolu Döküm. Proje Yönetimi modülünde DOKUM-PRJ kodlu projeyi açın.',
    filter: `project_code / açıklama: ${TAG}`,
  },
};

function log(m) { console.log(m); }

async function api(method, urlPath, body, firmaId) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': 'owner',
    'X-Firma-Id': String(firmaId),
  };
  const r = await fetch(BASE_URL + urlPath, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; }
  if (!r.ok) {
    const err = new Error(`${method} ${urlPath} → ${r.status} ${JSON.stringify(json)}`);
    err.status = r.status;
    err.json = json;
    throw err;
  }
  return json;
}

async function main() {
  const c = await pool.query(
    `SELECT id, company_code, company_name FROM companies WHERE company_code=$1`,
    [FIRMA]
  );
  if (!c.rows[0]) throw new Error('DOKUM firması yok');
  const firmaId = c.rows[0].id;
  summary.firma = c.rows[0];
  log(`Firma: ${c.rows[0].company_name} (#${firmaId})`);

  const users = await pool.query(
    `SELECT id, user_code FROM users WHERE is_active ORDER BY id LIMIT 3`
  );
  const managerId = users.rows[0]?.id;
  const memberId = users.rows[1]?.id || managerId;

  // Eski demo temizliği (aynı etiket)
  await pool.query(
    `DELETE FROM project_cost_entries WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM work_logs WHERE work_item_id IN (
       SELECT w.id FROM work_items w JOIN projects p ON p.id=w.project_id
       WHERE p.company_id=$1 AND p.project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM work_item_comments WHERE work_item_id IN (
       SELECT w.id FROM work_items w JOIN projects p ON p.id=w.project_id
       WHERE p.company_id=$1 AND p.project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  ).catch(() => {});
  await pool.query(
    `DELETE FROM work_item_relations WHERE from_work_item_id IN (
       SELECT w.id FROM work_items w JOIN projects p ON p.id=w.project_id
       WHERE p.company_id=$1 AND p.project_code LIKE $2)
       OR to_work_item_id IN (
       SELECT w.id FROM work_items w JOIN projects p ON p.id=w.project_id
       WHERE p.company_id=$1 AND p.project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  ).catch(() => {});
  await pool.query(
    `DELETE FROM work_items WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM prj_sprint_work_items WHERE sprint_id IN (
       SELECT s.id FROM prj_sprints s JOIN projects p ON p.id=s.project_id
       WHERE p.company_id=$1 AND p.project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM prj_sprints WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM prj_board_columns WHERE board_id IN (
       SELECT b.id FROM prj_boards b JOIN projects p ON p.id=b.project_id
       WHERE p.company_id=$1 AND p.project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM prj_boards WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM project_budget_lines WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM project_risks WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM project_close_checklists WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM project_milestones WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM project_phases WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2)`,
    [firmaId, `${TAG}%`]
  );
  await pool.query(
    `DELETE FROM projects WHERE company_id=$1 AND project_code LIKE $2`,
    [firmaId, `${TAG}%`]
  );

  const code = `${TAG}-${Date.now().toString().slice(-5)}`;
  let project;
  try {
    project = await api('POST', '/prj-integrations/from-template/TPL_MAKINE', {
      project_name: 'Döküm Hattı Kurulum Demo',
      project_code: code,
      manager_user_id: managerId,
      plan_start_date: '2026-03-01',
      plan_end_date: '2026-09-30',
      description: `${TAG} — döküm fırın hattı kurulum ve devreye alma`,
    }, firmaId);
  } catch (err) {
    log(`Şablon yok/hata (${err.message}) — elle proje`);
    project = await api('POST', '/prj-projeler', {
      project_name: 'Döküm Hattı Kurulum Demo',
      project_code: code,
      manager_user_id: managerId,
      planned_budget: 250000,
      plan_start_date: '2026-03-01',
      plan_end_date: '2026-09-30',
      approach: 'classic',
      description: `${TAG} — manuel`,
    }, firmaId);
    for (const title of [
      'Saha keşfi ve ölçüm',
      'Fırın temeli',
      'Elektrik panosu',
      'Deneme dökümü',
      'Eğitim ve teslim',
    ]) {
      await api('POST', '/prj-isler', {
        project_id: project.id,
        title,
        plan_start_date: '2026-03-10',
        plan_end_date: '2026-04-30',
        estimated_hours: 40,
        assignee_user_id: memberId,
      }, firmaId);
    }
  }
  summary.project = { id: project.id, project_code: project.project_code, project_name: project.project_name };
  log(`Proje: ${project.project_code} (#${project.id})`);

  // Üye
  try {
    await api('POST', `/prj-projeler/${project.id}/members`, {
      user_id: memberId,
      role_code: 'MEMBER',
      can_view_budget: true,
      can_view_costs: true,
    }, firmaId);
  } catch (_) { /* zaten var */ }

  const items = await api('GET', `/prj-isler?project_id=${project.id}`, null, firmaId);
  summary.work_items = (items || []).slice(0, 8).map((w) => ({
    id: w.id, no: w.work_item_no, title: w.title, status: w.status_code,
  }));
  log(`İş sayısı: ${items.length}`);

  if (items[0]) {
    await api('POST', `/prj-isler/${items[0].id}/work-logs`, {
      work_date: '2026-03-12',
      hours_spent: 4,
      description: `${TAG} keşif worklog`,
      start_time: '09:00',
      end_time: '13:00',
    }, firmaId).catch((e) => log(`worklog: ${e.message}`));
  }

  // Board + WIP move
  const board = await api('GET', `/prj-board?project_id=${project.id}`, null, firmaId);
  summary.board = { columns: (board.columns || []).map((c) => ({ name: c.column_name || c.status_name, cards: (c.cards || []).length })) };
  const card = (board.columns || []).flatMap((c) => c.cards || [])[0];
  const todo = (board.columns || []).find((c) => ['TODO', 'IN_PROGRESS'].includes(c.status_code));
  if (card && todo) {
    await api('POST', '/prj-board/move', {
      work_item_id: card.id,
      to_status_id: todo.status_id,
    }, firmaId).catch((e) => log(`board move: ${e.message}`));
  }

  // Sprint
  const sp = await api('POST', '/prj-sprintler', {
    project_id: project.id,
    sprint_name: `${TAG} Sprint 1`,
    start_date: '2026-03-01',
    end_date: '2026-03-14',
    capacity_hours: 120,
    goal: 'Saha keşfi ve temel',
  }, firmaId);
  if (items[0]) {
    await api('POST', `/prj-sprintler/${sp.id}/items`, { work_item_id: items[0].id }, firmaId).catch(() => {});
  }
  await api('POST', `/prj-sprintler/${sp.id}/start`, {}, firmaId).catch((e) => log(`sprint start: ${e.message}`));
  summary.sprint = { id: sp.id, name: sp.sprint_name, code: sp.sprint_code };

  // Gantt reschedule
  if (items[1]) {
    summary.gantt = await api('POST', '/prj-planning/gantt/reschedule', {
      work_item_id: items[1].id,
      plan_start_date: '2026-03-15',
      plan_end_date: '2026-04-05',
    }, firmaId).catch((e) => ({ hata: e.message }));
  }
  const gantt = await api('GET', `/prj-planning/gantt?project_id=${project.id}`, null, firmaId);
  summary.gantt_tasks = (gantt.tasks || []).length;

  // Bütçe + aşım (onay + e-posta)
  await api('POST', `/prj-budget/${project.id}/lines`, {
    category_code: 'MALZEME',
    category_name: 'Hammadde / refrakter',
    planned_qty: 1,
    unit_price: 80000,
    planned_amount: 80000,
    description: `${TAG} plan`,
  }, firmaId);
  await api('POST', `/prj-budget/${project.id}/lines`, {
    category_code: 'PERSONEL',
    category_name: 'Montaj ekibi',
    planned_qty: 200,
    unit_price: 500,
    planned_amount: 100000,
  }, firmaId);
  // planned_budget satır toplamından güncellenir
  const cost = await api('POST', `/prj-budget/${project.id}/costs`, {
    category_code: 'MALZEME',
    amount: 220000,
    source_module: 'PRJ',
    source_table: 'demo_dokum',
    source_id: Date.now() % 1000000,
    description: `${TAG} aşırı refrakter maliyeti`,
  }, firmaId);
  summary.budget = {
    cost_id: cost.id,
    amount: cost.amount,
    approval_meta: cost.approval_meta || null,
  };
  const sum = await api('GET', `/prj-budget/${project.id}/summary`, null, firmaId);
  summary.budget.summary = sum;

  // Risk
  const risk = await api('POST', '/prj-riskler', {
    project_id: project.id,
    title: 'Refrakter tedarik gecikmesi',
    probability: 'High',
    impact: 'High',
    mitigation: 'Alternatif ithalatçı + stok emniyeti',
    description: TAG,
  }, firmaId);
  summary.risk = { id: risk.id, score: risk.score, title: risk.title };

  // Dashboard
  summary.dashboard = await api('GET', `/prj-dashboard/overview?project_id=${project.id}`, null, firmaId).catch((e) => ({ hata: e.message }));
  summary.portfolio = await api('GET', '/prj-dashboard/portfolio', null, firmaId).catch((e) => ({ hata: e.message }));

  // Kapanış (force — açık işler olabilir)
  summary.close = await api('POST', `/prj-integrations/projects/${project.id}/close`, {
    force: true,
    close_notes: `${TAG} demo kapanış`,
  }, firmaId).catch((e) => ({ hata: e.message }));

  const outDir = path.join(__dirname, '../docs/project-management/evidence');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'dokum-prj-demo.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2), 'utf8');
  log(`Özet yazıldı: ${out}`);
  log(JSON.stringify({
    project: summary.project,
    work_items: summary.work_items.length,
    sprint: summary.sprint,
    budget_overrun: summary.budget?.summary?.overrun,
    risk_score: summary.risk?.score,
    close_ok: !summary.close?.hata,
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool.end());
