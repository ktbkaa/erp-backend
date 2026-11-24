/**
 * MARVEL firma işlem verisini temizler (plants/warehouses/companies kalır).
 */
const path = require('path');
const { spawnSync } = require('child_process');
const { FIRMA_KODU, log } = require('./marvel-common');

async function purgeMarvelIfExists() {
  let pool = require('../../db');
  const r = await pool.query(
    `SELECT id, company_code, company_name FROM companies WHERE UPPER(company_code)=$1`,
    [FIRMA_KODU],
  );
  if (!r.rows[0]) {
    log('MARVEL henüz yok — purge atlandı.');
    return null;
  }
  const firma = r.rows[0];
  log(`MARVEL (id=${firma.id}) mevcut — transactional veri temizleniyor...`);
  // Alt process'te purge — ana pool'u kapatma
  const root = path.join(__dirname, '../..');
  const proc = spawnSync('node', ['scripts/purge-firma-veri.js', FIRMA_KODU], {
    cwd: root,
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (proc.status !== 0) {
    log('Purge script uyarı kodu döndü — devam ediliyor.');
  }
  const check = await pool.query(`SELECT id FROM companies WHERE id=$1`, [firma.id]);
  return check.rows[0] ? { ...firma, id: check.rows[0].id } : null;
}

module.exports = { purgeMarvelIfExists };