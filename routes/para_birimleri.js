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
        const sql = `SELECT * FROM para_birimleri ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY pb_kodu`;
        res.json((await pool.query(sql)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM para_birimleri WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const pb_adi = trimOrNull(req.body.pb_adi);
        if (!pb_adi) return res.status(400).json({ hata: 'pb_adi zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.pb_kodu) || (await sonrakiKod(client, 'PARA_BIRIM'));
            const ins = await client.query(
                `INSERT INTO para_birimleri (pb_kodu, pb_adi, sembol, aktif)
                 VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING *`,
                [
                    kod,
                    pb_adi,
                    trimOrNull(req.body.sembol),
                    typeof req.body.aktif === 'boolean' ? req.body.aktif : true,
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'Para birimi kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const pb_adi = trimOrNull(req.body.pb_adi);
        if (!pb_adi) return res.status(400).json({ hata: 'pb_adi zorunludur.' });
        const upd = await pool.query(
            `UPDATE para_birimleri SET
                pb_adi = $2,
                sembol = COALESCE($3, sembol),
                aktif = COALESCE($4, aktif)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                pb_adi,
                trimOrNull(req.body.sembol),
                typeof req.body.aktif === 'boolean' ? req.body.aktif : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM para_birimleri WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
