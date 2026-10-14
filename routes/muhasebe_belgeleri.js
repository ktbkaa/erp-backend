const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function belgeGetir(id) {
    const b = await pool.query('SELECT * FROM muhasebe_belgeleri WHERE id=$1', [id]);
    if (!b.rows[0]) return null;
    const kalemler = await pool.query(
        `
        SELECT k.*, h.hesap_kodu, h.hesap_adi
        FROM muhasebe_belge_kalemleri k
        JOIN muhasebe_hesaplari h ON h.id = k.hesap_id
        WHERE k.belge_id=$1
        ORDER BY k.id
        `,
        [id]
    );
    const borc = kalemler.rows.reduce((s, r) => s + Number(r.borc), 0);
    const alacak = kalemler.rows.reduce((s, r) => s + Number(r.alacak), 0);
    return {
        ...b.rows[0],
        kalemler: kalemler.rows,
        satirlar: kalemler.rows,
        toplam_borc: borc,
        toplam_alacak: alacak,
        dengeli: Math.abs(borc - alacak) < 0.005,
    };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM muhasebe_belgeleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await belgeGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const belge = await belgeGetir(req.params.id);
        if (!belge) return res.status(404).json({ hata: 'Belge bulunamadı.' });
        res.json(belge);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { belge_tarihi, aciklama, kalemler, satirlar } = req.body;
        const lines = kalemler || satirlar;
        if (!Array.isArray(lines) || lines.length < 2) {
            return res.status(400).json({ hata: 'En az iki muhasebe kalemi gerekli.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'MUHASEBE_BELGE');
            const baslik = await client.query(
                `
                INSERT INTO muhasebe_belgeleri (belge_no, belge_tarihi, aciklama)
                VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3) RETURNING id
                `,
                [no, belge_tarihi || null, aciklama || null]
            );
            const belgeId = baslik.rows[0].id;
            let borc = 0;
            let alacak = 0;
            for (const k of lines) {
                if (!k.hesap_id) throw new Error('hesap_id zorunlu.');
                const b = Number(k.borc || 0);
                const a = Number(k.alacak || 0);
                if (b < 0 || a < 0 || (b > 0 && a > 0) || (b === 0 && a === 0)) {
                    throw new Error('Her kalemde yalnızca borc veya alacak > 0 olmalı.');
                }
                borc += b;
                alacak += a;
                await client.query(
                    `
                    INSERT INTO muhasebe_belge_kalemleri (belge_id, hesap_id, borc, alacak, aciklama)
                    VALUES ($1,$2,$3,$4,$5)
                    `,
                    [belgeId, k.hesap_id, b, a, k.aciklama || null]
                );
            }
            if (Math.abs(borc - alacak) >= 0.005) {
                throw new Error(`Belge dengeli değil: borc=${borc} alacak=${alacak}`);
            }
            return belgeId;
        });
        res.status(201).json(await belgeGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { belge_tarihi, aciklama, durum, kalemler, satirlar } = req.body;
        if (durum && !['Taslak', 'Onayli', 'Iptal'].includes(durum)) {
            return res.status(400).json({ hata: 'Geçersiz durum.' });
        }
        const lines = kalemler || satirlar;
        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                'SELECT id, durum FROM muhasebe_belgeleri WHERE id=$1 FOR UPDATE',
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                const e = new Error('Belge bulunamadı.');
                e.status = 404;
                throw e;
            }
            if (mevcut.rows[0].durum === 'Onayli' && lines) {
                throw new Error('Onaylı belge kalemleri değiştirilemez; önce onay kaldırın.');
            }
            await client.query(
                `
                UPDATE muhasebe_belgeleri SET
                    belge_tarihi = COALESCE($2::date, belge_tarihi),
                    aciklama = COALESCE($3, aciklama),
                    durum = COALESCE($4, durum)
                WHERE id=$1
                `,
                [req.params.id, belge_tarihi || null, aciklama ?? null, durum || null]
            );
            if (Array.isArray(lines)) {
                if (lines.length < 2) throw new Error('En az iki kalem gerekli.');
                await client.query('DELETE FROM muhasebe_belge_kalemleri WHERE belge_id=$1', [req.params.id]);
                let borc = 0;
                let alacak = 0;
                for (const k of lines) {
                    if (!k.hesap_id) throw new Error('hesap_id zorunlu.');
                    const b = Number(k.borc || 0);
                    const a = Number(k.alacak || 0);
                    if (b < 0 || a < 0 || (b > 0 && a > 0) || (b === 0 && a === 0)) {
                        throw new Error('Her kalemde yalnızca borc veya alacak > 0 olmalı.');
                    }
                    borc += b;
                    alacak += a;
                    await client.query(
                        `
                        INSERT INTO muhasebe_belge_kalemleri (belge_id, hesap_id, borc, alacak, aciklama)
                        VALUES ($1,$2,$3,$4,$5)
                        `,
                        [req.params.id, k.hesap_id, b, a, k.aciklama || null]
                    );
                }
                if (Math.abs(borc - alacak) >= 0.005) {
                    throw new Error(`Belge dengeli değil: borc=${borc} alacak=${alacak}`);
                }
            }
            return Number(req.params.id);
        });
        res.json(await belgeGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.post('/:id/onayla', async (req, res) => {
    try {
        const belge = await belgeGetir(req.params.id);
        if (!belge) return res.status(404).json({ hata: 'Belge bulunamadı.' });
        if (!belge.dengeli) return res.status(400).json({ hata: 'Dengesiz belge onaylanamaz.' });
        const upd = await pool.query(
            `UPDATE muhasebe_belgeleri SET durum='Onayli' WHERE id=$1 AND durum='Taslak' RETURNING id`,
            [req.params.id]
        );
        if (!upd.rows[0]) return res.status(400).json({ hata: 'Belge onaylanamadı.' });
        res.json(await belgeGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/:id/onay-kaldir', async (req, res) => {
    try {
        const upd = await pool.query(
            `UPDATE muhasebe_belgeleri SET durum='Taslak' WHERE id=$1 AND durum='Onayli' RETURNING id`,
            [req.params.id]
        );
        if (!upd.rows[0]) return res.status(400).json({ hata: 'Onay kaldırılamadı.' });
        res.json(await belgeGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const mevcut = await pool.query('SELECT durum FROM muhasebe_belgeleri WHERE id=$1', [req.params.id]);
        if (!mevcut.rows[0]) return res.status(404).json({ hata: 'Belge bulunamadı.' });
        if (mevcut.rows[0].durum === 'Onayli') {
            return res.status(400).json({ hata: 'Onaylı belge silinemez.' });
        }
        await pool.query('DELETE FROM muhasebe_belgeleri WHERE id=$1', [req.params.id]);
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
