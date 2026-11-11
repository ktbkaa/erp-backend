const express = require('express');
const router = express.Router();
const pool = require('../db');
const { HAREKET_BELGE_TIPI } = require('../src/utils/belgeOmurga');

/** Eski seed / UI PascalCase anahtarları (geriye uyumluluk) */
const LEGACY_BELGE_TIPLERI = [
    'SatisTeklif', 'SatisSiparis', 'SevkEmri', 'SatisIrsaliye', 'SatisFatura',
    'SatinAlmaTalep', 'SatinAlmaSiparis', 'MalKabul', 'AlisFatura',
    'UretimEmri', 'UretimGiris', 'UretimTuketim', 'Transfer', 'Sayim', 'Fire', 'Duzeltme',
    'StokGiris', 'StokCikis',
];

const LEGACY_LABELS = {
    SatisTeklif: 'Satış Teklifi',
    SatisSiparis: 'Satış Siparişi',
    SevkEmri: 'Sevk Emri',
    SatisIrsaliye: 'Satış İrsaliyesi',
    SatisFatura: 'Satış Faturası',
    SatinAlmaTalep: 'Satınalma Talebi',
    SatinAlmaSiparis: 'Satınalma Siparişi',
    MalKabul: 'Mal Kabul',
    AlisFatura: 'Alış Faturası',
    UretimEmri: 'Üretim Emri',
    UretimGiris: 'Üretim Girişi',
    UretimTuketim: 'Üretim Tüketim',
    Transfer: 'Transfer',
    Sayim: 'Sayım',
    Fire: 'Fire / Sarf',
    Duzeltme: 'Stok Düzeltme',
    StokGiris: 'Stok Giriş',
    StokCikis: 'Stok Çıkış',
};

/**
 * Belge tipi → hareket_kodlari.document_type değeri.
 * Eşleme yoksa document_type_code olduğu gibi kullanılır (SATIS_IADE vb.).
 */
function movementDocumentKey(documentTypeCode) {
    const code = String(documentTypeCode || '').trim();
    if (!code) return '';
    return HAREKET_BELGE_TIPI[code] || code;
}

/** UI / validasyon için belge tipi listesi (DB + legacy) */
async function loadDocumentTypeOptions(client = pool) {
    const byKey = new Map();

    const docs = await client.query(
        `SELECT document_type_code, document_type_name, module, affects_stock, is_active
         FROM document_types
         WHERE is_active IS DISTINCT FROM FALSE
         ORDER BY module, document_type_name, document_type_code`
    );
    for (const row of docs.rows) {
        let key = movementDocumentKey(row.document_type_code);
        if (!key) continue;
        // Çakışmada stok etkili / kendi kodunu koru
        const prev = byKey.get(key);
        if (prev && prev.document_type_code && prev.document_type_code !== row.document_type_code) {
            key = row.document_type_code;
        }
        byKey.set(key, {
            id: key,
            document_type: key,
            label: row.document_type_name || key,
            document_type_code: row.document_type_code,
            module: row.module || null,
            affects_stock: Boolean(row.affects_stock),
            source: 'document_types',
        });
    }

    // Eski sabitler + DB’de kullanılan document_type değerleri
    for (const id of LEGACY_BELGE_TIPLERI) {
        if (byKey.has(id)) continue;
        byKey.set(id, {
            id,
            document_type: id,
            label: LEGACY_LABELS[id] || id,
            document_type_code: null,
            module: null,
            affects_stock: null,
            source: 'legacy',
        });
    }

    const used = await client.query(
        `SELECT DISTINCT document_type FROM movement_codes WHERE document_type IS NOT NULL ORDER BY 1`
    );
    for (const row of used.rows) {
        const id = String(row.document_type || '').trim();
        if (!id || byKey.has(id)) continue;
        byKey.set(id, {
            id,
            document_type: id,
            label: LEGACY_LABELS[id] || id,
            document_type_code: null,
            module: null,
            affects_stock: null,
            source: 'movement_codes',
        });
    }

    return [...byKey.values()].sort((a, b) =>
        String(a.label).localeCompare(String(b.label), 'tr')
        || String(a.id).localeCompare(String(b.id), 'tr')
    );
}

async function assertValidDocumentType(document_type) {
    const tip = String(document_type || '').trim();
    if (!tip) return { ok: false, hata: 'document_type zorunlu.' };
    const opts = await loadDocumentTypeOptions();
    if (opts.some((o) => o.id === tip)) return { ok: true, tip };
    // Doğrudan document_types kodu (eşlemesiz) da kabul
    const doc = await pool.query(
        `SELECT document_type_code FROM document_types
         WHERE document_type_code = $1 AND is_active IS DISTINCT FROM FALSE`,
        [tip]
    );
    if (doc.rows[0]) return { ok: true, tip };
    return {
        ok: false,
        hata: `Geçersiz document_type: ${tip}. Belge Tipleri tanımından seçin.`,
    };
}

router.get('/belge-tipleri', async (req, res) => {
    try {
        let rows = await loadDocumentTypeOptions();
        if (req.query.affects_stock === 'true') {
            rows = rows.filter((r) => r.affects_stock === true || r.affects_stock == null);
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { document_type, is_active, affects_stock, grup } = req.query;
        const where = [];
        const params = [];
        if (document_type) {
            params.push(document_type);
            where.push(`document_type = $${params.length}`);
        }
        if (is_active === 'true') where.push('is_active = TRUE');
        if (affects_stock === 'true') where.push('affects_stock = TRUE');
        if (grup === 'inv') {
            where.push(`document_type IN ('StokGiris','StokCikis','Transfer','Sayim','Fire','Duzeltme','STOK_GIRIS','STOK_CIKIS','STOK_HAREKET','TRANSFER','SAYIM')`);
        }
        const sql = `
            SELECT * FROM movement_codes
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY document_type, movement_code
        `;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM movement_codes WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Hareket kodu bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Form/API boolean: true/false, 1/0, "evet"/"hayir" */
function asBool(v, fallback = null) {
    if (v === undefined || v === null || v === '') return fallback;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'evet', 'yes', 'on', 'e'].includes(s)) return true;
    if (['0', 'false', 'hayir', 'no', 'off', 'h'].includes(s)) return false;
    return fallback;
}

router.post('/', async (req, res) => {
    try {
        const {
            movement_code, movement_name, document_type, direction, affects_stock,
            partner_required, warehouse_required, allow_negative_balance, gl_account_code, description, is_active,
            create_incoming_qc_order, create_outgoing_qc_order,
        } = req.body;
        if (!movement_code || !movement_name || !document_type) {
            return res.status(400).json({ hata: 'movement_code, movement_name, document_type zorunlu.' });
        }
        const check = await assertValidDocumentType(document_type);
        if (!check.ok) return res.status(400).json({ hata: check.hata });
        const type = direction || 'Bilgi';
        if (!['Giris', 'Cikis', 'Transfer', 'Bilgi'].includes(type)) {
            return res.status(400).json({ hata: 'Geçersiz direction.' });
        }
        const result = await pool.query(
            `
            INSERT INTO movement_codes
                (movement_code, movement_name, document_type, direction, affects_stock, partner_required,
                 warehouse_required, allow_negative_balance, gl_account_code, description, is_active,
                 create_incoming_qc_order, create_outgoing_qc_order)
            VALUES ($1,$2,$3,$4,COALESCE($5,FALSE),COALESCE($6,FALSE),COALESCE($7,FALSE),
                    COALESCE($8,FALSE),$9,$10,COALESCE($11,TRUE),COALESCE($12,FALSE),COALESCE($13,FALSE))
            RETURNING *
            `,
            [
                movement_code, movement_name, check.tip, type, affects_stock, partner_required,
                warehouse_required, allow_negative_balance, gl_account_code || null, description || null, is_active,
                asBool(create_incoming_qc_order, false), asBool(create_outgoing_qc_order, false),
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            movement_name, document_type, direction, affects_stock, partner_required,
            warehouse_required, allow_negative_balance, gl_account_code, description, is_active,
            create_incoming_qc_order, create_outgoing_qc_order,
        } = req.body;
        let tip = document_type;
        if (document_type) {
            const check = await assertValidDocumentType(document_type);
            if (!check.ok) return res.status(400).json({ hata: check.hata });
            tip = check.tip;
        }
        if (direction && !['Giris', 'Cikis', 'Transfer', 'Bilgi'].includes(direction)) {
            return res.status(400).json({ hata: 'Geçersiz direction.' });
        }
        const result = await pool.query(
            `
            UPDATE movement_codes SET
                movement_name = COALESCE($2, movement_name),
                document_type = COALESCE($3, document_type),
                direction = COALESCE($4, direction),
                affects_stock = COALESCE($5, affects_stock),
                partner_required = COALESCE($6, partner_required),
                warehouse_required = COALESCE($7, warehouse_required),
                allow_negative_balance = COALESCE($8, allow_negative_balance),
                gl_account_code = COALESCE($9, gl_account_code),
                description = COALESCE($10, description),
                is_active = COALESCE($11, is_active),
                create_incoming_qc_order = COALESCE($12, create_incoming_qc_order),
                create_outgoing_qc_order = COALESCE($13, create_outgoing_qc_order)
            WHERE id=$1 RETURNING *
            `,
            [
                req.params.id, movement_name, tip, direction, affects_stock, partner_required,
                warehouse_required, allow_negative_balance, gl_account_code, description, is_active,
                asBool(create_incoming_qc_order, null),
                asBool(create_outgoing_qc_order, null),
            ]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Hareket kodu bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM movement_codes WHERE id=$1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Hareket kodu bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.BELGE_TIPLERI = LEGACY_BELGE_TIPLERI;
module.exports.loadDocumentTypeOptions = loadDocumentTypeOptions;
module.exports.movementDocumentKey = movementDocumentKey;
