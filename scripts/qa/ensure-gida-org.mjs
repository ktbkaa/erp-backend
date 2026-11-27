/**
 * GIDA (Anadolu Süt) org yoksa oluştur — demo:4-firma TR tablo isimleriyle kırık.
 */
require('dotenv').config();
const pool = require('../../db');
const { withTransaction } = require('../../src/utils/withTransaction');

async function main() {
  const result = await withTransaction(pool, async (client) => {
    let firma = (await client.query(`SELECT * FROM companies WHERE company_code='GIDA'`)).rows[0];
    if (!firma) {
      firma = (await client.query(
        `INSERT INTO companies (company_code, company_name, tax_id, address, email, is_active)
         VALUES ('GIDA','Anadolu Süt ve Süt Ürünleri A.Ş.','1234567890','Konya Organize Sanayi','info@gida-test.local',TRUE)
         RETURNING *`
      )).rows[0];
    }
    let plant = (await client.query(
      `SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`, [firma.id]
    )).rows[0];
    if (!plant) {
      plant = (await client.query(
        `INSERT INTO plants (company_id, plant_code, plant_name, address, is_active)
         VALUES ($1,'GIDA-MR','GIDA Merkez Fabrika','Konya',TRUE) RETURNING *`,
        [firma.id]
      )).rows[0];
    }
    const whDefs = [
      ['GIDA-ANA', 'Ana Depo'],
      ['GIDA-HMD', 'Hammadde'],
      ['GIDA-MAM', 'Mamul'],
      ['GIDA-KK', 'Kalite / Karantina'],
      ['GIDA-SVK', 'Sevk'],
      ['GIDA-GIR', 'Giriş'],
      ['GIDA-CKK', 'Çıkış KK'],
      ['GIDA-YM', 'Yarı Mamul'],
    ];
    const warehouses = [];
    for (const [code, name] of whDefs) {
      let w = (await client.query(
        `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`, [plant.id, code]
      )).rows[0];
      if (!w) {
        w = (await client.query(
          `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, company_id)
           VALUES ($1,$2,$3,TRUE,$4) RETURNING *`,
          [plant.id, code, name, firma.id]
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
         VALUES ($1,'GIDA-IM1','GIDA Pastörizasyon Hattı',TRUE) RETURNING *`,
        [plant.id]
      )).rows[0];
    }
    return { firma, plant, warehouses: warehouses.length, workCenter: wc.center_code };
  });
  console.log(JSON.stringify({ ok: true, ...result, firma: { id: result.firma.id, code: result.firma.company_code, name: result.firma.company_name } }, null, 2));
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
