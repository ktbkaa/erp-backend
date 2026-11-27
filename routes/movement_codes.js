const express = require('express');
const router = express.Router();
const pool = require('../db');

const BELGE_TIPLERI = [
    'SatisTeklif', 'SatisSiparis', 'SevkEmri', 'SatisIrsaliye', 'SatisFatura',
    'SatinAlmaTalep', 'SatinAlmaSiparis', 'MalKabul', 'AlisFatura',
    'UretimEmri', 'UretimGiris', 'UretimTuketim', 'Transfer', 'Sayim', 'Fire', 'Duzeltme',
    'StokGiris', 'StokCikis',
];

router.get('/belge-tipleri', (req, res) => {
    res.json(BELGE_TIPLERI.map((id) => ({
        id,
        document_type: id,
        label: {
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
        }[id] || id,
    })));
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
            where.push(`document_type IN ('StokGiris','StokCikis','Transfer','Sayim','Fire','Duzeltme')`);
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
        if (!BELGE_TIPLERI.includes(document_type)) {
            return res.status(400).json({ hata: `Geçersiz document_type. İzin: ${BELGE_TIPLERI.join(', ')}` });
        }
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
                movement_code, movement_name, document_type, type, stock_etkisi, partner_zorunlu,
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
        if (document_type && !BELGE_TIPLERI.includes(document_type)) {
            return res.status(400).json({ hata: 'Geçersiz document_type.' });
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
                req.params.id, movement_name, document_type, direction, stock_etkisi, partner_zorunlu,
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
module.exports.BELGE_TIPLERI = BELGE_TIPLERI;
