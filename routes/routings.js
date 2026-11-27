const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

function boolOr(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
  if (v === 0 || v === '0' || String(v).toLowerCase() === 'false') return false;
  return def;
}

function numOr(v, def = 0) {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function rotaGetir(id) {
  const baslik = await pool.query(
    `
    SELECT r.*,
           s.item_code, s.item_name, s.item_type,
           ua.bom_code, ua.bom_name, ua.alt_no AS bom_alt_no,
           p.plant_code, p.plant_name,
           c.company_code, c.company_name
    FROM routings r
    JOIN items s ON s.id = r.item_id
    LEFT JOIN boms ua ON ua.id = r.product_bom_id
    LEFT JOIN plants p ON p.id = r.plant_id
    LEFT JOIN companies c ON c.id = r.company_id
    WHERE r.id = $1
    `,
    [id]
  );
  if (!baslik.rows[0]) return null;

  const ops = await pool.query(
    `
    SELECT o.*,
           m.center_code, m.center_name,
           ws.station_code, ws.station_name,
           cs.item_code AS cikti_stok_kodu,
           cs.item_name AS cikti_stok_adi,
           os.item_code AS op_item_code,
           os.item_name AS op_item_name,
           os.item_type AS op_item_type,
           ua.bom_code AS op_bom_code,
           ua.bom_name AS op_bom_name
    FROM routing_operations o
    LEFT JOIN work_centers m ON m.id = o.work_center_id
    LEFT JOIN work_stations ws ON ws.id = o.work_station_id
    LEFT JOIN items cs ON cs.id = o.output_item_id
    LEFT JOIN items os ON os.id = o.item_id
    LEFT JOIN boms ua ON ua.id = o.product_bom_id
    WHERE o.route_id = $1
    ORDER BY o.line_no
    `,
    [id]
  );

  const opIds = ops.rows.map((o) => o.id);
  let equipByOp = new Map();
  if (opIds.length) {
    const eq = await pool.query(
      `SELECT * FROM routing_operation_equipment
       WHERE operation_id = ANY($1::int[])
       ORDER BY line_no, id`,
      [opIds]
    );
    for (const row of eq.rows) {
      if (!equipByOp.has(row.operation_id)) equipByOp.set(row.operation_id, []);
      equipByOp.get(row.operation_id).push(row);
    }
  }

  const operasyonlar = [];
  for (const op of ops.rows) {
    const bilesenler = await pool.query(
      `
      SELECT b.*, st.item_code, st.item_name, st.item_type
      FROM routing_operation_components b
      JOIN items st ON st.id = b.item_id
      WHERE b.operasyon_id = $1
      ORDER BY b.id
      `,
      [op.id]
    );
    const sonraki = ops.rows.find((x) => x.line_no === op.sonraki_line_no);
    operasyonlar.push({
      ...op,
      bilesenler: bilesenler.rows,
      ekipmanlar: equipByOp.get(op.id) || [],
      sonraki_operasyon: sonraki
        ? {
            line_no: sonraki.line_no,
            operation_code: sonraki.operation_code,
            operation_name: sonraki.operation_name,
          }
        : null,
    });
  }

  return { ...baslik.rows[0], operasyonlar };
}

function pickHeader(body, cur = {}) {
  const g = (k, def) => (body[k] !== undefined ? body[k] : (cur[k] !== undefined ? cur[k] : def));
  return {
    item_id: g('item_id', null),
    product_bom_id: g('product_bom_id', null),
    route_code: g('route_code', null),
    route_name: g('route_name', null),
    template: boolOr(g('template', false), false),
    varsayilan: boolOr(g('varsayilan', false), false),
    valid_from: g('valid_from', null) || null,
    valid_to: g('valid_to', null) || null,
    company_id: g('company_id', null) || null,
    plant_id: g('plant_id', null) || null,
    route_type: g('route_type', 'Uretim') || 'Uretim',
    alt_no: g('alt_no', '00') != null ? String(g('alt_no', '00')) : '00',
    alt_description: g('alt_description', null) || null,
    min_quantity: numOr(g('min_quantity', 0), 0),
    max_quantity: numOr(g('max_quantity', 999999999), 999999999),
    revision: g('revision', null) || null,
    brand_code: g('brand_code', null) || null,
    attr3_code: g('attr3_code', null) || null,
    wo_change_mode: g('wo_change_mode', 'Serbest') || 'Serbest',
    is_reverse: boolOr(g('is_reverse', false), false),
    is_active: body.is_active !== undefined ? boolOr(body.is_active, true) : (cur.is_active == null ? true : boolOr(cur.is_active, true)),
    notes: g('notes', null) || null,
  };
}

function opInsertValues(rotaId, op) {
  const opTime = numOr(op.op_time != null ? op.op_time : op.sure_dk, 0);
  return [
    rotaId,
    op.line_no || 10,
    op.operation_code || null,
    op.operation_name || null,
    op.work_center_id || null,
    opTime,
    op.output_item_id || null,
    op.sonraki_line_no || null,
    op.description || null,
    op.work_station_id || null,
    opTime,
    op.op_time_uom || 'dk',
    numOr(op.wait_time, 0),
    op.wait_time_uom || 'dk',
    numOr(op.setup_time, 0),
    op.setup_time_uom || 'dk',
    numOr(op.unload_time, 0),
    op.unload_time_uom || 'dk',
    op.include_precost == null ? true : boolOr(op.include_precost, true),
    op.include_std_cost == null ? true : boolOr(op.include_std_cost, true),
    op.include_actual_cost == null ? true : boolOr(op.include_actual_cost, true),
    numOr(op.cost_factor_1, 1),
    numOr(op.cost_factor_2, 1),
    boolOr(op.is_disassemble, false),
    boolOr(op.is_subcontract, false),
    boolOr(op.is_shared_op, false),
    boolOr(op.require_qc, false),
    boolOr(op.require_spc, false),
    op.note1 || null,
    op.note2 || null,
    op.item_id || null,
    op.product_bom_id || null,
  ];
}

const OP_INSERT_SQL = `
  INSERT INTO routing_operations (
    route_id, line_no, operation_code, operation_name, work_center_id,
    sure_dk, output_item_id, sonraki_line_no,
    description, work_station_id,
    op_time, op_time_uom, wait_time, wait_time_uom,
    setup_time, setup_time_uom, unload_time, unload_time_uom,
    include_precost, include_std_cost, include_actual_cost,
    cost_factor_1, cost_factor_2,
    is_disassemble, is_subcontract, is_shared_op, require_qc, require_spc,
    note1, note2, item_id, product_bom_id
  ) VALUES (
    $1,$2,$3,$4,$5,
    $6,$7,$8,
    $9,$10,
    $11,$12,$13,$14,
    $15,$16,$17,$18,
    $19,$20,$21,
    $22,$23,
    $24,$25,$26,$27,$28,
    $29,$30,$31,$32
  ) RETURNING id
`;

async function insertEquipment(client, operationId, list) {
  let line = 10;
  for (const e of list || []) {
    if (!e?.equipment_code && !e?.equipment_name) continue;
    await client.query(
      `
      INSERT INTO routing_operation_equipment (
        operation_id, line_no, equipment_code, equipment_name,
        cavity_count, used_cavity_count, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        operationId,
        e.line_no != null ? Number(e.line_no) : line,
        e.equipment_code || e.equipment_name,
        e.equipment_name || null,
        numOr(e.cavity_count, 0),
        numOr(e.used_cavity_count, 0),
        e.notes || null,
      ]
    );
    line += 10;
  }
}

async function insertOps(client, rotaId, operasyonlar) {
  for (const op of operasyonlar || []) {
    if (!op.operation_code && !op.operation_name) continue;
    const opIns = await client.query(OP_INSERT_SQL, opInsertValues(rotaId, op));
    const opId = opIns.rows[0].id;
    for (const b of op.bilesenler || []) {
      if (!b.item_id) continue;
      await client.query(
        `INSERT INTO routing_operation_components (operasyon_id, item_id, quantity, uom_code)
         VALUES ($1,$2,$3,$4)`,
        [opId, b.item_id, b.quantity || 0, b.uom_code || null]
      );
    }
    await insertEquipment(client, opId, op.ekipmanlar || op.equipment || []);
  }
}

async function clearOtherDefault(client, itemId, keepId) {
  if (!itemId) return;
  await client.query(
    `UPDATE routings SET varsayilan=FALSE
     WHERE item_id=$1 AND id IS DISTINCT FROM $2 AND varsayilan=TRUE`,
    [itemId, keepId || 0]
  );
}

router.get('/', async (req, res) => {
  try {
    const onlyMamul = req.query.type !== 'hepsi';
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (onlyMamul) where.push(`s.item_type IN ('Mamul','YariMamul')`);
    if (firmaId) {
      params.push(firmaId);
      where.push(`(r.company_id = $${params.length} OR s.company_id = $${params.length})`);
    }
    if (req.query.template != null && req.query.template !== '') {
      where.push(`r.template = ${boolOr(req.query.template, false) ? 'TRUE' : 'FALSE'}`);
    }
    if (req.query.item_id) {
      params.push(req.query.item_id);
      where.push(`r.item_id = $${params.length}`);
    }
    if (req.query.plant_id) {
      params.push(req.query.plant_id);
      where.push(`r.plant_id = $${params.length}`);
    }
    if (req.query.route_type) {
      params.push(req.query.route_type);
      where.push(`r.route_type = $${params.length}`);
    }
    const liste = await pool.query(
      `
      SELECT r.id
      FROM routings r
      JOIN items s ON s.id = r.item_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.id DESC
      `,
      params
    );
    const result = [];
    for (const r of liste.rows) result.push(await rotaGetir(r.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rota = await rotaGetir(req.params.id);
    if (!rota) return res.status(404).json({ hata: 'Rota bulunamadı.' });
    res.json(rota);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Şablon rotanın operasyonlarını bu rotaya kopyala (mevcut ops silinir). */
router.post('/:id/sablon-uygula', async (req, res) => {
  try {
    const templateId = Number(req.body?.template_id || req.body?.sablon_id);
    if (!templateId) return res.status(400).json({ hata: 'template_id zorunlu.' });
    const kayitId = await withTransaction(pool, async (client) => {
      const hedef = await client.query('SELECT id FROM routings WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!hedef.rows[0]) {
        const err = new Error('Rota bulunamadı.');
        err.status = 404;
        throw err;
      }
      const sablon = await rotaGetir(templateId);
      if (!sablon) {
        const err = new Error('Şablon rota bulunamadı.');
        err.status = 404;
        throw err;
      }
      const eskiOps = await client.query('SELECT id FROM routing_operations WHERE route_id=$1', [req.params.id]);
      for (const op of eskiOps.rows) {
        await client.query('DELETE FROM routing_operation_components WHERE operasyon_id=$1', [op.id]);
        await client.query('DELETE FROM routing_operation_equipment WHERE operation_id=$1', [op.id]);
      }
      await client.query('DELETE FROM routing_operations WHERE route_id=$1', [req.params.id]);
      await insertOps(client, Number(req.params.id), sablon.operasyonlar || []);
      await client.query('UPDATE routings SET updated_at=NOW() WHERE id=$1', [req.params.id]);
      return Number(req.params.id);
    });
    res.json(await rotaGetir(kayitId));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

/** Başlık product_bom_id: yoksa ilk operasyon ağacından (geriye uyum). */
function headerBomFromOps(headerBomId, operasyonlar) {
  if (headerBomId) return headerBomId;
  const hit = (operasyonlar || []).find((o) => o && o.product_bom_id);
  return hit?.product_bom_id || null;
}

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const h = pickHeader(body);
    const operasyonlar = Array.isArray(body.operasyonlar) ? body.operasyonlar : [];
    if (!h.item_id || !h.route_code || !h.route_name) {
      return res.status(400).json({ hata: 'item_id, route_code ve route_name zorunlu.' });
    }
    if (!operasyonlar.length) {
      return res.status(400).json({ hata: 'En az bir operasyon gerekli.' });
    }
    const headerBomId = headerBomFromOps(h.product_bom_id, operasyonlar);

    const id = await withTransaction(pool, async (client) => {
      let firmaId = firmaIdFromReq(req) || Number(h.company_id) || null;
      if (!firmaId) {
        const st = await client.query('SELECT company_id FROM items WHERE id=$1', [h.item_id]);
        firmaId = st.rows[0]?.company_id || null;
      }
      const baslik = await client.query(
        `
        INSERT INTO routings (
          item_id, product_bom_id, route_code, route_name, template, varsayilan,
          valid_from, valid_to, company_id, plant_id, route_type, alt_no, alt_description,
          min_quantity, max_quantity, revision, brand_code, attr3_code,
          wo_change_mode, is_reverse, is_active, notes, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,
          $14,$15,$16,$17,$18,
          $19,$20,$21,$22,NOW()
        ) RETURNING id
        `,
        [
          h.item_id,
          headerBomId,
          h.route_code,
          h.route_name,
          h.template,
          h.varsayilan,
          h.valid_from,
          h.valid_to,
          firmaId,
          h.plant_id,
          h.route_type,
          h.alt_no,
          h.alt_description,
          h.min_quantity,
          h.max_quantity,
          h.revision,
          h.brand_code,
          h.attr3_code,
          h.wo_change_mode,
          h.is_reverse,
          h.is_active,
          h.notes,
        ]
      );
      const rotaId = baslik.rows[0].id;
      if (h.varsayilan) await clearOtherDefault(client, h.item_id, rotaId);
      await insertOps(client, rotaId, operasyonlar);
      return rotaId;
    });

    res.status(201).json(await rotaGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const operasyonlar = body.operasyonlar;

    const kayitId = await withTransaction(pool, async (client) => {
      const mevcut = await client.query('SELECT * FROM routings WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!mevcut.rows[0]) {
        const err = new Error('Rota bulunamadı.');
        err.status = 404;
        throw err;
      }
      const h = pickHeader(body, mevcut.rows[0]);
      if (!h.route_name) {
        const err = new Error('route_name zorunlu.');
        err.status = 400;
        throw err;
      }
      const opsArr = Array.isArray(operasyonlar) ? operasyonlar : null;
      let nextHeaderBom = Object.prototype.hasOwnProperty.call(body, 'product_bom_id')
        ? (h.product_bom_id || null)
        : mevcut.rows[0].product_bom_id;
      if (opsArr) {
        nextHeaderBom = headerBomFromOps(h.product_bom_id || null, opsArr) || nextHeaderBom;
      }

      await client.query(
        `
        UPDATE routings SET
          route_name=$2,
          item_id=COALESCE($3, item_id),
          product_bom_id=$4,
          template=$5,
          varsayilan=$6,
          valid_from=$7,
          valid_to=$8,
          plant_id=$9,
          company_id=COALESCE($10, company_id),
          route_type=$11,
          alt_no=$12,
          alt_description=$13,
          min_quantity=$14,
          max_quantity=$15,
          revision=$16,
          brand_code=$17,
          attr3_code=$18,
          wo_change_mode=$19,
          is_reverse=$20,
          is_active=$21,
          notes=$22,
          updated_at=NOW()
        WHERE id=$1
        `,
        [
          req.params.id,
          h.route_name,
          h.item_id || null,
          nextHeaderBom,
          h.template,
          h.varsayilan,
          h.valid_from,
          h.valid_to,
          h.plant_id,
          h.company_id,
          h.route_type,
          h.alt_no,
          h.alt_description,
          h.min_quantity,
          h.max_quantity,
          h.revision,
          h.brand_code,
          h.attr3_code,
          h.wo_change_mode,
          h.is_reverse,
          h.is_active,
          h.notes,
        ]
      );

      const itemId = h.item_id || mevcut.rows[0].item_id;
      if (h.varsayilan) await clearOtherDefault(client, itemId, Number(req.params.id));

      if (Array.isArray(operasyonlar)) {
        const eskiOps = await client.query('SELECT id FROM routing_operations WHERE route_id=$1', [req.params.id]);
        for (const op of eskiOps.rows) {
          await client.query('DELETE FROM routing_operation_components WHERE operasyon_id=$1', [op.id]);
          await client.query('DELETE FROM routing_operation_equipment WHERE operation_id=$1', [op.id]);
        }
        await client.query('DELETE FROM routing_operations WHERE route_id=$1', [req.params.id]);
        await insertOps(client, Number(req.params.id), operasyonlar);
      }
      return Number(req.params.id);
    });

    res.json(await rotaGetir(kayitId));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM routings WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Rota bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
