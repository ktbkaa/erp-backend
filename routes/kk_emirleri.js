const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { assertYetki, reqKullaniciKodu } = require('../src/utils/yetki');
const { emirGetir, emirKaydet, emirOnayla } = require('../src/services/kaliteService');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.yon) {
            params.push(req.query.yon);
            where.push(`e.yon = $${params.length}`);
        }
        if (req.query.durum) {
            params.push(req.query.durum);
            where.push(`e.durum = $${params.length}`);
        }
        if (req.query.stok_id) {
            params.push(Number(req.query.stok_id));
            where.push(`e.stok_id = $${params.length}`);
        }
        const ids = await pool.query(
            `
            SELECT e.id FROM kk_emirleri e
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY e.id DESC
            LIMIT 500
            `,
            params
        );
        const out = [];
        for (const r of ids.rows) out.push(await emirGetir(pool, r.id));
        res.json(out);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const e = await emirGetir(pool, req.params.id);
        if (!e) return res.status(404).json({ hata: 'KK emri bulunamadı.' });
        res.json(e);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/:id/kaydet', async (req, res) => {
    try {
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_kontrol');
        await withTransaction(pool, async (client) => {
            await emirKaydet(client, Number(req.params.id), {
                olcumler: req.body.olcumler || [],
                uygunMiktar: req.body.uygun_miktar,
                uygunsuzMiktar: req.body.uygunsuz_miktar,
                numuneMiktar: req.body.numune_miktar,
                aciklama: req.body.aciklama,
                kullanici,
            });
        });
        res.json(await emirGetir(pool, req.params.id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.post('/:id/onayla', async (req, res) => {
    try {
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_kontrol');
        await withTransaction(pool, async (client) => {
            await emirOnayla(client, Number(req.params.id), {
                onay: req.body.onay !== false && req.body.onay !== 'Hayir',
                uygunMiktar: req.body.uygun_miktar,
                uygunsuzMiktar: req.body.uygunsuz_miktar,
                hedefDepoId: req.body.hedef_depo_id,
                retNedenId: req.body.ret_neden_id,
                aciklama: req.body.aciklama,
                kullanici,
            });
        });
        res.json(await emirGetir(pool, req.params.id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.post('/:id/reddet', async (req, res) => {
    try {
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_kontrol');
        await withTransaction(pool, async (client) => {
            const emir = await client.query('SELECT miktar FROM kk_emirleri WHERE id=$1', [req.params.id]);
            if (!emir.rows[0]) throw Object.assign(new Error('Emir yok'), { status: 404 });
            await emirOnayla(client, Number(req.params.id), {
                onay: false,
                uygunMiktar: 0,
                uygunsuzMiktar: Number(emir.rows[0].miktar),
                retNedenId: req.body.ret_neden_id,
                aciklama: req.body.aciklama,
                kullanici,
            });
        });
        res.json(await emirGetir(pool, req.params.id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

module.exports = router;
