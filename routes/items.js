const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod, stokSeriKodundanTip } = require('../src/utils/kodUretici');
const { firmaIdFromReq, andStokFirma, assertFirmaKayit } = require('../src/utils/firmaScope');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

function nonempty(v) {
    return trimOrNull(v) !== null;
}

function rowHasContent(row, keys) {
    return keys.some((k) => {
        const v = row[k];
        if (typeof v === 'boolean') return v;
        return nonempty(v);
    });
}

async function assertBirim(client, kod, label) {
    const k = trimOrNull(kod);
    if (!k) return null;
    const r = await client.query(
        'SELECT uom_code FROM units_of_measure WHERE uom_code = $1',
        [k]
    );
    if (!r.rows[0]) {
        // ölçü birimi tablosu boş/eksik olabilir — uyarı yerine mevcut serbest birime izin ver (geri uyum)
        // ama bilinen kodlar için doğrula: tablo doluysa reddet
        const cnt = await client.query('SELECT COUNT(*)::int AS n FROM units_of_measure');
        if (cnt.rows[0].n > 0) {
            const err = new Error(`${label}: ölçü birimi bulunamadı (${k}).`);
            err.status = 400;
            err.alan = label;
            throw err;
        }
    }
    return k;
}

async function stokGetir(id) {
    const stokRes = await pool.query(
        `
        SELECT
            s.*,
            (
                SELECT f.company_code
                FROM item_plants siy
                JOIN plants i ON i.id = siy.plant_id
                JOIN companies f ON f.id = i.company_id
                WHERE siy.item_id = s.id AND siy.is_active = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS company_code,
            (
                SELECT f.company_name
                FROM item_plants siy
                JOIN plants i ON i.id = siy.plant_id
                JOIN companies f ON f.id = i.company_id
                WHERE siy.item_id = s.id AND siy.is_active = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS company_name,
            (
                SELECT i.plant_code
                FROM item_plants siy
                JOIN plants i ON i.id = siy.plant_id
                WHERE siy.item_id = s.id AND siy.is_active = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS plant_code,
            (
                SELECT i.plant_name
                FROM item_plants siy
                JOIN plants i ON i.id = siy.plant_id
                WHERE siy.item_id = s.id AND siy.is_active = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS plant_name
        FROM items s
        WHERE s.id = $1
        `,
        [id]
    );
    if (!stokRes.rows[0]) return null;
    const [detaylar, birimler, isyerleri, barkodlar, languages] = await Promise.all([
        pool.query('SELECT * FROM item_details WHERE item_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM item_uom_conversions WHERE item_id = $1 ORDER BY line_no, id', [id]),
        pool.query(
            `SELECT siy.*, i.plant_code, i.plant_name
             FROM item_plants siy
             JOIN plants i ON i.id = siy.plant_id
             WHERE siy.item_id = $1 ORDER BY siy.id`,
            [id]
        ),
        pool.query('SELECT * FROM item_barcodes WHERE item_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM item_languages WHERE item_id = $1 ORDER BY id', [id]),
    ]);
    const row = stokRes.rows[0];
    const bags = isyerleri.rows;
    return {
        ...row,
        // Form master alanı: ilk is_active iş yeri bağından
        plant_id: row.plant_id
          || (bags.find((b) => b.is_active !== false)?.plant_id)
          || bags[0]?.plant_id
          || null,
        item_details: detaylar.rows,
        birim_tanimlari: birimler.rows,
        is_yeri_baglari: bags,
        barkodlar: barkodlar.rows,
        dil_tanimlari: languages.rows,
    };
}

async function saveChildren(client, stokId, body) {
    if (Array.isArray(body.item_details)) {
        await client.query('DELETE FROM item_details WHERE item_id = $1', [stokId]);
        for (const d of body.item_details) {
            if (!rowHasContent(d, ['boyut', 'agirlik'])) continue;
            await client.query(
                `INSERT INTO item_details (item_id, boyut, agirlik) VALUES ($1, $2, $3)`,
                [stokId, trimOrNull(d.boyut), d.agirlik ?? null]
            );
        }
    }

    if (Array.isArray(body.birim_tanimlari)) {
        await client.query('DELETE FROM item_uom_conversions WHERE item_id = $1', [stokId]);
        let sira = 0;
        for (const d of body.birim_tanimlari) {
            if (!nonempty(d.uom_code)) continue;
            sira += 1;
            const uom_code = await assertBirim(client, d.uom_code, 'Birim kodu');
            const cevr = nonempty(d.cevrilecek_uom)
                ? await assertBirim(client, d.cevrilecek_uom, 'Çevrilecek uom_code')
                : null;
            const kaynakKatsayi = d.source_katsayi == null || d.source_katsayi === ''
                ? 1
                : Number(d.source_katsayi);
            if (!Number.isFinite(kaynakKatsayi) || kaynakKatsayi <= 0) {
                const err = new Error('Kaynak katsayi 0 dan buyuk olmalidir.');
                err.status = 400;
                err.alan = 'source_katsayi';
                throw err;
            }
            const katsayi = Number(d.katsayi);
            if (!Number.isFinite(katsayi) || katsayi <= 0) {
                const err = new Error('Birim katsayisi 0 dan buyuk olmalidir.');
                err.status = 400;
                err.alan = 'katsayi';
                throw err;
            }
            await client.query(
                `
                INSERT INTO item_uom_conversions (
                    item_id, line_no, uom_code, source_katsayi, katsayi, cevrilecek_uom, barkod,
                    kutu_en_mm, kutu_boy_mm, kutu_yukseklik_mm, hacim, agirlik, takip_uom_mi
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,FALSE))
                `,
                [
                    stokId, sira, uom_code, kaynakKatsayi, katsayi, cevr, trimOrNull(d.barkod),
                    d.kutu_en_mm ?? null, d.kutu_boy_mm ?? null, d.kutu_yukseklik_mm ?? null,
                    d.hacim ?? null, d.agirlik ?? null, Boolean(d.takip_uom_mi),
                ]
            );
        }
    }

    if (Array.isArray(body.is_yeri_baglari)) {
        await client.query('DELETE FROM item_plants WHERE item_id = $1', [stokId]);
        for (const d of body.is_yeri_baglari) {
            const iy = Number(d.plant_id);
            if (!Number.isFinite(iy)) continue;
            const chk = await client.query('SELECT id FROM plants WHERE id = $1', [iy]);
            if (!chk.rows[0]) {
                const err = new Error(`İş yeri bulunamadı (${iy}).`);
                err.status = 400;
                throw err;
            }
            await client.query(
                `INSERT INTO item_plants (item_id, plant_id, is_active)
                 VALUES ($1,$2,COALESCE($3,TRUE))
                 ON CONFLICT (item_id, plant_id) DO UPDATE SET is_active = EXCLUDED.is_active`,
                [stokId, iy, typeof d.is_active === 'boolean' ? d.is_active : true]
            );
        }
    }

    if (Array.isArray(body.barkodlar)) {
        await client.query('DELETE FROM item_barcodes WHERE item_id = $1', [stokId]);
        for (const d of body.barkodlar) {
            if (!nonempty(d.barkod)) continue;
            await client.query(
                `INSERT INTO item_barcodes (item_id, barkod, uom_code, varsayilan)
                 VALUES ($1,$2,$3,COALESCE($4,FALSE))`,
                [stokId, trimOrNull(d.barkod), trimOrNull(d.uom_code), Boolean(d.varsayilan)]
            );
        }
    }

    if (Array.isArray(body.dil_tanimlari)) {
        await client.query('DELETE FROM item_languages WHERE item_id = $1', [stokId]);
        for (const d of body.dil_tanimlari) {
            if (!nonempty(d.dil_code)) continue;
            await client.query(
                `INSERT INTO item_languages
                    (item_id, dil_code, dil_name, item_name, description, varsayilan)
                 VALUES ($1,$2,$3,$4,$5,COALESCE($6,FALSE))`,
                [
                    stokId,
                    trimOrNull(d.dil_code),
                    trimOrNull(d.dil_name),
                    trimOrNull(d.item_name),
                    trimOrNull(d.description),
                    Boolean(d.varsayilan),
                ]
            );
        }
    }
}

router.get('/', async (req, res) => {
    try {
        const { type, is_active } = req.query;
        const params = [];
        const where = [];
        if (type) {
            const tips = String(type).split(',').map((t) => t.trim()).filter(Boolean);
            if (tips.length === 1) {
                params.push(tips[0]);
                where.push(`item_type = $${params.length}`);
            } else if (tips.length > 1) {
                params.push(tips);
                where.push(`item_type = ANY($${params.length}::text[])`);
            }
        }
        if (is_active === 'true') where.push('is_active IS DISTINCT FROM FALSE');
        if (is_active === 'false') where.push('is_active = FALSE');
        const firmaId = firmaIdFromReq(req);
        const firmaClause = andStokFirma('items', firmaId, params);
        if (firmaClause) where.push(firmaClause.replace(/^\s*AND\s+/i, ''));
        const ids = await pool.query(
            `SELECT id FROM items ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY item_code`,
            params
        );
        const items = [];
        for (const r of ids.rows) items.push(await stokGetir(r.id));
        res.json(items);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            const ok = await assertFirmaKayit(pool, 'items', req.params.id, firmaId);
            if (!ok) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        }
        const stok = await stokGetir(req.params.id);
        if (!stok) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        res.json(stok);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const item_name = trimOrNull(req.body.item_name);
        if (!item_name) {
            return res.status(400).json({
                hata: 'Stok adı zorunludur.',
                hatalar: [{ alan: 'item_name', hata: 'Stok adı zorunludur.' }],
            });
        }
        const type = trimOrNull(req.body.item_type) || 'Ticari';
        const m = req.body;
        // Master’daki firma / iş yeri — olmazsa olmaz
        const firmaId = Number(m.company_id) || firmaIdFromReq(req) || null;
        const isYeriId = Number(m.plant_id)
          || Number((Array.isArray(m.is_yeri_baglari) && m.is_yeri_baglari[0]?.plant_id))
          || null;
        if (!firmaId) {
            return res.status(400).json({
                hata: 'Firma zorunludur.',
                hatalar: [{ alan: 'company_id', hata: 'Firma zorunludur.' }],
            });
        }
        if (!isYeriId) {
            return res.status(400).json({
                hata: 'İş yeri zorunludur.',
                hatalar: [{ alan: 'plant_id', hata: 'İş yeri zorunludur.' }],
            });
        }
        // Master iş yeri → item_plants bağları
        if (!Array.isArray(m.is_yeri_baglari) || !m.is_yeri_baglari.some((b) => Number(b.plant_id) === isYeriId)) {
            m.is_yeri_baglari = [
                { plant_id: isYeriId, is_active: true },
                ...((Array.isArray(m.is_yeri_baglari) ? m.is_yeri_baglari : [])),
            ];
        }

        const sonucId = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(m.item_code) || (await sonrakiKod(client, stokSeriKodundanTip(type)));
            const uom_code = await assertBirim(client, m.uom_code || m.stock_takip_uom || 'AD', 'Birim') || 'AD';
            const takip = await assertBirim(client, m.stock_takip_uom || uom_code, 'Stok takip birimi') || uom_code;
            const abc = trimOrNull(m.abc_code);
            if (abc && !['A', 'B', 'C'].includes(abc)) {
                const err = new Error("ABC kodu 'A', 'B' veya 'C' olmalı.");
                err.status = 400;
                err.alan = 'abc_code';
                throw err;
            }

            const stokSonuc = await client.query(
                `
                INSERT INTO items (
                    item_code, item_name, item_name_2, description, uzun_item_code,
                    uom_code, stock_takip_uom, sales_price, item_type, tedarik_type, is_active,
                    abc_code, hacim, yogunluk, hacim_uom, yogunluk_uom, agirlik_uom,
                    koli_brut_agirlik, kutu_brut_agirlik, kutu_en_mm, kutu_boy_mm, kutu_yukseklik_mm,
                    barkod, safety_stock, max_stock, country_mensei, raf_omru_days,
                    marka, temin_method, quantity_hassasiyeti,
                    lot_politika, kalite_control_gerekli, varsayilan_giris_warehouse_id, varsayilan_cikis_warehouse_id,
                    company_id,
                    purchase_uom, sales_uom, gtip_code, uretici_code, old_item_code, original_code,
                    sa_tolerans_min_yuzde, sa_tolerans_max_yuzde, varsayilan_vat_rate,
                    min_stock, optimum_order_quantity, net_agirlik, brut_agirlik,
                    series_politika, class_code, temin_suresi_days, reorder_level, fixed_order_quantity,
                    cikis_type, silindi
                ) VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,COALESCE($10,'Satinalma'),COALESCE($11,TRUE),
                    $12,$13,$14,$15,$16,$17,
                    $18,$19,$20,$21,$22,
                    $23,$24,$25,$26,$27,
                    $28,$29,COALESCE($30,3),
                    COALESCE($31,'Takipsiz'),COALESCE($32,FALSE),$33,$34,
                    $35,
                    $36,$37,$38,$39,$40,$41,
                    COALESCE($42,0),COALESCE($43,0),COALESCE($44,20),
                    COALESCE($45,0),$46,$47,$48,
                    COALESCE($49,'Takipsiz'),$50,COALESCE($51,0),COALESCE($52,0),$53,
                    COALESCE($54,'Manuel'),COALESCE($55,FALSE)
                )
                RETURNING id
                `,
                [
                    kod, item_name, trimOrNull(m.item_name_2), trimOrNull(m.description), trimOrNull(m.uzun_item_code),
                    uom_code, takip, m.sales_price || 0, type, trimOrNull(m.tedarik_type),
                    typeof m.is_active === 'boolean' ? m.is_active : true,
                    abc, m.hacim ?? null, m.yogunluk ?? null,
                    trimOrNull(m.hacim_uom), trimOrNull(m.yogunluk_uom), trimOrNull(m.agirlik_uom),
                    m.koli_brut_agirlik ?? null, m.kutu_brut_agirlik ?? null,
                    m.kutu_en_mm ?? null, m.kutu_boy_mm ?? null, m.kutu_yukseklik_mm ?? null,
                    trimOrNull(m.barkod), m.safety_stock ?? null, m.max_stock ?? null,
                    trimOrNull(m.country_mensei), m.raf_omru_days ?? null,
                    trimOrNull(m.marka), trimOrNull(m.temin_method), m.quantity_hassasiyeti ?? 3,
                    trimOrNull(m.lot_politika) || 'Takipsiz',
                    typeof m.kalite_control_gerekli === 'boolean' ? m.kalite_control_gerekli : false,
                    m.varsayilan_giris_warehouse_id || null,
                    m.varsayilan_cikis_warehouse_id || null,
                    firmaId,
                    trimOrNull(m.purchase_uom), trimOrNull(m.sales_uom), trimOrNull(m.gtip_code),
                    trimOrNull(m.uretici_code), trimOrNull(m.old_item_code), trimOrNull(m.original_code),
                    m.sa_tolerans_min_yuzde ?? 0, m.sa_tolerans_max_yuzde ?? 0, m.varsayilan_vat_rate ?? 20,
                    m.min_stock ?? 0, m.optimum_order_quantity ?? null, m.net_agirlik ?? null, m.brut_agirlik ?? null,
                    trimOrNull(m.series_politika) || 'Takipsiz', trimOrNull(m.class_code),
                    m.temin_suresi_days ?? 0, m.reorder_level ?? 0, m.fixed_order_quantity ?? null,
                    trimOrNull(m.cikis_type) || 'Manuel',
                    typeof m.silindi === 'boolean' ? m.silindi : false,
                ]
            );
            const stokId = stokSonuc.rows[0].id;

            // birim_tanimlari yoksa takip biriminden tek satır
            if (!Array.isArray(m.birim_tanimlari) || !m.birim_tanimlari.some((b) => nonempty(b.uom_code))) {
                m.birim_tanimlari = [{ source_katsayi: 1, uom_code: takip, katsayi: 1, cevrilecek_uom: takip, takip_uom_mi: true }];
            }
            await saveChildren(client, stokId, m);
            return stokId;
        });

        res.status(201).json(await stokGetir(sonucId));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu stok kodu zaten kullanılıyor.', alan: 'item_code' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const item_name = trimOrNull(req.body.item_name);
        if (!item_name) {
            return res.status(400).json({
                hata: 'Stok adı zorunludur.',
                hatalar: [{ alan: 'item_name', hata: 'Stok adı zorunludur.' }],
            });
        }
        const m = req.body;
        const abc = trimOrNull(m.abc_code);
        if (abc && !['A', 'B', 'C'].includes(abc)) {
            return res.status(400).json({
                hata: "ABC kodu 'A', 'B' veya 'C' olmalı.",
                hatalar: [{ alan: 'abc_code', hata: "ABC kodu 'A', 'B' veya 'C' olmalı." }],
            });
        }
        const isYeriId = Number(m.plant_id)
          || Number((Array.isArray(m.is_yeri_baglari) && m.is_yeri_baglari[0]?.plant_id))
          || null;
        if (m.company_id !== undefined && m.company_id !== null && m.company_id !== '' && !Number(m.company_id) && !firmaIdFromReq(req)) {
            return res.status(400).json({
                hata: 'Firma zorunludur.',
                hatalar: [{ alan: 'company_id', hata: 'Firma zorunludur.' }],
            });
        }
        if (m.plant_id !== undefined || Array.isArray(m.is_yeri_baglari)) {
            if (!isYeriId) {
                return res.status(400).json({
                    hata: 'İş yeri zorunludur.',
                    hatalar: [{ alan: 'plant_id', hata: 'İş yeri zorunludur.' }],
                });
            }
            if (!Array.isArray(m.is_yeri_baglari) || !m.is_yeri_baglari.some((b) => Number(b.plant_id) === isYeriId)) {
                m.is_yeri_baglari = [
                    { plant_id: isYeriId, is_active: true },
                    ...((Array.isArray(m.is_yeri_baglari) ? m.is_yeri_baglari : [])),
                ];
            }
        }

        await withTransaction(pool, async (client) => {
            const uom_code = Object.prototype.hasOwnProperty.call(m, 'uom_code')
                ? (await assertBirim(client, m.uom_code, 'Birim'))
                : undefined;
            const takip = Object.prototype.hasOwnProperty.call(m, 'stock_takip_uom')
                ? (await assertBirim(client, m.stock_takip_uom, 'Stok takip birimi'))
                : undefined;

            const upd = await client.query(
                `
                UPDATE items SET
                    item_name = $2,
                    item_name_2 = $3,
                    description = $4,
                    uzun_item_code = $5,
                    uom_code = COALESCE($6, uom_code),
                    stock_takip_uom = COALESCE($7, stock_takip_uom),
                    sales_price = COALESCE($8, sales_price),
                    item_type = COALESCE($9, item_type),
                    tedarik_type = COALESCE($10, tedarik_type),
                    is_active = COALESCE($11, is_active),
                    abc_code = $12,
                    hacim = $13,
                    yogunluk = $14,
                    hacim_uom = $15,
                    yogunluk_uom = $16,
                    agirlik_uom = $17,
                    koli_brut_agirlik = $18,
                    kutu_brut_agirlik = $19,
                    kutu_en_mm = $20,
                    kutu_boy_mm = $21,
                    kutu_yukseklik_mm = $22,
                    barkod = $23,
                    safety_stock = $24,
                    max_stock = $25,
                    country_mensei = $26,
                    raf_omru_days = $27,
                    marka = $28,
                    temin_method = $29,
                    quantity_hassasiyeti = COALESCE($30, quantity_hassasiyeti),
                    lot_politika = COALESCE($31, lot_politika),
                    kalite_control_gerekli = COALESCE($32, kalite_control_gerekli),
                    varsayilan_giris_warehouse_id = COALESCE($33, varsayilan_giris_warehouse_id),
                    varsayilan_cikis_warehouse_id = COALESCE($34, varsayilan_cikis_warehouse_id),
                    company_id = COALESCE($35, company_id),
                    temin_suresi_days = COALESCE($36, temin_suresi_days),
                    reorder_level = COALESCE($37, reorder_level),
                    fixed_order_quantity = COALESCE($38, fixed_order_quantity),
                    purchase_uom = COALESCE($39, purchase_uom),
                    sales_uom = COALESCE($40, sales_uom),
                    gtip_code = COALESCE($41, gtip_code),
                    uretici_code = COALESCE($42, uretici_code),
                    old_item_code = COALESCE($43, old_item_code),
                    original_code = COALESCE($44, original_code),
                    sa_tolerans_min_yuzde = COALESCE($45, sa_tolerans_min_yuzde),
                    sa_tolerans_max_yuzde = COALESCE($46, sa_tolerans_max_yuzde),
                    varsayilan_vat_rate = COALESCE($47, varsayilan_vat_rate),
                    min_stock = COALESCE($48, min_stock),
                    optimum_order_quantity = COALESCE($49, optimum_order_quantity),
                    net_agirlik = COALESCE($50, net_agirlik),
                    brut_agirlik = COALESCE($51, brut_agirlik),
                    series_politika = COALESCE($52, series_politika),
                    class_code = COALESCE($53, class_code),
                    cikis_type = COALESCE($54, cikis_type),
                    silindi = COALESCE($55, silindi)
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    item_name,
                    trimOrNull(m.item_name_2),
                    trimOrNull(m.description),
                    trimOrNull(m.uzun_item_code),
                    uom_code === undefined ? null : uom_code,
                    takip === undefined ? null : takip,
                    m.sales_price ?? null,
                    trimOrNull(m.item_type),
                    trimOrNull(m.tedarik_type),
                    typeof m.is_active === 'boolean' ? m.is_active : null,
                    abc,
                    m.hacim ?? null,
                    m.yogunluk ?? null,
                    trimOrNull(m.hacim_uom),
                    trimOrNull(m.yogunluk_uom),
                    trimOrNull(m.agirlik_uom),
                    m.koli_brut_agirlik ?? null,
                    m.kutu_brut_agirlik ?? null,
                    m.kutu_en_mm ?? null,
                    m.kutu_boy_mm ?? null,
                    m.kutu_yukseklik_mm ?? null,
                    trimOrNull(m.barkod),
                    m.safety_stock ?? null,
                    m.max_stock ?? null,
                    trimOrNull(m.country_mensei),
                    m.raf_omru_days ?? null,
                    trimOrNull(m.marka),
                    trimOrNull(m.temin_method),
                    m.quantity_hassasiyeti ?? null,
                    trimOrNull(m.lot_politika),
                    typeof m.kalite_control_gerekli === 'boolean' ? m.kalite_control_gerekli : null,
                    m.varsayilan_giris_warehouse_id ?? null,
                    m.varsayilan_cikis_warehouse_id ?? null,
                    Number(m.company_id) || firmaIdFromReq(req) || null,
                    m.temin_suresi_days ?? null,
                    m.reorder_level ?? null,
                    m.fixed_order_quantity ?? null,
                    trimOrNull(m.purchase_uom),
                    trimOrNull(m.sales_uom),
                    trimOrNull(m.gtip_code),
                    trimOrNull(m.uretici_code),
                    trimOrNull(m.old_item_code),
                    trimOrNull(m.original_code),
                    m.sa_tolerans_min_yuzde ?? null,
                    m.sa_tolerans_max_yuzde ?? null,
                    m.varsayilan_vat_rate ?? null,
                    m.min_stock ?? null,
                    m.optimum_order_quantity ?? null,
                    m.net_agirlik ?? null,
                    m.brut_agirlik ?? null,
                    trimOrNull(m.series_politika),
                    trimOrNull(m.class_code),
                    trimOrNull(m.cikis_type),
                    typeof m.silindi === 'boolean' ? m.silindi : null,
                ]
            );
            if (!upd.rows[0]) throw Object.assign(new Error('Stok bulunamadı.'), { status: 404 });
            await saveChildren(client, Number(req.params.id), m);
        });

        res.json(await stokGetir(req.params.id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu stok kodu zaten kullanılıyor.', alan: 'item_code' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM items WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
