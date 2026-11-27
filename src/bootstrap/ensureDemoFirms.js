/**
 * Sunucu açılışında demo firma profillerini görünür tutar (veri silmez).
 * GIDA vb. yoksa iskelet org ekler; aktif kullanıcılara yetki verir.
 */
const DEMO = [
  { code: 'GIDA', name: 'Anadolu Süt ve Süt Ürünleri A.Ş.', city: 'Konya' },
  { code: 'DOKUM', name: 'Anadolu Döküm Sanayi A.Ş.', city: 'Kayseri' },
  { code: 'ELEK', name: 'Kompanzasyon Röle Elektronik A.Ş.', city: 'İstanbul' },
  { code: 'TEKS', name: 'Denim Tekstil Üretim A.Ş.', city: 'Gaziantep' },
  { code: 'META', name: 'Oto Kapı Metal Sanayi A.Ş.', city: 'Bursa' },
  { code: 'KILIF', name: 'CaseForm Silikon & Plastik Kılıf A.Ş.', city: 'İstanbul' },
  { code: 'MOBIL', name: 'Mobilite Tekerlekli Sandalye A.Ş.', city: 'Ankara' },
];

async function ensureWarehouse(client, plantId, code, name, rol) {
  const ex = await client.query(
    `SELECT id FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
    [plantId, code]
  );
  if (ex.rowCount) return;
  await client.query(
    `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role)
     VALUES ($1,$2,$3,TRUE,$4)`,
    [plantId, code, name, rol]
  );
}

async function ensureDemoFirms(pool) {
  if (process.env.AUTO_HEAL === '0') {
    return { skipped: true, reason: 'AUTO_HEAL=0' };
  }

  const client = await pool.connect();
  const created = [];
  try {
    await client.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS is_profile BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await client.query(
      `UPDATE companies SET is_profile = TRUE
       WHERE UPPER(company_code) = ANY($1::text[])
         AND is_profile IS DISTINCT FROM TRUE`,
      [DEMO.map((d) => d.code)]
    );

    await client.query(
      `UPDATE companies SET is_profile = TRUE
       WHERE company_code ILIKE 'FRM%' AND is_profile IS DISTINCT FROM TRUE`
    );

    for (const d of DEMO) {
      let firma = (await client.query(
        `SELECT id, company_code FROM companies WHERE UPPER(company_code)=$1`,
        [d.code]
      )).rows[0];

      if (!firma) {
        firma = (await client.query(
          `INSERT INTO companies (company_code, company_name, address, email, is_profile)
           VALUES ($1,$2,$3,$4,TRUE) RETURNING id, company_code`,
          [d.code, d.name, `${d.city} OSB`, `info@${d.code.toLowerCase()}.local`]
        )).rows[0];
        created.push(d.code);

        const plant = (await client.query(
          `INSERT INTO plants (company_id, plant_code, plant_name, address)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [firma.id, `${d.code}-MR`, `${d.code} Merkez`, d.city]
        )).rows[0];

        await ensureWarehouse(client, plant.id, `${d.code}-ANA`, 'Ana Depo', 'Normal');
        await ensureWarehouse(client, plant.id, `${d.code}-HMD`, 'Hammadde', 'Hammadde');
        await ensureWarehouse(client, plant.id, `${d.code}-MAM`, 'Mamul', 'Mamul');
      } else {
        await client.query(
          `UPDATE companies SET is_profile = TRUE WHERE id=$1 AND is_profile IS DISTINCT FROM TRUE`,
          [firma.id]
        );
      }
    }

    // Tüm aktif kullanıcılara tüm profil firmaları (yerel kullanım — picker boş kalmasın)
    const firms = (await client.query(
      `SELECT id, company_code FROM companies WHERE COALESCE(is_profile, FALSE) = TRUE`
    )).rows;
    const users = (await client.query(
      `SELECT id, user_code FROM users WHERE COALESCE(is_active, TRUE) = TRUE`
    )).rows;

    let grants = 0;
    for (const u of users) {
      for (const f of firms) {
        const r = await client.query(
          `INSERT INTO user_company_permissions (user_id, company_id)
           SELECT $1,$2 WHERE NOT EXISTS (
             SELECT 1 FROM user_company_permissions WHERE user_id=$1 AND company_id=$2
           )`,
          [u.id, f.id]
        );
        grants += r.rowCount || 0;
      }
    }

    const profiles = await client.query(
      `SELECT company_code FROM companies WHERE is_profile ORDER BY company_code`
    );
    return {
      ok: true,
      created,
      grants,
      profiles: profiles.rows.map((r) => r.company_code),
      count: profiles.rowCount,
    };
  } finally {
    client.release();
  }
}

module.exports = { ensureDemoFirms };
