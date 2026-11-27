#!/usr/bin/env node
/**
 * İzole test veritabanı için asgari fixture (CI / test:isolated).
 *
 *   node scripts/ci/seed-test-db.js
 *
 * Migration'dan sonra çalışır; idempotenttir. Testlerin beklediği:
 * - demo firma profilleri (ensureDemoFirms) + GIDA örnek verisi (ensureDemoData)
 * - 'owner' ve 'admin' yönetici kullanıcıları (X-Kullanici-Kodu soft auth)
 * - ilk firmada en az bir müşteri cari + stok kartı
 *
 * Canlı DB'ye yanlışlıkla yazmamak için yalnız adı test/ci içeren
 * veritabanlarında çalışır (ALLOW_TEST_SEED=1 ile aşılabilir).
 */
require('dotenv').config();
const { describeTarget } = require('../lib/dbConn');

function assertTestDatabase() {
  const { database } = describeTarget();
  if (process.env.ALLOW_TEST_SEED === '1') return database;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production iken test seed çalıştırılamaz.');
  }
  if (!/(^|[_-])(test|ci)\d*([_-]|$)/i.test(database || '')) {
    throw new Error(
      `"${database}" test veritabanı gibi görünmüyor (adında test/ci yok). `
      + 'Bilinçli ise ALLOW_TEST_SEED=1 verin.'
    );
  }
  return database;
}

async function ensureUser(client, { code, first, last, role, group }) {
  const found = await client.query('SELECT id FROM users WHERE user_code = $1', [code]);
  if (found.rows[0]) {
    await client.query(
      `UPDATE users SET role = $2, group_code = COALESCE(group_code, $3), is_active = TRUE WHERE id = $1`,
      [found.rows[0].id, role, group]
    );
    return found.rows[0].id;
  }
  const ins = await client.query(
    `INSERT INTO users (first_name, last_name, role, user_code, username, group_code, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
    [first, last, role, code, code, group]
  );
  return ins.rows[0].id;
}

async function main() {
  const database = assertTestDatabase();
  const pool = require('../../db');
  try {
    const { ensureDemoFirms } = require('../../src/bootstrap/ensureDemoFirms');
    const { ensureDemoData } = require('../../src/bootstrap/ensureDemoData');
    const firms = await ensureDemoFirms(pool);
    const data = await ensureDemoData(pool);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureUser(client, { code: 'owner', first: 'Test', last: 'Owner', role: 'Yonetici', group: 'ADMIN' });
      await ensureUser(client, { code: 'admin', first: 'Test', last: 'Admin', role: 'Yonetici', group: 'ADMIN' });

      const company = (await client.query('SELECT id, company_code FROM companies ORDER BY id LIMIT 1')).rows[0];
      if (!company) throw new Error('companies boş — migration/ensureDemoFirms çalışmadı.');

      await client.query(
        `INSERT INTO partners (partner_code, partner_name, partner_type, company_id)
         SELECT 'CI-M001', 'CI Test Müşteri', 'Musteri', $1
         WHERE NOT EXISTS (
           SELECT 1 FROM partners WHERE company_id = $1 AND partner_type IN ('Musteri','HerIkisi')
         )`,
        [company.id]
      );
      await client.query(
        `INSERT INTO items (item_code, item_name, company_id)
         SELECT 'CI-S001', 'CI Test Stok', $1
         WHERE NOT EXISTS (SELECT 1 FROM items WHERE company_id = $1 OR company_id IS NULL)`,
        [company.id]
      );

      await client.query(
        `INSERT INTO user_company_permissions (user_id, company_id)
         SELECT u.id, c.id FROM users u CROSS JOIN companies c
         WHERE u.user_code IN ('owner','admin')
         ON CONFLICT DO NOTHING`
      );

      await client.query('COMMIT');
      console.log(JSON.stringify({
        ok: true,
        database,
        firms: firms?.count ?? null,
        demo_data: data?.seeded ? 'seeded' : (data?.reason || 'ok'),
        first_company: company.company_code,
      }));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`seed-test-db: ${err.message}`);
  process.exit(1);
});
