/**
 * Sistem / firma lisans yönetimi
 * GET/POST /lisanslar
 * GET/POST /lisanslar/firma/liste — firma atamaları (CRUD list)
 * GET /lisanslar/ozet/kullanim — koltuk kullanımı
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

async function getLicense(id) {
  const r = await pool.query(`SELECT * FROM system_licenses WHERE id=$1`, [id]);
  return r.rows[0] || null;
}

async function getCompanyLicense(id) {
  const r = await pool.query(
    `SELECT cl.*, sl.license_code, sl.license_name, sl.edition, sl.max_named_users,
            sl.valid_from, sl.valid_until, sl.modules_json, c.company_code, c.company_name
     FROM company_licenses cl
     JOIN system_licenses sl ON sl.id = cl.system_license_id
     JOIN companies c ON c.id = cl.company_id
     WHERE cl.id=$1`,
    [id],
  );
  if (!r.rows[0]) return null;
  const mods = await pool.query(
    `SELECT * FROM license_module_seats WHERE company_license_id=$1 ORDER BY module_code`,
    [id],
  );
  return { ...r.rows[0], modules: mods.rows };
}

async function assignCompanyLicense(b, companyId) {
  return withTransaction(pool, async (client) => {
    const sl = await client.query(`SELECT * FROM system_licenses WHERE id=$1`, [b.system_license_id]);
    if (!sl.rows[0]) {
      const err = new Error('Sistem lisansı bulunamadı.');
      err.status = 404;
      throw err;
    }
    const ins = await client.query(
      `INSERT INTO company_licenses (company_id, system_license_id, seat_named, seat_used, is_active, notes)
       VALUES ($1,$2,$3,0,COALESCE($4,TRUE),$5)
       ON CONFLICT (company_id, system_license_id) DO UPDATE SET
         seat_named = EXCLUDED.seat_named,
         is_active = EXCLUDED.is_active,
         notes = EXCLUDED.notes
       RETURNING id`,
      [
        companyId, b.system_license_id,
        b.seat_named ?? sl.rows[0].max_named_users,
        b.is_active !== false, b.notes || null,
      ],
    );
    const clId = ins.rows[0].id;
    const mods = Array.isArray(b.modules) ? b.modules
      : (Array.isArray(sl.rows[0].modules_json) ? sl.rows[0].modules_json : []);
    for (const m of mods) {
      const code = typeof m === 'string' ? m : m.module_code || m.code;
      const name = typeof m === 'string' ? m : m.module_name || m.name || code;
      if (!code) continue;
      await client.query(
        `INSERT INTO license_module_seats (company_license_id, module_code, module_name, enabled, max_users)
         VALUES ($1,$2,$3,COALESCE($4,TRUE),$5)
         ON CONFLICT (company_license_id, module_code) DO UPDATE SET
           module_name = EXCLUDED.module_name,
           enabled = EXCLUDED.enabled,
           max_users = EXCLUDED.max_users`,
        [clId, code, name, m.enabled !== false, m.max_users || null],
      );
    }
    return clId;
  });
}

router.get('/', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM system_licenses ORDER BY id DESC`);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.license_code || !b.license_name) {
      return res.status(400).json({ hata: 'license_code ve license_name zorunlu.' });
    }
    const r = await pool.query(
      `INSERT INTO system_licenses (
         license_code, license_name, vendor_name, edition,
         max_named_users, max_concurrent_users, max_companies,
         modules_json, issued_at, valid_from, valid_until,
         is_active, license_key, description
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,COALESCE($9::date,CURRENT_DATE),
                 COALESCE($10::date,CURRENT_DATE),$11,COALESCE($12,TRUE),$13,$14)
       RETURNING *`,
      [
        b.license_code, b.license_name, b.vendor_name || 'KTB ERP', b.edition || 'Enterprise',
        b.max_named_users ?? 50, b.max_concurrent_users || null, b.max_companies ?? 1,
        JSON.stringify(b.modules_json || b.modules || []),
        b.issued_at || null, b.valid_from || null, b.valid_until || null,
        b.is_active !== false, b.license_key || null, b.description || null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 400).json({ hata: err.message });
  }
});

/** Firma lisans — spesifik path'ler :id'den önce */
router.get('/firma/liste', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    let sql = `
      SELECT cl.*, sl.license_code, sl.license_name, sl.edition,
             sl.max_named_users, sl.valid_until, c.company_code, c.company_name
      FROM company_licenses cl
      JOIN system_licenses sl ON sl.id = cl.system_license_id
      JOIN companies c ON c.id = cl.company_id`;
    if (firmaId) {
      params.push(firmaId);
      sql += ` WHERE cl.company_id = $${params.length}`;
    }
    sql += ' ORDER BY cl.id DESC';
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/firma/liste', async (req, res) => {
  try {
    const b = req.body || {};
    const companyId = companyIdFromReq(req) || b.company_id;
    if (!companyId || !b.system_license_id) {
      return res.status(400).json({ hata: 'company_id ve system_license_id zorunlu.' });
    }
    const id = await assignCompanyLicense(b, companyId);
    res.status(201).json(await getCompanyLicense(id));
  } catch (err) {
    res.status(err.status || 400).json({ hata: err.message });
  }
});

router.post('/firma', async (req, res) => {
  try {
    const b = req.body || {};
    const companyId = companyIdFromReq(req) || b.company_id;
    if (!companyId || !b.system_license_id) {
      return res.status(400).json({ hata: 'company_id ve system_license_id zorunlu.' });
    }
    const id = await assignCompanyLicense(b, companyId);
    res.status(201).json(await getCompanyLicense(id));
  } catch (err) {
    res.status(err.status || 400).json({ hata: err.message });
  }
});

router.get('/firma/:id', async (req, res) => {
  try {
    const row = await getCompanyLicense(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Firma lisansı bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/ozet/kullanim', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req) || req.query.company_id;
    if (!firmaId) return res.status(400).json({ hata: 'company_id gerekli.' });
    const used = await pool.query(
      `SELECT COUNT(*)::int AS n FROM user_company_permissions WHERE company_id=$1`,
      [firmaId],
    );
    const empUsers = await pool.query(
      `SELECT COUNT(*)::int AS n FROM hr_employees
       WHERE company_id=$1 AND user_id IS NOT NULL AND COALESCE(is_active,TRUE)`,
      [firmaId],
    );
    const cl = await pool.query(
      `SELECT cl.*, sl.license_code, sl.license_name, sl.edition, sl.max_named_users,
              sl.valid_from, sl.valid_until, sl.is_active AS license_active
       FROM company_licenses cl
       JOIN system_licenses sl ON sl.id = cl.system_license_id
       WHERE cl.company_id=$1 AND cl.is_active
       ORDER BY cl.id DESC LIMIT 1`,
      [firmaId],
    );
    const row = cl.rows[0] || null;
    if (row) {
      await pool.query(`UPDATE company_licenses SET seat_used=$2 WHERE id=$1`, [row.id, used.rows[0].n]);
    }
    const mods = row
      ? (await pool.query(
        `SELECT * FROM license_module_seats WHERE company_license_id=$1 ORDER BY module_code`,
        [row.id],
      )).rows
      : [];
    res.json({
      company_id: Number(firmaId),
      named_users_assigned: used.rows[0].n,
      employees_with_login: empUsers.rows[0].n,
      license: row,
      modules: mods,
      seat_ok: row
        ? used.rows[0].n <= Number(row.seat_named || row.max_named_users || 0)
        : false,
      valid: row
        ? (!row.valid_until || new Date(row.valid_until) >= new Date()) && row.license_active
        : false,
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(404).json({ hata: 'Lisans bulunamadı.' });
    }
    const row = await getLicense(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Lisans bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE system_licenses SET
         license_name = COALESCE($2, license_name),
         vendor_name = COALESCE($3, vendor_name),
         edition = COALESCE($4, edition),
         max_named_users = COALESCE($5, max_named_users),
         max_concurrent_users = COALESCE($6, max_concurrent_users),
         max_companies = COALESCE($7, max_companies),
         modules_json = COALESCE($8::jsonb, modules_json),
         valid_from = COALESCE($9::date, valid_from),
         valid_until = COALESCE($10::date, valid_until),
         is_active = COALESCE($11, is_active),
         license_key = COALESCE($12, license_key),
         description = COALESCE($13, description),
         updated_at = CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, b.license_name, b.vendor_name, b.edition,
        b.max_named_users, b.max_concurrent_users, b.max_companies,
        b.modules_json != null || b.modules != null
          ? JSON.stringify(b.modules_json || b.modules)
          : null,
        b.valid_from, b.valid_until,
        b.is_active, b.license_key, b.description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Lisans bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

module.exports = router;
