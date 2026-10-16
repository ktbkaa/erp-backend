const express = require('express');
const router = express.Router();
const pool = require('../db');

async function bagGetir(id) {
    const sonuc = await pool.query(
        `
        SELECT sd.*,
               s.stok_kodu, s.stok_adi, s.stok_tipi,
               d.depo_kodu, d.depo_adi,
               iy.is_yeri_kodu, iy.is_yeri_adi
        FROM stok_depo sd
        JOIN stoklar s ON s.id = sd.stok_id
        JOIN depolar d ON d.id = sd.depo_id
        LEFT JOIN is_yerleri iy ON iy.id = sd.is_yeri_id
        WHERE sd.id = $1
        `,
        [id]
    );
    return sonuc.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const { stok_id, depo_id, aktif } = req.query;
        const params = [];
        const where = [];
        if (stok_id) {
            params.push(Number(stok_id));
            where.push(`sd.stok_id = $${params.length}`);
        }
        if (depo_id) {
            params.push(Number(depo_id));
            where.push(`sd.depo_id = $${params.length}`);
        }
        if (aktif === 'true') where.push('sd.aktif = TRUE');
        if (aktif === 'false') where.push('sd.aktif = FALSE');

        const sonuc = await pool.query(
            `
            SELECT sd.*,
                   s.stok_kodu, s.stok_adi, s.stok_tipi,
                   d.depo_kodu, d.depo_adi,
                   iy.is_yeri_kodu, iy.is_yeri_adi
            FROM stok_depo sd
            JOIN stoklar s ON s.id = sd.stok_id
            JOIN depolar d ON d.id = sd.depo_id
            LEFT JOIN is_yerleri iy ON iy.id = sd.is_yeri_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY s.stok_kodu, d.depo_kodu
            `,
            params
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await bagGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Stok-depo bağı bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { stok_id, depo_id, is_yeri_id, aktif, varsayilan_giris, varsayilan_cikis } = req.body;
        if (!stok_id || !depo_id) {
            return res.status(400).json({ hata: 'stok_id ve depo_id zorunlu.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif, varsayilan_giris, varsayilan_cikis)
            VALUES ($1,$2,$3,COALESCE($4,TRUE),COALESCE($5,FALSE),COALESCE($6,FALSE))
            ON CONFLICT (stok_id, depo_id) DO UPDATE SET
                is_yeri_id = COALESCE(EXCLUDED.is_yeri_id, stok_depo.is_yeri_id),
                aktif = COALESCE(EXCLUDED.aktif, stok_depo.aktif),
                varsayilan_giris = COALESCE(EXCLUDED.varsayilan_giris, stok_depo.varsayilan_giris),
                varsayilan_cikis = COALESCE(EXCLUDED.varsayilan_cikis, stok_depo.varsayilan_cikis)
            RETURNING id
            `,
            [stok_id, depo_id, is_yeri_id || null, aktif, varsayilan_giris, varsayilan_cikis]
        );
        res.status(201).json(await bagGetir(sonuc.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { stok_id, depo_id, is_yeri_id, aktif, varsayilan_giris, varsayilan_cikis } = req.body;
        const sonuc = await pool.query(
            `
            UPDATE stok_depo SET
                stok_id = COALESCE($2, stok_id),
                depo_id = COALESCE($3, depo_id),
                is_yeri_id = COALESCE($4, is_yeri_id),
                aktif = COALESCE($5, aktif),
                varsayilan_giris = COALESCE($6, varsayilan_giris),
                varsayilan_cikis = COALESCE($7, varsayilan_cikis)
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, stok_id || null, depo_id || null, is_yeri_id ?? null, aktif, varsayilan_giris, varsayilan_cikis]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Stok-depo bağı bulunamadı.' });
        res.json(await bagGetir(sonuc.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM stok_depo WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Stok-depo bağı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
