const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, assertStokDepoIzin } = require('../src/services/stokHareketService');
const { kkEmriOlustur, gkkDepoCozumle, depoBulKodVeyaRol } = require('../src/services/kaliteService');
const { parametreAl } = require('../src/utils/yetki');

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
            const kkSatirlari = [];
            const gkkDepo = await gkkDepoCozumle(client);
            const hammaddeDepo = await depoBulKodVeyaRol(client, {
                kodParam: 'HAMMADDE_DEPO_KODU',
                rol: 'Hammadde',
            });
            const depoZorunlu = String(await parametreAl(client, 'STOK_DEPO_ZORUNLU', 'Evet')).toLowerCase() === 'evet';

            for (const ks of kabulSatirlari) {
                const satir = siparisSatirlari.rows.find((x) => x.id === Number(ks.siparis_satir_id));
                if (!satir) throw new Error(`Sipariş satırı yok: ${ks.siparis_satir_id}`);
                const kalan = Number(satir.miktar) - Number(satir.giren_miktar);
                const miktar = Number(ks.miktar);
                if (miktar <= 0) throw new Error('Kabul miktarı > 0 olmalı.');
                if (miktar - kalan > 1e-9) {
                    throw new Error(`Fazla kabul engellendi. Satır=${satir.id}, kalan=${kalan}, istenen=${miktar}`);
                }

                const stok = await client.query(
                    `SELECT id, birim, kalite_kontrol_gerekli, varsayilan_giris_depo_id, parti_politika
                     FROM stoklar WHERE id=$1`,
                    [satir.stok_id]
                );
                if (!stok.rows[0]) throw new Error(`Stok yok: ${satir.stok_id}`);
                const kkGerekli = Boolean(stok.rows[0].kalite_kontrol_gerekli);
                let hedefDepoId = depo_id;
                if (kkGerekli) {
                    if (!gkkDepo) throw new Error('GKK deposu tanımlı değil (GKK_DEPO_KODU / depo_rolu=GKK).');
                    hedefDepoId = gkkDepo.id;
                } else if (stok.rows[0].varsayilan_giris_depo_id) {
                    hedefDepoId = stok.rows[0].varsayilan_giris_depo_id;
                }

                if (depoZorunlu) {
                    try {
                        await assertStokDepoIzin(client, satir.stok_id, hedefDepoId);
                    } catch (e) {
                        // Mal kabulde tanımsızsa stok_depo otomatik oluştur (ilk kabul)
                        await client.query(
                            `
                            INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif, varsayilan_giris)
                            VALUES ($1,$2,$3,TRUE,$4)
                            ON CONFLICT (stok_id, depo_id) DO UPDATE SET aktif=TRUE
                            `,
                            [satir.stok_id, hedefDepoId, siparis.rows[0].is_yeri_id || null, !kkGerekli]
                        );
                    }
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
                    birim: satir.birim || stok.rows[0].birim,
                    stok_statu: kkGerekli ? 'Kalitede' : 'Kullanilabilir',
                    depo_id: hedefDepoId,
                    kk: kkGerekli,
                });
                islenen.push({
                    siparis_satir_id: satir.id,
                    stok_id: satir.stok_id,
                    miktar,
                    depo_id: hedefDepoId,
                    kk: kkGerekli,
                });
            }

            // Depo bazında grupla (GKK vs normal)
            const depoGrup = new Map();
            for (const s of hareketSatirlari) {
                const key = `${s.depo_id}|${s.stok_statu}`;
                if (!depoGrup.has(key)) depoGrup.set(key, { depoId: s.depo_id, satirlar: [] });
                depoGrup.get(key).satirlar.push(s);
            }

            const { hareketKoduBul, BELGE_TIPI } = require('../src/utils/belgeOmurga');
            const hk = await hareketKoduBul(client, BELGE_TIPI.MAL_KABUL);
            let anaHareketId = null;

            for (const grup of depoGrup.values()) {
                const hareket = await stokHareketOlustur(client, {
                    hareketTipi: 'SATINALMA_GIRIS',
                    isYeriId: siparis.rows[0].is_yeri_id,
                    depoId: grup.depoId,
                    belgeTipi: 'MAL_KABUL',
                    aciklama: `SAS ${siparis.rows[0].siparis_no} mal kabul`,
                    hareketKoduId: hk?.id || null,
                    satirlar: grup.satirlar,
                });
                if (!anaHareketId) anaHareketId = hareket.hareket.id;

                for (const sat of hareket.satirlar) {
                    const kaynak = hareketSatirlari.find(
                        (x) => x.stok_id === sat.stok_id && x.kk && x.depo_id === grup.depoId
                    );
                    if (kaynak?.kk) {
                        kkSatirlari.push({
                            stok_id: sat.stok_id,
                            parti_id: sat.parti_id,
                            miktar: sat.miktar,
                            depo_id: grup.depoId,
                            hareket_id: hareket.hareket.id,
                        });
                    }
                }
            }

            const kabulNo = await sonrakiBelgeNo(client, 'MAL_KABUL');
            const kabul = await client.query(
                `INSERT INTO mal_kabuller (kabul_no, siparis_id, depo_id, stok_hareket_id)
                 VALUES ($1,$2,$3,$4) RETURNING id`,
                [kabulNo, siparis_id, depo_id, anaHareketId]
            );
            const kabulId = kabul.rows[0].id;

            for (const s of islenen) {
                await client.query(
                    `INSERT INTO mal_kabul_satirlari (kabul_id, siparis_satir_id, stok_id, miktar)
                     VALUES ($1,$2,$3,$4)`,
                    [kabulId, s.siparis_satir_id, s.stok_id, s.miktar]
                );
            }

            for (const kk of kkSatirlari) {
                await kkEmriOlustur(client, {
                    yon: 'GKK',
                    stokId: kk.stok_id,
                    partiId: kk.parti_id,
                    depoId: kk.depo_id,
                    hedefDepoId: hammaddeDepo?.id || null,
                    miktar: kk.miktar,
                    kaynakTipi: 'MAL_KABUL',
                    kaynakId: kabulId,
                    stokHareketId: kk.hareket_id,
                    aciklama: `Mal kabul ${kabulNo}`,
                });
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

            if (anaHareketId) {
                await client.query(
                    'UPDATE stok_hareketleri SET belge_id = $1 WHERE id = $2',
                    [kabulId, anaHareketId]
                );
            }

            return kabulId;
        });

        res.status(201).json(await kabulGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await kabulGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Mal kabul bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM mal_kabuller WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Mal kabul bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Mal kabul → Alış faturası (REQ-PUR-006 / REQ-FIN-001 / P13)
 * POST /mal-kabuller/:id/fatura-olustur
 */
router.post('/:id/fatura-olustur', async (req, res, next) => {
    try {
        const kabulId = Number(req.params.id);
        const faturaId = await withTransaction(pool, async (client) => {
            const kLock = await client.query(
                `SELECT * FROM mal_kabuller WHERE id = $1 FOR UPDATE`,
                [kabulId]
            );
            if (!kLock.rows[0]) throw Object.assign(new Error('Mal kabul bulunamadı.'), { status: 404 });
            const k = await client.query(
                `SELECT mk.*, sas.cari_id, sas.id AS siparis_id, sas.siparis_no
                 FROM mal_kabuller mk
                 JOIN satin_alma_siparisleri sas ON sas.id = mk.siparis_id
                 WHERE mk.id = $1`,
                [kabulId]
            );
            const mevcut = await client.query(
                `SELECT id FROM faturalar WHERE mal_kabul_id = $1 LIMIT 1`,
                [kabulId]
            );
            if (mevcut.rows[0]) {
                throw Object.assign(new Error(`Bu mal kabul zaten faturalandı (fatura id=${mevcut.rows[0].id}).`), { status: 409 });
            }
            const satirlar = await client.query(
                `SELECT mks.*, COALESCE(ss.birim_fiyat, 0) AS birim_fiyat, ss.birim
                 FROM mal_kabul_satirlari mks
                 LEFT JOIN satin_alma_siparis_satirlari ss ON ss.id = mks.siparis_satir_id
                 WHERE mks.kabul_id = $1 ORDER BY mks.id`,
                [kabulId]
            );
            if (!satirlar.rows.length) throw Object.assign(new Error('Mal kabul satırı yok.'), { status: 400 });

            const no = await sonrakiBelgeNo(client, 'ALIS_FATURA');
            let toplam = 0;
            let toplamKdv = 0;
            const kdvOran = Number(req.body.kdv_oran ?? 20);
            for (const s of satirlar.rows) {
                const satir = Number(s.miktar) * Number(s.birim_fiyat || 0);
                toplam += satir;
                toplamKdv += satir * (kdvOran / 100);
            }
            const f = await client.query(
                `INSERT INTO faturalar (
                    fatura_no, cari_id, fatura_turu, toplam_tutar,
                    mal_hizmet_toplam, toplam_kdv, odenecek_tutar,
                    mal_kabul_id, siparis_id, kaynak_belge_tipi, kaynak_belge_id,
                    durum, odeme_kosulu, para_birimi, kur
                 ) VALUES ($1,$2,'Alis',$3,$3,$4,$5,$6,$7,'MAL_KABUL',$6,'Taslak',$8,'TRY',1)
                 RETURNING id`,
                [
                    no, k.rows[0].cari_id, toplam, toplamKdv, toplam + toplamKdv,
                    kabulId, k.rows[0].siparis_id, req.body.odeme_kosulu || null,
                ]
            );
            const id = f.rows[0].id;
            for (const s of satirlar.rows) {
                const satir = Number(s.miktar) * Number(s.birim_fiyat || 0);
                await client.query(
                    `INSERT INTO fatura_detaylari
                      (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar, birim, kdv_oran, kdv_tutari, mal_hizmet_tutari)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [
                        id, s.stok_id, s.miktar, s.birim_fiyat || 0, satir,
                        s.birim || null, kdvOran, satir * (kdvOran / 100), satir,
                    ]
                );
            }
            return id;
        });
        const fatura = await pool.query(
            `SELECT f.*, c.cari_kodu, c.cari_adi FROM faturalar f
             JOIN cariler c ON c.id = f.cari_id WHERE f.id = $1`,
            [faturaId]
        );
        const kalemler = await pool.query(
            `SELECT fd.*, s.stok_kodu, s.stok_adi FROM fatura_detaylari fd
             JOIN stoklar s ON s.id = fd.stok_id WHERE fd.fatura_id = $1 ORDER BY fd.id`,
            [faturaId]
        );
        res.status(201).json({ ...fatura.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
