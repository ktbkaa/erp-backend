const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { parametreAl } = require('../src/utils/yetki');
const {
  kullanilabilirNet,
  siparisRezerveEt,
  rezervasyonIptalSiparis,
} = require('../src/services/rezervasyonService');
const {
  pickFields,
  appendInsert,
  SIPARIS_BASLIK,
  SIPARIS_SATIR,
} = require('../src/utils/belgeAlanlari');

const { firmaIdFromReq, andFirma, andFirmaViaIsYeri, andStokFirma, andCariFirma } = require('../src/utils/firmaScope');
/** ATP: kullanılabilir stok (fiziksel − rezerv) vs sipariş kalemleri (REQ-SAL-008 / INV-004) */
async function atpKontrol(clientOrPool, kalemler, { sert = null, depoId = null } = {}) {
  let zorunlu = sert;
  if (zorunlu == null) {
    const vSert = await parametreAl(clientOrPool, 'ATP_SERT', 'Hayir');
    const vZorunlu = await parametreAl(clientOrPool, 'ATP_ZORUNLU', 'Hayir');
    zorunlu = String(vSert).toLowerCase() === 'evet'
      || String(vZorunlu).toLowerCase() === 'evet';
  }
  const uyari = [];
  for (const k of kalemler) {
    const stokId = k.item_id;
    const quantity = Number(k.quantity || 0);
    if (!stokId || quantity <= 0) continue;
    const net = await kullanilabilirNet(clientOrPool, stokId, depoId || null);
    if (net.kullanilabilir + 1e-9 < quantity) {
      uyari.push({
        item_id: stokId,
        item_code: k.item_code,
        istenen: quantity,
        bakiye: net.bakiye,
        rezerve: net.rezerve,
        kullanilabilir: net.kullanilabilir,
      });
    }
  }
  if (uyari.length && zorunlu) {
    const err = new Error(
      `ATP: yetersiz stok — ${uyari.map((u) => `${u.item_code || u.item_id}:${u.kullanilabilir}/${u.istenen}`).join(', ')}`
    );
    err.status = 409;
    err.detay = uyari;
    throw err;
  }
  return uyari;
}

async function siparisGetir(id) {
    const s = await pool.query(
        `
        SELECT sp.*, c.partner_code AS cari_kodu_ref, c.partner_name AS cari_adi_ref
        FROM sales_orders sp
        LEFT JOIN partners c ON c.id = sp.partner_id
        WHERE sp.id = $1
        `,
        [id]
    );
    if (!s.rows[0]) return null;
    const kalemler = await pool.query(
        `
        SELECT sd.*, st.item_code AS stok_kodu_ref, st.item_name AS stok_adi_ref,
               GREATEST(0, COALESCE(sd.quantity,0) - COALESCE(sd.shipped_quantity,0)) AS kalan_sevk_miktar,
               GREATEST(0, COALESCE(sd.quantity,0) - COALESCE(sd.delivered_quantity,0)) AS kalan_irsaliye_miktar,
               GREATEST(0, COALESCE(sd.quantity,0) - COALESCE(sd.invoiced_quantity,0)) AS kalan_fatura_miktar
        FROM sales_order_lines sd
        LEFT JOIN items st ON st.id = sd.item_id
        WHERE sd.sales_order_id = $1
        ORDER BY sd.id
        `,
        [id]
    );
    return { ...s.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows };
}

router.get('/', async (req, res) => {
    try {
        const { order_type, status } = req.query;
        const where = [];
        const params = [];
        if (order_type) {
            params.push(order_type);
            where.push(`order_type = $${params.length}`);
        }
        if (status) {
            params.push(status);
            where.push(`status = ${params.length}`);
        }
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
          params.push(firmaId);
          where.push(`company_id = $${params.length}`);
        }
        // Varsayılan: satış siparişleri (satınalma ayrı ekranda)
        if (!order_type && req.query.kapsam !== 'hepsi') {
            where.push(`(order_type ILIKE '%satis%' OR order_type ILIKE '%satış%' OR order_type = 'SatisSiparis' OR order_type = 'AlinanSiparis')`);
        }
        const sql = `
            SELECT id FROM sales_orders
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC
        `;
        const liste = await pool.query(sql, params);
        const sales_orders = [];
        for (const r of liste.rows) sales_orders.push(await siparisGetir(r.id));
        res.json(sales_orders);
    } catch (err) {
        console.error('Sipariş listeleme hatası:', err);
        res.status(500).json({ hata: 'Siparişler çekilirken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const siparis = await siparisGetir(req.params.id);
        if (!siparis) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        res.json(siparis);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

async function resolveCari(client, body) {
    if (body.partner_id) {
        const r = await client.query(
            'SELECT id, partner_code, partner_name FROM partners WHERE id = $1',
            [body.partner_id]
        );
        if (!r.rows[0]) throw new Error(`Cari bulunamadı (id=${body.partner_id}).`);
        return r.rows[0];
    }
    if (body.partner_code) {
        const r = await client.query(
            'SELECT id, partner_code, partner_name FROM partners WHERE partner_code = $1',
            [body.partner_code]
        );
        if (!r.rows[0]) throw new Error(`Belirtilen cari kodu (${body.partner_code}) sistemde bulunamadı!`);
        return r.rows[0];
    }
    throw new Error('partner_id veya partner_code zorunludur.');
}

async function resolveKalemler(client, kalemler) {
    const islenmis = [];
    let toplam = 0;
    for (const k of kalemler) {
        let stok;
        if (k.item_id) {
            const r = await client.query(
                'SELECT id, item_code, item_name, uom_code, sales_price FROM items WHERE id = $1',
                [k.item_id]
            );
            stok = r.rows[0];
        } else if (k.item_code) {
            const r = await client.query(
                'SELECT id, item_code, item_name, uom_code, sales_price FROM items WHERE item_code = $1',
                [k.item_code]
            );
            stok = r.rows[0];
        }
        if (!stok) throw new Error(`Stok bulunamadı (${k.item_id || k.item_code}).`);
        if (k.quantity == null) throw new Error('Her kalemde quantity zorunludur.');
        const unit_price =
            k.unit_price !== undefined && k.unit_price !== null
                ? Number(k.unit_price)
                : Number(stok.sales_price);
        const satirToplam = Number(k.quantity) * unit_price;
        toplam += satirToplam;
        islenmis.push({
            item_id: stok.id,
            item_code: stok.item_code,
            item_name: stok.item_name,
            stock_uom: stok.uom_code,
            quantity: k.quantity,
            unit_price,
            total_amount: satirToplam,
        });
    }
    return { islenmis, toplam };
}

router.post('/', async (req, res) => {
    try {
        const { order_no, order_date, order_type, status } = req.body;
        const kalemler = req.body.kalemler || req.body.satirlar;
        if (!order_type) {
            return res.status(400).json({ hata: 'order_type zorunludur.' });
        }
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'En az bir sipariş kalemi gerekli.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const cari = await resolveCari(client, req.body);
            const { islenmis, toplam } = await resolveKalemler(client, kalemler);

            const belgeTipi =
                String(order_type).toLowerCase().includes('verilen') ||
                String(order_type).toLowerCase().includes('satinal') ||
                String(order_type).toLowerCase().includes('satın')
                    ? 'SATINALMA_SIPARIS'
                    : 'SATIS_SIPARIS';

            // ATP yalnızca satış siparişlerinde
            let atpUyari = [];
            if (belgeTipi === 'SATIS_SIPARIS') {
                atpUyari = await atpKontrol(client, islenmis, { depoId: req.body.warehouse_id || null });
            }

            const no = order_no || (await sonrakiBelgeNo(client, belgeTipi));
            const extras = pickFields(req.body, SIPARIS_BASLIK);
            if (extras.subtotal == null) extras.subtotal = toplam;
            if (extras.grand_total == null) extras.grand_total = toplam;
            const baslik = appendInsert(
                ['order_no', 'partner_id', 'partner_code', 'partner_name', 'order_date', 'order_type', 'total_amount', 'status'],
                [no, cari.id, cari.partner_code, cari.partner_name, order_date || new Date(), order_type, toplam, status || 'Taslak'],
                extras
            );
            const siparisSonuc = await client.query(
                `INSERT INTO sales_orders (${baslik.cols.join(',')}) VALUES (${baslik.placeholders}) RETURNING id`,
                baslik.vals
            );
            client._atpUyari = atpUyari;
            const siparisId = siparisSonuc.rows[0].id;

            const bodySatirlar = req.body.kalemler || req.body.satirlar || [];
            for (let i = 0; i < islenmis.length; i++) {
                const ik = islenmis[i];
                const raw = bodySatirlar[i] || {};
                const satirEx = pickFields(raw, SIPARIS_SATIR);
                if (satirEx.amount_ex_tax == null) satirEx.amount_ex_tax = ik.total_amount;
                if (satirEx.net_unit_price == null) satirEx.net_unit_price = ik.unit_price;
                if (satirEx.line_no == null) satirEx.line_no = i + 1;
                const sat = appendInsert(
                    ['sales_order_id', 'item_id', 'item_code', 'item_name', 'stock_uom', 'quantity', 'unit_price', 'total_amount'],
                    [siparisId, ik.item_id, ik.item_code, ik.item_name, ik.stock_uom, ik.quantity, ik.unit_price, ik.total_amount],
                    satirEx
                );
                await client.query(
                    `INSERT INTO sales_order_lines (${sat.cols.join(',')}) VALUES (${sat.placeholders})`,
                    sat.vals
                );
            }
            return { siparisId, atpUyari };
        });

        const row = await siparisGetir(id.siparisId);
        res.status(201).json({ ...row, atp_uyari: id.atpUyari || [] });
    } catch (err) {
        console.error('Sipariş kayıt hatası:', err);
        const status = err.status || (String(err.message || '').includes('bulunamadı') ? 400 : 500);
        res.status(status).json({
            hata: err.message || 'Sipariş kaydedilirken bir pürüz çıktı.',
            detay: err.detay,
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { order_date, order_type, status } = req.body;
        const kalemler = req.body.kalemler || req.body.satirlar;

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                'SELECT * FROM sales_orders WHERE id=$1 FOR UPDATE',
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                const err = new Error('Sipariş bulunamadı.');
                err.status = 404;
                throw err;
            }

            let cari = {
                id: mevcut.rows[0].partner_id,
                partner_code: mevcut.rows[0].partner_code,
                partner_name: mevcut.rows[0].partner_name,
            };
            if (req.body.partner_id || req.body.partner_code) {
                cari = await resolveCari(client, req.body);
            }

            let toplam = mevcut.rows[0].total_amount;
            if (Array.isArray(kalemler)) {
                const resolved = await resolveKalemler(client, kalemler);
                toplam = resolved.toplam;
                await client.query('DELETE FROM sales_order_lines WHERE sales_order_id=$1', [req.params.id]);
                for (const ik of resolved.islenmis) {
                    await client.query(
                        `
                        INSERT INTO sales_order_lines
                            (sales_order_id, item_id, item_code, item_name, stock_uom, quantity, unit_price, total_amount)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                        `,
                        [
                            req.params.id, ik.item_id, ik.item_code, ik.item_name,
                            ik.stock_uom, ik.quantity, ik.unit_price, ik.total_amount,
                        ]
                    );
                }
            }

            await client.query(
                `
                UPDATE sales_orders SET
                    partner_id = $2,
                    partner_code = $3,
                    partner_name = $4,
                    order_date = COALESCE($5, order_date),
                    order_type = COALESCE($6, order_type),
                    status = COALESCE($7, status),
                    total_amount = $8
                WHERE id = $1
                `,
                [
                    req.params.id,
                    cari.id,
                    cari.partner_code,
                    cari.partner_name,
                    order_date || null,
                    order_type || null,
                    status || null,
                    toplam,
                ]
            );
            return Number(req.params.id);
        });

        res.json(await siparisGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** POST /sales_orders/:id/rezerve — stok rezervasyonu (INV-004) */
router.post('/:id/rezerve', async (req, res) => {
  try {
    const olusan = await withTransaction(pool, async (client) => {
      return siparisRezerveEt(client, Number(req.params.id), {
        depoId: req.body.warehouse_id ? Number(req.body.warehouse_id) : null,
      });
    });
    const siparis = await siparisGetir(req.params.id);
    res.status(201).json({ rezervasyonlar: olusan, siparis });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, detay: err.detay });
  }
});

/** POST /sales_orders/:id/rezervasyon-iptal */
router.post('/:id/rezervasyon-iptal', async (req, res) => {
  try {
    await withTransaction(pool, async (client) => {
      await rezervasyonIptalSiparis(client, Number(req.params.id));
    });
    res.json(await siparisGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

/** Satış siparişi → Sevk emri (P01 ref + P04 depo + P32 açık quantity) */
router.post('/:id/sevk-emri-olustur', async (req, res) => {
    try {
        const { BELGE_TIPI, hareketKoduBul, kalanMiktar, onerilenDepolar } = require('../src/utils/belgeOmurga');
        const { depoStokBakiye } = require('../src/services/stokHareketService');
        const siparis = await siparisGetir(req.params.id);
        if (!siparis) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        if (!['Onayli', 'Taslak', 'Kismi'].includes(siparis.status)) {
            return res.status(400).json({ hata: `Sipariş durumu accepted değil: ${siparis.status}` });
        }
        const warehouse_id = Number(req.body.warehouse_id);
        if (!warehouse_id) return res.status(400).json({ hata: 'warehouse_id zorunlu.' });

        // Depo bakiyesi ön uyarısı (sevk stok düşmez ama kullanıcıyı bilgilendir)
        const uyariSatirlar = [];
        for (const k of siparis.kalemler || []) {
            if (!k.item_id) continue;
            const kalan = kalanMiktar(k);
            if (kalan <= 0) continue;
            const bakiye = await depoStokBakiye(pool, warehouse_id, k.item_id);
            if (bakiye + 1e-9 < kalan) {
                uyariSatirlar.push({
                    item_id: k.item_id,
                    item_code: k.item_code || k.stok_kodu_ref,
                    kalan,
                    bakiye,
                    onerilen_depolar: await onerilenDepolar(pool, k.item_id, kalan, warehouse_id),
                });
            }
        }
        if (uyariSatirlar.length && req.body.stok_uyari_yoksay !== true) {
            // Sevk emri stok düşürmez; yine de net uyarı + öneri dön (zorla devam için flag)
            // Varsayılan: oluşturmaya izin ver ama yanıtta uyari taşı — UI gösterecek.
            // Kritik stok yoksa bile devam.
        }

        const { sevkGetir } = require('./shipment_orders');
        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SEVK_EMRI');
            const hk = await hareketKoduBul(client, BELGE_TIPI.SEVK_EMRI);
            const cari = await client.query(`SELECT * FROM partners WHERE id=$1`, [siparis.partner_id]);
            const c = cari.rows[0] || {};
            const baslik = await client.query(
                `
                INSERT INTO shipment_orders
                    (shipment_no, sales_order_id, partner_id, warehouse_id, ship_date, ship_to_address,
                     ship_city, ship_district, ship_country, ship_postal_code, status, movement_code_id, description,
                     source_document_type, source_document_id)
                VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,COALESCE($8,'TR'),$9,
                        COALESCE($10,'Onayli'),$11,$12,$13,$14)
                RETURNING id
                `,
                [
                    no, siparis.id, siparis.partner_id, warehouse_id,
                    req.body.ship_to_address || siparis.ship_to_address || c.bill_address_1 || c.address,
                    req.body.ship_city || c.il, req.body.ship_district || c.district,
                    req.body.ship_country || c.country, req.body.ship_postal_code || c.postal_code,
                    req.body.status || 'Onayli', hk?.id || null,
                    req.body.description || `Sipariş ${siparis.order_no}`,
                    BELGE_TIPI.SATIS_SIPARIS, siparis.id,
                ]
            );
            const sid = baslik.rows[0].id;
            let sira = 1;
            let sevkEdilenVar = false;
            for (const k of siparis.kalemler || []) {
                if (!k.item_id) continue;
                const kalan = kalanMiktar(k);
                if (kalan <= 0) continue;
                const quantity = req.body.miktarlar?.[k.id] != null
                    ? Number(req.body.miktarlar[k.id])
                    : kalan;
                if (quantity <= 0) continue;
                if (quantity > kalan + 1e-9) {
                    throw new Error(`Satır ${k.id}: sevk miktarı açık miktarı aşıyor (açık=${kalan}).`);
                }
                await client.query(
                    `
                    INSERT INTO shipment_order_lines
                        (ship_id, line_no, item_id, sales_order_line_id, quantity, uom_code,
                         source_document_type, source_document_id, source_document_line_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                    `,
                    [
                        sid, sira++, k.item_id, k.id, quantity, k.stock_uom || k.uom_code || null,
                        BELGE_TIPI.SATIS_SIPARIS, siparis.id, k.id,
                    ]
                );
                await client.query(
                    `UPDATE sales_order_lines
                     SET shipped_quantity = COALESCE(shipped_quantity,0) + $2
                     WHERE id=$1`,
                    [k.id, quantity]
                );
                sevkEdilenVar = true;
            }
            if (!sevkEdilenVar) throw new Error('Sevk edilecek açık quantity yok.');

            // Sipariş durumu: kısmi / kapalı (sevk bazlı)
            const guncel = await client.query(
                `SELECT quantity, shipped_quantity FROM sales_order_lines WHERE sales_order_id=$1`,
                [siparis.id]
            );
            const hepsi = guncel.rows.every(
                (r) => Number(r.shipped_quantity) + 1e-9 >= Number(r.quantity)
            );
            await client.query(
                `UPDATE sales_orders SET status=$2 WHERE id=$1`,
                [siparis.id, hepsi ? 'Kapali' : 'Kismi']
            );
            return sid;
        });
        const sevk = await sevkGetir(id);
        res.status(201).json({
            ...sevk,
            stok_uyari: uyariSatirlar.length ? uyariSatirlar : undefined,
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM sales_orders WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
