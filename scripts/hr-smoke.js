#!/usr/bin/env node
/**
 * İK uçtan uca duman testi — gerçek API + DB.
 * Kullanım: node scripts/hr-smoke.js
 */
const pool = require('../db');

const BASE = process.env.HR_SMOKE_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;

async function api(path, { method = 'GET', body, firmaId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data.hata || data.error || `${res.status} ${path}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  const firma = await pool.query(`SELECT id, company_code FROM companies ORDER BY id LIMIT 1`);
  if (!firma.rows[0]) throw new Error('Firma yok');
  const firmaId = firma.rows[0].id;
  console.log('Firma', firma.rows[0].company_code, firmaId);

  const dept = await api('/hr-org/departmanlar', {
    method: 'POST', firmaId,
    body: { company_id: firmaId, department_name: 'İK Smoke Departman' },
  });
  const pos = await api('/hr-org/pozisyonlar', {
    method: 'POST', firmaId,
    body: { company_id: firmaId, position_name: 'İK Analist', department_id: dept.id },
  });
  const cal = await api('/hr-takvim/takvimler', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      calendar_name: '5 Gün Model B',
      work_days_per_week: 5,
      daily_presence_hours: 10.5,
      daily_net_hours: 9.5,
      break_minutes: 60,
      weekly_net_hours: 47.5,
      effective_from: '2025-01-01',
    },
  });
  const emp = await api('/hr-personel', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      first_name: 'Ayşe',
      last_name: 'Yılmaz',
      hire_date: '2022-03-01',
      department_id: dept.id,
      position_id: pos.id,
      work_calendar_id: cal.id,
      email: `ayse.smoke.${Date.now()}@example.com`,
      gross_amount: 50000,
    },
  });
  console.log('Personel', emp.employee_no, emp.id);

  const types = await api('/hr-izin/turler', { firmaId });
  const yillik = types.find((t) => t.leave_code === 'YILLIK');
  await api('/hr-izin/bakiyeler/accrue', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      employee_id: emp.id,
      leave_type_id: yillik.id,
      year_no: 2025,
      accrued: 14,
    },
  });
  const leave = await api('/hr-izin/talepler', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      employee_id: emp.id,
      leave_type_id: yillik.id,
      start_date: '2025-06-02',
      end_date: '2025-06-06',
      quantity: 5,
    },
  });
  await api(`/hr-izin/talepler/${leave.id}/gonder`, { method: 'POST', firmaId });
  const approved = await api(`/hr-izin/talepler/${leave.id}/onayla`, { method: 'POST', firmaId });
  console.log('İzin', approved.request_no, approved.status);

  await api('/hr-puantaj/ham', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      employee_id: emp.id,
      event_time: '2025-06-10T08:00:00',
      event_type: 'Giris',
      source_record_id: `S-${emp.id}-in`,
    },
  });
  await api('/hr-puantaj/ham', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      employee_id: emp.id,
      event_time: '2025-06-10T18:30:00',
      event_type: 'Cikis',
      source_record_id: `S-${emp.id}-out`,
    },
  });
  const day = await api('/hr-puantaj/isle', {
    method: 'POST', firmaId,
    body: { company_id: firmaId, employee_id: emp.id, work_date: '2025-06-10' },
  });
  console.log('Puantaj', day.planned_minutes, day.actual_minutes, day.overtime_minutes, day.status);

  const sim = await api('/hr-bordro/hesapla-sim', {
    method: 'POST', firmaId,
    body: { gross: 50000, country_code: 'TR', on_date: '2025-06-15' },
  });
  console.log('Sim net', sim.net_wage, 'param', sim.param_set_code);

  const period = await api('/hr-bordro/donemler', {
    method: 'POST', firmaId,
    body: { company_id: firmaId, year_no: 2025, month_no: 6 },
  });
  const run = await api('/hr-bordro/calismalar', {
    method: 'POST', firmaId,
    body: { company_id: firmaId, period_id: period.id },
  });
  const calc = await api(`/hr-bordro/calismalar/${run.id}/hesapla`, { method: 'POST', firmaId });
  await api(`/hr-bordro/calismalar/${run.id}/onayla`, { method: 'POST', firmaId });
  const kesin = await api(`/hr-bordro/calismalar/${run.id}/kesinlestir`, { method: 'POST', firmaId });
  console.log('Bordro', kesin.run_no, kesin.status, 'kişiler', calc.employee_count, 'net', calc.total_net);

  const job = await api('/hr-ise-alim/ilanlar', {
    method: 'POST', firmaId,
    body: { company_id: firmaId, title: 'Üretim Operatörü', department_id: dept.id, position_id: pos.id },
  });
  const cand = await api('/hr-ise-alim/adaylar', {
    method: 'POST', firmaId,
    body: {
      company_id: firmaId,
      first_name: 'Mehmet',
      last_name: 'Demir',
      email: `mehmet.smoke.${Date.now()}@example.com`,
      requisition_id: job.id,
    },
  });
  const hired = await api(`/hr-ise-alim/adaylar/${cand.id}/ise-al`, {
    method: 'POST', firmaId,
    body: { hire_date: '2025-07-01' },
  });
  console.log('İşe alım', hired.employee_no);

  console.log('SMOKE_OK');
  await pool.end();
}

main().catch(async (e) => {
  console.error('SMOKE_FAIL', e.message, e.data || '');
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
