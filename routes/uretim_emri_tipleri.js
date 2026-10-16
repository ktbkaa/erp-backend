const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function tipGetir(id) {
    const sonuc = await pool.query('SELECT * FROM uretim_emri_tipleri WHERE id=$1', [id]);
    return sonuc.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const onlyAktif = req.query.aktif === 'true';
        const sonuc = await pool.query(
            `
            SELECT * FROM uretim_emri_tipleri
            ${onlyAktif ? 'WHERE aktif = TRUE' : ''}
            ORDER BY tip_kodu
            `
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await tipGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Üretim emri tipi bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { tip_kodu, tip_adi, planli_kesin, aciklama, aktif } = req.body;
        if (!tip_adi) return res.status(400).json({ hata: 'tip_adi zorunlu.' });
        if (planli_kesin && !['Planli', 'Kesin'].includes(planli_kesin)) {
            return res.status(400).json({ hata: "planli_kesin 'Planli' veya 'Kesin' olmalı." });
        }
        const id = await withTransaction(pool, async (client) => {
            const kod = tip_kodu || (await sonrakiKod(client, 'URETIM_EMRI_TIP'));
            const sonuc = await client.query(
                `
                INSERT INTO uretim_emri_tipleri (tip_kodu, tip_adi, planli_kesin, aciklama, aktif)
                VALUES ($1,$2,COALESCE($3,'Kesin'),$4,COALESCE($5,TRUE))
                RETURNING id
                `,
                [kod, tip_adi, planli_kesin || null, aciklama || null, aktif]
            );
            return sonuc.rows[0].id;
        });
        res.status(201).json(await tipGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { tip_adi, planli_kesin, aciklama, aktif } = req.body;
        if (planli_kesin && !['Planli', 'Kesin'].includes(planli_kesin)) {
            return res.status(400).json({ hata: "planli_kesin 'Planli' veya 'Kesin' olmalı." });
        }
        const sonuc = await pool.query(
            `
            UPDATE uretim_emri_tipleri SET
                tip_adi = COALESCE($2, tip_adi),
                planli_kesin = COALESCE($3, planli_kesin),
                aciklama = COALESCE($4, aciklama),
                aktif = COALESCE($5, aktif)
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, tip_adi || null, planli_kesin || null, aciklama ?? null, aktif]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Üretim emri tipi bulunamadı.' });
        res.json(await tipGetir(sonuc.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(
            `DELETE FROM uretim_emri_tipleri WHERE id=$1 RETURNING id`,
            [req.params.id]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Üretim emri tipi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
