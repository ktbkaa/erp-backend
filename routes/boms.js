const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

const HEADER_COLS = [
  'finished_good_item_id', 'bom_code', 'bom_name', 'quantity', 'uom_code',
  'valid_from', 'valid_to', 'min_quantity', 'max_quantity', 'company_id', 'plant_id',
  'category', 'alt_no', 'bom_type', 'design_department', 'bom_status',
  'element_interval', 'proportional_qty', 'drawing_no', 'revision',
  'customer_partner_id', 'is_cad', 'notes', 'is_default_for_wo', 'is_disassembly',
  'is_active', 'silindi', 'created_by', 'updated_by',
  // Uyum gap
  'fg_warehouse_id', 'alt_description', 'version_code', 'brand_code', 'attr3_code',
  'wo_change_mode', 'lock_when_used_in_route', 'std_cost', 'precost_amount', 'precost_at',
];

function satirAgaciKur(duzSatirlar) {
  const map = new Map();
  for (const s of duzSatirlar) {
    map.set(s.id, { ...s, alt_satirlar: [], alternatifler: s.alternatifler || [] });
  }
  const kokler = [];
  for (const s of map.values()) {
    if (s.parent_line_id && map.has(s.parent_line_id)) {
      map.get(s.parent_line_id).alt_satirlar.push(s);
    } else {
      kokler.push(s);
    }
  }
  return kokler;
}

function boolOr(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
  if (v === 0 || v === '0' || String(v).toLowerCase() === 'false') return false;
  return def;
}

function normalizeLineQty(satir) {
  const scrap = Math.max(0, Number(satir.scrap_pct) || 0);
  const factor = 1 + scrap / 100;
  const entry = String(satir.qty_entry_type || 'Net');
  const isBrut = /^brut|brüt$/i.test(entry);
  let net;
  let gross;
  if (isBrut) {
    gross = Number(
      satir.gross_quantity != null && satir.gross_quantity !== ''
        ? satir.gross_quantity
        : satir.quantity
    ) || 0;
    net = factor > 0 ? gross / factor : gross;
  } else {
    net = Number(
      satir.net_quantity != null && satir.net_quantity !== ''
        ? satir.net_quantity
        : satir.quantity
    ) || 0;
    gross = net * factor;
  }
  return {
    qty_entry_type: isBrut ? 'Brut' : 'Net',
    quantity: net,
    net_quantity: net,
    gross_quantity: gross,
    scrap_pct: scrap,
  };
}

async function loadAlternatives(lineIds) {
  if (!lineIds.length) return new Map();
  const r = await pool.query(
    `
    SELECT a.*, st.item_code AS alt_item_code, st.item_name AS alt_item_name, st.item_type AS alt_item_type
    FROM bom_line_alternatives a
    JOIN items st ON st.id = a.alt_item_id
    WHERE a.bom_line_id = ANY($1::int[])
    ORDER BY a.priority, a.id
    `,
    [lineIds]
  );
  const map = new Map();
  for (const row of r.rows) {
    if (!map.has(row.bom_line_id)) map.set(row.bom_line_id, []);
    map.get(row.bom_line_id).push(row);
  }
  return map;
}

async function agacGetir(id) {
  const baslik = await pool.query(
    `
    SELECT ua.*,
           s.item_code, s.item_name, s.item_type, s.uom_code AS item_uom_code,
           s.son_cost AS mamul_son_cost, s.marka AS item_marka,
           p.plant_code, p.plant_name,
           c.company_code, c.company_name,
           pr.partner_code AS customer_code, pr.partner_name AS customer_name,
           wh.warehouse_code AS fg_warehouse_code, wh.warehouse_name AS fg_warehouse_name
    FROM boms ua
    JOIN items s ON s.id = ua.finished_good_item_id
    LEFT JOIN plants p ON p.id = ua.plant_id
    LEFT JOIN companies c ON c.id = ua.company_id
    LEFT JOIN partners pr ON pr.id = ua.customer_partner_id
    LEFT JOIN warehouses wh ON wh.id = ua.fg_warehouse_id
    WHERE ua.id = $1
    `,
    [id]
  );
  if (!baslik.rows[0]) return null;

  const satirlar = await pool.query(
    `
    SELECT us.*, st.item_code, st.item_name, st.item_type, st.uom_code AS item_uom_code,
           st.son_cost AS item_son_cost,
           wh.warehouse_code, wh.warehouse_name
    FROM bom_lines us
    JOIN items st ON st.id = us.component_item_id
    LEFT JOIN warehouses wh ON wh.id = us.warehouse_id
    WHERE us.product_bom_id = $1
    ORDER BY us.line_no, us.id
    `,
    [id]
  );

  const altMap = await loadAlternatives(satirlar.rows.map((r) => r.id));
  const withAlts = satirlar.rows.map((r) => ({
    ...r,
    alternatifler: altMap.get(r.id) || [],
  }));

  return {
    ...baslik.rows[0],
    satirlar: withAlts,
    agac: satirAgaciKur(withAlts),
  };
}

function buildListWhere(req) {
  const q = req.query || {};
  const firmaId = firmaIdFromReq(req);
  const params = [];
  const where = [];

  if (firmaId) {
    params.push(firmaId);
    where.push(`(ua.company_id = $${params.length} OR s.company_id = $${params.length})`);
  }

  const onlyMamul = q.type !== 'hepsi';
  if (onlyMamul) where.push(`s.item_type IN ('Mamul', 'YariMamul')`);

  const silinen = boolOr(q.silindi ?? q.silinen, false);
  if (!silinen) {
    where.push(`COALESCE(ua.silindi, FALSE) = FALSE`);
  } else {
    where.push(`COALESCE(ua.silindi, FALSE) = TRUE`);
  }

  const addEq = (col, val) => {
    if (val == null || val === '') return;
    params.push(val);
    where.push(`${col} = $${params.length}`);
  };
  const addLike = (col, val) => {
    if (val == null || val === '') return;
    params.push(`%${String(val).trim()}%`);
    where.push(`${col} ILIKE $${params.length}`);
  };

  addEq('ua.plant_id', q.plant_id);
  addEq('ua.finished_good_item_id', q.finished_good_item_id);
  addEq('ua.category', q.category);
  addEq('ua.alt_no', q.alt_no);
  addEq('ua.bom_type', q.bom_type);
  addEq('ua.design_department', q.design_department);
  addEq('ua.bom_status', q.bom_status);
  addEq('ua.fg_warehouse_id', q.fg_warehouse_id);
  addEq('ua.version_code', q.version_code);
  addLike('ua.bom_code', q.bom_code);
  addLike('ua.bom_name', q.bom_name || q.aciklama);
  addLike('ua.alt_description', q.alt_description);
  addLike('s.item_code', q.item_code || q.malzeme_no);

  if (q.is_active != null && q.is_active !== '') {
    addEq('ua.is_active', boolOr(q.is_active, true));
  }

  return { where, params };
}

router.get('/', async (req, res) => {
  try {
    const { where, params } = buildListWhere(req);
    const liste = await pool.query(
      `
      SELECT ua.id
      FROM boms ua
      JOIN items s ON s.id = ua.finished_good_item_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ua.id DESC
      `,
      params
    );
    const result = [];
    for (const a of liste.rows) result.push(await agacGetir(a.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Ön maliyet — kaydedilmiş ağaç üzerinden stok son_cost * brüt miktar */
router.get('/:id/on-maliyet', async (req, res) => {
  try {
    const agac = await agacGetir(req.params.id);
    if (!agac) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
    const baz = Math.max(0.000001, Number(agac.quantity) || 1);
    const hedefQty = Math.max(0, Number(req.query.quantity) || baz);
    const carpan = hedefQty / baz;
    let toplam = 0;
    const kalemler = [];
    for (const s of agac.satirlar || []) {
      if (s.is_byproduct || String(s.component_type || '') === 'YanUrun') continue;
      const net = Number(s.net_quantity != null ? s.net_quantity : s.quantity) || 0;
      const scrap = Math.max(0, Number(s.scrap_pct) || 0);
      const brut = Number(s.gross_quantity != null ? s.gross_quantity : net * (1 + scrap / 100)) || 0;
      const birimMaliyet = Number(s.item_son_cost || s.std_cost || 0) || 0;
      const tutar = brut * carpan * birimMaliyet;
      toplam += tutar;
      kalemler.push({
        line_id: s.id,
        line_no: s.line_no,
        item_id: s.component_item_id,
        item_code: s.item_code,
        item_name: s.item_name,
        net_quantity: net * carpan,
        gross_quantity: brut * carpan,
        scrap_pct: scrap,
        uom_cost: birimMaliyet,
        amount: tutar,
        stop_explosion: Boolean(s.stop_explosion),
      });
    }
    // Kayda yaz (opsiyonel persist=1)
    if (boolOr(req.query.persist, true)) {
      await pool.query(
        `UPDATE boms SET precost_amount=$2, precost_at=NOW(), updated_at=NOW() WHERE id=$1`,
        [req.params.id, toplam]
      );
    }
    res.json({
      bom_id: Number(req.params.id),
      bom_code: agac.bom_code,
      quantity: hedefQty,
      precost_amount: toplam,
      kalemler,
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agac = await agacGetir(req.params.id);
    if (!agac) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
    res.json(agac);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

function pickHeader(body, { forInsert = false } = {}) {
  const out = {};
  for (const k of HEADER_COLS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  if (forInsert) {
    out.category = out.category || 'Standart';
    out.alt_no = out.alt_no != null && out.alt_no !== '' ? String(out.alt_no) : '00';
    out.bom_type = out.bom_type || 'Uretim';
    out.design_department = out.design_department || 'Standart';
    out.bom_status = out.bom_status || 'Aktif';
    out.element_interval = Number(out.element_interval) || 10;
    out.proportional_qty = out.proportional_qty != null ? Number(out.proportional_qty) : 1;
    out.is_cad = boolOr(out.is_cad, false);
    out.is_default_for_wo = boolOr(out.is_default_for_wo, false);
    out.is_disassembly = boolOr(out.is_disassembly, out.category === 'Demontaj');
    out.is_active = out.is_active == null ? true : boolOr(out.is_active, true);
    out.silindi = boolOr(out.silindi, false);
    out.min_quantity = out.min_quantity ?? 0;
    out.max_quantity = out.max_quantity ?? 999999999;
    out.quantity = out.quantity != null ? Number(out.quantity) : 1;
    out.wo_change_mode = out.wo_change_mode || 'Serbest';
    out.lock_when_used_in_route = boolOr(out.lock_when_used_in_route, false);
  }
  return out;
}

function lineValues(satir, urunAgaciId, ustSatirId, siraNo) {
  const qty = normalizeLineQty(satir);
  const isBy = boolOr(satir.is_byproduct, false) || String(satir.component_type || '') === 'YanUrun';
  const isPh = boolOr(satir.is_phantom, false) || String(satir.component_type || '') === 'Phantom';
  return [
    urunAgaciId,
    satir.component_item_id,
    qty.quantity,
    satir.uom_code || null,
    satir.line_no || siraNo,
    ustSatirId,
    satir.component_type || 'Stok',
    satir.component_alt_no != null ? String(satir.component_alt_no) : '00',
    satir.line_description || satir.description || null,
    qty.scrap_pct,
    satir.operation_seq != null && satir.operation_seq !== '' ? Number(satir.operation_seq) : null,
    boolOr(satir.is_fixed_qty, false),
    satir.goes_to_wo == null ? true : boolOr(satir.goes_to_wo, true),
    isPh,
    isBy,
    satir.valid_from || null,
    satir.valid_to || null,
    // gap
    satir.line_type || null,
    qty.qty_entry_type,
    qty.net_quantity,
    qty.gross_quantity,
    satir.warehouse_id || null,
    satir.operation_code || null,
    satir.operation_name || null,
    satir.operation_no != null ? String(satir.operation_no) : null,
    boolOr(satir.stop_explosion, false),
    boolOr(satir.no_consume_on_receipt, false),
    boolOr(satir.no_subcontract, false),
    satir.byproduct_cost_ratio != null ? Number(satir.byproduct_cost_ratio) : 0,
    boolOr(satir.is_disassemble, false),
    satir.disassemble_operation_code || null,
    satir.disassemble_operation_name || null,
    satir.disassemble_operation_no != null ? String(satir.disassemble_operation_no) : null,
    satir.position_no || null,
    satir.drawing_no || null,
    satir.line_revision || null,
    satir.brand_code || null,
    satir.attr3_code || null,
    satir.delivery_control_code || null,
    boolOr(satir.packaging_dependent, false),
    satir.packaging_type_code || null,
    satir.packaging_type_name || null,
    satir.line_description_2 || null,
    satir.std_cost != null ? Number(satir.std_cost) : null,
    satir.precost_amount != null ? Number(satir.precost_amount) : null,
  ];
}

const LINE_INSERT_SQL = `
  INSERT INTO bom_lines (
    product_bom_id, component_item_id, quantity, uom_code, line_no, parent_line_id,
    component_type, component_alt_no, line_description, scrap_pct, operation_seq,
    is_fixed_qty, goes_to_wo, is_phantom, is_byproduct, valid_from, valid_to,
    line_type, qty_entry_type, net_quantity, gross_quantity, warehouse_id,
    operation_code, operation_name, operation_no,
    stop_explosion, no_consume_on_receipt, no_subcontract, byproduct_cost_ratio,
    is_disassemble, disassemble_operation_code, disassemble_operation_name, disassemble_operation_no,
    position_no, drawing_no, line_revision, brand_code, attr3_code, delivery_control_code,
    packaging_dependent, packaging_type_code, packaging_type_name,
    line_description_2, std_cost, precost_amount
  ) VALUES (
    $1,$2,$3,$4,$5,$6,
    $7,$8,$9,$10,$11,
    $12,$13,$14,$15,$16,$17,
    $18,$19,$20,$21,$22,
    $23,$24,$25,
    $26,$27,$28,$29,
    $30,$31,$32,$33,
    $34,$35,$36,$37,$38,$39,
    $40,$41,$42,
    $43,$44,$45
  )
  RETURNING id
`;

async function insertAlternatives(client, bomLineId, alts) {
  const list = Array.isArray(alts) ? alts : [];
  let prio = 10;
  for (const a of list) {
    if (!a?.alt_item_id && !a?.component_item_id) continue;
    const itemId = a.alt_item_id || a.component_item_id;
    await client.query(
      `
      INSERT INTO bom_line_alternatives (
        bom_line_id, alt_item_id, priority, quantity, uom_code,
        quality_code, color_code, packaging_type_code, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        bomLineId,
        itemId,
        a.priority != null ? Number(a.priority) : prio,
        a.quantity != null && a.quantity !== '' ? Number(a.quantity) : null,
        a.uom_code || null,
        a.quality_code || null,
        a.color_code || null,
        a.packaging_type_code || null,
        a.notes || null,
      ]
    );
    prio += 10;
  }
}

async function satirEkle(client, urunAgaciId, satir, ustSatirId, siraNo) {
  const ins = await client.query(LINE_INSERT_SQL, lineValues(satir, urunAgaciId, ustSatirId, siraNo));
  const id = ins.rows[0].id;
  await insertAlternatives(client, id, satir.alternatifler || satir.alternatives || []);
  let altSira = 10;
  for (const alt of satir.alt_satirlar || []) {
    await satirEkle(client, urunAgaciId, alt, id, altSira);
    altSira += 10;
  }
  return id;
}

async function clearOtherDefaultWo(client, finishedGoodItemId, keepId) {
  if (!finishedGoodItemId) return;
  await client.query(
    `UPDATE boms SET is_default_for_wo = FALSE
     WHERE finished_good_item_id = $1 AND id IS DISTINCT FROM $2 AND is_default_for_wo = TRUE`,
    [finishedGoodItemId, keepId || 0]
  );
}

async function assertNotLockedByRoute(client, bomId, lockFlag) {
  if (!lockFlag) return;
  const used = await client.query(
    `SELECT id, route_code FROM routings
     WHERE product_bom_id = $1 AND COALESCE(silindi, FALSE) = FALSE
     LIMIT 1`,
    [bomId]
  );
  if (used.rows[0]) {
    const err = new Error(
      `Bu ürün ağacı rotada kullanılıyor (${used.rows[0].route_code}); yapı değişikliği engellendi.`
    );
    err.status = 409;
    throw err;
  }
}

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const h = pickHeader(body, { forInsert: true });
    const satirlar = Array.isArray(body.satirlar) ? body.satirlar : [];
    if (!h.finished_good_item_id || !h.bom_code || !h.bom_name) {
      return res.status(400).json({
        hata: 'finished_good_item_id, bom_code ve bom_name zorunlu.',
      });
    }
    if (!h.bom_type || !h.design_department || !h.bom_status) {
      return res.status(400).json({ hata: 'Ürün ağacı tipi, tasarım bölümü ve statü zorunlu.' });
    }

    const userCode = req.user?.user_code || req.headers['x-kullanici-kodu'] || null;

    const kayitId = await withTransaction(pool, async (client) => {
      let firmaId = firmaIdFromReq(req) || Number(h.company_id) || null;
      if (!firmaId) {
        const st = await client.query('SELECT company_id, uom_code FROM items WHERE id=$1', [h.finished_good_item_id]);
        firmaId = st.rows[0]?.company_id || null;
        if (!h.uom_code) h.uom_code = st.rows[0]?.uom_code || null;
      } else if (!h.uom_code) {
        const st = await client.query('SELECT uom_code FROM items WHERE id=$1', [h.finished_good_item_id]);
        h.uom_code = st.rows[0]?.uom_code || null;
      }

      const baslik = await client.query(
        `
        INSERT INTO boms (
          finished_good_item_id, bom_code, bom_name, quantity, uom_code,
          valid_from, valid_to, min_quantity, max_quantity, company_id, plant_id,
          category, alt_no, bom_type, design_department, bom_status,
          element_interval, proportional_qty, drawing_no, revision,
          customer_partner_id, is_cad, notes, is_default_for_wo, is_disassembly,
          is_active, silindi, created_by, updated_by, updated_at,
          fg_warehouse_id, alt_description, version_code, brand_code, attr3_code,
          wo_change_mode, lock_when_used_in_route
        ) VALUES (
          $1,$2,$3,COALESCE($4,1),$5,
          $6,$7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,
          $17,$18,$19,$20,
          $21,$22,$23,$24,$25,
          $26,$27,$28,$28,NOW(),
          $29,$30,$31,$32,$33,
          $34,$35
        )
        RETURNING id
        `,
        [
          h.finished_good_item_id,
          h.bom_code,
          h.bom_name,
          h.quantity,
          h.uom_code || null,
          h.valid_from || null,
          h.valid_to || null,
          h.min_quantity,
          h.max_quantity,
          firmaId,
          h.plant_id || null,
          h.category,
          h.alt_no,
          h.bom_type,
          h.design_department,
          h.bom_status,
          h.element_interval,
          h.proportional_qty,
          h.drawing_no || null,
          h.revision || null,
          h.customer_partner_id || null,
          h.is_cad,
          h.notes || null,
          h.is_default_for_wo,
          h.is_disassembly,
          h.is_active,
          h.silindi,
          userCode,
          h.fg_warehouse_id || null,
          h.alt_description || null,
          h.version_code || null,
          h.brand_code || null,
          h.attr3_code || null,
          h.wo_change_mode || 'Serbest',
          boolOr(h.lock_when_used_in_route, false),
        ]
      );
      const uaId = baslik.rows[0].id;
      if (h.is_default_for_wo) {
        await clearOtherDefaultWo(client, h.finished_good_item_id, uaId);
      }
      const step = Number(h.element_interval) || 10;
      let sira = step;
      for (const s of satirlar) {
        if (!s.component_item_id) continue;
        await satirEkle(client, uaId, s, null, sira);
        sira += step;
      }
      return uaId;
    });

    res.status(201).json(await agacGetir(kayitId));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const h = pickHeader(body);
    const userCode = req.user?.user_code || req.headers['x-kullanici-kodu'] || null;
    const satirlar = body.satirlar;

    const kayitId = await withTransaction(pool, async (client) => {
      const mevcut = await client.query('SELECT * FROM boms WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!mevcut.rows[0]) {
        const err = new Error('Ürün ağacı bulunamadı.');
        err.status = 404;
        throw err;
      }
      const cur = mevcut.rows[0];
      const next = {
        bom_name: h.bom_name != null ? h.bom_name : cur.bom_name,
        quantity: h.quantity != null ? h.quantity : cur.quantity,
        uom_code: h.uom_code !== undefined ? h.uom_code : cur.uom_code,
        finished_good_item_id: h.finished_good_item_id || cur.finished_good_item_id,
        valid_from: h.valid_from !== undefined ? h.valid_from : cur.valid_from,
        valid_to: h.valid_to !== undefined ? h.valid_to : cur.valid_to,
        min_quantity: h.min_quantity !== undefined ? h.min_quantity : cur.min_quantity,
        max_quantity: h.max_quantity !== undefined ? h.max_quantity : cur.max_quantity,
        plant_id: h.plant_id !== undefined ? h.plant_id : cur.plant_id,
        company_id: h.company_id !== undefined ? h.company_id : cur.company_id,
        category: h.category || cur.category,
        alt_no: h.alt_no != null ? String(h.alt_no) : cur.alt_no,
        bom_type: h.bom_type || cur.bom_type,
        design_department: h.design_department || cur.design_department,
        bom_status: h.bom_status || cur.bom_status,
        element_interval: h.element_interval != null ? Number(h.element_interval) : cur.element_interval,
        proportional_qty: h.proportional_qty != null ? Number(h.proportional_qty) : cur.proportional_qty,
        drawing_no: h.drawing_no !== undefined ? h.drawing_no : cur.drawing_no,
        revision: h.revision !== undefined ? h.revision : cur.revision,
        customer_partner_id: h.customer_partner_id !== undefined ? h.customer_partner_id : cur.customer_partner_id,
        is_cad: h.is_cad !== undefined ? boolOr(h.is_cad, false) : cur.is_cad,
        notes: h.notes !== undefined ? h.notes : cur.notes,
        is_default_for_wo: h.is_default_for_wo !== undefined ? boolOr(h.is_default_for_wo, false) : cur.is_default_for_wo,
        is_disassembly: h.is_disassembly !== undefined
          ? boolOr(h.is_disassembly, false)
          : (h.category === 'Demontaj' ? true : cur.is_disassembly),
        is_active: h.is_active !== undefined ? boolOr(h.is_active, true) : cur.is_active,
        silindi: h.silindi !== undefined ? boolOr(h.silindi, false) : cur.silindi,
        fg_warehouse_id: h.fg_warehouse_id !== undefined ? h.fg_warehouse_id : cur.fg_warehouse_id,
        alt_description: h.alt_description !== undefined ? h.alt_description : cur.alt_description,
        version_code: h.version_code !== undefined ? h.version_code : cur.version_code,
        brand_code: h.brand_code !== undefined ? h.brand_code : cur.brand_code,
        attr3_code: h.attr3_code !== undefined ? h.attr3_code : cur.attr3_code,
        wo_change_mode: h.wo_change_mode || cur.wo_change_mode || 'Serbest',
        lock_when_used_in_route: h.lock_when_used_in_route !== undefined
          ? boolOr(h.lock_when_used_in_route, false)
          : Boolean(cur.lock_when_used_in_route),
      };
      if (!next.bom_name) {
        const err = new Error('bom_name zorunlu.');
        err.status = 400;
        throw err;
      }

      if (Array.isArray(satirlar)) {
        await assertNotLockedByRoute(client, Number(req.params.id), next.lock_when_used_in_route);
      }

      await client.query(
        `UPDATE boms SET
          bom_name=$2, quantity=$3, uom_code=$4, finished_good_item_id=$5,
          valid_from=$6, valid_to=$7, min_quantity=$8, max_quantity=$9,
          plant_id=$10, company_id=COALESCE($11, company_id),
          category=$12, alt_no=$13, bom_type=$14, design_department=$15, bom_status=$16,
          element_interval=$17, proportional_qty=$18, drawing_no=$19, revision=$20,
          customer_partner_id=$21, is_cad=$22, notes=$23,
          is_default_for_wo=$24, is_disassembly=$25, is_active=$26, silindi=$27,
          fg_warehouse_id=$28, alt_description=$29, version_code=$30, brand_code=$31, attr3_code=$32,
          wo_change_mode=$33, lock_when_used_in_route=$34,
          updated_by=$35, updated_at=NOW()
         WHERE id=$1`,
        [
          req.params.id,
          next.bom_name,
          next.quantity,
          next.uom_code,
          next.finished_good_item_id,
          next.valid_from || null,
          next.valid_to || null,
          next.min_quantity,
          next.max_quantity,
          next.plant_id || null,
          next.company_id || null,
          next.category,
          next.alt_no,
          next.bom_type,
          next.design_department,
          next.bom_status,
          next.element_interval,
          next.proportional_qty,
          next.drawing_no || null,
          next.revision || null,
          next.customer_partner_id || null,
          next.is_cad,
          next.notes || null,
          next.is_default_for_wo,
          next.is_disassembly,
          next.is_active,
          next.silindi,
          next.fg_warehouse_id || null,
          next.alt_description || null,
          next.version_code || null,
          next.brand_code || null,
          next.attr3_code || null,
          next.wo_change_mode,
          next.lock_when_used_in_route,
          userCode,
        ]
      );

      if (next.is_default_for_wo) {
        await clearOtherDefaultWo(client, next.finished_good_item_id, Number(req.params.id));
      }

      if (Array.isArray(satirlar)) {
        await client.query('DELETE FROM bom_lines WHERE product_bom_id=$1', [req.params.id]);
        const step = Number(next.element_interval) || 10;
        let sira = step;
        for (const s of satirlar) {
          if (!s.component_item_id) continue;
          const hasQty = s.quantity != null || s.net_quantity != null || s.gross_quantity != null;
          if (!hasQty) continue;
          await satirEkle(client, Number(req.params.id), s, null, sira);
          sira += step;
        }
      }
      return Number(req.params.id);
    });

    res.json(await agacGetir(kayitId));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

/** Soft delete (BOMT01: Silindi işareti) veya hard delete (?hard=1 / silinen listeden) */
router.delete('/:id', async (req, res) => {
  try {
    const hard = boolOr(req.query.hard, false);
    if (hard) {
      const result = await pool.query(`DELETE FROM boms WHERE id=$1 RETURNING id`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
      return res.json({ silindi: true, hard: true, id: Number(req.params.id) });
    }
    const result = await pool.query(
      `UPDATE boms SET silindi=TRUE, is_active=FALSE, updated_at=NOW() WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
    res.json({ silindi: true, hard: false, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
