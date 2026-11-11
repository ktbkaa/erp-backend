/**
 * DOKUM (Anadolu Döküm Sanayi) org — EN şema.
 */
require('dotenv').config();
const pool = require('../../db');
const { withTransaction } = require('../../src/utils/withTransaction');

async function main() {
  const result = await withTransaction(pool, async (client) => {
    let firma = (await client.query(`SELECT * FROM companies WHERE company_code='DOKUM'`)).rows[0];
    if (!firma) {
      firma = (await client.query(
        `INSERT INTO companies (company_code, company_name, tax_id, address, email)
         VALUES ('DOKUM','Anadolu Döküm Sanayi A.Ş.','9876543210','Kayseri Organize Sanayi','info@dokum-test.local')
         RETURNING *`
      )).rows[0];
    }
    let plant = (await client.query(
      `SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`, [firma.id]
    )).rows[0];
    if (!plant) {
      plant = (await client.query(
        `INSERT INTO plants (company_id, plant_code, plant_name, address)
         VALUES ($1,'DOKUM-MR','DOKUM Merkez Dökümhane','Kayseri') RETURNING *`,
        [firma.id]
      )).rows[0];
    }
    const whDefs = [
      ['DOKUM-ANA', 'Ana Depo', 'Normal'],
      ['DOKUM-HMD', 'Hammadde', 'Hammadde'],
      ['DOKUM-MAM', 'Mamul', 'Mamul'],
      ['DOKUM-KK', 'Kalite / Karantina', 'GKK'],
      ['DOKUM-SVK', 'Sevk', 'Normal'],
      ['DOKUM-GIR', 'Giriş', 'Giris'],
      ['DOKUM-CKK', 'Çıkış KK', 'CKK'],
      ['DOKUM-YM', 'Yarı Mamul', 'YariMamul'],
    ];
    const warehouses = [];
    for (const [code, name, rol] of whDefs) {
      let w = (await client.query(
        `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`, [plant.id, code]
      )).rows[0];
      if (!w) {
        w = (await client.query(
          `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role)
           VALUES ($1,$2,$3,TRUE,$4) RETURNING *`,
          [plant.id, code, name, rol]
        )).rows[0];
      }
      warehouses.push(w);
    }
    let wc = (await client.query(
      `SELECT * FROM work_centers WHERE plant_id=$1 ORDER BY id LIMIT 1`, [plant.id]
    )).rows[0];
    if (!wc) {
      wc = (await client.query(
        `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
         VALUES ($1,'DOKUM-IM1','DOKUM Eritme & Kalıp Hattı',TRUE) RETURNING *`,
        [plant.id]
      )).rows[0];
    }
    const grants = [];
    for (const code of ['ADMIN', 'owner']) {
      const u = (await client.query(`SELECT id FROM users WHERE user_code=$1`, [code])).rows[0];
      if (!u) continue;
      await client.query(
        `INSERT INTO user_company_permissions (user_id, company_id)
         SELECT $1,$2 WHERE NOT EXISTS (
           SELECT 1 FROM user_company_permissions WHERE user_id=$1 AND company_id=$2
         )`,
        [u.id, firma.id]
      );
      grants.push(code);
    }
    return {
      firma: { id: firma.id, code: firma.company_code, name: firma.company_name },
      plant: { id: plant.id, code: plant.plant_code },
      warehouses: warehouses.length,
      workCenter: wc.center_code,
      grants,
    };
  });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
