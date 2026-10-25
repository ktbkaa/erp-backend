const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function getir(id) {
  const r = await pool.query(
    `
    SELECT k.*,
           r.route_code, r.route_name,
           s.template_code, s.template_name,
           f.company_code, f.company_name
    FROM approval_module_usages k
    JOIN approval_routes r ON r.id = k.route_id
    LEFT JOIN approval_message_templates s ON s.id = k.template_id
    LEFT JOIN companies f ON f.id = k.company_id
    WHERE k.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let sql = 'SELECT id FROM approval_module_usages';
    const where = [];
    if (req.query.is_active === 'true') where.push('is_active = TRUE');
    if (firmaId) {
      params.push(firmaId);
      where.push(`(company_id IS NULL OR company_id = $${params.length})`);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY kullanim_code';
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await getir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kullanım bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      kullanim_code, kullanim_name, module_code, screen_id, route_id,
      company_id, min_amount, otomatik_gonder, template_id, is_active, description,
    } = req.body;
    if (!kullanim_name || !module_code || !screen_id || !route_id) {
      return res.status(400).json({ hata: 'kullanim_name, module_code, screen_id, route_id zorunlu.' });
    }
    if (!kullanim_code) {
      try { kullanim_code = await sonrakiKod(pool, 'ONAY_KULLANIM'); }
      catch (_) { kullanim_code = `OM${Date.now().toString().slice(-5)}`; }
    }
    const ins = await pool.query(
      `
      INSERT INTO approval_module_usages (
        kullanim_code, kullanim_name, module_code, screen_id, route_id,
        company_id, min_amount, otomatik_gonder, template_id, is_active, description
      ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0),COALESCE($8,FALSE),$9,COALESCE($10,TRUE),$11)
      RETURNING id
      `,
      [
        kullanim_code, kullanim_name, module_code, screen_id, route_id,
        company_id || null, min_amount, otomatik_gonder, template_id || null, is_active, description || null,
      ],
    );
    res.status(201).json(await getir(ins.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      kullanim_name, module_code, screen_id, route_id,
      company_id, min_amount, otomatik_gonder, template_id, is_active, description,
    } = req.body;
    const r = await pool.query(
      `
      UPDATE approval_module_usages SET
        kullanim_name = COALESCE($2, kullanim_name),
        module_code = COALESCE($3, module_code),
        screen_id = COALESCE($4, screen_id),
        route_id = COALESCE($5, route_id),
        company_id = COALESCE($6, company_id),
        min_amount = COALESCE($7, min_amount),
        otomatik_gonder = COALESCE($8, otomatik_gonder),
        template_id = COALESCE($9, template_id),
        is_active = COALESCE($10, is_active),
        description = COALESCE($11, description)
      WHERE id=$1 RETURNING id
      `,
      [
        req.params.id, kullanim_name || null, module_code || null, screen_id || null, route_id || null,
        company_id, min_amount, otomatik_gonder, template_id, is_active, description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kullanım bulunamadı.' });
    res.json(await getir(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_module_usages WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kullanım bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
