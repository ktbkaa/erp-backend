const express = require('express');
const router = express.Router();
const pool = require('../db');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { withTransaction } = require('../src/utils/withTransaction');
const { runAutomation } = require('../src/services/prjAutomationService');

const SCORE = { Low: 1, Medium: 2, High: 3, Critical: 4 };

function calcScore(prob, impact) {
  return (SCORE[prob] || 2) * (SCORE[impact] || 2);
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let where = 'WHERE r.is_active=TRUE';
    if (req.query.project_id) {
      params.push(req.query.project_id);
      where += ` AND r.project_id=$${params.length}`;
    }
    const rows = await pool.query(
      `
      SELECT r.*, p.project_code
      FROM project_risks r
      JOIN projects p ON p.id = r.project_id
      ${where}
      ORDER BY r.score DESC, r.id DESC
      `,
      params
    );
    res.json(rows.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { project_id, title, probability, impact, description, mitigation, contingency, owner_user_id } = req.body;
    if (!project_id || !title) return res.status(400).json({ hata: 'project_id ve title zorunlu.' });
    const row = await withTransaction(pool, async (client) => {
      const p = await client.query(`SELECT company_id FROM projects WHERE id=$1`, [project_id]);
      if (!p.rows[0]) throw Object.assign(new Error('Proje bulunamadı.'), { status: 404 });
      const code = req.body.risk_code || (await nextSequenceCode(client, 'PRJ_RISK'));
      const score = calcScore(probability || 'Medium', impact || 'Medium');
      const ins = await client.query(
        `
        INSERT INTO project_risks (
          project_id, company_id, risk_code, title, description, probability, impact, score,
          owner_user_id, mitigation, contingency
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
        `,
        [
          project_id, p.rows[0].company_id, code, title, description || null,
          probability || 'Medium', impact || 'Medium', score,
          owner_user_id || null, mitigation || null, contingency || null,
        ]
      );
      return ins.rows[0];
    });
    if (row.score >= 12 || (row.probability === 'High' && row.impact === 'High') || row.probability === 'Critical') {
      await runAutomation(
        'RISK_LEVEL',
        { project_id: row.project_id, risk_id: row.id, score: row.score },
        { eventKey: `risk:${row.id}:${row.score}` }
      );
    }
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT r.*, p.project_code FROM project_risks r JOIN projects p ON p.id = r.project_id WHERE r.id=$1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Risk bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const cur = await pool.query(`SELECT * FROM project_risks WHERE id=$1`, [req.params.id]);
    const old = cur.rows[0];
    if (!old) return res.status(404).json({ hata: 'Risk bulunamadı.' });
    const b = req.body || {};
    const pick = (k) => (b[k] === undefined ? old[k] : (b[k] === '' ? null : b[k]));
    const probability = pick('probability') || 'Medium';
    const impact = pick('impact') || 'Medium';
    const title = pick('title');
    if (!title) return res.status(400).json({ hata: 'title zorunlu.' });
    const r = await pool.query(
      `UPDATE project_risks SET
         title=$2, description=$3, probability=$4, impact=$5, score=$6,
         owner_user_id=$7, mitigation=$8, contingency=$9, status_code=$10
       WHERE id=$1 RETURNING *`,
      [req.params.id, title, pick('description'), probability, impact, calcScore(probability, impact),
        pick('owner_user_id'), pick('mitigation'), pick('contingency'), pick('status_code')]
    );
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`UPDATE project_risks SET is_active=FALSE WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Risk bulunamadı.' });
    res.json({ is_deleted: true, soft: true, id: Number(r.rows[0].id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
