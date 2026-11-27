const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { assertYetki, reqKullaniciKodu } = require('../src/utils/yetki');
const { epostaKuyrugaAl, gonderBir } = require('../src/services/epostaService');

const TALEP_BASLIK_KEYS = [
  'plant_id', 'description', 'supplier_partner_id', 'company_id', 'status',
  'warehouse_id', 'project_code', 'region', 'target_delivery_date', 'requisition_date',
  'currency_code', 'exchange_rate', 'rate_type', 'internal_note',
];

function pick(body, keys) {
  const out = {};
  for (const k of keys) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

async function talepGetir(id) {
  const t = await pool.query('SELECT * FROM purchase_requisitions WHERE id = $1', [id]);
  if (!t.rows[0]) return null;
  const satirlar = await pool.query(`
    SELECT ts.*,
           COALESCE(ts.item_code, s.item_code) AS item_code,
           COALESCE(ts.item_name, s.item_name) AS item_name,
           s.uom_code AS stock_uom
    FROM purchase_requisition_lines ts
    JOIN items s ON s.id = ts.item_id
    WHERE ts.requisition_id = $1
    ORDER BY COALESCE(ts.line_no, ts.id), ts.id
  `, [id]);
  return { ...t.rows[0], satirlar: satirlar.rows };
}

async function insertTalepSatir(client, talepId, s, sira) {
  const stok = await client.query(
    `SELECT id, uom_code, purchase_uom, item_code, item_name, varsayilan_vat_rate
     FROM items WHERE id = $1`,
    [s.item_id]
  );
  if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.item_id}`);
  const st = stok.rows[0];
  await client.query(
    `INSERT INTO purchase_requisition_lines (
        requisition_id, item_id, quantity, uom_code, line_no, line_type, line_description,
        delivery_date, warehouse_id, project_code, region,
        tahmini_unit_price, currency_code, exchange_rate, rate_type,
        vat_rate, vat_mode, discount_rate,
        supplier_item_code, supplier_item_name,
        rezervasyon_type, rezervasyon_iliski_no, item_code, item_name
     ) VALUES (
        $1,$2,$3,$4,$5,COALESCE($6,'S'),$7,
        $8,$9,$10,$11,
        COALESCE($12::numeric,0),$13,$14,$15,
        COALESCE($16::numeric,20),COALESCE($17,'Haric'),COALESCE($18::numeric,0),
        $19,$20,$21,$22,$23,$24
     )`,
    [
      talepId, s.item_id, s.quantity, s.uom_code || st.purchase_uom || st.uom_code, sira,
      s.line_type || 'S', s.line_description || null,
      s.delivery_date || null, s.warehouse_id || null, s.project_code || null, s.region || null,
      s.tahmini_unit_price ?? s.unit_price ?? 0,
      s.currency_code || null, s.exchange_rate ?? null, s.rate_type || null,
      s.vat_rate ?? st.varsayilan_vat_rate ?? 20, s.vat_mode || 'Haric', s.discount_rate ?? 0,
      s.supplier_item_code || null, s.supplier_item_name || null,
      s.rezervasyon_type || null, s.rezervasyon_iliski_no || null,
      s.item_code || st.item_code, s.item_name || st.item_name,
    ]
  );
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    let sql = 'SELECT id FROM purchase_requisitions';
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      sql += ` WHERE company_id = $${params.length}`;
    }
    sql += ' ORDER BY id DESC';
    const liste = await pool.query(sql, params);
    const result = [];
    for (const r of liste.rows) result.push(await talepGetir(r.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const talep = await talepGetir(req.params.id);
    if (!talep) return res.status(404).json({ hata: 'Talep bulunamadı.' });
    const firmaId = firmaIdFromReq(req);
    if (firmaId && talep.company_id != null && Number(talep.company_id) !== Number(firmaId)) {
      return res.status(404).json({ hata: 'Talep bulunamadı.' });
    }
    res.json(talep);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const { satirlar } = body;
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const kod = reqKullaniciKodu(req);
    let created_by = null;
    if (kod) created_by = await assertYetki(pool, kod, 'purchase_requisition_ref');
    const firmaId = body.company_id || firmaIdFromReq(req) || null;
    const p = pick(body, TALEP_BASLIK_KEYS);

    const id = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
      const baslik = await client.query(
        `INSERT INTO purchase_requisitions (
            requisition_no, plant_id, description, created_by_id, supplier_partner_id, company_id,
            warehouse_id, project_code, region, target_delivery_date, requisition_date,
            currency_code, exchange_rate, rate_type, internal_note
         ) VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,COALESCE($11::date,CURRENT_DATE),
            COALESCE($12,'TRY'),COALESCE($13::numeric,1),$14,$15
         ) RETURNING id`,
        [
          no, p.plant_id || null, p.description || null, created_by?.id || null,
          p.supplier_partner_id || null, firmaId,
          p.warehouse_id || null, p.project_code || null, p.region || null, p.target_delivery_date || null,
          p.requisition_date || null,
          p.currency_code || 'TRY', p.exchange_rate ?? 1, p.rate_type || null, p.internal_note || null,
        ]
      );
      const talepId = baslik.rows[0].id;
      let sira = 1;
      for (const s of satirlar) {
        if (!s.item_id || s.quantity == null) continue;
        await insertTalepSatir(client, talepId, s, s.line_no || sira);
        sira += 1;
      }
      return talepId;
    });

    res.status(201).json(await talepGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const { satirlar } = body;
    const allowed = ['Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'];
    if (body.status && !allowed.includes(body.status)) {
      return res.status(400).json({ hata: `Geçersiz status. İzin verilen: ${allowed.join(', ')}` });
    }
    const p = pick(body, TALEP_BASLIK_KEYS);

    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query(
        'SELECT id FROM purchase_requisitions WHERE id=$1 FOR UPDATE',
        [req.params.id]
      );
      if (!mevcut.rows[0]) {
        const err = new Error('Talep bulunamadı.');
        err.status = 404;
        throw err;
      }
      await client.query(
        `UPDATE purchase_requisitions SET
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            plant_id = COALESCE($4, plant_id),
            supplier_partner_id = COALESCE($5, supplier_partner_id),
            warehouse_id = COALESCE($6, warehouse_id),
            project_code = COALESCE($7, project_code),
            region = COALESCE($8, region),
            target_delivery_date = COALESCE($9::date, target_delivery_date),
            requisition_date = COALESCE($10::date, requisition_date),
            currency_code = COALESCE($11, currency_code),
            exchange_rate = COALESCE($12, exchange_rate),
            rate_type = COALESCE($13, rate_type),
            internal_note = COALESCE($14, internal_note),
            company_id = COALESCE($15, company_id)
         WHERE id = $1`,
        [
          req.params.id,
          p.description ?? null, p.status || null, p.plant_id || null,
          p.supplier_partner_id || null, p.warehouse_id || null, p.project_code || null, p.region || null,
          p.target_delivery_date || null, p.requisition_date || null,
          p.currency_code || null, p.exchange_rate ?? null, p.rate_type || null, p.internal_note ?? null,
          p.company_id || null,
        ]
      );
      if (Array.isArray(satirlar)) {
        await client.query('DELETE FROM purchase_requisition_lines WHERE requisition_id=$1', [req.params.id]);
        let sira = 1;
        for (const s of satirlar) {
          if (!s.item_id || s.quantity == null) continue;
          await insertTalepSatir(client, Number(req.params.id), s, s.line_no || sira);
          sira += 1;
        }
      }
      return Number(req.params.id);
    });

    res.json(await talepGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    const approved_by = await assertYetki(pool, reqKullaniciKodu(req), 'satinalma_onay');
    const epostaGonder = req.body.eposta !== false;

    const result = await withTransaction(pool, async (client) => {
      const upd = await client.query(
        `UPDATE purchase_requisitions SET
            status='Onayli', approved_by_id=$2, onay_date=CURRENT_TIMESTAMP,
            supplier_partner_id=COALESCE($3, supplier_partner_id)
         WHERE id=$1 AND status='Acik' RETURNING *`,
        [req.params.id, approved_by.id, req.body.supplier_partner_id || null]
      );
      if (!upd.rows[0]) {
        const err = new Error('Talep onaylanamadı (bulunamadı veya status Acik değil).');
        err.status = 400;
        throw err;
      }
      const talep = upd.rows[0];
      let eposta = null;
      if (epostaGonder) {
        let alici = req.body.alici_eposta || null;
        let cariAd = '';
        if (talep.supplier_partner_id) {
          const c = await client.query('SELECT partner_name, email FROM partners WHERE id=$1', [talep.supplier_partner_id]);
          alici = alici || c.rows[0]?.email || null;
          cariAd = c.rows[0]?.partner_name || '';
        }
        if (alici) {
          const satirlar = await client.query(
            `SELECT COALESCE(ts.item_code, s.item_code) AS item_code,
                    COALESCE(ts.item_name, s.item_name) AS item_name,
                    ts.quantity, ts.uom_code, ts.delivery_date
             FROM purchase_requisition_lines ts
             JOIN items s ON s.id = ts.item_id
             WHERE ts.requisition_id=$1 ORDER BY COALESCE(ts.line_no, ts.id)`,
            [talep.id]
          );
          const govde = [
            `Satınalma talebi onaylandı: ${talep.requisition_no}`,
            cariAd ? `Tedarikçi: ${cariAd}` : '',
            talep.project_code ? `Proje: ${talep.project_code}` : '',
            '',
            ...satirlar.rows.map((s) => `- ${s.item_code} ${s.item_name}: ${s.quantity} ${s.uom_code || ''}${s.delivery_date ? ` (teslim ${s.delivery_date})` : ''}`),
            '',
            talep.description || '',
          ].filter(Boolean).join('\n');
          eposta = await epostaKuyrugaAl(client, {
            kaynakTipi: 'SATINALMA_TALEP',
            kaynakId: talep.id,
            alici,
            konu: `Satınalma talebi ${talep.requisition_no}`,
            govde,
          });
          eposta = await gonderBir(client, eposta.id);
        }
      }
      return { talepId: talep.id, eposta };
    });

    const talep = await talepGetir(result.talepId);
    res.json({ ...talep, eposta: result.eposta });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM purchase_requisitions WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Talep bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
