/**
 * Çok sektörlü firma org seed — EN şema (companies/plants/warehouses/…).
 * Eski TR tablo adları (firmalar/depolar) kaldırıldı.
 *
 *   node scripts/demo-4-firma.js
 *   npm run demo:4-firma
 *
 * Tam iş döngüsü için: demo:gida-dongu / demo:dokum-dongu / demo:elek-dongu
 */
require('dotenv').config();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

const FIRMS = [
  {
    kod: 'ELEK',
    adi: 'Kompanzasyon Röle Elektronik A.Ş.',
    sektor: 'Elektrik/Elektronik',
    sehir: 'İstanbul',
  },
  {
    kod: 'TEKS',
    adi: 'Denim Tekstil Üretim A.Ş.',
    sektor: 'Tekstil',
    sehir: 'Gaziantep',
  },
  {
    kod: 'META',
    adi: 'Oto Kapı Metal Sanayi A.Ş.',
    sektor: 'Metal / Otomotiv',
    sehir: 'Bursa',
  },
  {
    kod: 'GIDA',
    adi: 'Anadolu Süt ve Süt Ürünleri A.Ş.',
    sektor: 'Gıda',
    sehir: 'Konya',
  },
  {
    kod: 'DOKUM',
    adi: 'Anadolu Döküm Sanayi A.Ş.',
    sektor: 'Döküm',
    sehir: 'Kayseri',
  },
];

const WH_DEFS = [
  ['ANA', 'Ana Depo', 'Normal'],
  ['HMD', 'Hammadde', 'Hammadde'],
  ['MAM', 'Mamul', 'Mamul'],
  ['KK', 'Kalite / Karantina', 'GKK'],
  ['SVK', 'Sevk', 'Normal'],
  ['GIR', 'Giriş', 'Giris'],
  ['CKK', 'Çıkış KK', 'CKK'],
  ['YM', 'Yarı Mamul', 'YariMamul'],
];

async function ensureUom(client, code, name) {
  await client.query(
    `INSERT INTO units_of_measure (uom_code, uom_name, is_active)
     VALUES ($1,$2,TRUE)
     ON CONFLICT (uom_code) DO NOTHING`,
    [code, name]
  );
}

async function ensureFirm(client, def) {
  let firma = (await client.query(
    `SELECT * FROM companies WHERE company_code=$1`,
    [def.kod]
  )).rows[0];
  if (!firma) {
    firma = (await client.query(
      `INSERT INTO companies (company_code, company_name, tax_id, address, email)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        def.kod,
        def.adi,
        String(1000000000 + Math.floor(Math.random() * 899999999)),
        `${def.sehir} Organize Sanayi`,
        `info@${def.kod.toLowerCase()}.demo.local`,
      ]
    )).rows[0];
  }

  let plant = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`,
    [firma.id]
  )).rows[0];
  if (!plant) {
    plant = (await client.query(
      `INSERT INTO plants (company_id, plant_code, plant_name, address)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [firma.id, `${def.kod}-MR`, `${def.kod} Merkez Fabrika`, def.sehir]
    )).rows[0];
  }

  const warehouses = {};
  for (const [suf, name, rol] of WH_DEFS) {
    const code = `${def.kod}-${suf}`;
    let w = (await client.query(
      `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
      [plant.id, code]
    )).rows[0];
    if (!w) {
      w = (await client.query(
        `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_rolu)
         VALUES ($1,$2,$3,TRUE,$4) RETURNING *`,
        [plant.id, code, name, rol]
      )).rows[0];
    }
    warehouses[suf] = w;
  }

  let wc = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 ORDER BY id LIMIT 1`,
    [plant.id]
  )).rows[0];
  if (!wc) {
      wc = (await client.query(
        `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
         VALUES ($1,$2,$3,TRUE) RETURNING *`,
        [plant.id, `${def.kod}-IM1`, `${def.kod} Ana Hat`]
      )).rows[0];
  }

  const grants = [];
  for (const code of ['ADMIN', 'owner']) {
    const u = (await client.query(`SELECT id FROM users WHERE user_code=$1`, [code])).rows[0];
    if (!u) continue;
    await client.query(
      `INSERT INTO user_company_permissions (kisi_id, company_id)
       SELECT $1,$2 WHERE NOT EXISTS (
         SELECT 1 FROM user_company_permissions WHERE kisi_id=$1 AND company_id=$2
       )`,
      [u.id, firma.id]
    );
    grants.push(code);
  }

  return {
    firma: { id: firma.id, code: firma.company_code, name: firma.company_name, sektor: def.sektor },
    plant: { id: plant.id, code: plant.plant_code },
    warehouses: Object.keys(warehouses).length,
    workCenter: wc.center_code,
    grants,
  };
}

async function main() {
  const summary = await withTransaction(pool, async (client) => {
    for (const u of ['AD', 'KG', 'MT', 'LT', 'TON']) {
      await ensureUom(client, u, u);
    }
    const out = [];
    for (const def of FIRMS) {
      console.log('Seed org:', def.kod, def.adi);
      out.push(await ensureFirm(client, def));
    }
    return out;
  });
  console.log(JSON.stringify({ ok: true, firmalar: summary }, null, 2));
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
