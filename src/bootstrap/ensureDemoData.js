/**
 * GIDA örnek master veri yoksa SQL seed çalıştırır (silmez).
 * HTTP / rich-ornek’e bağımlı değil — migrate + boot + heal için güvenli.
 */
const fs = require('fs');
const path = require('path');

const SEED = path.join(__dirname, '..', '..', 'db', 'seeds', 'gida_ornek_master.sql');

async function demoDataMissing(pool) {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`
  );
  return Number(r.rows[0]?.n || 0) < 5;
}

async function ensureDemoData(pool) {
  if (process.env.AUTO_HEAL === '0' || process.env.AUTO_SEED === '0') {
    return { skipped: true, reason: 'disabled' };
  }
  const missing = await demoDataMissing(pool);
  if (!missing) {
    const r = await pool.query(`SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`);
    return { skipped: true, reason: 'has-data', n: r.rows[0].n };
  }
  if (!fs.existsSync(SEED)) {
    throw new Error(`Seed dosyası yok: ${SEED}`);
  }
  console.log('[heal] GIDA örnek master veri eksik — SQL seed…');
  const sql = fs.readFileSync(SEED, 'utf8');
  await pool.query(sql);
  const after = await pool.query(`SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`);
  return { seeded: true, n: after.rows[0].n };
}

module.exports = { ensureDemoData, demoDataMissing };
