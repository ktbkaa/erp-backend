const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

router.get('/', async (req, res) => {
    try {
        const { aktif } = req.query;
        const where = [];
        if (aktif === 'true') where.push('aktif = TRUE');
        if (aktif === 'false') where.push('aktif = FALSE');
        const sql = `SELECT * FROM ulkeler ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ulke_adi`;
        res.json((await pool.query(sql)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM ulkeler WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Ülke bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const ulke_adi = trimOrNull(req.body.ulke_adi);
        if (!ulke_adi) return res.status(400).json({ hata: 'ulke_adi zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.ulke_kodu) || (await sonrakiKod(client, 'ULKE'));
            const ins = await client.query(
                `INSERT INTO ulkeler (ulke_kodu, ulke_adi, aktif)
                 VALUES ($1,$2,COALESCE($3,TRUE)) RETURNING *`,
                [kod, ulke_adi, typeof req.body.aktif === 'boolean' ? req.body.aktif : true]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'Ülke kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const ulke_adi = trimOrNull(req.body.ulke_adi);
        if (!ulke_adi) return res.status(400).json({ hata: 'ulke_adi zorunludur.' });
        const upd = await pool.query(
            `UPDATE ulkeler SET ulke_adi=$2, aktif=COALESCE($3,aktif) WHERE id=$1 RETURNING *`,
            [req.params.id, ulke_adi, typeof req.body.aktif === 'boolean' ? req.body.aktif : null]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Ülke bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM ulkeler WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Ülke bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
