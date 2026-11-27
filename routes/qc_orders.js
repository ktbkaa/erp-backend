const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { assertYetki, reqKullaniciKodu } = require('../src/utils/yetki');
const { emirGetir, emirKaydet, emirOnayla } = require('../src/services/kaliteService');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.direction) {
            params.push(req.query.direction);
            where.push(`e.direction = $${params.length}`);
        }
        if (req.query.status) {
            params.push(req.query.status);
            where.push(`e.status = $${params.length}`);
        }
        if (req.query.item_id) {
            params.push(Number(req.query.item_id));
            where.push(`e.item_id = $${params.length}`);
        }
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`e.company_id = $${params.length}`);
        }
        const ids = await pool.query(
            `
            SELECT e.id FROM qc_orders e
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
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_control');
        await withTransaction(pool, async (client) => {
            await emirKaydet(client, Number(req.params.id), {
                olcumler: req.body.olcumler || [],
                uygunMiktar: req.body.accepted_quantity,
                uygunsuzMiktar: req.body.rejected_quantity,
                numuneMiktar: req.body.numune_quantity,
                description: req.body.description,
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
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_control');
        await withTransaction(pool, async (client) => {
            await emirOnayla(client, Number(req.params.id), {
                onay: req.body.onay !== false && req.body.onay !== 'Hayir',
                uygunMiktar: req.body.accepted_quantity,
                uygunsuzMiktar: req.body.rejected_quantity,
                hedefDepoId: req.body.target_warehouse_id,
                retNedenId: req.body.ret_neden_id,
                description: req.body.description,
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
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_control');
        await withTransaction(pool, async (client) => {
            const emir = await client.query('SELECT quantity FROM qc_orders WHERE id=$1', [req.params.id]);
            if (!emir.rows[0]) throw Object.assign(new Error('Emir yok'), { status: 404 });
            await emirOnayla(client, Number(req.params.id), {
                onay: false,
                uygunMiktar: 0,
                uygunsuzMiktar: Number(emir.rows[0].quantity),
                retNedenId: req.body.ret_neden_id,
                description: req.body.description,
                kullanici,
            });
        });
        res.json(await emirGetir(pool, req.params.id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

module.exports = router;
