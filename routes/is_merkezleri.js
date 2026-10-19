const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function merkezGetir(id) {
    const sonuc = await pool.query(
        `
        SELECT m.*, i.is_yeri_kodu, i.is_yeri_adi, i.firma_id
        FROM is_merkezleri m
        JOIN is_yerleri i ON i.id = m.is_yeri_id
        WHERE m.id = $1
        `,
        [id]
    );
    return sonuc.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        let firmaSql = '';
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            firmaSql = ` WHERE i.firma_id = $${params.length}`;
        }
        const sonuc = await pool.query(`
            SELECT m.*, i.is_yeri_kodu, i.is_yeri_adi, i.firma_id
            FROM is_merkezleri m
            JOIN is_yerleri i ON i.id = m.is_yeri_id
            ${firmaSql}
            ORDER BY m.id
        `, params);
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await merkezGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        const firmaId = firmaIdFromReq(req);
        if (firmaId && Number(row.firma_id) !== Number(firmaId)) {
            return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { is_yeri_id, merkez_kodu, merkez_adi } = req.body;
        if (!is_yeri_id || !merkez_adi) {
            return res.status(400).json({ hata: 'is_yeri_id ve merkez_adi zorunlu.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const kod = merkez_kodu || (await sonrakiKod(client, 'IS_MERKEZI'));
            const sonuc = await client.query(
                `INSERT INTO is_merkezleri (is_yeri_id, merkez_kodu, merkez_adi)
                 VALUES ($1,$2,$3) RETURNING id`,
                [is_yeri_id, kod, merkez_adi]
            );
            return sonuc.rows[0].id;
        });
        res.status(201).json(await merkezGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { is_yeri_id, merkez_adi } = req.body;
        if (!merkez_adi) return res.status(400).json({ hata: 'merkez_adi zorunlu.' });
        const upd = await pool.query(
            `
            UPDATE is_merkezleri SET
                is_yeri_id = COALESCE($2, is_yeri_id),
                merkez_adi = $3
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, is_yeri_id || null, merkez_adi]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        res.json(await merkezGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM is_merkezleri WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
