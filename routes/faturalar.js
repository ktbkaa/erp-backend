const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function faturaGetir(id) {
    const f = await pool.query(
        `
        SELECT f.*, c.cari_kodu, c.cari_adi
        FROM faturalar f
        JOIN cariler c ON f.cari_id = c.id
        WHERE f.id = $1
        `,
        [id]
    );
    if (!f.rows[0]) return null;
    const kalemler = await pool.query(
        `
        SELECT fd.*, s.stok_kodu, s.stok_adi
        FROM fatura_detaylari fd
        JOIN stoklar s ON fd.stok_id = s.id
        WHERE fd.fatura_id = $1
        ORDER BY fd.id
        `,
        [id]
    );
    return { ...f.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows };
}

router.get('/', async (req, res) => {
    try {
        const { fatura_turu } = req.query;
        let sql = 'SELECT id FROM faturalar';
        const params = [];
        if (fatura_turu) {
            params.push(fatura_turu);
            sql += ` WHERE fatura_turu = $1`;
        }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
        const faturalar = [];
        for (const r of liste.rows) faturalar.push(await faturaGetir(r.id));
        res.json(faturalar);
    } catch (err) {
        console.error('Fatura listeleme hatası:', err);
        res.status(500).json({ hata: 'Faturalar çekilirken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const fatura = await faturaGetir(req.params.id);
        if (!fatura) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
        res.json(fatura);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { fatura_no, cari_id, fatura_turu } = req.body;
        const kalemler = req.body.kalemler || req.body.satirlar;
        if (!cari_id) {
            return res.status(400).json({ hata: 'cari_id zorunludur.' });
        }
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'En az bir fatura kalemi gerekli.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const tur = fatura_turu || 'Satis';
            const seri = tur === 'Alis' ? 'ALIS_FATURA' : 'FATURA';
            const no = fatura_no || (await sonrakiBelgeNo(client, seri));

            let toplam_tutar = 0;
            for (const k of kalemler) {
                toplam_tutar += Number(k.miktar) * Number(k.birim_fiyat);
            }

            const faturaSonuc = await client.query(
                `
                INSERT INTO faturalar (fatura_no, cari_id, fatura_turu, toplam_tutar)
                VALUES ($1, $2, $3, $4)
                RETURNING id;
                `,
                [no, cari_id, tur, toplam_tutar]
            );
            const faturaId = faturaSonuc.rows[0].id;

            for (const k of kalemler) {
                if (!k.stok_id || k.miktar == null || k.birim_fiyat == null) {
                    throw new Error('Her kalemde stok_id, miktar ve birim_fiyat zorunludur.');
                }
                const satirToplam = Number(k.miktar) * Number(k.birim_fiyat);
                await client.query(
                    `
                    INSERT INTO fatura_detaylari
                        (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar)
                    VALUES ($1, $2, $3, $4, $5)
                    `,
                    [faturaId, k.stok_id, k.miktar, k.birim_fiyat, satirToplam]
                );
            }
            return faturaId;
        });

        res.status(201).json(await faturaGetir(id));
    } catch (err) {
        console.error('Fatura kayıt hatası:', err);
        res.status(500).json({ hata: 'Fatura kesilirken bir pürüz çıktı.', detay: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { fatura_turu, cari_id } = req.body;
        const kalemler = req.body.kalemler || req.body.satirlar;
        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM faturalar WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const err = new Error('Fatura bulunamadı.');
                err.status = 404;
                throw err;
            }
            if (Array.isArray(kalemler)) {
                let toplam = 0;
                for (const k of kalemler) toplam += Number(k.miktar) * Number(k.birim_fiyat);
                await client.query(
                    `UPDATE faturalar SET
                        fatura_turu = COALESCE($2, fatura_turu),
                        cari_id = COALESCE($3, cari_id),
                        toplam_tutar = $4
                     WHERE id = $1`,
                    [req.params.id, fatura_turu || null, cari_id || null, toplam]
                );
                await client.query('DELETE FROM fatura_detaylari WHERE fatura_id=$1', [req.params.id]);
                for (const k of kalemler) {
                    if (!k.stok_id || k.miktar == null || k.birim_fiyat == null) continue;
                    await client.query(
                        `INSERT INTO fatura_detaylari (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar)
                         VALUES ($1,$2,$3,$4,$5)`,
                        [req.params.id, k.stok_id, k.miktar, k.birim_fiyat, Number(k.miktar) * Number(k.birim_fiyat)]
                    );
                }
            } else {
                await client.query(
                    `UPDATE faturalar SET
                        fatura_turu = COALESCE($2, fatura_turu),
                        cari_id = COALESCE($3, cari_id)
                     WHERE id = $1`,
                    [req.params.id, fatura_turu || null, cari_id || null]
                );
            }
            return Number(req.params.id);
        });
        res.json(await faturaGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM faturalar WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Fatura bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
