const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode, itemTypeFromSeriesCode } = require('../src/utils/kodUretici');
const { companyIdFromReq, andItemCompany, assertItemCompanyRecord } = require('../src/utils/firmaScope');

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

async function assertUom(client, kod, label) {
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

async function getItemById(id) {
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
    const [detaylar, birimler, isyerleri, barkodlar, languages, depolar, firmaParams, vergiTanimlari] = await Promise.all([
        pool.query('SELECT * FROM item_details WHERE item_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM item_uom_conversions WHERE item_id = $1 ORDER BY line_no, id', [id]),
        pool.query(
            `SELECT siy.*, i.plant_code, i.plant_name, i.company_id
             FROM item_plants siy
             JOIN plants i ON i.id = siy.plant_id
             WHERE siy.item_id = $1 ORDER BY siy.id`,
            [id]
        ),
        pool.query('SELECT * FROM item_barcodes WHERE item_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM item_languages WHERE item_id = $1 ORDER BY id', [id]),
        pool.query(
            `SELECT sd.*, d.warehouse_code, d.warehouse_name, iy.plant_code, iy.plant_name
             FROM item_warehouses sd
             JOIN warehouses d ON d.id = sd.warehouse_id
             LEFT JOIN plants iy ON iy.id = sd.plant_id
             WHERE sd.item_id = $1
             ORDER BY d.warehouse_code, sd.id`,
            [id]
        ),
        pool.query(
            `SELECT fp.*,
                    f.company_code, f.company_name,
                    i.plant_code, i.plant_name
             FROM item_company_params fp
             JOIN companies f ON f.id = fp.company_id
             LEFT JOIN plants i ON i.id = fp.plant_id
             WHERE fp.item_id = $1
             ORDER BY f.company_code, fp.id`,
            [id]
        ).catch(() => ({ rows: [] })),
        pool.query(
            `SELECT t.*,
                    vk.tax_code, vk.tax_name,
                    COALESCE(
                      t.vat_rate,
                      (SELECT vo.rate FROM fin_tax_rates vo
                       WHERE vo.tax_code_id = t.tax_code_id
                         AND vo.valid_from <= CURRENT_DATE
                         AND (vo.valid_to IS NULL OR vo.valid_to >= CURRENT_DATE)
                       ORDER BY vo.valid_from DESC LIMIT 1)
                    ) AS vat_rate
             FROM item_tax_by_rate_type t
             LEFT JOIN fin_tax_codes vk ON vk.id = t.tax_code_id
             WHERE t.item_id = $1
             ORDER BY CASE t.rate_type
               WHEN 'Alış' THEN 1
               WHEN 'Satış' THEN 2
               WHEN 'Efektif alış' THEN 3
               WHEN 'Efektif satış' THEN 4
               ELSE 9 END, t.id`,
            [id]
        ).catch(() => ({ rows: [] })),
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
        depo_baglari: depolar.rows,
        firma_parametreleri: firmaParams.rows,
        vergi_tanimlari: vergiTanimlari.rows,
    };
}

async function saveChildren(client, stokId, body) {
    if (Array.isArray(body.item_details)) {
        await client.query('DELETE FROM item_details WHERE item_id = $1', [stokId]);
        for (const d of body.item_details) {
            if (!rowHasContent(d, ['dimensions', 'weight'])) continue;
            await client.query(
                `INSERT INTO item_details (item_id, dimensions, weight) VALUES ($1, $2, $3)`,
                [stokId, trimOrNull(d.dimensions), d.weight ?? null]
            );
        }
    }

    if (Array.isArray(body.birim_tanimlari)) {
        await client.query('DELETE FROM item_uom_conversions WHERE item_id = $1', [stokId]);
        let sira = 0;
        for (const d of body.birim_tanimlari) {
            if (!nonempty(d.uom_code)) continue;
            sira += 1;
            const uom_code = await assertUom(client, d.uom_code, 'Birim kodu');
            const cevr = nonempty(d.target_uom)
                ? await assertUom(client, d.target_uom, 'Çevrilecek uom_code')
                : null;
            const kaynakKatsayi = d.source_factor == null || d.source_factor === ''
                ? 1
                : Number(d.source_factor);
            if (!Number.isFinite(kaynakKatsayi) || kaynakKatsayi <= 0) {
                const err = new Error('Kaynak katsayi 0 dan buyuk olmalidir.');
                err.status = 400;
                err.alan = 'source_factor';
                throw err;
            }
            const katsayi = Number(d.conversion_factor);
            if (!Number.isFinite(katsayi) || katsayi <= 0) {
                const err = new Error('Birim katsayisi 0 dan buyuk olmalidir.');
                err.status = 400;
                err.alan = 'conversion_factor';
                throw err;
            }
            await client.query(
                `
                INSERT INTO item_uom_conversions (
                    item_id, line_no, uom_code, source_factor, conversion_factor, target_uom, barcode,
                    box_width_mm, box_length_mm, box_height_mm, volume, weight, is_tracking_uom
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,FALSE))
                `,
                [
                    stokId, sira, uom_code, kaynakKatsayi, katsayi, cevr, trimOrNull(d.barcode),
                    d.box_width_mm ?? null, d.box_length_mm ?? null, d.box_height_mm ?? null,
                    d.volume ?? null, d.weight ?? null, Boolean(d.is_tracking_uom),
                ]
            );
        }
    }

    if (Array.isArray(body.is_yeri_baglari)) {
        await client.query('DELETE FROM item_plants WHERE item_id = $1', [stokId]);
        for (const d of body.is_yeri_baglari) {
            const iy = Number(d.plant_id);
            if (!Number.isFinite(iy)) continue;
            const chk = await client.query(
                'SELECT id, company_id FROM plants WHERE id = $1',
                [iy]
            );
            if (!chk.rows[0]) {
                const err = new Error(`İş yeri bulunamadı (${iy}).`);
                err.status = 400;
                throw err;
            }
            // Parametre satırındaki firma ile iş yeri firması uyuşmalı (varsa)
            const bagFirma = Number(d.company_id) || null;
            if (bagFirma && Number(chk.rows[0].company_id) !== bagFirma) {
                const err = new Error(`İş yeri firma ile uyuşmuyor (${iy}).`);
                err.status = 400;
                err.alan = 'plant_id';
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
            if (!nonempty(d.barcode)) continue;
            await client.query(
                `INSERT INTO item_barcodes (item_id, barcode, uom_code, is_default)
                 VALUES ($1,$2,$3,COALESCE($4,FALSE))`,
                [stokId, trimOrNull(d.barcode), trimOrNull(d.uom_code), Boolean(d.is_default)]
            );
        }
    }

    if (Array.isArray(body.dil_tanimlari)) {
        await client.query('DELETE FROM item_languages WHERE item_id = $1', [stokId]);
        for (const d of body.dil_tanimlari) {
            if (!nonempty(d.language_code)) continue;
            await client.query(
                `INSERT INTO item_languages
                    (item_id, language_code, language_name, item_name, description, is_default)
                 VALUES ($1,$2,$3,$4,$5,COALESCE($6,FALSE))`,
                [
                    stokId,
                    trimOrNull(d.language_code),
                    trimOrNull(d.language_name),
                    trimOrNull(d.item_name),
                    trimOrNull(d.description),
                    Boolean(d.is_default),
                ]
            );
        }
    }

    if (Array.isArray(body.depo_baglari)) {
        await client.query('DELETE FROM item_warehouses WHERE item_id = $1', [stokId]);
        const seen = new Set();
        for (const d of body.depo_baglari) {
            const wid = Number(d.warehouse_id);
            if (!Number.isFinite(wid) || !wid || seen.has(wid)) continue;
            seen.add(wid);
            const chk = await client.query('SELECT id, plant_id FROM warehouses WHERE id = $1', [wid]);
            if (!chk.rows[0]) {
                const err = new Error(`Depo bulunamadı (${wid}).`);
                err.status = 400;
                throw err;
            }
            const plantId = Number(d.plant_id) || Number(chk.rows[0].plant_id) || null;
            const isActive = d.is_active === false ? false : true;
            await client.query(
                `INSERT INTO item_warehouses (
                    item_id, warehouse_id, plant_id, is_active, is_default_receipt, is_default_issue
                 ) VALUES ($1,$2,$3,$4,COALESCE($5,FALSE),COALESCE($6,FALSE))
                 ON CONFLICT (item_id, warehouse_id) DO UPDATE SET
                    plant_id = EXCLUDED.plant_id,
                    is_active = EXCLUDED.is_active,
                    is_default_receipt = EXCLUDED.is_default_receipt,
                    is_default_issue = EXCLUDED.is_default_issue`,
                [
                    stokId,
                    wid,
                    plantId,
                    isActive,
                    Boolean(d.is_default_receipt),
                    Boolean(d.is_default_issue),
                ]
            );
        }
    }

    if (Array.isArray(body.firma_parametreleri)) {
        await client.query('DELETE FROM item_company_params WHERE item_id = $1', [stokId]);
        // Aynı firma altında birden fazla iş yeri; anahtar = firma:işyeri (veya taslak)
        const seen = new Set();
        for (const d of body.firma_parametreleri) {
            if (d && d.is_active === false) continue;
            const firmaId = Number(d.company_id);
            if (!Number.isFinite(firmaId) || !firmaId) continue;
            const plantId = Number(d.plant_id) || null;
            const dedupeKey = plantId ? `${firmaId}:${plantId}` : `${firmaId}:draft`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            const firmaChk = await client.query('SELECT id FROM companies WHERE id = $1', [firmaId]);
            if (!firmaChk.rows[0]) {
                const err = new Error(`Firma bulunamadı (${firmaId}).`);
                err.status = 400;
                throw err;
            }
            if (plantId) {
                const pChk = await client.query(
                    'SELECT id FROM plants WHERE id = $1 AND company_id = $2',
                    [plantId, firmaId]
                );
                if (!pChk.rows[0]) {
                    const err = new Error(`İş yeri firma ile uyuşmuyor (${plantId}).`);
                    err.status = 400;
                    err.alan = 'plant_id';
                    throw err;
                }
            }
            await client.query(
                `INSERT INTO item_company_params (
                    item_id, company_id, plant_id, is_active,
                    sales_price, purchase_uom, sales_uom,
                    currency_code, purchase_currency_code,
                    po_tolerance_min_pct, po_tolerance_max_pct, lead_time_days, issue_type,
                    default_tax_code_id, default_vat_rate,
                    safety_stock, min_stock, max_stock, reorder_level,
                    fixed_order_quantity, optimum_order_quantity,
                    default_receipt_warehouse_id, default_issue_warehouse_id,
                    lot_policy, serial_policy, updated_at
                 ) VALUES (
                    $1,$2,$3,COALESCE($4,TRUE),
                    $5,$6,$7,
                    $8,$9,
                    $10,$11,$12,$13,
                    $14,$15,
                    $16,$17,$18,$19,
                    $20,$21,
                    $22,$23,
                    COALESCE($24,'Takipsiz'),COALESCE($25,'Takipsiz'),NOW()
                 )`,
                [
                    stokId, firmaId, plantId,
                    d.is_active === false ? false : true,
                    d.sales_price ?? null, trimOrNull(d.purchase_uom), trimOrNull(d.sales_uom),
                    trimOrNull(d.currency_code) || 'TRY',
                    trimOrNull(d.purchase_currency_code) || trimOrNull(d.currency_code) || 'TRY',
                    d.po_tolerance_min_pct ?? null, d.po_tolerance_max_pct ?? null,
                    d.lead_time_days ?? null, trimOrNull(d.issue_type),
                    d.default_tax_code_id ? Number(d.default_tax_code_id) : null,
                    d.default_vat_rate ?? null,
                    d.safety_stock ?? null, d.min_stock ?? null, d.max_stock ?? null, d.reorder_level ?? null,
                    d.fixed_order_quantity ?? null, d.optimum_order_quantity ?? null,
                    d.default_receipt_warehouse_id ? Number(d.default_receipt_warehouse_id) : null,
                    d.default_issue_warehouse_id ? Number(d.default_issue_warehouse_id) : null,
                    trimOrNull(d.lot_policy) || 'Takipsiz',
                    trimOrNull(d.serial_policy) || 'Takipsiz',
                ]
            );
        }
    }

    if (Array.isArray(body.vergi_tanimlari)) {
        const allowed = new Set(['Alış', 'Satış', 'Efektif alış', 'Efektif satış']);
        await client.query('DELETE FROM item_tax_by_rate_type WHERE item_id = $1', [stokId]);
        const seen = new Set();
        for (const d of body.vergi_tanimlari) {
            if (!d || d.is_active === false) continue;
            const tip = String(d.rate_type || '').trim();
            if (!allowed.has(tip) || seen.has(tip)) continue;
            seen.add(tip);
            const taxId = d.tax_code_id != null && d.tax_code_id !== ''
                ? Number(d.tax_code_id)
                : null;
            if (taxId) {
                const chk = await client.query('SELECT id FROM fin_tax_codes WHERE id = $1', [taxId]);
                if (!chk.rows[0]) {
                    const err = new Error(`Vergi kodu bulunamadı (${taxId}).`);
                    err.status = 400;
                    err.alan = 'tax_code_id';
                    throw err;
                }
            }
            let rate = d.vat_rate;
            if (taxId) {
                rate = await syncVatRateFromTax(client, taxId, rate);
            } else if (rate != null && rate !== '') {
                rate = Number(rate);
            } else {
                rate = null;
            }
            // KDV seçilmemiş boş tip satırlarını yazma
            if (!taxId && (rate == null || rate === '')) continue;
            await client.query(
                `INSERT INTO item_tax_by_rate_type (
                    item_id, rate_type, tax_code_id, vat_rate, is_active, updated_at
                 ) VALUES ($1,$2,$3,$4,TRUE,NOW())
                 ON CONFLICT (item_id, rate_type) DO UPDATE SET
                    tax_code_id = EXCLUDED.tax_code_id,
                    vat_rate = EXCLUDED.vat_rate,
                    is_active = TRUE,
                    updated_at = NOW()`,
                [stokId, tip, taxId, rate]
            );
        }
    }
}

async function resolveTaxCodeId(client, m) {
    const raw = m.default_tax_code_id;
    if (raw === undefined) return undefined;
    if (raw === null || raw === '') return null;
    const id = Number(raw);
    if (!Number.isFinite(id) || !id) return null;
    const r = await client.query('SELECT id, tax_code FROM fin_tax_codes WHERE id = $1', [id]);
    if (!r.rows[0]) {
        const err = new Error(`Vergi kodu bulunamadı (${id}).`);
        err.status = 400;
        err.alan = 'default_tax_code_id';
        throw err;
    }
    return id;
}

async function syncVatRateFromTax(client, taxId, fallbackRate) {
    if (!taxId) return fallbackRate ?? null;
    const r = await client.query(
        `SELECT rate FROM fin_tax_rates
         WHERE tax_code_id = $1
           AND valid_from <= CURRENT_DATE
           AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
         ORDER BY valid_from DESC LIMIT 1`,
        [taxId]
    );
    if (r.rows[0] && r.rows[0].rate != null) return Number(r.rows[0].rate);
    return fallbackRate ?? null;
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
        const firmaId = companyIdFromReq(req);
        const companyClause = andItemCompany('items', firmaId, params);
        if (companyClause) where.push(companyClause.replace(/^\s*AND\s+/i, ''));
        const ids = await pool.query(
            `SELECT id FROM items ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY item_code`,
            params
        );
        const items = [];
        for (const r of ids.rows) items.push(await getItemById(r.id));
        res.json(items);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            // Liste (andStokFirma) ile aynı kapsam — aksi halde Düzelt boş form
            const ok = await assertItemCompanyRecord(pool, req.params.id, firmaId);
            if (!ok) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        }
        const stok = await getItemById(req.params.id);
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
        // Firma zorunlu; iş yeri bağları boşsa firmanın tüm iş yerleri default
        const firmaId = Number(m.company_id) || companyIdFromReq(req) || null;
        if (!firmaId) {
            return res.status(400).json({
                hata: 'Firma zorunludur.',
                hatalar: [{ alan: 'company_id', hata: 'Firma zorunludur.' }],
            });
        }
        const hasBags = Array.isArray(m.is_yeri_baglari)
            && m.is_yeri_baglari.some((b) => Number(b.plant_id));
        if (!hasBags) {
            // Seçili firmaların (parametre + master) tüm iş yerleri default
            const firmaIds = new Set([firmaId]);
            if (Array.isArray(m.firma_parametreleri)) {
                m.firma_parametreleri.forEach((p) => {
                    if (p && p.is_active !== false && Number(p.company_id)) {
                        firmaIds.add(Number(p.company_id));
                    }
                });
            }
            const plants = await pool.query(
                `SELECT id, company_id FROM plants WHERE company_id = ANY($1::int[]) ORDER BY company_id, id`,
                [[...firmaIds]]
            );
            m.is_yeri_baglari = plants.rows.map((p) => ({
                plant_id: p.id,
                company_id: p.company_id,
                is_active: true,
            }));
        }
        const isYeriId = Number(m.plant_id)
            || Number((Array.isArray(m.is_yeri_baglari) && m.is_yeri_baglari[0]?.plant_id))
            || null;

        const sonucId = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(m.item_code) || (await nextSequenceCode(client, itemTypeFromSeriesCode(type)));
            const uom_code = await assertUom(client, m.uom_code || m.stock_tracking_uom || 'AD', 'Birim') || 'AD';
            const takip = await assertUom(client, m.stock_tracking_uom || uom_code, 'Stok takip birimi') || uom_code;
            const abc = trimOrNull(m.abc_code);
            if (abc && !['A', 'B', 'C'].includes(abc)) {
                const err = new Error("ABC kodu 'A', 'B' veya 'C' olmalı.");
                err.status = 400;
                err.alan = 'abc_code';
                throw err;
            }

            const taxCodeId = await resolveTaxCodeId(client, m);
            const vatRate = await syncVatRateFromTax(
                client,
                taxCodeId,
                m.default_vat_rate ?? 20
            );
            // Varsayılan depolar seçiliyse depo_baglari'na ekle
            if (Array.isArray(m.depo_baglari)) {
                const seen = new Set(m.depo_baglari.map((b) => Number(b.warehouse_id)).filter(Boolean));
                for (const wid of [m.default_receipt_warehouse_id, m.default_issue_warehouse_id]) {
                    const idn = Number(wid);
                    if (idn && !seen.has(idn)) {
                        m.depo_baglari.push({ warehouse_id: idn, plant_id: isYeriId, is_active: true });
                        seen.add(idn);
                    }
                }
            }

            const stokSonuc = await client.query(
                `
                INSERT INTO items (
                    item_code, item_name, item_name_2, description, long_item_code,
                    uom_code, stock_tracking_uom, sales_price, item_type, procurement_type, is_active,
                    abc_code, volume, density, volume_uom, density_uom, weight_uom,
                    carton_gross_weight, box_gross_weight, box_width_mm, box_length_mm, box_height_mm,
                    barcode, safety_stock, max_stock, country_of_origin, shelf_life_days,
                    brand_name, procurement_method, quantity_precision,
                    lot_policy, quality_control_required, default_receipt_warehouse_id, default_issue_warehouse_id,
                    company_id,
                    purchase_uom, sales_uom, hs_code, manufacturer_code, old_item_code, original_code,
                    po_tolerance_min_pct, po_tolerance_max_pct, default_vat_rate,
                    min_stock, optimum_order_quantity, net_weight, gross_weight,
                    serial_policy, class_code, lead_time_days, reorder_level, fixed_order_quantity,
                    issue_type, is_deleted, default_tax_code_id,
                    currency_code, purchase_currency_code
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
                    COALESCE($54,'Manuel'),COALESCE($55,FALSE),$56,
                    COALESCE($57,'TRY'),COALESCE($58,'TRY')
                )
                RETURNING id
                `,
                [
                    kod, item_name, trimOrNull(m.item_name_2), trimOrNull(m.description), trimOrNull(m.long_item_code),
                    uom_code, takip, m.sales_price || 0, type, trimOrNull(m.procurement_type),
                    typeof m.is_active === 'boolean' ? m.is_active : true,
                    abc, m.volume ?? null, m.density ?? null,
                    trimOrNull(m.volume_uom), trimOrNull(m.density_uom), trimOrNull(m.weight_uom),
                    m.carton_gross_weight ?? null, m.box_gross_weight ?? null,
                    m.box_width_mm ?? null, m.box_length_mm ?? null, m.box_height_mm ?? null,
                    trimOrNull(m.barcode), m.safety_stock ?? null, m.max_stock ?? null,
                    trimOrNull(m.country_of_origin), m.shelf_life_days ?? null,
                    trimOrNull(m.brand_name), trimOrNull(m.procurement_method), m.quantity_precision ?? 3,
                    trimOrNull(m.lot_policy) || 'Takipsiz',
                    typeof m.quality_control_required === 'boolean' ? m.quality_control_required : false,
                    m.default_receipt_warehouse_id || null,
                    m.default_issue_warehouse_id || null,
                    firmaId,
                    trimOrNull(m.purchase_uom), trimOrNull(m.sales_uom), trimOrNull(m.hs_code),
                    trimOrNull(m.manufacturer_code), trimOrNull(m.old_item_code), trimOrNull(m.original_code),
                    m.po_tolerance_min_pct ?? 0, m.po_tolerance_max_pct ?? 0, vatRate ?? 20,
                    m.min_stock ?? 0, m.optimum_order_quantity ?? null, m.net_weight ?? null, m.gross_weight ?? null,
                    trimOrNull(m.serial_policy) || 'Takipsiz', trimOrNull(m.class_code),
                    m.lead_time_days ?? 0, m.reorder_level ?? 0, m.fixed_order_quantity ?? null,
                    trimOrNull(m.issue_type) || 'Manuel',
                    typeof m.is_deleted === 'boolean' ? m.is_deleted : false,
                    taxCodeId ?? null,
                    trimOrNull(m.currency_code) || 'TRY',
                    trimOrNull(m.purchase_currency_code) || trimOrNull(m.currency_code) || 'TRY',
                ]
            );
            const stokId = stokSonuc.rows[0].id;

            // birim_tanimlari yoksa takip biriminden tek satır
            if (!Array.isArray(m.birim_tanimlari) || !m.birim_tanimlari.some((b) => nonempty(b.uom_code))) {
                m.birim_tanimlari = [{ source_factor: 1, uom_code: takip, conversion_factor: 1, target_uom: takip, is_tracking_uom: true }];
            }
            await saveChildren(client, stokId, m);
            return stokId;
        });

        res.status(201).json(await getItemById(sonucId));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu stok kodu zaten kullanılıyor.', alan: 'item_code' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            const ok = await assertItemCompanyRecord(pool, req.params.id, firmaId);
            if (!ok) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        }
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
        const putFirmaId = Number(m.company_id) || companyIdFromReq(req) || null;
        if (m.company_id !== undefined && m.company_id !== null && m.company_id !== '' && !Number(m.company_id) && !companyIdFromReq(req)) {
            return res.status(400).json({
                hata: 'Firma zorunludur.',
                hatalar: [{ alan: 'company_id', hata: 'Firma zorunludur.' }],
            });
        }
        // İş yeri bağları boş gönderildiyse seçili firmaların tüm iş yerlerini doldur
        if (Array.isArray(m.is_yeri_baglari) && !m.is_yeri_baglari.some((b) => Number(b.plant_id))) {
            const firmaIds = new Set();
            if (putFirmaId) firmaIds.add(putFirmaId);
            if (Array.isArray(m.firma_parametreleri)) {
                m.firma_parametreleri.forEach((p) => {
                    if (p && p.is_active !== false && Number(p.company_id)) {
                        firmaIds.add(Number(p.company_id));
                    }
                });
            }
            if (firmaIds.size) {
                const plants = await pool.query(
                    `SELECT id, company_id FROM plants WHERE company_id = ANY($1::int[]) ORDER BY company_id, id`,
                    [[...firmaIds]]
                );
                m.is_yeri_baglari = plants.rows.map((p) => ({
                    plant_id: p.id,
                    company_id: p.company_id,
                    is_active: true,
                }));
            }
        }
        const isYeriId = Number(m.plant_id)
            || Number((Array.isArray(m.is_yeri_baglari) && m.is_yeri_baglari[0]?.plant_id))
            || null;

        await withTransaction(pool, async (client) => {
            const uom_code = Object.prototype.hasOwnProperty.call(m, 'uom_code')
                ? (await assertUom(client, m.uom_code, 'Birim'))
                : undefined;
            const takip = Object.prototype.hasOwnProperty.call(m, 'stock_tracking_uom')
                ? (await assertUom(client, m.stock_tracking_uom, 'Stok takip birimi'))
                : undefined;

            const taxCodeId = await resolveTaxCodeId(client, m);
            let vatRate = m.default_vat_rate ?? null;
            if (taxCodeId !== undefined) {
                vatRate = await syncVatRateFromTax(client, taxCodeId, vatRate);
            }
            if (Array.isArray(m.depo_baglari)) {
                const seen = new Set(m.depo_baglari.map((b) => Number(b.warehouse_id)).filter(Boolean));
                for (const wid of [m.default_receipt_warehouse_id, m.default_issue_warehouse_id]) {
                    const idn = Number(wid);
                    if (idn && !seen.has(idn)) {
                        m.depo_baglari.push({
                            warehouse_id: idn,
                            plant_id: isYeriId,
                            is_active: true,
                        });
                        seen.add(idn);
                    }
                }
            }

            const upd = await client.query(
                `
                UPDATE items SET
                    item_name = $2,
                    item_name_2 = $3,
                    description = $4,
                    long_item_code = $5,
                    uom_code = COALESCE($6, uom_code),
                    stock_tracking_uom = COALESCE($7, stock_tracking_uom),
                    sales_price = COALESCE($8, sales_price),
                    item_type = COALESCE($9, item_type),
                    procurement_type = COALESCE($10, procurement_type),
                    is_active = COALESCE($11, is_active),
                    abc_code = $12,
                    volume = $13,
                    density = $14,
                    volume_uom = $15,
                    density_uom = $16,
                    weight_uom = $17,
                    carton_gross_weight = $18,
                    box_gross_weight = $19,
                    box_width_mm = $20,
                    box_length_mm = $21,
                    box_height_mm = $22,
                    barcode = $23,
                    safety_stock = $24,
                    max_stock = $25,
                    country_of_origin = $26,
                    shelf_life_days = $27,
                    brand_name = $28,
                    procurement_method = $29,
                    quantity_precision = COALESCE($30, quantity_precision),
                    lot_policy = COALESCE($31, lot_policy),
                    quality_control_required = COALESCE($32, quality_control_required),
                    default_receipt_warehouse_id = COALESCE($33, default_receipt_warehouse_id),
                    default_issue_warehouse_id = COALESCE($34, default_issue_warehouse_id),
                    company_id = COALESCE($35, company_id),
                    lead_time_days = COALESCE($36, lead_time_days),
                    reorder_level = COALESCE($37, reorder_level),
                    fixed_order_quantity = COALESCE($38, fixed_order_quantity),
                    purchase_uom = COALESCE($39, purchase_uom),
                    sales_uom = COALESCE($40, sales_uom),
                    hs_code = COALESCE($41, hs_code),
                    manufacturer_code = COALESCE($42, manufacturer_code),
                    old_item_code = COALESCE($43, old_item_code),
                    original_code = COALESCE($44, original_code),
                    po_tolerance_min_pct = COALESCE($45, po_tolerance_min_pct),
                    po_tolerance_max_pct = COALESCE($46, po_tolerance_max_pct),
                    default_vat_rate = COALESCE($47, default_vat_rate),
                    min_stock = COALESCE($48, min_stock),
                    optimum_order_quantity = COALESCE($49, optimum_order_quantity),
                    net_weight = COALESCE($50, net_weight),
                    gross_weight = COALESCE($51, gross_weight),
                    serial_policy = COALESCE($52, serial_policy),
                    class_code = COALESCE($53, class_code),
                    issue_type = COALESCE($54, issue_type),
                    is_deleted = COALESCE($55, is_deleted),
                    default_tax_code_id = CASE WHEN $57::boolean THEN $56 ELSE default_tax_code_id END,
                    currency_code = COALESCE($58, currency_code, 'TRY'),
                    purchase_currency_code = COALESCE($59, purchase_currency_code, 'TRY')
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    item_name,
                    trimOrNull(m.item_name_2),
                    trimOrNull(m.description),
                    trimOrNull(m.long_item_code),
                    uom_code === undefined ? null : uom_code,
                    takip === undefined ? null : takip,
                    m.sales_price ?? null,
                    trimOrNull(m.item_type),
                    trimOrNull(m.procurement_type),
                    typeof m.is_active === 'boolean' ? m.is_active : null,
                    abc,
                    m.volume ?? null,
                    m.density ?? null,
                    trimOrNull(m.volume_uom),
                    trimOrNull(m.density_uom),
                    trimOrNull(m.weight_uom),
                    m.carton_gross_weight ?? null,
                    m.box_gross_weight ?? null,
                    m.box_width_mm ?? null,
                    m.box_length_mm ?? null,
                    m.box_height_mm ?? null,
                    trimOrNull(m.barcode),
                    m.safety_stock ?? null,
                    m.max_stock ?? null,
                    trimOrNull(m.country_of_origin),
                    m.shelf_life_days ?? null,
                    trimOrNull(m.brand_name),
                    trimOrNull(m.procurement_method),
                    m.quantity_precision ?? null,
                    trimOrNull(m.lot_policy),
                    typeof m.quality_control_required === 'boolean' ? m.quality_control_required : null,
                    m.default_receipt_warehouse_id ?? null,
                    m.default_issue_warehouse_id ?? null,
                    Number(m.company_id) || companyIdFromReq(req) || null,
                    m.lead_time_days ?? null,
                    m.reorder_level ?? null,
                    m.fixed_order_quantity ?? null,
                    trimOrNull(m.purchase_uom),
                    trimOrNull(m.sales_uom),
                    trimOrNull(m.hs_code),
                    trimOrNull(m.manufacturer_code),
                    trimOrNull(m.old_item_code),
                    trimOrNull(m.original_code),
                    m.po_tolerance_min_pct ?? null,
                    m.po_tolerance_max_pct ?? null,
                    vatRate,
                    m.min_stock ?? null,
                    m.optimum_order_quantity ?? null,
                    m.net_weight ?? null,
                    m.gross_weight ?? null,
                    trimOrNull(m.serial_policy),
                    trimOrNull(m.class_code),
                    trimOrNull(m.issue_type),
                    typeof m.is_deleted === 'boolean' ? m.is_deleted : null,
                    taxCodeId === undefined ? null : taxCodeId,
                    taxCodeId !== undefined,
                    trimOrNull(m.currency_code) || 'TRY',
                    trimOrNull(m.purchase_currency_code) || trimOrNull(m.currency_code) || 'TRY',
                ]
            );
            if (!upd.rows[0]) throw Object.assign(new Error('Stok bulunamadı.'), { status: 404 });
            await saveChildren(client, Number(req.params.id), m);
        });

        res.json(await getItemById(req.params.id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu stok kodu zaten kullanılıyor.', alan: 'item_code' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            const ok = await assertItemCompanyRecord(pool, req.params.id, firmaId);
            if (!ok) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        }
        const result = await pool.query(`DELETE FROM items WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
