/** Yerel Postgres bağlantı kontrolü: node scripts/check-local-db.js */
require('dotenv').config();
const pool = require('../db');
(async () => {
  try {
    const r = await pool.query(
      `SELECT current_database() AS db, current_user AS usr,
              (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
              (SELECT to_regclass('public.items') IS NOT NULL) AS has_items,
              (SELECT to_regclass('public.companies') IS NOT NULL) AS has_companies`
    );
    console.log(JSON.stringify({ ok: true, ...r.rows[0] }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({
      ok: false,
      hata: err.message,
      ipucu: 'DB_HOST/DB_PORT/DB_USER/DB_PASSWORD (.env) ve Postgres servisinin çalıştığını kontrol edin. Detay: docs/ops/YEREL_POSTGRES_PGADMIN.md',
    }, null, 2));
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
})();
