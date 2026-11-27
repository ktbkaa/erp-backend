const express = require('express');
const router = express.Router();
const pool = require('../db');
const { runAutomation } = require('../src/services/prjAutomationService');
const { companyIdFromReq } = require('../src/utils/firmaScope');

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

/** Global (company_id NULL) herkese; aksi halde aktif firma ile eşleşmeli. */
function assertAutomationFirma(row, firmaId) {
  if (!firmaId || !row) return true;
  if (row.company_id == null) return true;
  return Number(row.company_id) === Number(firmaId);
}

router.get('/', async (req, res, next) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    let where = '';
    if (firmaId) {
      params.push(firmaId);
      where = `WHERE company_id IS NULL OR company_id=$${params.length}`;
    }
    const r = await pool.query(
      `SELECT * FROM prj_automations ${where} ORDER BY priority, automation_code`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/logs', async (req, res, next) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    let where = '';
    if (firmaId) {
      params.push(firmaId);
      where = `WHERE a.company_id IS NULL OR a.company_id=$${params.length}`;
    }
    const r = await pool.query(
      `
      SELECT l.*, a.automation_code, a.automation_name
      FROM prj_automation_logs l
      LEFT JOIN prj_automations a ON a.id = l.automation_id
      ${where}
      ORDER BY l.id DESC LIMIT 100
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) return next();
    const r = await pool.query(`SELECT * FROM prj_automations WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    if (!assertAutomationFirma(r.rows[0], companyIdFromReq(req))) {
      return res.status(403).json({ hata: 'Bu firma için otomasyon erişimi yok.' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    const code = trimOrNull(b.automation_code);
    const name = trimOrNull(b.automation_name);
    const trigger = trimOrNull(b.trigger_code);
    if (!code || !name || !trigger) {
      return res.status(400).json({
        hata: 'automation_code, automation_name ve trigger_code zorunlu.',
      });
    }
    const firmaId = b.company_id || companyIdFromReq(req) || null;
    const r = await pool.query(
      `INSERT INTO prj_automations (
         company_id, automation_code, automation_name, trigger_code,
         condition_json, action_json, is_enabled, priority, description
       ) VALUES ($1,$2,$3,$4,COALESCE($5::jsonb,'{}'::jsonb),COALESCE($6::jsonb,'{}'::jsonb),
                 COALESCE($7,TRUE),COALESCE($8,100),$9)
       RETURNING *`,
      [
        firmaId, code, name, trigger,
        JSON.stringify(b.condition_json || {}),
        JSON.stringify(b.action_json || {}),
        b.is_enabled !== false && b.is_active !== false,
        b.priority != null ? Number(b.priority) : 100,
        b.description || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) return next();
    const existing = await pool.query(`SELECT * FROM prj_automations WHERE id=$1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    if (!assertAutomationFirma(existing.rows[0], companyIdFromReq(req))) {
      return res.status(403).json({ hata: 'Bu firma için otomasyon erişimi yok.' });
    }
    const b = req.body || {};
    const sets = [];
    const params = [req.params.id];
    const bump = (col, val) => {
      if (val === undefined) return;
      params.push(val);
      sets.push(`${col}=$${params.length}`);
    };
    if (b.automation_name !== undefined) bump('automation_name', trimOrNull(b.automation_name));
    if (b.trigger_code !== undefined) bump('trigger_code', trimOrNull(b.trigger_code));
    if (b.condition_json !== undefined) bump('condition_json', JSON.stringify(b.condition_json || {}));
    if (b.action_json !== undefined) bump('action_json', JSON.stringify(b.action_json || {}));
    if (b.is_enabled !== undefined || b.is_active !== undefined) {
      const enabled = b.is_enabled !== undefined ? b.is_enabled !== false : b.is_active !== false;
      bump('is_enabled', enabled);
    }
    if (b.priority !== undefined) bump('priority', Number(b.priority));
    if (b.description !== undefined) bump('description', b.description);
    if (!sets.length) return res.status(400).json({ hata: 'Güncellenecek alan yok.' });
    const r = await pool.query(
      `UPDATE prj_automations SET ${sets.join(', ')} WHERE id=$1 RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) return next();
    const existing = await pool.query(`SELECT * FROM prj_automations WHERE id=$1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    if (!assertAutomationFirma(existing.rows[0], companyIdFromReq(req))) {
      return res.status(403).json({ hata: 'Bu firma için otomasyon erişimi yok.' });
    }
    const r = await pool.query(
      `UPDATE prj_automations SET is_enabled=FALSE WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

router.post('/:code/run', async (req, res, next) => {
  try {
    const a = await pool.query(`SELECT * FROM prj_automations WHERE automation_code=$1`, [req.params.code]);
    if (!a.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    if (!assertAutomationFirma(a.rows[0], companyIdFromReq(req))) {
      return res.status(403).json({ hata: 'Bu firma için otomasyon erişimi yok.' });
    }
    const results = await runAutomation(a.rows[0].trigger_code, req.body || {}, {
      eventKey: req.body.event_key || `manual:${req.params.code}:${Date.now()}`,
    });
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/toggle', async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT * FROM prj_automations WHERE id=$1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    if (!assertAutomationFirma(existing.rows[0], companyIdFromReq(req))) {
      return res.status(403).json({ hata: 'Bu firma için otomasyon erişimi yok.' });
    }
    const r = await pool.query(
      `UPDATE prj_automations SET is_enabled = NOT is_enabled WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
