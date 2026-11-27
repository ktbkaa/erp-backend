const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { faturaEslestir } = require('../src/services/faturaEslestirmeService');
const { faturadanMuhasebe } = require('../src/services/muhasebeEntegrasyonService');
const { belgeHtml } = require('../src/services/belgePdfService');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const {
  pickFields,
  appendInsert,
  FATURA_BASLIK,
  FATURA_SATIR,
} = require('../src/utils/belgeAlanlari');

const EBELGE_ALANLAR = [
  'scenario', 'invoice_category', 'ozellestirme_no', 'uuid_ettn',
  'payment_due_days', 'payment_term_code', 'currency_code', 'exchange_rate',
  'ship_to_address', 'description', 'invoice_date',
  'net_amount', 'total_discount', 'tax_amount', 'payable_amount',
  'movement_code_id', 'sales_order_id', 'delivery_note_id', 'goods_receipt_id',
  'source_document_type', 'source_document_id', 'status', 'vat_rate_varsayilan',
];

/** Başlık güncellemesi: e-belge + FATURA_BASLIK birleşik */
function baslikUpdateParams(body) {
  return pickFields({ ...ebelgeParams(body), ...body }, FATURA_BASLIK);
}

async function faturaGetir(id, clientOrPool = pool) {
  const f = await clientOrPool.query(
    `
    SELECT f.*, c.partner_code, c.partner_name
    FROM invoices f
    JOIN partners c ON f.partner_id = c.id
    WHERE f.id = $1
    `,
    [id]
  );
  if (!f.rows[0]) return null;
  const kalemler = await clientOrPool.query(
    `
    SELECT fd.*, s.item_code, s.item_name
    FROM invoice_lines fd
    JOIN items s ON fd.item_id = s.id
    WHERE fd.invoice_id = $1
    ORDER BY fd.id
    `,
    [id]
  );
  return { ...f.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows };
}

function ebelgeParams(body) {
  const out = {};
  for (const k of EBELGE_ALANLAR) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

router.get('/', async (req, res, next) => {
  try {
    const { invoice_type, partner_id, status } = req.query;
    const where = [];
    const params = [];
    if (invoice_type) {
      params.push(invoice_type);
      where.push(`f.invoice_type = $${params.length}`);
    }
    if (partner_id) {
      params.push(Number(partner_id));
      where.push(`f.partner_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`f.status = $${params.length}`);
    }
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`f.company_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // N+1 giderimi: tek sorguda başlık + satır sayısı
    const liste = await pool.query(
      `
      SELECT f.*, c.partner_code, c.partner_name,
             (SELECT COUNT(*)::int FROM invoice_lines fd WHERE fd.invoice_id = f.id) AS kalem_sayisi
      FROM invoices f
      JOIN partners c ON f.partner_id = c.id
      ${whereSql}
      ORDER BY f.id DESC
      `,
      params
    );
    // Detayları ihtiyaç halinde tek tek değil; liste için satırlar opsiyonel
    const withLines = String(req.query.detay || '').toLowerCase() === '1'
      || String(req.query.detay || '').toLowerCase() === 'true';
    if (!withLines) {
      return res.json(liste.rows.map((r) => ({ ...r, kalemler: [], satirlar: [] })));
    }
    const invoices = [];
    for (const r of liste.rows) invoices.push(await faturaGetir(r.id));
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const fatura = await faturaGetir(req.params.id);
    if (!fatura) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    res.json(fatura);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { invoice_no, partner_id, invoice_type } = req.body;
    const kalemler = req.body.kalemler || req.body.satirlar;
    if (!partner_id) return res.status(400).json({ hata: 'partner_id zorunludur.' });
    if (!Array.isArray(kalemler) || kalemler.length === 0) {
      return res.status(400).json({ hata: 'En az bir fatura kalemi gerekli.' });
    }
    const ekstra = baslikUpdateParams(req.body);

    const id = await withTransaction(pool, async (client) => {
      const tur = invoice_type || ekstra.invoice_category || 'Satis';
      const seri = String(tur).toLowerCase().includes('alis') ? 'ALIS_FATURA' : 'FATURA';
      const no = invoice_no || (await sonrakiBelgeNo(client, seri));

      let total_amount = 0;
      let tax_amount = 0;
      for (const k of kalemler) {
        const satir = Number(k.quantity) * Number(k.unit_price);
        const kdvOran = Number(k.vat_rate ?? ekstra.vat_rate_varsayilan ?? 20);
        total_amount += satir;
        tax_amount += satir * (kdvOran / 100);
      }

      const extras = { ...ekstra };
      delete extras.vat_rate_varsayilan;

      if (extras.remaining_amount == null) extras.remaining_amount = total_amount + tax_amount;
      const baslik = appendInsert(
        ['invoice_no', 'partner_id', 'invoice_type', 'total_amount', 'net_amount', 'tax_amount', 'payable_amount'],
        [no, partner_id, tur, total_amount, total_amount, tax_amount, total_amount + tax_amount],
        extras
      );
      const faturaSonuc = await client.query(
        `INSERT INTO invoices (${baslik.cols.join(',')}) VALUES (${baslik.placeholders}) RETURNING id`,
        baslik.vals
      );
      const faturaId = faturaSonuc.rows[0].id;

      let sira = 1;
      for (const k of kalemler) {
        if (!k.item_id || k.quantity == null || k.unit_price == null) {
          throw Object.assign(new Error('Her kalemde item_id, quantity ve unit_price zorunludur.'), { status: 400 });
        }
        const satirToplam = Number(k.quantity) * Number(k.unit_price);
        const kdvOran = Number(k.vat_rate ?? ekstra.vat_rate_varsayilan ?? 20);
        const kdvTutari = satirToplam * (kdvOran / 100);
        const satirEx = pickFields(k, FATURA_SATIR);
        if (satirEx.amount_ex_tax == null) satirEx.amount_ex_tax = satirToplam;
        if (satirEx.amount_ttc == null) satirEx.amount_ttc = satirToplam + kdvTutari;
        if (satirEx.net_unit_price == null) satirEx.net_unit_price = k.unit_price;
        if (satirEx.line_no == null) satirEx.line_no = sira++;
        if (satirEx.vat_rate == null) satirEx.vat_rate = kdvOran;
        if (satirEx.vat_amount == null) satirEx.vat_amount = kdvTutari;
        if (satirEx.uom_code == null) satirEx.uom_code = k.uom_code || null;
        const sat = appendInsert(
          ['invoice_id', 'item_id', 'quantity', 'unit_price', 'total_amount', 'goods_service_amount'],
          [faturaId, k.item_id, k.quantity, k.unit_price, satirToplam, satirToplam],
          satirEx
        );
        await client.query(
          `INSERT INTO invoice_lines (${sat.cols.join(',')}) VALUES (${sat.placeholders})`,
          sat.vals
        );
      }
      return faturaId;
    });

    res.status(201).json(await faturaGetir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { invoice_type, partner_id } = req.body;
    const kalemler = req.body.kalemler || req.body.satirlar;
    const ekstra = baslikUpdateParams(req.body);

    const id = await withTransaction(pool, async (client) => {
      const mevcut = await client.query('SELECT id FROM invoices WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!mevcut.rows[0]) {
        throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
      }

      const sets = [];
      const params = [req.params.id];
      if (invoice_type !== undefined) {
        params.push(invoice_type);
        sets.push(`invoice_type = $${params.length}`);
      }
      if (partner_id !== undefined) {
        params.push(partner_id);
        sets.push(`partner_id = $${params.length}`);
      }
      for (const [k, v] of Object.entries(ekstra)) {
        if (k === 'vat_rate_varsayilan') continue;
        params.push(v);
        sets.push(`${k} = $${params.length}`);
      }

      if (Array.isArray(kalemler)) {
        let toplam = 0;
        let tax_amount = 0;
        for (const k of kalemler) {
          const satir = Number(k.quantity) * Number(k.unit_price);
          const kdvOran = Number(k.vat_rate ?? 20);
          toplam += satir;
          tax_amount += satir * (kdvOran / 100);
        }
        params.push(toplam);
        sets.push(`total_amount = $${params.length}`);
        params.push(toplam);
        sets.push(`net_amount = $${params.length}`);
        params.push(tax_amount);
        sets.push(`tax_amount = $${params.length}`);
        params.push(toplam + tax_amount);
        sets.push(`payable_amount = $${params.length}`);

        if (sets.length) {
          await client.query(`UPDATE invoices SET ${sets.join(', ')} WHERE id = $1`, params);
        }
        await client.query('DELETE FROM invoice_lines WHERE invoice_id=$1', [req.params.id]);
        let sira = 1;
        for (const k of kalemler) {
          if (!k.item_id || k.quantity == null || k.unit_price == null) continue;
          const satirToplam = Number(k.quantity) * Number(k.unit_price);
          const kdvOran = Number(k.vat_rate ?? 20);
          const kdvTutari = satirToplam * (kdvOran / 100);
          const satirEx = pickFields(k, FATURA_SATIR);
          if (satirEx.amount_ex_tax == null) satirEx.amount_ex_tax = satirToplam;
          if (satirEx.amount_ttc == null) satirEx.amount_ttc = satirToplam + kdvTutari;
          if (satirEx.net_unit_price == null) satirEx.net_unit_price = k.unit_price;
          if (satirEx.line_no == null) satirEx.line_no = sira++;
          if (satirEx.vat_rate == null) satirEx.vat_rate = kdvOran;
          if (satirEx.vat_amount == null) satirEx.vat_amount = kdvTutari;
          if (satirEx.uom_code == null) satirEx.uom_code = k.uom_code || null;
          const sat = appendInsert(
            ['invoice_id', 'item_id', 'quantity', 'unit_price', 'total_amount', 'goods_service_amount'],
            [req.params.id, k.item_id, k.quantity, k.unit_price, satirToplam, satirToplam],
            satirEx
          );
          await client.query(
            `INSERT INTO invoice_lines (${sat.cols.join(',')}) VALUES (${sat.placeholders})`,
            sat.vals
          );
        }
      } else if (sets.length) {
        await client.query(`UPDATE invoices SET ${sets.join(', ')} WHERE id = $1`, params);
      }
      return Number(req.params.id);
    });
    res.json(await faturaGetir(id));
  } catch (err) {
    next(err);
  }
});

/** POST /invoices/:id/eslestir — 3-way match (PUR-007) */
router.post('/:id/eslestir', async (req, res, next) => {
  try {
    const row = await withTransaction(pool, (client) => faturaEslestir(client, Number(req.params.id)));
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

/** POST /invoices/:id/eslestirme-onay */
router.post('/:id/eslestirme-onay', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE invoice_matches SET result='Uyumlu', description=COALESCE(description,'') || ' [Manuel onay]'
       WHERE invoice_id=$1
       RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) {
      const created = await withTransaction(pool, (client) => faturaEslestir(client, Number(req.params.id)));
      await pool.query(`UPDATE invoice_matches SET result='Uyumlu' WHERE id=$1`, [created.id]);
      return res.json({ ...created, result: 'Uyumlu' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

/** POST /invoices/:id/muhasebelestir — belge→fiş + cari (FIN-004/005) */
router.post('/:id/muhasebelestir', async (req, res, next) => {
  try {
    const result = await withTransaction(pool, (client) =>
      faturadanMuhasebe(client, Number(req.params.id), {
        kullaniciKodu: reqKullaniciKodu(req),
      })
    );
    // Durumu Onayli yap
    await pool.query(
      `UPDATE invoices SET status='Onayli' WHERE id=$1 AND COALESCE(status,'') <> 'Onayli'`,
      [req.params.id]
    ).catch(() => {});
    res.status(201).json({ ...result, fatura: await faturaGetir(req.params.id) });
  } catch (err) {
    next(err);
  }
});

/** GET yazdır / pdf */
router.get('/:id/yazdir', async (req, res, next) => {
  try {
    const f = await faturaGetir(req.params.id);
    if (!f) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    const html = belgeHtml({
      baslik: String(f.invoice_type || '').toLowerCase().includes('alis') ? 'Alış Faturası' : 'Satış Faturası',
      belgeNo: f.invoice_no,
      tarih: f.invoice_date || f.created_at,
      cari: f,
      satirlar: f.kalemler || [],
      toplamlar: {
        net_amount: f.net_amount,
        tax_amount: f.tax_amount,
        payable_amount: f.payable_amount,
        total_amount: f.total_amount,
      },
      ekstra: { uuid_ettn: f.uuid_ettn, description: f.description },
    });
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
});
router.get('/:id/pdf', (req, res) => res.redirect(302, `/invoices/${req.params.id}/yazdir`));

/** POST /invoices/:id/iade — iade faturası (ters amount) */
router.post('/:id/iade', async (req, res, next) => {
  try {
    const source = await faturaGetir(req.params.id);
    if (!source) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    const id = await withTransaction(pool, async (client) => {
      const alis = String(source.invoice_type || '').toLowerCase().includes('alis');
      const tur = alis ? 'AlisIade' : 'SatisIade';
      const seri = alis ? 'ALIS_FATURA' : 'FATURA';
      const no = await sonrakiBelgeNo(client, seri);
      const r = await client.query(
        `
        INSERT INTO invoices
          (invoice_no, partner_id, invoice_type, total_amount, net_amount, tax_amount, payable_amount,
           status, source_document_type, source_document_id, description)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'Taslak',$8,$9,$10)
        RETURNING id
        `,
        [
          no, source.partner_id, tur,
          -Math.abs(Number(source.total_amount || 0)),
          -Math.abs(Number(source.net_amount || source.total_amount || 0)),
          -Math.abs(Number(source.tax_amount || 0)),
          -Math.abs(Number(source.payable_amount || source.total_amount || 0)),
          alis ? 'ALIS_IADE' : 'SATIS_IADE',
          source.id,
          `İade ← ${source.invoice_no}`,
        ]
      );
      const iadeId = r.rows[0].id;
      for (const k of source.kalemler || []) {
        const quantity = Number(k.quantity);
        const uom_code = Number(k.unit_price);
        const satir = quantity * uom_code;
        await client.query(
          `
          INSERT INTO invoice_lines
            (invoice_id, item_id, quantity, unit_price, total_amount, uom_code, vat_rate, vat_amount, goods_service_amount)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `,
          [
            iadeId, k.item_id, quantity, uom_code, -Math.abs(satir), k.uom_code || null,
            k.vat_rate, -Math.abs(Number(k.vat_amount || 0)), -Math.abs(satir),
          ]
        );
      }
      return iadeId;
    });
    res.status(201).json(await faturaGetir(id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM invoices WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
