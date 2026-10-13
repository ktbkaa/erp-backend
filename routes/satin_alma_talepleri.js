const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function talepGetir(id) {
    const t = await pool.query('SELECT * FROM satin_alma_talepleri WHERE id = $1', [id]);
    if (!t.rows[0]) return null;
    const satirlar = await pool.query(`
        SELECT ts.*, s.stok_kodu, s.stok_adi, s.birim AS stok_birimi
        FROM satin_alma_talep_satirlari ts
        JOIN stoklar s ON s.id = ts.stok_id
        WHERE ts.talep_id = $1 ORDER BY ts.id
    `, [id]);
    return { ...t.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM satin_alma_talepleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await talepGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const talep = await talepGetir(req.params.id);
        if (!talep) return res.status(404).json({ hata: 'Talep bulunamadı.' });
        res.json(talep);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { is_yeri_id, aciklama, satirlar } = req.body;
        if (!Array.isArray(satirlar) || satirlar.length === 0) {
            return res.status(400).json({ hata: 'satirlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
            const baslik = await client.query(
                `INSERT INTO satin_alma_talepleri (talep_no, is_yeri_id, aciklama)
                 VALUES ($1,$2,$3) RETURNING id`,
                [no, is_yeri_id || null, aciklama || null]
            );
            const talepId = baslik.rows[0].id;
            for (const s of satirlar) {
                const stok = await client.query('SELECT id, birim FROM stoklar WHERE id = $1', [s.stok_id]);
                if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
                await client.query(
                    `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
                     VALUES ($1,$2,$3,$4)`,
                    [talepId, s.stok_id, s.miktar, s.birim || stok.rows[0].birim]
                );
            }
            return talepId;
        });

        res.status(201).json(await talepGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { aciklama, durum } = req.body;
        const upd = await pool.query(
            `
            UPDATE satin_alma_talepleri SET
                aciklama = COALESCE($2, aciklama),
                durum = COALESCE($3, durum)
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, aciklama ?? null, durum || null]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Talep bulunamadı.' });
        res.json(await talepGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM satin_alma_talepleri WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Talep bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
