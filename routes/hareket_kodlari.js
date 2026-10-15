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
        belge_tipi: id,
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
        const { belge_tipi, aktif, stok_etkisi, grup } = req.query;
        const where = [];
        const params = [];
        if (belge_tipi) {
            params.push(belge_tipi);
            where.push(`belge_tipi = $${params.length}`);
        }
        if (aktif === 'true') where.push('aktif = TRUE');
        if (stok_etkisi === 'true') where.push('stok_etkisi = TRUE');
        if (grup === 'inv') {
            where.push(`belge_tipi IN ('StokGiris','StokCikis','Transfer','Sayim','Fire','Duzeltme')`);
        }
        const sql = `
            SELECT * FROM hareket_kodlari
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY belge_tipi, hareket_kodu
        `;
        const sonuc = await pool.query(sql, params);
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM hareket_kodlari WHERE id=$1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Hareket kodu bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            hareket_kodu, hareket_adi, belge_tipi, yon, stok_etkisi,
            cari_zorunlu, depo_zorunlu, eksi_bakiye_izin, muhasebe_hesap_kodu, aciklama, aktif,
        } = req.body;
        if (!hareket_kodu || !hareket_adi || !belge_tipi) {
            return res.status(400).json({ hata: 'hareket_kodu, hareket_adi, belge_tipi zorunlu.' });
        }
        if (!BELGE_TIPLERI.includes(belge_tipi)) {
            return res.status(400).json({ hata: `Geçersiz belge_tipi. İzin: ${BELGE_TIPLERI.join(', ')}` });
        }
        const tip = yon || 'Bilgi';
        if (!['Giris', 'Cikis', 'Transfer', 'Bilgi'].includes(tip)) {
            return res.status(400).json({ hata: 'Geçersiz yon.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO hareket_kodlari
                (hareket_kodu, hareket_adi, belge_tipi, yon, stok_etkisi, cari_zorunlu,
                 depo_zorunlu, eksi_bakiye_izin, muhasebe_hesap_kodu, aciklama, aktif)
            VALUES ($1,$2,$3,$4,COALESCE($5,FALSE),COALESCE($6,FALSE),COALESCE($7,FALSE),
                    COALESCE($8,FALSE),$9,$10,COALESCE($11,TRUE))
            RETURNING *
            `,
            [
                hareket_kodu, hareket_adi, belge_tipi, tip, stok_etkisi, cari_zorunlu,
                depo_zorunlu, eksi_bakiye_izin, muhasebe_hesap_kodu || null, aciklama || null, aktif,
            ]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            hareket_adi, belge_tipi, yon, stok_etkisi, cari_zorunlu,
            depo_zorunlu, eksi_bakiye_izin, muhasebe_hesap_kodu, aciklama, aktif,
        } = req.body;
        if (belge_tipi && !BELGE_TIPLERI.includes(belge_tipi)) {
            return res.status(400).json({ hata: 'Geçersiz belge_tipi.' });
        }
        if (yon && !['Giris', 'Cikis', 'Transfer', 'Bilgi'].includes(yon)) {
            return res.status(400).json({ hata: 'Geçersiz yon.' });
        }
        const sonuc = await pool.query(
            `
            UPDATE hareket_kodlari SET
                hareket_adi = COALESCE($2, hareket_adi),
                belge_tipi = COALESCE($3, belge_tipi),
                yon = COALESCE($4, yon),
                stok_etkisi = COALESCE($5, stok_etkisi),
                cari_zorunlu = COALESCE($6, cari_zorunlu),
                depo_zorunlu = COALESCE($7, depo_zorunlu),
                eksi_bakiye_izin = COALESCE($8, eksi_bakiye_izin),
                muhasebe_hesap_kodu = COALESCE($9, muhasebe_hesap_kodu),
                aciklama = COALESCE($10, aciklama),
                aktif = COALESCE($11, aktif)
            WHERE id=$1 RETURNING *
            `,
            [
                req.params.id, hareket_adi, belge_tipi, yon, stok_etkisi, cari_zorunlu,
                depo_zorunlu, eksi_bakiye_izin, muhasebe_hesap_kodu, aciklama, aktif,
            ]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Hareket kodu bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('DELETE FROM hareket_kodlari WHERE id=$1 RETURNING id', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Hareket kodu bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.BELGE_TIPLERI = BELGE_TIPLERI;
