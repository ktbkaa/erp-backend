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
];

function satirAgaciKur(duzSatirlar) {
  const map = new Map();
  for (const s of duzSatirlar) {
    map.set(s.id, { ...s, alt_satirlar: [] });
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

async function agacGetir(id) {
  const baslik = await pool.query(
    `
    SELECT ua.*,
           s.item_code, s.item_name, s.item_type, s.uom_code AS item_uom_code,
           p.plant_code, p.plant_name,
           c.company_code, c.company_name,
           pr.partner_code AS customer_code, pr.partner_name AS customer_name
    FROM boms ua
    JOIN items s ON s.id = ua.finished_good_item_id
    LEFT JOIN plants p ON p.id = ua.plant_id
    LEFT JOIN companies c ON c.id = ua.company_id
    LEFT JOIN partners pr ON pr.id = ua.customer_partner_id
    WHERE ua.id = $1
    `,
    [id]
  );
  if (!baslik.rows[0]) return null;

  const satirlar = await pool.query(
    `
    SELECT us.*, st.item_code, st.item_name, st.item_type, st.uom_code AS item_uom_code
    FROM bom_lines us
    JOIN items st ON st.id = us.component_item_id
    WHERE us.product_bom_id = $1
    ORDER BY us.line_no, us.id
    `,
    [id]
  );

  return {
    ...baslik.rows[0],
    satirlar: satirlar.rows,
    agac: satirAgaciKur(satirlar.rows),
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
  addLike('ua.bom_code', q.bom_code);
  addLike('ua.bom_name', q.bom_name || q.aciklama);
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
  }
  return out;
}

function lineValues(satir, urunAgaciId, ustSatirId, siraNo) {
  return [
    urunAgaciId,
    satir.component_item_id,
    satir.quantity,
    satir.uom_code || null,
    satir.line_no || siraNo,
    ustSatirId,
    satir.component_type || 'Stok',
    satir.component_alt_no != null ? String(satir.component_alt_no) : '00',
    satir.line_description || satir.description || null,
    satir.scrap_pct != null ? Number(satir.scrap_pct) : 0,
    satir.operation_seq != null && satir.operation_seq !== '' ? Number(satir.operation_seq) : null,
    boolOr(satir.is_fixed_qty, false),
    satir.goes_to_wo == null ? true : boolOr(satir.goes_to_wo, true),
    boolOr(satir.is_phantom, false) || String(satir.component_type || '') === 'Phantom',
    boolOr(satir.is_byproduct, false) || String(satir.component_type || '') === 'YanUrun',
    satir.valid_from || null,
    satir.valid_to || null,
  ];
}

const LINE_INSERT_SQL = `
  INSERT INTO bom_lines (
    product_bom_id, component_item_id, quantity, uom_code, line_no, parent_line_id,
    component_type, component_alt_no, line_description, scrap_pct, operation_seq,
    is_fixed_qty, goes_to_wo, is_phantom, is_byproduct, valid_from, valid_to
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  RETURNING id
`;

async function satirEkle(client, urunAgaciId, satir, ustSatirId, siraNo) {
  const ins = await client.query(LINE_INSERT_SQL, lineValues(satir, urunAgaciId, ustSatirId, siraNo));
  const id = ins.rows[0].id;
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
    // Elemanlar sonra eklenebilir (BOMT01: önce Genel, sonra Elemanlar)
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
          is_active, silindi, created_by, updated_by, updated_at
        ) VALUES (
          $1,$2,$3,COALESCE($4,1),$5,
          $6,$7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,
          $17,$18,$19,$20,
          $21,$22,$23,$24,$25,
          $26,$27,$28,$28,NOW()
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
    if (!h.bom_name && body.bom_name === undefined) {
      // allow partial; but name usually required
    }
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
      };
      if (!next.bom_name) {
        const err = new Error('bom_name zorunlu.');
        err.status = 400;
        throw err;
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
          updated_by=$28, updated_at=NOW()
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
          if (!s.component_item_id || s.quantity == null) continue;
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
