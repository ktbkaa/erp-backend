/**
 * Metal Marvel — firma / org / İK / kullanıcı seed yardımcıları
 */
const { hashParola } = require('../../src/utils/parola');

const DEPTS = [
  { code: 'YON', name: 'Genel Yönetim', cost: 'YON-01' },
  { code: 'SAT', name: 'Satış', cost: 'SAT-01' },
  { code: 'CRM', name: 'CRM / Pazarlama', cost: 'CRM-01' },
  { code: 'SA', name: 'Satınalma', cost: 'SA-01' },
  { code: 'PLN', name: 'Planlama / MRP', cost: 'PLN-01' },
  { code: 'UDK', name: 'Üretim Döküm', cost: 'UDK-01' },
  { code: 'UCN', name: 'Üretim CNC', cost: 'UCN-01' },
  { code: 'KLT', name: 'Kalite', cost: 'KLT-01' },
  { code: 'KAL', name: 'Kalibrasyon', cost: 'KAL-01' },
  { code: 'DEP', name: 'Depo / Lojistik', cost: 'DEP-01' },
  { code: 'IK', name: 'İnsan Kaynakları', cost: 'IK-01' },
  { code: 'FIN', name: 'Finans / Muhasebe', cost: 'FIN-01' },
  { code: 'PRJ', name: 'Proje Yönetimi', cost: 'PRJ-01' },
  { code: 'BKM', name: 'Bakım', cost: 'BKM-01' },
  { code: 'ARD', name: 'Ar-Ge / Tasarım', cost: 'ARD-01' },
  { code: 'IT', name: 'Bilgi Teknolojileri', cost: 'IT-01' },
];

/** Departman başına 2 beyaz yaka (ad,soyad); erp=true olanlar kullanıcı olur */
const WHITE_PAIR = {
  YON: [{ f: 'Kemal', l: 'Yılmaz', erp: 'marvel.yonetim', role: 'Yonetici' }, { f: 'Selin', l: 'Aydın', erp: null }],
  SAT: [{ f: 'Burak', l: 'Koç', erp: 'marvel.satis', role: 'Personel' }, { f: 'Deniz', l: 'Arslan', erp: 'marvel.satis2', role: 'Personel' }],
  CRM: [{ f: 'Ece', l: 'Polat', erp: 'marvel.crm', role: 'Personel' }, { f: 'Mert', l: 'Şahin', erp: null }],
  SA: [{ f: 'Ayşe', l: 'Kara', erp: 'marvel.sa', role: 'Satinalma' }, { f: 'Can', l: 'Demir', erp: 'marvel.samudur', role: 'Satinalma' }],
  PLN: [{ f: 'Onur', l: 'Çelik', erp: 'marvel.plan', role: 'Uretim' }, { f: 'Gül', l: 'Öztürk', erp: null }],
  UDK: [{ f: 'Hakan', l: 'Taş', erp: 'marvel.dokum', role: 'Uretim' }, { f: 'İpek', l: 'Yıldız', erp: null }],
  UCN: [{ f: 'Emre', l: 'Acar', erp: 'marvel.cnc', role: 'Uretim' }, { f: 'Seda', l: 'Kılıç', erp: null }],
  KLT: [{ f: 'Nil', l: 'Erdem', erp: 'marvel.kalite', role: 'Personel' }, { f: 'Barış', l: 'Güneş', erp: null }],
  KAL: [{ f: 'Tolga', l: 'Akın', erp: 'marvel.kalibrasyon', role: 'Personel' }, { f: 'Pınar', l: 'Bulut', erp: null }],
  DEP: [{ f: 'Volkan', l: 'Kurt', erp: 'marvel.depo', role: 'Personel' }, { f: 'Esra', l: 'Doğan', erp: null }],
  IK: [{ f: 'Zeynep', l: 'Aksoy', erp: 'marvel.ik', role: 'Personel' }, { f: 'Ali', l: 'Vural', erp: null }],
  FIN: [{ f: 'Melis', l: 'Özkan', erp: 'marvel.finans', role: 'Finans' }, { f: 'Serkan', l: 'Aslan', erp: null }],
  PRJ: [{ f: 'Cem', l: 'Yalçın', erp: 'marvel.proje', role: 'Personel' }, { f: 'Hande', l: 'Sezer', erp: null }],
  BKM: [{ f: 'Rıza', l: 'Korkmaz', erp: 'marvel.bakim', role: 'Personel' }, { f: 'Derya', l: 'Uçar', erp: null }],
  ARD: [{ f: 'Yiğit', l: 'Bozkurt', erp: 'marvel.arge', role: 'Personel' }, { f: 'Lara', l: 'Çetin', erp: null }],
  IT: [{ f: 'Furkan', l: 'Tekin', erp: 'marvel.it', role: 'Personel' }, { f: 'Buse', l: 'Aydın', erp: null }],
};

const FIRST = ['Ahmet', 'Mehmet', 'Mustafa', 'Fatma', 'Ayşe', 'Emine', 'Hasan', 'Hüseyin', 'Hatice', 'Elif', 'Murat', 'Özlem', 'Cemal', 'Sevgi', 'Yusuf', 'Sibel'];
const LAST = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara'];

function pick(arr, i) {
  return arr[i % arr.length];
}

async function ensureCompany(client) {
  let firma = (await client.query(
    `SELECT * FROM companies WHERE UPPER(company_code)='MARVEL'`,
  )).rows[0];
  if (!firma) {
    firma = (await client.query(
      `INSERT INTO companies (company_code, company_name, address, email, phone, is_profile, functional_currency)
       VALUES ('MARVEL','Metal Marvel Figür Sanayi A.Ş.',
               'Gebze OSB 5. Cadde No:42 Kocaeli','info@metalmarvel.demo',
               '+90 262 000 0000', TRUE, 'TRY')
       RETURNING *`,
    )).rows[0];
  } else {
    await client.query(
      `UPDATE companies SET company_name=$2, address=$3, email=$4, is_profile=TRUE
       WHERE id=$1`,
      [firma.id, 'Metal Marvel Figür Sanayi A.Ş.', 'Gebze OSB 5. Cadde No:42 Kocaeli', 'info@metalmarvel.demo'],
    );
    firma = (await client.query(`SELECT * FROM companies WHERE id=$1`, [firma.id])).rows[0];
  }
  return firma;
}

async function ensurePlantWh(client, firmaId) {
  let plant = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 AND plant_code='MRV-GEB'`,
    [firmaId],
  )).rows[0];
  if (!plant) {
    plant = (await client.query(
      `INSERT INTO plants (company_id, plant_code, plant_name, address)
       VALUES ($1,'MRV-GEB','Metal Marvel Gebze Fabrika','Gebze OSB') RETURNING *`,
      [firmaId],
    )).rows[0];
  }
  const defs = [
    ['MRV-HMD', 'Hammadde Depo', 'Hammadde', true],
    ['MRV-DKM', 'Döküm WIP', 'Normal', false],
    ['MRV-CNC', 'CNC WIP', 'Normal', false],
    ['MRV-MAM', 'Mamul Depo', 'Mamul', false],
    ['MRV-GKK', 'Giriş Kalite', 'GKK', false],
    ['MRV-CKK', 'Çıkış Kalite', 'CKK', false],
    ['MRV-SVK', 'Sevk Depo', 'Normal', false],
  ];
  const wh = {};
  for (const [code, name, rol, isDef] of defs) {
    let w = (await client.query(
      `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
      [plant.id, code],
    )).rows[0];
    if (!w) {
      w = (await client.query(
        `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, is_default, warehouse_role)
         VALUES ($1,$2,$3,TRUE,$4,$5) RETURNING *`,
        [plant.id, code, name, isDef, rol],
      )).rows[0];
    }
    wh[code] = w;
  }
  return { plant, wh };
}

async function ensureHrOrg(client, firmaId) {
  const depts = {};
  const positions = {};
  for (const d of DEPTS) {
    let row = (await client.query(
      `SELECT * FROM hr_departments WHERE company_id=$1 AND department_code=$2`,
      [firmaId, d.code],
    )).rows[0];
    if (!row) {
      row = (await client.query(
        `INSERT INTO hr_departments (company_id, department_code, department_name, cost_center_code, is_active, description)
         VALUES ($1,$2,$3,$4,TRUE,'Metal Marvel') RETURNING *`,
        [firmaId, d.code, d.name, d.cost],
      )).rows[0];
    }
    depts[d.code] = row;
    const posCode = `${d.code}-UZM`;
    let pos = (await client.query(
      `SELECT * FROM hr_positions WHERE company_id=$1 AND position_code=$2`,
      [firmaId, posCode],
    )).rows[0];
    if (!pos) {
      pos = (await client.query(
        `INSERT INTO hr_positions (company_id, department_id, position_code, position_name, is_active)
         VALUES ($1,$2,$3,$4,TRUE) RETURNING *`,
        [firmaId, row.id, posCode, `${d.name} Uzmanı`],
      )).rows[0];
    }
    positions[d.code] = pos;
  }
  // Operatör pozisyonları
  for (const [code, name] of [['UDK-OP', 'Döküm Operatörü'], ['UCN-OP', 'CNC Operatörü']]) {
    const deptCode = code.startsWith('UDK') ? 'UDK' : 'UCN';
    let pos = (await client.query(
      `SELECT * FROM hr_positions WHERE company_id=$1 AND position_code=$2`,
      [firmaId, code],
    )).rows[0];
    if (!pos) {
      pos = (await client.query(
        `INSERT INTO hr_positions (company_id, department_id, position_code, position_name, is_active)
         VALUES ($1,$2,$3,$4,TRUE) RETURNING *`,
        [firmaId, depts[deptCode].id, code, name],
      )).rows[0];
    }
    positions[code] = pos;
  }
  let cal = (await client.query(
    `SELECT * FROM hr_work_calendars WHERE company_id=$1 AND calendar_code='MRV-5G'`,
    [firmaId],
  )).rows[0];
  if (!cal) {
    cal = (await client.query(
      `INSERT INTO hr_work_calendars (
         company_id, calendar_code, calendar_name, work_days_per_week,
         daily_presence_hours, daily_net_hours, break_minutes, weekly_net_hours, effective_from, is_active
       ) VALUES ($1,'MRV-5G','Marvel 5 Gün',5,9,8,60,40,'2026-01-01',TRUE) RETURNING *`,
      [firmaId],
    )).rows[0];
  }
  let shift = (await client.query(
    `SELECT * FROM hr_shifts WHERE company_id=$1 AND shift_code='MRV-G'`,
    [firmaId],
  )).rows[0];
  if (!shift) {
    // schema may vary — try common columns
    try {
      shift = (await client.query(
        `INSERT INTO hr_shifts (company_id, shift_code, shift_name, start_time, end_time, is_active)
         VALUES ($1,'MRV-G','Gündüz 08-17','08:00','17:00',TRUE) RETURNING *`,
        [firmaId],
      )).rows[0];
    } catch (_) {
      shift = (await client.query(
        `INSERT INTO hr_shifts (company_id, shift_code, shift_name, is_active)
         VALUES ($1,'MRV-G','Gündüz 08-17',TRUE) RETURNING *`,
        [firmaId],
      )).rows[0];
    }
  }
  return { depts, positions, cal, shift };
}

async function upsertUser(client, { userCode, username, first, last, role, firmaId }) {
  let u = (await client.query(
    `SELECT * FROM users WHERE LOWER(user_code)=LOWER($1) OR LOWER(username)=LOWER($2)`,
    [userCode, username],
  )).rows[0];
  const hash = hashParola('Demo123!');
  if (!u) {
    u = (await client.query(
      `INSERT INTO users (user_code, username, first_name, last_name, role, group_code, password_hash, is_active)
       VALUES ($1,$2,$3,$4,$5,'GENEL',$6,TRUE) RETURNING *`,
      [userCode, username, first, last, role || 'Personel', hash],
    )).rows[0];
  } else {
    await client.query(
      `UPDATE users SET password_hash=$2, first_name=$3, last_name=$4, role=COALESCE($5,role), is_active=TRUE
       WHERE id=$1`,
      [u.id, hash, first, last, role || null],
    );
  }
  await client.query(
    `INSERT INTO user_company_permissions (user_id, company_id)
     VALUES ($1,$2) ON CONFLICT (user_id, company_id) DO NOTHING`,
    [u.id, firmaId],
  );
  return u;
}

async function seedWhiteCollar(client, { firmaId, plantId, depts, positions, cal, shift }) {
  const users = {};
  const employees = {};
  let n = 0;
  for (const d of DEPTS) {
    const pair = WHITE_PAIR[d.code] || [];
    for (let i = 0; i < pair.length; i += 1) {
      const p = pair[i];
      const empNo = `BY-${d.code}-${String(i + 1).padStart(2, '0')}`;
      let userId = null;
      if (p.erp) {
        const u = await upsertUser(client, {
          userCode: p.erp,
          username: p.erp,
          first: p.f,
          last: p.l,
          role: p.role,
          firmaId,
        });
        users[p.erp] = u;
        userId = u.id;
      }
      let emp = (await client.query(
        `SELECT * FROM hr_employees WHERE company_id=$1 AND employee_no=$2`,
        [firmaId, empNo],
      )).rows[0];
      if (!emp) {
        emp = (await client.query(
          `INSERT INTO hr_employees (
             company_id, plant_id, employee_no, first_name, last_name, hire_date,
             department_id, position_id, user_id, work_calendar_id, shift_id,
             collar_type, employment_status, contract_type, email, badge_no,
             work_location, education_level, employee_type, is_active, cost_center_code,
             city_code, gender
           ) VALUES (
             $1,$2,$3,$4,$5,'2022-03-01',
             $6,$7,$8,$9,$10,
             'BeyazYaka','Aktif','BelirsizSureli',$11,$12,
             'Gebze Ofis','Lisans','Normal',TRUE,$13,
             '41',$14
           ) RETURNING *`,
          [
            firmaId, plantId, empNo, p.f, p.l,
            depts[d.code].id, positions[d.code].id, userId, cal.id, shift.id,
            `${p.erp || empNo.toLowerCase()}@metalmarvel.demo`,
            `K${1000 + n}`,
            DEPTS.find((x) => x.code === d.code).cost,
            i % 2 === 0 ? 'Erkek' : 'Kadin',
          ],
        )).rows[0];
      } else if (userId) {
        await client.query(`UPDATE hr_employees SET user_id=$2, collar_type='BeyazYaka' WHERE id=$1`, [emp.id, userId]);
      }
      employees[empNo] = emp;
      n += 1;
    }
  }

  // Ek beyaz yaka (~88) — ERP kullanıcısı yok
  const targetExtra = 88;
  for (let i = 0; i < targetExtra; i += 1) {
    const d = DEPTS[i % DEPTS.length];
    const empNo = `BY-X-${String(i + 1).padStart(3, '0')}`;
    const exists = await client.query(
      `SELECT 1 FROM hr_employees WHERE company_id=$1 AND employee_no=$2`,
      [firmaId, empNo],
    );
    if (exists.rows[0]) continue;
    await client.query(
      `INSERT INTO hr_employees (
         company_id, plant_id, employee_no, first_name, last_name, hire_date,
         department_id, position_id, work_calendar_id, shift_id,
         collar_type, employment_status, contract_type, badge_no,
         work_location, education_level, employee_type, is_active, cost_center_code, gender
       ) VALUES (
         $1,$2,$3,$4,$5, (DATE '2026-01-01' - ($6::int * INTERVAL '1 month'))::date,
         $7,$8,$9,$10,
         'BeyazYaka','Aktif','BelirsizSureli',$11,
         'Gebze Ofis',$12,'Normal',TRUE,$13,$14
       )`,
      [
        firmaId, plantId, empNo, pick(FIRST, i), pick(LAST, i + 3),
        6 + (i % 36),
        depts[d.code].id, positions[d.code].id, cal.id, shift.id,
        `K${2000 + i}`,
        ['Lise', 'OnLisans', 'Lisans'][i % 3],
        d.cost,
        i % 2 === 0 ? 'Kadin' : 'Erkek',
      ],
    );
  }
  return { users, employees };
}

async function seedBlueCollar(client, { firmaId, plantId, depts, positions, cal, shift }) {
  const countDokum = 220;
  const countCnc = 200;
  const insertBatch = async (deptCode, posCode, count, prefix, location) => {
    for (let i = 0; i < count; i += 1) {
      const empNo = `${prefix}-${String(i + 1).padStart(4, '0')}`;
      const exists = await client.query(
        `SELECT 1 FROM hr_employees WHERE company_id=$1 AND employee_no=$2`,
        [firmaId, empNo],
      );
      if (exists.rows[0]) continue;
      await client.query(
        `INSERT INTO hr_employees (
           company_id, plant_id, employee_no, first_name, last_name, hire_date,
           department_id, position_id, work_calendar_id, shift_id,
           collar_type, employment_status, contract_type, badge_no,
           work_location, education_level, employee_type, is_active,
           cost_center_code, union_member, gender
         ) VALUES (
           $1,$2,$3,$4,$5,(DATE '2023-01-15' + ($6::int * INTERVAL '1 day'))::date,
           $7,$8,$9,$10,
           'MaviYaka','Aktif','BelirsizSureli',$11,
           $12,$13,'Normal',TRUE,
           $14,$15,$16
         )`,
        [
          firmaId, plantId, empNo, pick(FIRST, i + 7), pick(LAST, i + 11),
          String(i % 600),
          depts[deptCode].id, positions[posCode].id, cal.id, shift.id,
          `M${prefix === 'MY-DKM' ? 3000 + i : 5000 + i}`,
          location,
          ['Ilkogretim', 'Lise', 'Lise'][i % 3],
          DEPTS.find((x) => x.code === deptCode).cost,
          i % 3 === 0,
          i % 2 === 0 ? 'Erkek' : 'Kadin',
        ],
      );
    }
  };
  await insertBatch('UDK', 'UDK-OP', countDokum, 'MY-DKM', 'Dökümhane');
  await insertBatch('UCN', 'UCN-OP', countCnc, 'MY-CNC', 'CNC Atölye');
  return { dokum: countDokum, cnc: countCnc };
}

module.exports = {
  DEPTS,
  ensureCompany,
  ensurePlantWh,
  ensureHrOrg,
  seedWhiteCollar,
  seedBlueCollar,
  upsertUser,
};
