/**
 * Metal Marvel — firma, org, İK, lisans, kalibrasyon
 */
const { hashParola } = require('../../src/utils/parola');
const { nextSequenceCode } = require('../../src/utils/kodUretici');
const {
  FIRMA_KODU, FIRMA_ADI, TAG, DATES, FIRST_NAMES, LAST_NAMES, log, api,
} = require('./marvel-common');

const DEPTS = [
  { key: 'Yonetim', name: 'Yönetim', erp: null, role: 'ADMIN' },
  { key: 'Satis', name: 'Satış', erp: 'marvel.satis', role: 'USER' },
  { key: 'CRM', name: 'CRM', erp: null, role: 'USER' },
  { key: 'Satinalma', name: 'Satınalma', erp: 'marvel.sa', role: 'USER' },
  { key: 'Planlama', name: 'Planlama', erp: 'marvel.planlama', role: 'USER' },
  { key: 'UretimDokum', name: 'Üretim Döküm', erp: 'marvel.uretim.dokum', role: 'USER' },
  { key: 'UretimCnc', name: 'Üretim CNC', erp: 'marvel.uretim.cnc', role: 'USER' },
  { key: 'Kalite', name: 'Kalite', erp: 'marvel.kalite', role: 'USER' },
  { key: 'Kalibrasyon', name: 'Kalibrasyon', erp: 'marvel.kalibrasyon', role: 'USER' },
  { key: 'Depo', name: 'Depo', erp: 'marvel.depo', role: 'USER' },
  { key: 'IK', name: 'İK', erp: 'marvel.ik', role: 'USER' },
  { key: 'Finans', name: 'Finans', erp: 'marvel.finans', role: 'USER' },
  { key: 'Proje', name: 'Proje', erp: 'marvel.proje', role: 'USER' },
  { key: 'Bakim', name: 'Bakım', erp: null, role: 'USER' },
  { key: 'ArGe', name: 'Ar-Ge', erp: 'marvel.arge', role: 'USER' },
  { key: 'IT', name: 'BT / IT', erp: null, role: 'USER' },
];

const WH_SPECS = [
  { code: 'MARVEL-GIRIS', name: 'Mal Kabul Giriş', role: 'Giris' },
  { code: 'MARVEL-HMD', name: 'Hammadde', role: 'Hammadde' },
  { code: 'MARVEL-DOK-WIP', name: 'Döküm WIP', role: 'YariMamul' },
  { code: 'MARVEL-CNC-WIP', name: 'CNC WIP', role: 'YariMamul' },
  { code: 'MARVEL-MAM', name: 'Mamul', role: 'Mamul' },
  { code: 'MARVEL-GKK', name: 'Giriş Kalite', role: 'GKK' },
  { code: 'MARVEL-CKK', name: 'Çıkış Kalite', role: 'CKK' },
  { code: 'MARVEL-SVK', name: 'Sevk', role: 'Normal' },
];

const LICENSE_MODULES = [
  'SATIS', 'SATINALMA', 'DEPO', 'URETIM', 'MRP', 'KALITE', 'FINANS', 'MUHASEBE',
  'CRM', 'PROJE', 'IK', 'ONAY', 'BAKIM', 'ARGE', 'LISANS', 'HR', 'KALIBRASYON',
];

async function ensureCompany(client) {
  let row = (await client.query(`SELECT * FROM companies WHERE company_code=$1`, [FIRMA_KODU])).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO companies (
         company_code, company_name, tax_id, tax_office, address, email,
         functional_currency, is_profile, phone
       ) VALUES ($1,$2,'1234567890','Gebze','Organize Sanayi Bölgesi 4. Cad. Gebze/Kocaeli',
                 'info@metalmarvel.com.tr','TRY',TRUE,'0262 555 0100')
       RETURNING *`,
      [FIRMA_KODU, FIRMA_ADI],
    )).rows[0];
    log(`Firma oluşturuldu: ${FIRMA_KODU} (#${row.id})`);
  } else {
    await client.query(
      `UPDATE companies SET company_name=$2, is_profile=TRUE, address='Organize Sanayi Bölgesi Gebze/Kocaeli'
       WHERE id=$1`,
      [row.id, FIRMA_ADI],
    );
    log(`Firma güncellendi: ${FIRMA_KODU} (#${row.id})`);
  }
  return row;
}

async function ensurePlantAndWarehouses(client, firmaId) {
  let plant = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 AND plant_code='MARVEL-GEBZE'`,
    [firmaId],
  )).rows[0];
  if (!plant) {
    plant = (await client.query(
      `INSERT INTO plants (company_id, plant_code, plant_name, address)
       VALUES ($1,'MARVEL-GEBZE','Gebze Fabrika','OSB 4. Cad. Gebze / Kocaeli') RETURNING *`,
      [firmaId],
    )).rows[0];
  }
  const wh = {};
  for (const spec of WH_SPECS) {
    let w = (await client.query(
      `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
      [plant.id, spec.code],
    )).rows[0];
    if (!w) {
      w = (await client.query(
        `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, warehouse_role, is_active)
         VALUES ($1,$2,$3,$4,TRUE) RETURNING *`,
        [plant.id, spec.code, spec.name, spec.role],
      )).rows[0];
    }
    wh[spec.code.replace('MARVEL-', '').replace(/-/g, '_').toLowerCase()] = w;
    if (spec.code.endsWith('GIRIS')) wh.giris = w;
    if (spec.code.endsWith('HMD')) wh.hmd = w;
    if (spec.code.endsWith('MAM')) wh.mam = w;
    if (spec.code.endsWith('GKK')) wh.gkk = w;
    if (spec.code.endsWith('CKK')) wh.ckk = w;
    if (spec.code.endsWith('SVK')) wh.svk = w;
    if (spec.code.includes('DOK-WIP')) wh.dok_wip = w;
    if (spec.code.includes('CNC-WIP')) wh.cnc_wip = w;
  }
  return { plant, wh };
}

async function ensureWorkCenters(client, plantId) {
  const specs = [
    { code: 'MM-DOKUM-01', name: 'Döküm Hattı — Kalıp & Döküm' },
    { code: 'MM-CNC-01', name: 'CNC İşleme Merkezi' },
    { code: 'MM-BOYAMA', name: 'Boyama & Montaj' },
  ];
  const out = {};
  for (const s of specs) {
    let wc = (await client.query(
      `SELECT * FROM work_centers WHERE plant_id=$1 AND center_code=$2`,
      [plantId, s.code],
    )).rows[0];
    if (!wc) {
      wc = (await client.query(
        `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
         VALUES ($1,$2,$3,TRUE) RETURNING *`,
        [plantId, s.code, s.name],
      )).rows[0];
    }
    if (s.code.includes('DOKUM')) out.dokum = wc;
    if (s.code.includes('CNC')) out.cnc = wc;
    if (s.code.includes('BOYAMA')) out.boyama = wc;
  }
  return out;
}

async function upsertErpUser(_client, { userCode, first, last, title, role, companyId }) {
  // API ile personel bağlarken görünür olsun diye pool üzerinden commit
  const db = require('../../db');
  const hash = hashParola('Demo123!');
  let u = (await db.query(`SELECT * FROM users WHERE user_code=$1`, [userCode])).rows[0];
  if (!u) {
    u = (await db.query(
      `INSERT INTO users (user_code, username, first_name, last_name, role, title, is_active, password_hash, group_code)
       VALUES ($1,$1,$2,$3,$4,$5,TRUE,$6,'GENEL') RETURNING *`,
      [userCode, first, last, role || 'USER', title, hash],
    )).rows[0];
  } else {
    await db.query(
      `UPDATE users SET first_name=$2, last_name=$3, title=$4, password_hash=$5, is_active=TRUE WHERE id=$1`,
      [u.id, first, last, title, hash],
    );
  }
  await db.query(
    `INSERT INTO user_company_permissions (user_id, company_id)
     SELECT $1,$2 WHERE NOT EXISTS (
       SELECT 1 FROM user_company_permissions WHERE user_id=$1 AND company_id=$2)`,
    [u.id, companyId],
  );
  return u;
}

async function seedHrOrg(client, firmaId, apiCtx) {
  const { plant } = apiCtx;
  const out = { depts: {}, users: {}, employees: {}, shifts: {}, calendar: null, counts: {} };

  const cal = await api('POST', '/hr-takvim/takvimler', {
    company_id: firmaId,
    calendar_name: 'Metal Marvel 5 Gün',
    work_days_per_week: 5,
    daily_presence_hours: 9,
    daily_net_hours: 8,
    break_minutes: 60,
    weekly_net_hours: 40,
    effective_from: '2026-01-01',
  }, firmaId);
  out.calendar = cal;

  const shiftDok = await api('POST', '/hr-takvim/vardiyalar', {
    company_id: firmaId,
    shift_name: 'Döküm Vardiya A',
    start_time: '06:00',
    end_time: '14:00',
    break_minutes: 60,
  }, firmaId).catch(async () => {
    const r = await client.query(
      `INSERT INTO hr_shifts (company_id, shift_code, shift_name, start_time, end_time, break_minutes, is_active)
       VALUES ($1,'MMD-A','Döküm Vardiya A','06:00','14:00',60,TRUE)
       ON CONFLICT DO NOTHING RETURNING *`,
      [firmaId],
    );
    return r.rows[0] || (await client.query(`SELECT * FROM hr_shifts WHERE company_id=$1 LIMIT 1`, [firmaId])).rows[0];
  });
  const shiftCnc = await api('POST', '/hr-takvim/vardiyalar', {
    company_id: firmaId,
    shift_name: 'CNC Vardiya B',
    start_time: '14:00',
    end_time: '22:00',
    break_minutes: 60,
  }, firmaId).catch(async () => shiftDok);
  out.shifts = { dokum: shiftDok, cnc: shiftCnc };

  let nameIdx = 0;
  const pickName = () => {
    const f = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
    const l = LAST_NAMES[(nameIdx * 3) % LAST_NAMES.length];
    nameIdx += 1;
    return { f, l };
  };

  for (const d of DEPTS) {
    const dept = await api('POST', '/hr-org/departmanlar', {
      company_id: firmaId,
      department_name: d.name,
      description: `[${TAG.LABEL}] ${d.key}`,
    }, firmaId);
    const pos = await api('POST', '/hr-org/pozisyonlar', {
      company_id: firmaId,
      department_id: dept.id,
      position_name: `${d.name} Uzmanı`,
    }, firmaId);
    out.depts[d.key] = { dept, pos };

    const people = [];
    for (let i = 0; i < 2; i++) {
      const { f, l } = pickName();
      let userId = null;
      if (i === 0 && d.erp) {
        const u = await upsertErpUser(client, {
          userCode: d.erp,
          first: f,
          last: l,
          title: `${d.name} — ERP`,
          role: d.role,
          companyId: firmaId,
        });
        userId = u.id;
        out.users[d.erp] = { id: u.id, user_code: d.erp, name: `${f} ${l}` };
      }
      const emp = await api('POST', '/hr-personel', {
        company_id: firmaId,
        first_name: f,
        last_name: l,
        hire_date: DATES.w1Start,
        department_id: dept.id,
        position_id: pos.id,
        work_calendar_id: cal.id,
        collar_type: 'BeyazYaka',
        badge_no: `BY${String(dept.id).padStart(3, '0')}${i + 1}`,
        education_level: 'Lisans',
        education_school: 'Gebze Teknik Üniversitesi',
        education_field: 'Endüstri Mühendisliği',
        work_location: plant.plant_name || 'Gebze Fabrika',
        email: `${f.toLowerCase()}.${l.toLowerCase()}@metalmarvel.local`,
        gross_amount: 85000 + i * 5000,
        user_id: userId,
      }, firmaId);
      people.push(emp);
    }
    out.employees[d.key] = people;
  }

  // Ek beyaz yaka (~88) — ERP hesabı yok
  const extraWhite = 88;
  const deptKeys = ['Yonetim', 'CRM', 'Bakim', 'IT', 'Planlama'];
  for (let i = 0; i < extraWhite; i++) {
    const dKey = deptKeys[i % deptKeys.length];
    const dRef = out.depts[dKey];
    if (!dRef) continue;
    const { f, l } = pickName();
    const kod = `MMBY${1000 + i}`;
    await client.query(
      `INSERT INTO hr_employees (
         company_id, employee_no, first_name, last_name, hire_date,
         department_id, position_id, work_calendar_id, collar_type, badge_no,
         education_level, work_location, employment_status, is_active
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BeyazYaka',$9,'Lisans','Gebze','Aktif',TRUE)
       ON CONFLICT (company_id, employee_no) DO NOTHING`,
      [
        firmaId, kod, f, l, DATES.w1Start,
        dRef.dept.id, dRef.pos.id, cal.id, `EX${i + 1}`,
      ],
    ).catch(() => null);
  }

  // Mavi yaka ~400 — bulk SQL
  const dokDept = out.depts.UretimDokum?.dept?.id;
  const cncDept = out.depts.UretimCnc?.dept?.id;
  const dokPos = out.depts.UretimDokum?.pos?.id;
  const cncPos = out.depts.UretimCnc?.pos?.id;
  const shiftDokId = shiftDok?.id || null;
  const shiftCncId = shiftCnc?.id || null;

  await client.query(
    `INSERT INTO hr_employees (
       company_id, employee_no, first_name, last_name, hire_date,
       department_id, position_id, work_calendar_id, shift_id,
       collar_type, badge_no, work_location, employment_status, is_active, union_member
     )
     SELECT
       $1,
       'MMBC' || lpad(g::text, 4, '0'),
       ($2::text[])[1 + mod(g - 1, array_length($2::text[], 1))],
       ($3::text[])[1 + mod(g - 1, array_length($3::text[], 1))],
       $4::date,
       CASE WHEN g % 2 = 0 THEN $5::int ELSE $6::int END,
       CASE WHEN g % 2 = 0 THEN $7::int ELSE $8::int END,
       $9::int,
       CASE WHEN g % 2 = 0 THEN $10::int ELSE $11::int END,
       'MaviYaka',
       'PD' || lpad(g::text, 5, '0'),
       'Gebze Üretim Sahası',
       'Aktif', TRUE,
       (g % 7 = 0)
     FROM generate_series(1, 400) g
     ON CONFLICT (company_id, employee_no) DO NOTHING`,
    [
      firmaId, FIRST_NAMES, LAST_NAMES, DATES.w1Start,
      dokDept, cncDept, dokPos, cncPos, cal.id, shiftDokId, shiftCncId,
    ],
  );

  const cnt = await client.query(
    `SELECT collar_type, COUNT(*)::int AS n FROM hr_employees WHERE company_id=$1 GROUP BY collar_type`,
    [firmaId],
  );
  out.counts.hr = Object.fromEntries(cnt.rows.map((r) => [r.collar_type, r.n]));
  log(`İK: ${JSON.stringify(out.counts.hr)}`);
  return out;
}

async function seedLicense(firmaId) {
  const licCode = 'MARVEL-ENT-2026';
  let sysRow = (await require('../../db').query(
    `SELECT id FROM system_licenses WHERE license_code=$1`,
    [licCode],
  )).rows[0];
  if (!sysRow) {
    const created = await api('POST', '/lisanslar', {
      license_code: licCode,
      license_name: 'Metal Marvel Enterprise Suite',
      edition: 'Enterprise',
      max_named_users: 50,
      valid_from: '2026-01-01',
      valid_until: '2027-12-31',
      modules_json: LICENSE_MODULES.map((m) => ({ module_code: m, module_name: m, enabled: true })),
      description: `[${TAG.LABEL}] Tam modül paketi`,
    }, firmaId);
    sysRow = { id: created.id };
  }
  const cl = await api('POST', '/lisanslar/firma', {
    company_id: firmaId,
    system_license_id: sysRow.id,
    seat_named: 40,
    modules: LICENSE_MODULES.map((code) => ({ module_code: code, module_name: code, enabled: true })),
    notes: TAG.LABEL,
  }, firmaId);
  return { system_license_id: sysRow.id, company_license: cl };
}

async function seedCalibration(firmaId, plantId, kaliteUserId) {
  const devices = [];
  for (const spec of [
    { name: 'Mitutoyo Kumpas 0-300mm', type: 'Olcum', loc: 'Kalite Lab' },
    { name: 'Sylvac Mikrometre CNC Hat', type: 'Olcum', loc: 'CNC WIP' },
    { name: 'Profil Projektör Döküm', type: 'Olcum', loc: 'Döküm QC' },
  ]) {
    const dev = await api('POST', '/kk-kalite/cihazlar', {
      company_id: firmaId,
      plant_id: plantId,
      instrument_name: spec.name,
      instrument_type: spec.type,
      location_code: spec.loc,
      responsible_user_id: kaliteUserId || null,
      calibration_interval_days: 180,
      next_calibration_date: DATES.w3Start,
      description: TAG.LABEL,
    }, firmaId);
    devices.push(dev);
    await api('POST', '/kk-kalite/kalibrasyonlar', {
      company_id: firmaId,
      instrument_id: dev.id,
      calibration_date: DATES.w2Start,
      performed_by: 'TÜBİTAK UME',
      lab_name: 'Akredite Kalibrasyon Lab',
      certificate_no: `CERT-${dev.instrument_code || dev.id}`,
      result_status: 'Uygun',
      description: `[${TAG.W2}] periyodik kalibrasyon`,
    }, firmaId).catch((e) => log(`  kalibrasyon kaydı: ${e.message}`));
  }
  return devices;
}

async function ensurePoApprovalRule(client, firmaId, finansUserId) {
  const owner = (await client.query(`SELECT id FROM users WHERE user_code='owner' LIMIT 1`)).rows[0];
  const uid = finansUserId || owner?.id;
  if (!uid) return;
  for (const [kod, adi] of [
    ['SA_MUDUR-MARVEL', 'Satınalma Müdürü (MARVEL)'],
    ['FINANS-MARVEL', 'Finans Onayı (MARVEL)'],
  ]) {
    await client.query(
      `INSERT INTO approval_roles (role_code, role_name, description, user_id, company_id, is_active)
       SELECT $1::varchar,$2::varchar,$3::varchar,$4::int,$5::int,TRUE WHERE NOT EXISTS (
         SELECT 1 FROM approval_roles WHERE role_code=$1::varchar AND company_id=$5::int)`,
      [kod, adi, TAG.LABEL, uid, firmaId],
    );
  }
  await client.query(
    `INSERT INTO approval_rules (
       rule_code, rule_name, description, screen_id, company_id, is_active, line_no, term_min_amount
     ) SELECT 'OM-SA-MARVEL'::varchar, 'MARVEL SA >50K'::varchar, $1::varchar,
              'satin-alma-siparisleri'::varchar, $2::int, TRUE, 10, 50000
     WHERE NOT EXISTS (
       SELECT 1 FROM approval_rules WHERE rule_code='OM-SA-MARVEL' AND company_id=$2::int)`,
    [TAG.LABEL, firmaId],
  );
}

module.exports = {
  DEPTS,
  ensureCompany,
  ensurePlantAndWarehouses,
  ensureWorkCenters,
  seedHrOrg,
  seedLicense,
  seedCalibration,
  ensurePoApprovalRule,
  upsertErpUser,
};