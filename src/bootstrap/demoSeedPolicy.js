/**
 * Demo firma / örnek veri politikası.
 *
 * Demo firmalar (GIDA, DOKUM, …), OG-* örnek stoklar ve "tüm kullanıcılara tüm
 * demo firmalar" yetkisi yalnızca SEED_DEMO_DATA=1 iken yazılır. Bayrak yoksa
 * (canlı varsayılanı) ne açılış heal’i ne de demo seed migration’ları çalışır.
 */

/** Demo seed içeren eski migration’lar — bayrak yoksa migrate atlar (kaydetmez). */
const DEMO_SEED_MIGRATIONS = Object.freeze([
  '082_ensure_demo_company_profiles.sql',
  '083_gida_ornek_master_seed.sql',
]);

function isDemoSeedEnabled(env = process.env) {
  if (String(env.AUTO_HEAL || '').trim() === '0') return false;
  return String(env.SEED_DEMO_DATA || '').trim() === '1';
}

function isDemoSeedMigration(filename) {
  return DEMO_SEED_MIGRATIONS.includes(String(filename || ''));
}

module.exports = {
  DEMO_SEED_MIGRATIONS,
  isDemoSeedEnabled,
  isDemoSeedMigration,
};
