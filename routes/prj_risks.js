const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');
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
      const code = req.body.risk_code || (await sonrakiKod(client, 'PRJ_RISK'));
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

module.exports = router;
