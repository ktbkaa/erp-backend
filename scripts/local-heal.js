/**
 * Yerel Windows/PC: migrate sonrası “firma/veri kayboldu” hissini giderir.
 * ASLA TRUNCATE / DELETE / cleanup yapmaz — yalnızca onarır ve eksikleri ekler.
 *
 *   npm run local:heal
 *   npm run local:heal -- --seed-ornek
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');
const pool = require('../db');

const DEMO_CODES = ['GIDA', 'DOKUM', 'ELEK', 'TEKS', 'META', 'KILIF', 'MOBIL'];
const forceSeed = process.argv.includes('--seed-ornek');

function runNpm(script) {
  const r = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', script],
    { cwd: path.join(__dirname, '..'), stdio: 'inherit', env: process.env }
  );
  if (r.status !== 0) throw new Error(`npm run ${script} başarısız (exit ${r.status})`);
}

async function columnExists(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column]
  );
  return r.rowCount > 0;
}

async function main() {
  const client = await pool.connect();
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      try { client.release(); } catch (_) { /* */ }
    }
  };

  try {
    console.log('— local-heal: şema kontrolü —');

    const hasParamEn = await columnExists(client, 'system_parameters', 'parameter_code');
    const hasParamTr = await columnExists(client, 'system_parameters', 'parametre_code');
    const hasCompanyCode = await columnExists(client, 'companies', 'company_code');

    if (!hasCompanyCode) {
      throw new Error('companies.company_code yok — önce: npm run migrate');
    }
    if (!hasParamEn && hasParamTr) {
      throw new Error('İngilizce kolon rename henüz uygulanmamış — önce: npm run migrate');
    }
    if (!hasParamEn) {
      throw new Error('system_parameters.parameter_code yok — önce: npm run migrate');
    }
    console.log('OK: parameter_code + company_code mevcut');

    await client.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS is_profile BOOLEAN NOT NULL DEFAULT FALSE
    `);

    const before = await client.query(
      `SELECT id, company_code, company_name, is_profile FROM companies ORDER BY id`
    );
    console.log(`Firmalar (önce): ${before.rowCount}`);
    for (const r of before.rows) {
      console.log(`  #${r.id} ${r.company_code}  profile=${r.is_profile}  ${r.company_name}`);
    }

    const prof = await client.query(
      `UPDATE companies
       SET is_profile = TRUE
       WHERE UPPER(company_code) = ANY($1::text[])
         AND is_profile IS DISTINCT FROM TRUE
       RETURNING company_code`,
      [DEMO_CODES]
    );
    if (prof.rowCount) {
      console.log('Profil açıldı:', prof.rows.map((r) => r.company_code).join(', '));
    }

    const codes = new Set(before.rows.map((r) => String(r.company_code || '').toUpperCase()));
    const needGida = before.rowCount === 0 || !codes.has('GIDA');
    const needDokum = !codes.has('DOKUM');
    release();

    if (needGida) {
      console.log('GIDA org iskeleti…');
      runNpm('qa:gida-org');
    }
    if (needDokum) {
      console.log('DOKUM org iskeleti…');
      runNpm('qa:dokum-org');
    }

    const c2 = await pool.connect();
    try {
      await c2.query(
        `UPDATE companies SET is_profile = TRUE
         WHERE UPPER(company_code) = ANY($1::text[])`,
        [DEMO_CODES]
      );
    } finally {
      c2.release();
    }

    runNpm('ensure:firma-yetki');

    const og = await pool.query(`SELECT count(*)::int AS n FROM items WHERE item_code LIKE 'OG-%'`);
    const needSeed = forceSeed || before.rowCount === 0 || Number(og.rows[0]?.n || 0) < 5;
    if (needSeed) {
      console.log('Örnek veri eksik — qa:ornek-gida (idempotent, silmez)…');
      runNpm('qa:ornek-gida');
    } else {
      console.log(`Örnek veri mevcut (OG stok: ${og.rows[0].n})`);
    }

    const fin = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM companies) AS companies,
         (SELECT count(*)::int FROM companies WHERE is_profile) AS profiles,
         (SELECT count(*)::int FROM items) AS items,
         (SELECT count(*)::int FROM partners) AS partners`
    );
    const list = await pool.query(
      `SELECT company_code, company_name, is_profile FROM companies ORDER BY company_code`
    );
    console.log('\n— local-heal özet —');
    console.log(JSON.stringify(fin.rows[0], null, 2));
    for (const r of list.rows) {
      console.log(`  ${r.is_profile ? '●' : '○'} ${r.company_code}  ${r.company_name}`);
    }
    console.log('\nSunucuyu yeniden başlatın (npm start), tarayıcıda Ctrl+F5.');
  } catch (err) {
    release();
    console.error('local-heal hata:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
