const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function isYeriGetir(id) {
    const sonuc = await pool.query(
        `
        SELECT i.*, f.firma_adi, f.firma_kodu
        FROM is_yerleri i
        JOIN firmalar f ON i.firma_id = f.id
        WHERE i.id = $1
        `,
        [id]
    );
    return sonuc.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(`
            SELECT i.*, f.firma_adi, f.firma_kodu
            FROM is_yerleri i
            JOIN firmalar f ON i.firma_id = f.id
            ORDER BY i.id DESC
        `);
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: 'İş yerleri çekilirken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await isYeriGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'İş yeri bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { firma_id, is_yeri_kodu, is_yeri_adi, adres } = req.body;
        if (!firma_id || !is_yeri_adi) {
            return res.status(400).json({ hata: 'firma_id ve is_yeri_adi zorunludur.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const kod = is_yeri_kodu || (await sonrakiKod(client, 'ISYERI'));
            const sonuc = await client.query(
                `
                INSERT INTO is_yerleri (firma_id, is_yeri_kodu, is_yeri_adi, adres)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                `,
                [firma_id, kod, is_yeri_adi, adres || null]
            );
            return sonuc.rows[0].id;
        });
        res.status(201).json(await isYeriGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { firma_id, is_yeri_adi, adres } = req.body;
        if (!is_yeri_adi) return res.status(400).json({ hata: 'is_yeri_adi zorunludur.' });
        const sonuc = await pool.query(
            `
            UPDATE is_yerleri SET
                firma_id = COALESCE($2, firma_id),
                is_yeri_adi = $3,
                adres = $4
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, firma_id || null, is_yeri_adi, adres || null]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'İş yeri bulunamadı.' });
        res.json(await isYeriGetir(sonuc.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM is_yerleri WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'İş yeri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
