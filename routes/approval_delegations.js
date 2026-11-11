const express = require('express');
const router = express.Router();
const pool = require('../db');
const { nextSequenceCode } = require('../src/utils/kodUretici');

async function fetchById(id) {
  const r = await pool.query(
    `
    SELECT d.*,
           CONCAT(COALESCE(v.first_name,''), ' ', COALESCE(v.last_name,'')) AS veren_adi,
           v.user_code AS veren_kodu,
           CONCAT(COALESCE(a.first_name,''), ' ', COALESCE(a.last_name,'')) AS alan_adi,
           a.user_code AS alan_kodu,
           role.role_code, role.role_name
    FROM approval_delegations d
    JOIN users v ON v.id = d.delegator_user_id
    JOIN users a ON a.id = d.delegate_user_id
    LEFT JOIN approval_roles role ON role.id = d.role_id
    WHERE d.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    if (req.query.is_active === 'true') where.push('d.is_active = TRUE');
    if (req.query.delegate_user_id) {
      params.push(req.query.delegate_user_id);
      where.push(`d.delegate_user_id = $${params.length}`);
    }
    const sql = `
      SELECT d.id FROM approval_delegations d
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY d.id DESC
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await fetchById(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await fetchById(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Devir bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      delegation_code, delegator_user_id, delegate_user_id, role_id,
      start_date, end_date, is_active, description,
    } = req.body;
    if (!delegator_user_id || !delegate_user_id) {
      return res.status(400).json({ hata: 'delegator_user_id ve delegate_user_id zorunlu.' });
    }
    if (Number(delegator_user_id) === Number(delegate_user_id)) {
      return res.status(400).json({ hata: 'Veren ve alan aynı kişi olamaz.' });
    }
    if (!delegation_code) {
      try { delegation_code = await nextSequenceCode(pool, 'ONAY_DEVIR'); }
      catch (_) { delegation_code = `OD${Date.now().toString().slice(-5)}`; }
    }
    const ins = await pool.query(
      `
      INSERT INTO approval_delegations (
        delegation_code, delegator_user_id, delegate_user_id, role_id,
        start_date, end_date, is_active, description
      ) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,COALESCE($7,TRUE),$8)
      RETURNING id
      `,
      [
        delegation_code, delegator_user_id, delegate_user_id, role_id || null,
        start_date || null, end_date || null, is_active, description || null,
      ],
    );
    res.status(201).json(await fetchById(ins.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      delegator_user_id, delegate_user_id, role_id,
      start_date, end_date, is_active, description,
    } = req.body;
    const r = await pool.query(
      `
      UPDATE approval_delegations SET
        delegator_user_id = COALESCE($2, delegator_user_id),
        delegate_user_id = COALESCE($3, delegate_user_id),
        role_id = COALESCE($4, role_id),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        is_active = COALESCE($7, is_active),
        description = COALESCE($8, description)
      WHERE id=$1 RETURNING id
      `,
      [
        req.params.id, delegator_user_id || null, delegate_user_id || null, role_id,
        start_date || null, end_date, is_active, description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Devir bulunamadı.' });
    res.json(await fetchById(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_delegations WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Devir bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
