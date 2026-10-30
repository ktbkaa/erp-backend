const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
// ---- Departmanlar ----
router.get('/departmanlar', async (req, res) => {
  try {
    const params = [];
    let where = '';
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where = `WHERE d.company_id=$${params.length}`;
    }
    const r = await pool.query(
      `SELECT d.*, p.department_code AS parent_code, p.department_name AS parent_name
       FROM hr_departments d
       LEFT JOIN hr_departments p ON p.id = d.parent_id
       ${where}
       ORDER BY d.department_code`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/departmanlar/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM hr_departments WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Departman bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/departmanlar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    const kod = typeof b.department_code === 'string' ? b.department_code.trim() : b.department_code;
    if (!firmaId || !b.department_name) {
      return res.status(400).json({ hata: 'company_id ve department_name zorunlu.' });
    }
    if (!kod) {
      return res.status(400).json({ hata: 'department_code zorunlu.' });
    }
    if (b.parent_id && Number(b.parent_id) === Number(b.id)) {
      return res.status(400).json({ hata: 'Departman kendi üstü olamaz.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `INSERT INTO hr_departments (
           company_id, department_code, department_name, parent_id, cost_center_code, manager_employee_id, description
         ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [firmaId, kod, b.department_name, b.parent_id || null, b.cost_center_code || null, b.manager_employee_id || null, b.description || null],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_departments WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Departman kodu zaten var.' });
    res.status(500).json({ hata: err.message });
  }
});

router.put('/departmanlar/:id', async (req, res) => {
  try {
    const b = req.body || {};
    if (b.parent_id && Number(b.parent_id) === Number(req.params.id)) {
      return res.status(400).json({ hata: 'Departman kendi üstü olamaz.' });
    }
    const r = await pool.query(
      `UPDATE hr_departments SET
         department_name = COALESCE($2, department_name),
         parent_id = COALESCE($3, parent_id),
         cost_center_code = COALESCE($4, cost_center_code),
         manager_employee_id = COALESCE($5, manager_employee_id),
         is_active = COALESCE($6, is_active),
         description = COALESCE($7, description)
       WHERE id=$1 RETURNING *`,
      [req.params.id, b.department_name, b.parent_id, b.cost_center_code, b.manager_employee_id, b.is_active, b.description],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Departman bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/departmanlar/:id', async (req, res) => {
  try {
    const used = await pool.query(`SELECT 1 FROM hr_employees WHERE department_id=$1 LIMIT 1`, [req.params.id]);
    if (used.rows[0]) {
      await pool.query(`UPDATE hr_departments SET is_active=FALSE WHERE id=$1`, [req.params.id]);
      return res.json({ silindi: false, pasife_alindi: true, id: Number(req.params.id) });
    }
    const r = await pool.query(`DELETE FROM hr_departments WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Departman bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- Pozisyonlar ----
router.get('/pozisyonlar', async (req, res) => {
  try {
    const params = [];
    let where = '';
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where = `WHERE p.company_id=$${params.length}`;
    }
    const r = await pool.query(
      `SELECT p.*, d.department_code, d.department_name
       FROM hr_positions p
       LEFT JOIN hr_departments d ON d.id = p.department_id
       ${where}
       ORDER BY p.position_code`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/pozisyonlar/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM hr_positions WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Pozisyon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/pozisyonlar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    const kod = typeof b.position_code === 'string' ? b.position_code.trim() : b.position_code;
    if (!firmaId || !b.position_name) {
      return res.status(400).json({ hata: 'company_id ve position_name zorunlu.' });
    }
    if (!kod) {
      return res.status(400).json({ hata: 'position_code zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `INSERT INTO hr_positions (company_id, position_code, position_name, department_id, description)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [firmaId, kod, b.position_name, b.department_id || null, b.description || null],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_positions WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ hata: 'Pozisyon kodu zaten var.' });
    res.status(500).json({ hata: err.message });
  }
});

router.put('/pozisyonlar/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE hr_positions SET
         position_name = COALESCE($2, position_name),
         department_id = COALESCE($3, department_id),
         is_active = COALESCE($4, is_active),
         description = COALESCE($5, description)
       WHERE id=$1 RETURNING *`,
      [req.params.id, b.position_name, b.department_id, b.is_active, b.description],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Pozisyon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/pozisyonlar/:id', async (req, res) => {
  try {
    const used = await pool.query(`SELECT 1 FROM hr_employees WHERE position_id=$1 LIMIT 1`, [req.params.id]);
    if (used.rows[0]) {
      await pool.query(`UPDATE hr_positions SET is_active=FALSE WHERE id=$1`, [req.params.id]);
      return res.json({ silindi: false, pasife_alindi: true, id: Number(req.params.id) });
    }
    const r = await pool.query(`DELETE FROM hr_positions WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Pozisyon bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
