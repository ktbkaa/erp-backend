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
function hareketBelgeKey(documentTypeCode) {
    const code = String(documentTypeCode || '').trim();
    if (!code) return '';
    return HAREKET_BELGE_TIPI[code] || code;
}

/** UI / validasyon için belge tipi listesi (DB + legacy) */
async function loadBelgeTipiOptions(client = pool) {
    const byKey = new Map();

    const docs = await client.query(
        `SELECT document_type_code, document_type_name, module, stock_etkisi, is_active
         FROM document_types
         WHERE is_active IS DISTINCT FROM FALSE
         ORDER BY module, document_type_name, document_type_code`
    );
    for (const row of docs.rows) {
        let key = hareketBelgeKey(row.document_type_code);
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
            stock_etkisi: Boolean(row.stock_etkisi),
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
            stock_etkisi: null,
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
            stock_etkisi: null,
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
    const opts = await loadBelgeTipiOptions();
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
        let rows = await loadBelgeTipiOptions();
        if (req.query.stock_etkisi === 'true') {
            rows = rows.filter((r) => r.stock_etkisi === true || r.stock_etkisi == null);
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { document_type, is_active, stock_etkisi, grup } = req.query;
        const where = [];
        const params = [];
        if (document_type) {
            params.push(document_type);
            where.push(`document_type = $${params.length}`);
        }
        if (is_active === 'true') where.push('is_active = TRUE');
        if (stock_etkisi === 'true') where.push('stock_etkisi = TRUE');
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

router.post('/', async (req, res) => {
    try {
        const {
            movement_code, movement_name, document_type, direction, stock_etkisi,
            partner_zorunlu, warehouse_zorunlu, eksi_balance_izin, gl_account_code, description, is_active,
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
                (movement_code, movement_name, document_type, direction, stock_etkisi, partner_zorunlu,
                 warehouse_zorunlu, eksi_balance_izin, gl_account_code, description, is_active)
            VALUES ($1,$2,$3,$4,COALESCE($5,FALSE),COALESCE($6,FALSE),COALESCE($7,FALSE),
                    COALESCE($8,FALSE),$9,$10,COALESCE($11,TRUE))
            RETURNING *
            `,
            [
                movement_code, movement_name, check.tip, type, stock_etkisi, partner_zorunlu,
                warehouse_zorunlu, eksi_balance_izin, gl_account_code || null, description || null, is_active,
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
            movement_name, document_type, direction, stock_etkisi, partner_zorunlu,
            warehouse_zorunlu, eksi_balance_izin, gl_account_code, description, is_active,
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
                stock_etkisi = COALESCE($5, stock_etkisi),
                partner_zorunlu = COALESCE($6, partner_zorunlu),
                warehouse_zorunlu = COALESCE($7, warehouse_zorunlu),
                eksi_balance_izin = COALESCE($8, eksi_balance_izin),
                gl_account_code = COALESCE($9, gl_account_code),
                description = COALESCE($10, description),
                is_active = COALESCE($11, is_active)
            WHERE id=$1 RETURNING *
            `,
            [
                req.params.id, movement_name, tip, direction, stock_etkisi, partner_zorunlu,
                warehouse_zorunlu, eksi_balance_izin, gl_account_code, description, is_active,
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
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.BELGE_TIPLERI = LEGACY_BELGE_TIPLERI;
module.exports.loadBelgeTipiOptions = loadBelgeTipiOptions;
module.exports.hareketBelgeKey = hareketBelgeKey;
