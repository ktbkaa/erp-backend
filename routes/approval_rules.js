const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function kuralGetir(id) {
  const r = await pool.query(
    `
    SELECT k.*,
           f.company_code, f.company_name,
           iy.plant_code, iy.plant_name,
           s.template_code, s.template_name
    FROM approval_rules k
    LEFT JOIN companies f ON f.id = k.company_id
    LEFT JOIN plants iy ON iy.id = k.plant_id
    LEFT JOIN approval_message_templates s ON s.id = k.template_id
    WHERE k.id = $1
    `,
    [id],
  );
  if (!r.rows[0]) return null;
  const hareketler = await pool.query(
    `
    SELECT h.*,
           hk.movement_code AS hk_kod,
           hk.movement_name
    FROM approval_rule_movements h
    LEFT JOIN movement_codes hk ON hk.id = h.movement_code_id
    WHERE h.rule_id = $1
    ORDER BY h.id
    `,
    [id],
  );
  return {
    ...r.rows[0],
    hareketler: hareketler.rows.map((x) => ({
      ...x,
      movement_code: x.movement_code || x.hk_kod,
      movement_name: x.movement_name,
    })),
  };
}

async function kaydetHareketler(client, kuralId, hareketler) {
  await client.query('DELETE FROM approval_rule_movements WHERE rule_id=$1', [kuralId]);
  if (!Array.isArray(hareketler)) return;
  for (const h of hareketler) {
    if (!h) continue;
    let kod = h.movement_code || null;
    let kodId = h.movement_code_id || null;
    if (!kod && kodId) {
      const rr = await client.query('SELECT movement_code FROM movement_codes WHERE id=$1', [kodId]);
      kod = rr.rows[0]?.movement_code || null;
    }
    if (!kod && !kodId) continue;
    await client.query(
      `
      INSERT INTO approval_rule_movements (rule_id, movement_code_id, movement_code)
      VALUES ($1,$2,$3)
      ON CONFLICT (rule_id, movement_code) DO NOTHING
      `,
      [kuralId, kodId, kod],
    );
  }
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (req.query.is_active === 'true') where.push('is_active = TRUE');
    if (firmaId) {
      params.push(firmaId);
      where.push(`(company_id IS NULL OR company_id = $${params.length})`);
    }
    if (req.query.screen_id) {
      params.push(req.query.screen_id);
      where.push(`screen_id = $${params.length}`);
    }
    const sql = `
      SELECT id FROM approval_rules
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY line_no, rule_code
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await kuralGetir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await kuralGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let {
      rule_code, rule_name, line_no, company_id, plant_id, screen_id, template_id,
      term_direction, term_min_amount, term_max_amount, condition_statuses,
      otomatik_onay, onaylaninca_is_active, is_active, description, hareketler,
    } = req.body;
    if (!rule_name || !screen_id) {
      return res.status(400).json({ hata: 'Kural adı ve ekran seçimi zorunlu.' });
    }
    if (!rule_code) {
      try { rule_code = await sonrakiKod(pool, 'ONAY_KURAL'); }
      catch (_) { rule_code = `NKR${Date.now().toString().slice(-5)}`; }
    }
    const id = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `
        INSERT INTO approval_rules (
          rule_code, rule_name, line_no, company_id, plant_id, screen_id, template_id,
          term_direction, term_min_amount, term_max_amount, condition_statuses,
          otomatik_onay, onaylaninca_is_active, is_active, description
        ) VALUES (
          $1,$2,COALESCE($3,10),$4,$5,$6,$7,
          COALESCE($8,'Hepsi'),$9,$10,$11,
          COALESCE($12,FALSE),COALESCE($13,TRUE),COALESCE($14,TRUE),$15
        ) RETURNING id
        `,
        [
          rule_code, rule_name, line_no, company_id || null, plant_id || null, screen_id, template_id || null,
          term_direction, term_min_amount ?? null, term_max_amount ?? null, condition_statuses || null,
          otomatik_onay, onaylaninca_is_active, is_active, description || null,
        ],
      );
      await kaydetHareketler(client, ins.rows[0].id, hareketler);
      return ins.rows[0].id;
    });
    res.status(201).json(await kuralGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      rule_name, line_no, company_id, plant_id, screen_id, template_id,
      term_direction, term_min_amount, term_max_amount, condition_statuses,
      otomatik_onay, onaylaninca_is_active, is_active, description, hareketler,
    } = req.body;
    await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        UPDATE approval_rules SET
          rule_name = COALESCE($2, rule_name),
          line_no = COALESCE($3, line_no),
          company_id = COALESCE($4, company_id),
          plant_id = COALESCE($5, plant_id),
          screen_id = COALESCE($6, screen_id),
          template_id = COALESCE($7, template_id),
          term_direction = COALESCE($8, term_direction),
          term_min_amount = COALESCE($9, term_min_amount),
          term_max_amount = COALESCE($10, term_max_amount),
          condition_statuses = COALESCE($11, condition_statuses),
          otomatik_onay = COALESCE($12, otomatik_onay),
          onaylaninca_is_active = COALESCE($13, onaylaninca_is_active),
          is_active = COALESCE($14, is_active),
          description = COALESCE($15, description)
        WHERE id=$1 RETURNING id
        `,
        [
          req.params.id, rule_name || null, line_no ?? null, company_id, plant_id, screen_id || null, template_id,
          term_direction || null, term_min_amount, term_max_amount, condition_statuses,
          otomatik_onay, onaylaninca_is_active, is_active, description,
        ],
      );
      if (!r.rows[0]) {
        const err = new Error('Kural bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (hareketler !== undefined) await kaydetHareketler(client, req.params.id, hareketler);
    });
    res.json(await kuralGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_rules WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
