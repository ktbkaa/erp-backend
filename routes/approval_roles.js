const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function rolGetir(id) {
  const r = await pool.query(
    `
    SELECT r.*,
           CONCAT(COALESCE(k.first_name,''), ' ', COALESCE(k.last_name,'')) AS kisi_adi,
           k.user_code, k.username,
           f.company_code, f.company_name,
           iy.plant_code, iy.plant_name
    FROM approval_roles r
    LEFT JOIN users k ON k.id = r.kisi_id
    LEFT JOIN companies f ON f.id = r.company_id
    LEFT JOIN plants iy ON iy.id = r.plant_id
    WHERE r.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (req.query.is_active === 'true') where.push('r.is_active = TRUE');
    if (firmaId) {
      params.push(firmaId);
      where.push(`(r.company_id IS NULL OR r.company_id = $${params.length})`);
    }
    if (req.query.role_name) {
      params.push(req.query.role_name);
      where.push(`r.role_name ILIKE $${params.length}`);
    }
    const sql = `
      SELECT r.id FROM approval_roles r
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.role_name, r.id
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await rolGetir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await rolGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Rol kaydı bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let { role_code, role_name, kisi_id, company_id, plant_id, description, is_active } = req.body;
    if (!role_name) return res.status(400).json({ hata: 'Onay role adı zorunlu.' });
    if (!kisi_id) return res.status(400).json({ hata: 'Kişi seçimi zorunlu.' });
    if (!role_code) {
      try { role_code = await sonrakiKod(pool, 'ONAY_ROL'); }
      catch (_) { role_code = `NL${Date.now().toString().slice(-5)}`; }
    }
    const ins = await pool.query(
      `
      INSERT INTO approval_roles (role_code, role_name, kisi_id, company_id, plant_id, description, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE))
      RETURNING id
      `,
      [role_code, role_name, kisi_id, company_id || null, plant_id || null, description || null, is_active],
    );
    res.status(201).json(await rolGetir(ins.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { role_name, kisi_id, company_id, plant_id, description, is_active } = req.body;
    const r = await pool.query(
      `
      UPDATE approval_roles SET
        role_name = COALESCE($2, role_name),
        kisi_id = COALESCE($3, kisi_id),
        company_id = COALESCE($4, company_id),
        plant_id = COALESCE($5, plant_id),
        description = COALESCE($6, description),
        is_active = COALESCE($7, is_active)
      WHERE id=$1 RETURNING id
      `,
      [req.params.id, role_name || null, kisi_id || null, company_id, plant_id, description, is_active],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rol kaydı bulunamadı.' });
    res.json(await rolGetir(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_roles WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rol kaydı bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
