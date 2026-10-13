const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
    try {
        const { ekran } = req.query;
        const params = [];
        let where = '';
        if (ekran) {
            params.push(ekran);
            where = 'WHERE ekran_kodu = $1';
        }
        const sonuc = await pool.query(
            `
            SELECT seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif, kayit_tarihi
            FROM kod_serileri
            ${where}
            ORDER BY COALESCE(ekran_adi, aciklama), seri_kodu
            `,
            params
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:seriKodu', async (req, res) => {
    try {
        const sonuc = await pool.query(
            `SELECT * FROM kod_serileri WHERE seri_kodu = $1`,
            [req.params.seriKodu]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Numaratör bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Numaratörü bir adım ilerletir ve yeni kodu döner (Yeni / Kopyala açılışında). */
router.post('/:seriKodu/ayir', async (req, res) => {
    try {
        const kod = await withTransaction(pool, async (client) => {
            const seri = await client.query(
                `SELECT seri_kodu, aktif FROM kod_serileri WHERE seri_kodu = $1`,
                [req.params.seriKodu]
            );
            if (!seri.rows[0]) throw Object.assign(new Error('Numaratör tanımlı değil.'), { status: 404 });
            if (seri.rows[0].aktif === false) {
                throw Object.assign(new Error('Numaratör pasif.'), { status: 400 });
            }
            return sonrakiKod(client, req.params.seriKodu);
        });
        res.status(201).json({ seri_kodu: req.params.seriKodu, kod });
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.put('/:seriKodu', async (req, res) => {
    try {
        const { aciklama, ekran_kodu, ekran_adi, aktif, son_numara, onek } = req.body;
        const sonuc = await pool.query(
            `
            UPDATE kod_serileri SET
                aciklama = COALESCE($2, aciklama),
                ekran_kodu = COALESCE($3, ekran_kodu),
                ekran_adi = COALESCE($4, ekran_adi),
                aktif = COALESCE($5, aktif),
                son_numara = COALESCE($6, son_numara),
                onek = COALESCE($7, onek)
            WHERE seri_kodu = $1
            RETURNING *
            `,
            [
                req.params.seriKodu,
                aciklama ?? null,
                ekran_kodu ?? null,
                ekran_adi ?? null,
                typeof aktif === 'boolean' ? aktif : null,
                Number.isFinite(Number(son_numara)) ? Number(son_numara) : null,
                onek ?? null,
            ]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Numaratör bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { seri_kodu, onek, aciklama, ekran_kodu, ekran_adi, son_numara } = req.body;
        if (!seri_kodu || !onek || !aciklama) {
            return res.status(400).json({ hata: 'seri_kodu, onek ve aciklama zorunludur.' });
        }
        if (String(onek).length !== 1) {
            return res.status(400).json({ hata: 'onek tek karakter olmalı.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
            VALUES ($1, $2, $3, COALESCE($4, 0), $5, $6, TRUE)
            RETURNING *
            `,
            [seri_kodu, String(onek).toUpperCase(), aciklama, son_numara ?? 0, ekran_kodu || null, ekran_adi || null]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
