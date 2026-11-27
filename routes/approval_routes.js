const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { companyIdFromReq } = require('../src/utils/firmaScope');

async function getRouting(id) {
  const r = await pool.query(
    `
    SELECT rt.*,
           f.company_code, f.company_name,
           iy.plant_code, iy.plant_name,
           ku.rule_code, ku.rule_name,
           s1.template_name AS ilk_mesaj_adi, s1.template_code AS ilk_mesaj_kodu,
           s2.template_name AS red_mesaj_adi, s2.template_code AS red_mesaj_kodu,
           s3.template_name AS ekstra_mesaj_adi, s3.template_code AS ekstra_mesaj_kodu
    FROM approval_routes rt
    LEFT JOIN companies f ON f.id = rt.company_id
    LEFT JOIN plants iy ON iy.id = rt.plant_id
    LEFT JOIN approval_rules ku ON ku.id = rt.rule_id
    LEFT JOIN approval_message_templates s1 ON s1.id = rt.first_message_template_id
    LEFT JOIN approval_message_templates s2 ON s2.id = rt.reject_message_template_id
    LEFT JOIN approval_message_templates s3 ON s3.id = rt.extra_message_template_id
    WHERE rt.id = $1
    `,
    [id],
  );
  if (!r.rows[0]) return null;
  const adimlar = await pool.query(
    `
    SELECT a.*
    FROM approval_route_steps a
    WHERE a.route_id = $1
    ORDER BY a.line_no
    `,
    [id],
  );
  return { ...r.rows[0], adimlar: adimlar.rows };
}

router.get('/', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    let sql = 'SELECT id FROM approval_routes';
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`(company_id IS NULL OR company_id = $${params.length})`);
    }
    if (req.query.screen_id) {
      params.push(req.query.screen_id);
      where.push(`screen_id = $${params.length}`);
    }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY route_code, version_no DESC';
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await getRouting(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getRouting(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Rota bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

async function saveSteps(client, rotaId, adimlar) {
  await client.query('DELETE FROM approval_route_steps WHERE route_id=$1', [rotaId]);
  if (!Array.isArray(adimlar)) return;
  let sira = 10;
  for (const a of adimlar) {
    if (!a) continue;
    const rolAdi = a.role_name || null;
    let rolId = a.role_id || null;
    if (!rolAdi && !rolId) continue;
    if (rolId && !rolAdi) {
      const rr = await client.query('SELECT role_name FROM approval_roles WHERE id=$1', [rolId]);
      // keep role_id for optional link; name from assignment
    }
    const sn = a.line_no != null ? Number(a.line_no) : sira;
    await client.query(
      `
      INSERT INTO approval_route_steps (
        route_id, line_no, step_name, role_id, role_name, is_required, is_parallel, min_amount,
        send_mail, send_sms, value_editable, send_back_line, description
      ) VALUES (
        $1,$2,$3,$4,$5,COALESCE($6,TRUE),COALESCE($7,FALSE),$8,
        COALESCE($9,TRUE),COALESCE($10,FALSE),COALESCE($11,FALSE),$12,$13
      )
      `,
      [
        rotaId,
        sn,
        a.step_name || rolAdi || `Adım ${sn}`,
        rolId,
        rolAdi || a.step_name || null,
        a.is_required,
        a.is_parallel,
        a.min_amount != null ? a.min_amount : null,
        a.send_mail,
        a.send_sms,
        a.value_editable,
        a.send_back_line != null ? a.send_back_line : null,
        a.description || null,
      ],
    );
    sira = sn + 10;
  }
}

router.post('/', async (req, res) => {
  try {
    const {
      route_code, route_name, description, company_id, plant_id, screen_id, rule_id,
      version_no: versiyon, first_message_template_id, reject_message_template_id, extra_message_template_id,
      cancel_role_name, attach_file_to_mail, is_active, adimlar,
    } = req.body;
    if (!route_name) return res.status(400).json({ hata: 'Rota adı zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      let kod = route_code;
      if (!kod) {
        try { kod = await nextSequenceCode(client, 'ONAY_ROTA'); }
        catch (_) { kod = `NR${Date.now().toString().slice(-5)}`; }
      }
      const ins = await client.query(
        `
        INSERT INTO approval_routes (
          route_code, route_name, description, company_id, plant_id, screen_id, rule_id,
          version_no, first_message_template_id, reject_message_template_id, extra_message_template_id,
          cancel_role_name, attach_file_to_mail, is_active
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          COALESCE($8,1),$9,$10,$11,
          $12,COALESCE($13,FALSE),COALESCE($14,TRUE)
        ) RETURNING id
        `,
        [
          kod, route_name, description || null, company_id || null, plant_id || null, screen_id || null, rule_id || null,
          versiyon, first_message_template_id || null, reject_message_template_id || null, extra_message_template_id || null,
          cancel_role_name || null, attach_file_to_mail, is_active,
        ],
      );
      await saveSteps(client, ins.rows[0].id, adimlar);
      return ins.rows[0].id;
    });
    res.status(201).json(await getRouting(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      route_name, description, company_id, plant_id, screen_id, rule_id,
      version_no: versiyon, first_message_template_id, reject_message_template_id, extra_message_template_id,
      cancel_role_name, attach_file_to_mail, is_active, adimlar,
    } = req.body;
    await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        UPDATE approval_routes SET
          route_name = COALESCE($2, route_name),
          description = COALESCE($3, description),
          company_id = COALESCE($4, company_id),
          plant_id = COALESCE($5, plant_id),
          screen_id = COALESCE($6, screen_id),
          rule_id = COALESCE($7, rule_id),
          version_no = COALESCE($8, version_no),
          first_message_template_id = COALESCE($9, first_message_template_id),
          reject_message_template_id = COALESCE($10, reject_message_template_id),
          extra_message_template_id = COALESCE($11, extra_message_template_id),
          cancel_role_name = COALESCE($12, cancel_role_name),
          attach_file_to_mail = COALESCE($13, attach_file_to_mail),
          is_active = COALESCE($14, is_active)
        WHERE id=$1 RETURNING id
        `,
        [
          req.params.id, route_name || null, description, company_id, plant_id, screen_id || null, rule_id,
          versiyon ?? null, first_message_template_id, reject_message_template_id, extra_message_template_id,
          cancel_role_name, attach_file_to_mail, is_active,
        ],
      );
      if (!r.rows[0]) {
        const err = new Error('Rota bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (adimlar !== undefined) await saveSteps(client, req.params.id, adimlar);
    });
    res.json(await getRouting(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_routes WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rota bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
