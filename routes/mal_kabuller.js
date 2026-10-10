const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');

async function kabulGetir(id) {
    const k = await pool.query(`
        SELECT mk.*, sas.siparis_no, d.depo_kodu, d.depo_adi
        FROM mal_kabuller mk
        JOIN satin_alma_siparisleri sas ON sas.id = mk.siparis_id
        JOIN depolar d ON d.id = mk.depo_id
        WHERE mk.id = $1
    `, [id]);
    if (!k.rows[0]) return null;
    const satirlar = await pool.query(`
        SELECT mks.*, st.stok_kodu, st.stok_adi
        FROM mal_kabul_satirlari mks
        JOIN stoklar st ON st.id = mks.stok_id
        WHERE mks.kabul_id = $1 ORDER BY mks.id
    `, [id]);
    return { ...k.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM mal_kabuller ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await kabulGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Satınalma siparişinden mal kabul + Ana Depo stok girişi
 * Body: { siparis_id, depo_id, satirlar?: [{ siparis_satir_id, miktar }] }
 * satirlar yoksa kalan miktarın tamamı alınır.
 */
router.post('/', async (req, res) => {
    try {
        const { siparis_id, depo_id, satirlar } = req.body;
        if (!siparis_id || !depo_id) {
            return res.status(400).json({ hata: 'siparis_id ve depo_id zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const siparis = await client.query(
                'SELECT * FROM satin_alma_siparisleri WHERE id = $1 FOR UPDATE',
                [siparis_id]
            );
            if (!siparis.rows[0]) throw new Error('Sipariş bulunamadı.');
            if (['Iptal', 'Kapali'].includes(siparis.rows[0].durum)) {
                throw new Error(`Sipariş kapalı/iptal: ${siparis.rows[0].durum}`);
            }

            const depo = await client.query('SELECT * FROM depolar WHERE id = $1', [depo_id]);
            if (!depo.rows[0]) throw new Error('Depo bulunamadı.');

            const siparisSatirlari = await client.query(
                'SELECT * FROM satin_alma_siparis_satirlari WHERE siparis_id = $1 FOR UPDATE',
                [siparis_id]
            );

            let kabulSatirlari = satirlar;
            if (!Array.isArray(kabulSatirlari) || kabulSatirlari.length === 0) {
                kabulSatirlari = siparisSatirlari.rows
                    .map((s) => ({
                        siparis_satir_id: s.id,
                        miktar: Number(s.miktar) - Number(s.giren_miktar),
                    }))
                    .filter((s) => s.miktar > 0);
            }
            if (kabulSatirlari.length === 0) throw new Error('Kabul edilecek kalan miktar yok.');

            const hareketSatirlari = [];
            const islenen = [];

            for (const ks of kabulSatirlari) {
                const satir = siparisSatirlari.rows.find((x) => x.id === Number(ks.siparis_satir_id));
                if (!satir) throw new Error(`Sipariş satırı yok: ${ks.siparis_satir_id}`);
                const kalan = Number(satir.miktar) - Number(satir.giren_miktar);
                const miktar = Number(ks.miktar);
                if (miktar <= 0) throw new Error('Kabul miktarı > 0 olmalı.');
                if (miktar - kalan > 1e-9) {
                    throw new Error(`Fazla kabul engellendi. Satır=${satir.id}, kalan=${kalan}, istenen=${miktar}`);
                }

                await client.query(
                    `UPDATE satin_alma_siparis_satirlari
                     SET giren_miktar = giren_miktar + $1 WHERE id = $2`,
                    [miktar, satir.id]
                );

                hareketSatirlari.push({
                    stok_id: satir.stok_id,
                    miktar,
                    yon: 1,
                    birim: satir.birim,
                });
                islenen.push({ siparis_satir_id: satir.id, stok_id: satir.stok_id, miktar });
            }

            const hareket = await stokHareketOlustur(client, {
                hareketTipi: 'SATINALMA_GIRIS',
                isYeriId: siparis.rows[0].is_yeri_id,
                depoId: depo_id,
                belgeTipi: 'MAL_KABUL',
                aciklama: `SAS ${siparis.rows[0].siparis_no} mal kabul`,
                satirlar: hareketSatirlari,
            });

            const kabulNo = await sonrakiBelgeNo(client, 'MAL_KABUL');
            const kabul = await client.query(
                `INSERT INTO mal_kabuller (kabul_no, siparis_id, depo_id, stok_hareket_id)
                 VALUES ($1,$2,$3,$4) RETURNING id`,
                [kabulNo, siparis_id, depo_id, hareket.hareket.id]
            );
            const kabulId = kabul.rows[0].id;

            for (const s of islenen) {
                await client.query(
                    `INSERT INTO mal_kabul_satirlari (kabul_id, siparis_satir_id, stok_id, miktar)
                     VALUES ($1,$2,$3,$4)`,
                    [kabulId, s.siparis_satir_id, s.stok_id, s.miktar]
                );
            }

            // Sipariş durumu
            const guncel = await client.query(
                'SELECT miktar, giren_miktar FROM satin_alma_siparis_satirlari WHERE siparis_id = $1',
                [siparis_id]
            );
            const hepsi = guncel.rows.every((r) => Number(r.giren_miktar) + 1e-9 >= Number(r.miktar));
            const hic = guncel.rows.every((r) => Number(r.giren_miktar) === 0);
            const durum = hepsi ? 'Kapali' : hic ? 'Onayli' : 'KismiTeslim';
            await client.query('UPDATE satin_alma_siparisleri SET durum = $1 WHERE id = $2', [durum, siparis_id]);

            await client.query(
                'UPDATE stok_hareketleri SET belge_id = $1 WHERE id = $2',
                [kabulId, hareket.hareket.id]
            );

            return kabulId;
        });

        res.status(201).json(await kabulGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

module.exports = router;
