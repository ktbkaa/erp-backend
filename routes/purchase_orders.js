const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { cariTedarikciMi } = require('../src/utils/kodUretici');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');

async function siparisGetir(id) {
  const s = await pool.query(`
    SELECT sas.*, c.partner_code, c.partner_name, t.requisition_no
    FROM purchase_orders sas
    JOIN partners c ON c.id = sas.partner_id
    LEFT JOIN purchase_requisitions t ON t.id = sas.requisition_id
    WHERE sas.id = $1
  `, [id]);
  if (!s.rows[0]) return null;
  const satirlar = await pool.query(`
    SELECT ss.*,
           COALESCE(ss.item_code, st.item_code) AS item_code,
           COALESCE(ss.item_name, st.item_name) AS item_name,
           (ss.quantity - ss.giren_quantity) AS remaining_quantity
    FROM purchase_order_lines ss
    JOIN items st ON st.id = ss.item_id
    WHERE ss.purchase_order_id = $1
    ORDER BY COALESCE(ss.line_no, ss.id), ss.id
  `, [id]);
  return { ...s.rows[0], satirlar: satirlar.rows };
}

async function assertTedarikci(client, partner_id) {
  const cari = await client.query(
    'SELECT id, partner_code, partner_name, partner_type, is_active FROM partners WHERE id = $1',
    [partner_id]
  );
  if (!cari.rows[0]) throw new Error('Cari bulunamadı.');
  if (cari.rows[0].is_active === false) throw new Error('Cari is_inactive; satınalma yapılamaz.');
  if (!cariTedarikciMi(cari.rows[0].partner_type)) {
    throw new Error(
      `Satınalma siparişi yalnızca tedarikçiye açılır. Seçilen cari (${cari.rows[0].partner_code}) türü: ${cari.rows[0].partner_type}`
    );
  }
  return cari.rows[0];
}

async function insertSiparisSatir(client, siparisId, s, sira, baslikKur) {
  const stok = await client.query(
    `SELECT id, uom_code, purchase_uom, item_code, item_name, varsayilan_vat_rate
     FROM items WHERE id=$1`,
    [s.item_id]
  );
  if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.item_id}`);
  const st = stok.rows[0];
  const exchange_rate = Number(s.exchange_rate ?? baslikKur ?? 1) || 1;
  const hes = satirHesapla({
    quantity: s.quantity,
    unit_price: s.unit_price,
    discount_rate: s.discount_rate,
    discount_rate_2: s.discount_rate_2,
    discount_rate_3: s.discount_rate_3,
    vat_rate: s.vat_rate ?? st.varsayilan_vat_rate ?? 20,
    vat_mode: s.vat_mode || 'Haric',
    withholding_rate: s.withholding_rate,
    excise_rate: s.excise_rate,
    exchange_rate,
  });
  await client.query(
    `INSERT INTO purchase_order_lines (
        purchase_order_id, requisition_line_id, item_id, quantity, unit_price, uom_code,
        line_no, line_type, line_description, delivery_date, ship_date,
        discount_rate, discount_amount, discount_rate_2, discount_tutari2, discount_rate_3, discount_tutari3,
        vat_rate, vat_amount, vat_mode, amount_ex_tax, amount_ttc,
        withholding_code, withholding_rate, withholding_amount, excise_rate, excise_amount,
        currency_code, exchange_rate, rate_type, yp_unit_price, yp_amount,
        supplier_item_code, supplier_item_name, warehouse_id, project_code, region,
        rezervasyon_type, rezervasyon_iliski_no, item_code, item_name
     ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,COALESCE($8,'S'),$9,$10,$11,
        $12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,
        $23,$24,$25,$26,$27,
        $28,$29,$30,$31,$32,
        $33,$34,$35,$36,$37,
        $38,$39,$40,$41
     )`,
    [
      siparisId, s.requisition_line_id || null, s.item_id, s.quantity, Number(s.unit_price || 0),
      s.uom_code || st.purchase_uom || st.uom_code,
      sira, s.line_type || 'S', s.line_description || null, s.delivery_date || null, s.ship_date || null,
      hes.discount_rate, hes.discount_amount, hes.discount_rate_2, hes.discount_tutari2, hes.discount_rate_3, hes.discount_tutari3,
      hes.vat_rate, hes.vat_amount, hes.vat_mode, hes.amount_ex_tax, hes.amount_ttc,
      s.withholding_code || null, hes.withholding_rate, hes.withholding_amount, hes.excise_rate, hes.excise_amount,
      s.currency_code || null, exchange_rate, s.rate_type || null, hes.yp_unit_price, hes.yp_amount,
      s.supplier_item_code || null, s.supplier_item_name || null,
      s.warehouse_id || null, s.project_code || null, s.region || null,
      s.rezervasyon_type || null, s.rezervasyon_iliski_no || null,
      s.item_code || st.item_code, s.item_name || st.item_name,
    ]
  );
  return { ...hes, quantity: s.quantity, unit_price: Number(s.unit_price || 0) };
}

async function replaceSiparisSatirlar(client, siparisId, satirlar, baslikKur) {
  await client.query('DELETE FROM purchase_order_lines WHERE purchase_order_id=$1', [siparisId]);
  const hesapli = [];
  let sira = 1;
  for (const s of satirlar || []) {
    if (!s.item_id || s.quantity == null) continue;
    const h = await insertSiparisSatir(client, siparisId, s, s.line_no || sira, baslikKur);
    hesapli.push(h);
    sira += 1;
  }
  const top = belgelerToplam(hesapli);
  await client.query(
    `UPDATE purchase_orders SET
        total_amount=$2, subtotal=$3, tax_amount=$4, grand_total=$5, discount_amount=$6
     WHERE id=$1`,
    [siparisId, top.total_amount, top.subtotal, top.tax_amount, top.grand_total, top.total_discount]
  );
  return top;
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let sql = 'SELECT id FROM purchase_orders';
    if (firmaId) {
      params.push(firmaId);
      sql += ` WHERE company_id = $${params.length}`;
    }
    sql += ' ORDER BY id DESC';
    const liste = await pool.query(sql, params);
    const result = [];
    for (const r of liste.rows) result.push(await siparisGetir(r.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const siparis = await siparisGetir(req.params.id);
    if (!siparis) return res.status(404).json({ hata: 'Satınalma siparişi bulunamadı.' });
    res.json(siparis);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const { partner_id, satirlar } = b;
    if (!partner_id) return res.status(400).json({ hata: 'partner_id zorunlu.' });
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const firmaId = b.company_id || firmaIdFromReq(req) || null;

    const id = await withTransaction(pool, async (client) => {
      await assertTedarikci(client, partner_id);
      const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
      const siparis = await client.query(
        `INSERT INTO purchase_orders
            (order_no, partner_id, plant_id, requisition_id, status, total_amount,
             company_id, currency_code, exchange_rate, rate_type, order_date, delivery_date, ship_date, warehouse_id,
             payment_term_code, payment_method, description, public_note, internal_note, project_code, region,
             supplier_order_no, delivery_term_code)
         VALUES ($1,$2,$3,$4,COALESCE($5,'Taslak'),0,
             $6,$7,COALESCE($8::numeric,1),$9,COALESCE($10::date,CURRENT_DATE),$11,$12,$13,
             $14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING id`,
        [
          no, partner_id, b.plant_id || null, b.requisition_id || null, b.status || 'Taslak',
          firmaId, b.currency_code || 'TRY', b.exchange_rate ?? 1, b.rate_type || null,
          b.order_date || null, b.delivery_date || null, b.ship_date || null, b.warehouse_id || null,
          b.payment_term_code || null, b.payment_method || null, b.description || null,
          b.public_note || null, b.internal_note || null, b.project_code || null, b.region || null,
          b.supplier_order_no || null, b.delivery_term_code || null,
        ]
      );
      const siparisId = siparis.rows[0].id;
      await replaceSiparisSatirlar(client, siparisId, satirlar, b.exchange_rate ?? 1);
      return siparisId;
    });

    res.status(201).json(await siparisGetir(id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.post('/talep-donustur', async (req, res) => {
  try {
    const { requisition_id, partner_id, birim_fiyatlar } = req.body;
    if (!requisition_id || !partner_id) {
      return res.status(400).json({ hata: 'requisition_id ve partner_id zorunlu.' });
    }

    const id = await withTransaction(pool, async (client) => {
      const talep = await client.query('SELECT * FROM purchase_requisitions WHERE id = $1 FOR UPDATE', [requisition_id]);
      if (!talep.rows[0]) throw new Error('Talep bulunamadı.');
      if (!['Acik', 'Onayli'].includes(talep.rows[0].status)) {
        throw new Error(`Talep dönüştürülemez. Durum: ${talep.rows[0].status}`);
      }
      const satirlar = await client.query(
        'SELECT * FROM purchase_requisition_lines WHERE requisition_id = $1 ORDER BY COALESCE(line_no, id)',
        [requisition_id]
      );
      if (satirlar.rows.length === 0) throw new Error('Talep satırı yok.');
      await assertTedarikci(client, partner_id);

      const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
      const fiyatMap = birim_fiyatlar || {};
      const t = talep.rows[0];
      const firmaId = t.company_id || firmaIdFromReq(req) || null;
      const siparis = await client.query(
        `INSERT INTO purchase_orders
            (order_no, partner_id, plant_id, requisition_id, status, total_amount, company_id,
             warehouse_id, project_code, region, currency_code, exchange_rate, rate_type, delivery_date)
         VALUES ($1,$2,$3,$4,'Onayli',0,$5,$6,$7,$8,COALESCE($9,'TRY'),COALESCE($10::numeric,1),$11,$12)
         RETURNING id`,
        [
          no, partner_id, t.plant_id, requisition_id, firmaId,
          t.warehouse_id || null, t.project_code || null, t.region || null,
          t.currency_code || 'TRY', t.exchange_rate ?? 1, t.rate_type || null, t.target_delivery_date || null,
        ]
      );
      const siparisId = siparis.rows[0].id;
      const mapped = satirlar.rows.map((sat) => ({
        ...sat,
        requisition_line_id: sat.id,
        unit_price: Number(
          fiyatMap[sat.item_id] ?? fiyatMap[String(sat.item_id)] ?? sat.tahmini_unit_price ?? 0
        ),
        currency_code: sat.currency_code || t.currency_code,
        exchange_rate: sat.exchange_rate ?? t.exchange_rate ?? 1,
        rate_type: sat.rate_type || t.rate_type,
        warehouse_id: sat.warehouse_id || t.warehouse_id,
        project_code: sat.project_code || t.project_code,
        region: sat.region || t.region,
        delivery_date: sat.delivery_date || t.target_delivery_date,
      }));
      await replaceSiparisSatirlar(client, siparisId, mapped, t.exchange_rate ?? 1);
      await client.query(`UPDATE purchase_requisitions SET status = 'SipariseDonustu' WHERE id = $1`, [requisition_id]);
      return siparisId;
    });

    res.status(201).json(await siparisGetir(id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const allowed = ['Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'];
    if (b.status && !allowed.includes(b.status)) {
      return res.status(400).json({ hata: `Geçersiz status. İzin verilen: ${allowed.join(', ')}` });
    }

    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query(
        'SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!mevcut.rows[0]) {
        const err = new Error('Sipariş bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (b.partner_id) await assertTedarikci(client, b.partner_id);

      await client.query(
        `UPDATE purchase_orders SET
            status = COALESCE($2, status),
            partner_id = COALESCE($3, partner_id),
            plant_id = COALESCE($4, plant_id),
            requisition_id = COALESCE($5, requisition_id),
            company_id = COALESCE($6, company_id),
            currency_code = COALESCE($7, currency_code),
            exchange_rate = COALESCE($8, exchange_rate),
            rate_type = COALESCE($9, rate_type),
            order_date = COALESCE($10::date, order_date),
            delivery_date = COALESCE($11::date, delivery_date),
            ship_date = COALESCE($12::date, ship_date),
            warehouse_id = COALESCE($13, warehouse_id),
            payment_term_code = COALESCE($14, payment_term_code),
            payment_method = COALESCE($15, payment_method),
            description = COALESCE($16, description),
            public_note = COALESCE($17, public_note),
            internal_note = COALESCE($18, internal_note),
            project_code = COALESCE($19, project_code),
            region = COALESCE($20, region),
            supplier_order_no = COALESCE($21, supplier_order_no),
            delivery_term_code = COALESCE($22, delivery_term_code),
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [
          req.params.id,
          b.status || null, b.partner_id || null, b.plant_id || null, b.requisition_id || null,
          b.company_id || null, b.currency_code || null, b.exchange_rate ?? null, b.rate_type || null,
          b.order_date || null, b.delivery_date || null, b.ship_date || null, b.warehouse_id || null,
          b.payment_term_code || null, b.payment_method || null, b.description ?? null,
          b.public_note ?? null, b.internal_note ?? null, b.project_code || null, b.region || null,
          b.supplier_order_no || null, b.delivery_term_code || null,
        ]
      );

      if (Array.isArray(b.satirlar)) {
        const exchange_rate = b.exchange_rate ?? mevcut.rows[0].exchange_rate ?? 1;
        await replaceSiparisSatirlar(client, Number(req.params.id), b.satirlar, exchange_rate);
      }
      return Number(req.params.id);
    });

    res.json(await siparisGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    const upd = await pool.query(
      `UPDATE purchase_orders SET status='Onayli', onay_date=CURRENT_TIMESTAMP
       WHERE id=$1 AND status='Taslak' RETURNING id`,
      [req.params.id]
    );
    if (!upd.rows[0]) {
      return res.status(400).json({ hata: 'Sipariş onaylanamadı (bulunamadı veya status Taslak değil).' });
    }
    res.json(await siparisGetir(upd.rows[0].id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM purchase_orders WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
