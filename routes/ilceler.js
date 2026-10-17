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
        const { aktif, sehir_kodu, sehir_adi } = req.query;
        const where = [];
        const params = [];
        if (aktif === 'true') where.push('aktif = TRUE');
        if (aktif === 'false') where.push('aktif = FALSE');
        if (sehir_kodu) {
            params.push(sehir_kodu);
            where.push(`sehir_kodu = $${params.length}`);
        }
        if (sehir_adi) {
            params.push(sehir_adi);
            where.push(`sehir_kodu IN (SELECT sehir_kodu FROM sehirler WHERE lower(sehir_adi) = lower($${params.length}))`);
        }
        const sql = `SELECT * FROM ilceler ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ilce_adi`;
        res.json((await pool.query(sql, params)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM ilceler WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const ilce_adi = trimOrNull(req.body.ilce_adi);
        if (!ilce_adi) return res.status(400).json({ hata: 'ilce_adi zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.ilce_kodu) || (await sonrakiKod(client, 'ILCE'));
            const ins = await client.query(
                `INSERT INTO ilceler (ilce_kodu, ilce_adi, sehir_kodu, aktif)
                 VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING *`,
                [
                    kod,
                    ilce_adi,
                    trimOrNull(req.body.sehir_kodu),
                    typeof req.body.aktif === 'boolean' ? req.body.aktif : true,
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İlçe kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const ilce_adi = trimOrNull(req.body.ilce_adi);
        if (!ilce_adi) return res.status(400).json({ hata: 'ilce_adi zorunludur.' });
        const upd = await pool.query(
            `UPDATE ilceler SET
                ilce_adi = $2,
                sehir_kodu = COALESCE($3, sehir_kodu),
                aktif = COALESCE($4, aktif)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                ilce_adi,
                trimOrNull(req.body.sehir_kodu),
                typeof req.body.aktif === 'boolean' ? req.body.aktif : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM ilceler WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
