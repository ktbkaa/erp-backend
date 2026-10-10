const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');

async function emirGetir(id) {
    const e = await pool.query(`
        SELECT ue.*, s.stok_kodu, s.stok_adi, s.stok_tipi,
               hd.depo_kodu AS hammadde_depo_kodu,
               md.depo_kodu AS mamul_depo_kodu,
               ua.agac_kodu, r.rota_kodu
        FROM uretim_emirleri ue
        JOIN stoklar s ON s.id = ue.stok_id
        LEFT JOIN depolar hd ON hd.id = ue.hammadde_depo_id
        LEFT JOIN depolar md ON md.id = ue.mamul_depo_id
        LEFT JOIN urun_agaclari ua ON ua.id = ue.urun_agaci_id
        LEFT JOIN rotalar r ON r.id = ue.rota_id
        WHERE ue.id = $1
    `, [id]);
    if (!e.rows[0]) return null;
    const bilesenler = await pool.query(`
        SELECT b.*, st.stok_kodu, st.stok_adi
        FROM uretim_emri_bilesenleri b
        JOIN stoklar st ON st.id = b.stok_id
        WHERE b.emir_id = $1 ORDER BY b.id
    `, [id]);
    const girisler = await pool.query(
        'SELECT * FROM uretim_girisleri WHERE emir_id = $1 ORDER BY id',
        [id]
    );
    return { ...e.rows[0], bilesenler: bilesenler.rows, girisler: girisler.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM uretim_emirleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await emirGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const emir = await emirGetir(req.params.id);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json(emir);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Ürün ağacı + rota ile iş emri aç
 */
router.post('/', async (req, res) => {
    try {
        const {
            stok_id,
            urun_agaci_id,
            rota_id,
            is_yeri_id,
            hammadde_depo_id,
            mamul_depo_id,
            planlanan_miktar,
        } = req.body;

        if (!stok_id || !urun_agaci_id || !hammadde_depo_id || !mamul_depo_id || !planlanan_miktar) {
            return res.status(400).json({
                hata: 'stok_id, urun_agaci_id, hammadde_depo_id, mamul_depo_id, planlanan_miktar zorunlu.',
            });
        }

        const id = await withTransaction(pool, async (client) => {
            const agac = await client.query(
                'SELECT * FROM urun_agaclari WHERE id = $1 AND mamul_stok_id = $2',
                [urun_agaci_id, stok_id]
            );
            if (!agac.rows[0]) throw new Error('Ürün ağacı bu stok ile eşleşmiyor / bulunamadı.');

            const bilesenler = await client.query(
                'SELECT * FROM urun_agaci_satirlari WHERE urun_agaci_id = $1 ORDER BY sira_no',
                [urun_agaci_id]
            );
            if (bilesenler.rows.length === 0) throw new Error('Ürün ağacında bileşen yok.');

            const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
            const emir = await client.query(
                `INSERT INTO uretim_emirleri
                    (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
                     hammadde_depo_id, mamul_depo_id, planlanan_miktar, durum)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik') RETURNING id`,
                [
                    no, stok_id, urun_agaci_id, rota_id || null, is_yeri_id || null,
                    hammadde_depo_id, mamul_depo_id, planlanan_miktar,
                ]
            );
            const emirId = emir.rows[0].id;
            const carpan = Number(planlanan_miktar) / Number(agac.rows[0].miktar || 1);

            for (const b of bilesenler.rows) {
                await client.query(
                    `INSERT INTO uretim_emri_bilesenleri
                        (emir_id, stok_id, planlanan_miktar, birim)
                     VALUES ($1,$2,$3,$4)`,
                    [emirId, b.bilesen_stok_id, Number(b.miktar) * carpan, b.birim]
                );
            }
            return emirId;
        });

        res.status(201).json(await emirGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Üretim girişi: hammadde tüket + mamul depoya giriş
 * Body: { miktar }
 */
router.post('/:id/uretim-giris', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        const miktar = Number(req.body.miktar);
        if (!miktar || miktar <= 0) {
            return res.status(400).json({ hata: 'miktar > 0 olmalı.' });
        }

        const sonuc = await withTransaction(pool, async (client) => {
            const emirRes = await client.query(
                'SELECT * FROM uretim_emirleri WHERE id = $1 FOR UPDATE',
                [emirId]
            );
            const emir = emirRes.rows[0];
            if (!emir) throw new Error('Üretim emri bulunamadı.');
            if (['Kapali', 'Iptal'].includes(emir.durum)) {
                throw new Error(`Emir kapalı/iptal: ${emir.durum}`);
            }

            const kalan = Number(emir.planlanan_miktar) - Number(emir.uretilen_miktar);
            if (miktar - kalan > 1e-9) {
                throw new Error(`Fazla üretim engellendi. Kalan=${kalan}`);
            }

            const bilesenler = await client.query(
                'SELECT * FROM uretim_emri_bilesenleri WHERE emir_id = $1 FOR UPDATE',
                [emirId]
            );

            const oran = miktar / Number(emir.planlanan_miktar);
            const tuketimSatirlari = [];
            for (const b of bilesenler.rows) {
                const tuket = Number(b.planlanan_miktar) * oran;
                tuketimSatirlari.push({
                    stok_id: b.stok_id,
                    miktar: tuket,
                    yon: -1,
                    birim: b.birim,
                });
                await client.query(
                    `UPDATE uretim_emri_bilesenleri
                     SET tuketilen_miktar = tuketilen_miktar + $1 WHERE id = $2`,
                    [tuket, b.id]
                );
            }

            const tuketim = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_TUKETIM',
                isYeriId: emir.is_yeri_id,
                depoId: emir.hammadde_depo_id,
                belgeTipi: 'URETIM_GIRIS',
                aciklama: `UE ${emir.emir_no} tüketim`,
                satirlar: tuketimSatirlari,
            });

            const mamulStok = await client.query('SELECT birim FROM stoklar WHERE id = $1', [emir.stok_id]);
            const mamulHareket = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_GIRIS',
                isYeriId: emir.is_yeri_id,
                depoId: emir.mamul_depo_id,
                belgeTipi: 'URETIM_GIRIS',
                aciklama: `UE ${emir.emir_no} mamul giriş`,
                satirlar: [{
                    stok_id: emir.stok_id,
                    miktar,
                    yon: 1,
                    birim: mamulStok.rows[0]?.birim,
                }],
            });

            const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
            const giris = await client.query(
                `INSERT INTO uretim_girisleri
                    (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
                 VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                [girisNo, emirId, miktar, tuketim.hareket.id, mamulHareket.hareket.id]
            );

            await client.query(
                'UPDATE stok_hareketleri SET belge_id = $1 WHERE id IN ($2,$3)',
                [giris.rows[0].id, tuketim.hareket.id, mamulHareket.hareket.id]
            );

            const yeniUretilen = Number(emir.uretilen_miktar) + miktar;
            const durum = yeniUretilen + 1e-9 >= Number(emir.planlanan_miktar) ? 'Kapali' : 'Uretimde';
            await client.query(
                `UPDATE uretim_emirleri
                 SET uretilen_miktar = $1, durum = $2 WHERE id = $3`,
                [yeniUretilen, durum, emirId]
            );

            return giris.rows[0];
        });

        res.status(201).json({
            uretim_girisi: sonuc,
            emir: await emirGetir(emirId),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

module.exports = router;
