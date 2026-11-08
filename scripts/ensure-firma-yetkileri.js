/**
 * Tüm is_profile firmalarını aktif kullanıcılara (admin/yonetici/owner) bağlar.
 * Firma profil picker'da ELEK/TEKS vb. görünmesi için gerekli.
 *
 *   node scripts/ensure-firma-yetkileri.js
 *   node scripts/ensure-firma-yetkileri.js ELEK TEKS
 */
require('dotenv').config();
const pool = require('../db');

const onlyCodes = process.argv.slice(2).map((c) => String(c).trim().toUpperCase()).filter(Boolean);

async function main() {
  const client = await pool.connect();
  try {
    const firms = onlyCodes.length
      ? (await client.query(
        `SELECT id, company_code, company_name FROM companies
         WHERE UPPER(company_code) = ANY($1::text[])
         ORDER BY company_code`,
        [onlyCodes]
      )).rows
      : (await client.query(
        `SELECT id, company_code, company_name FROM companies
         WHERE COALESCE(is_profile, TRUE) = TRUE
         ORDER BY company_code`
      )).rows;

    const users = (await client.query(
      `SELECT id, user_code, role, group_code FROM users
       WHERE COALESCE(is_active, TRUE) = TRUE
         AND (
           LOWER(COALESCE(role,'')) IN ('admin','yonetici','administrator')
           OR UPPER(COALESCE(group_code,'')) = 'ADMIN'
           OR LOWER(COALESCE(user_code,'')) IN ('owner','admin')
         )
       ORDER BY id`
    )).rows;

    if (!firms.length) {
      console.log('Firma yok.');
      return;
    }
    if (!users.length) {
      console.log('Uygun kullanıcı yok.');
      return;
    }

    let n = 0;
    for (const u of users) {
      for (const f of firms) {
        const r = await client.query(
          `INSERT INTO user_company_permissions (kisi_id, company_id)
           VALUES ($1,$2)
           ON CONFLICT (kisi_id, company_id) DO NOTHING`,
          [u.id, f.id]
        );
        n += r.rowCount || 0;
      }
    }

    const check = await client.query(
      `SELECT u.user_code, c.company_code
       FROM user_company_permissions p
       JOIN users u ON u.id = p.kisi_id
       JOIN companies c ON c.id = p.company_id
       WHERE c.company_code = ANY($1::text[])
       ORDER BY u.user_code, c.company_code`,
      [firms.map((f) => f.company_code)]
    );

    console.log(JSON.stringify({
      firms: firms.map((f) => f.company_code),
      users: users.map((u) => u.user_code),
      inserted: n,
      yetkiler: check.rows,
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
