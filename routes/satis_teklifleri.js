const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');

async function teklifGetir(id) {
    const t = await pool.query(
        `
        SELECT t.*, c.cari_kodu, c.cari_adi, hk.hareket_kodu, hk.hareket_adi
        FROM satis_teklifleri t
        JOIN cariler c ON c.id = t.cari_id
        LEFT JOIN hareket_kodlari hk ON hk.id = t.hareket_kodu_id
        WHERE t.id = $1
        `,
        [id]
    );
    if (!t.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.stok_kodu, st.stok_adi
        FROM satis_teklif_satirlari s
        JOIN stoklar st ON st.id = s.stok_id
        WHERE s.teklif_id = $1
        ORDER BY s.sira_no, s.id
        `,
        [id]
    );
    return { ...t.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

function hazirSatirlar(raw) {
    return raw.map((k, i) => {
        const h = satirHesapla(k);
        return {
            sira_no: k.sira_no || i + 1,
            stok_id: k.stok_id,
            miktar: k.miktar,
            birim: k.birim || null,
            birim_fiyat: k.birim_fiyat,
            ...h,
        };
    });
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM satis_teklifleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await teklifGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await teklifGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { cari_id, teklif_tarihi, gecerlilik_tarihi, para_birimi, aciklama, hareket_kodu_id, durum } = req.body;
        const raw = req.body.satirlar || req.body.kalemler;
        if (!cari_id) return res.status(400).json({ hata: 'cari_id zorunlu.' });
        if (!Array.isArray(raw) || !raw.length) return res.status(400).json({ hata: 'satirlar zorunlu.' });
        const satirlar = hazirSatirlar(raw);
        const top = belgelerToplam(satirlar);

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATIS_TEKLIF');
            let hk = hareket_kodu_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM hareket_kodlari WHERE belge_tipi='SatisTeklif' AND aktif ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO satis_teklifleri
                    (teklif_no, cari_id, teklif_tarihi, gecerlilik_tarihi, para_birimi,
                     durum, hareket_kodu_id, aciklama, toplam_tutar)
                VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,COALESCE($5,'TRY'),
                        COALESCE($6,'Taslak'),$7,$8,$9)
                RETURNING id
                `,
                [
                    no, cari_id, teklif_tarihi || null, gecerlilik_tarihi || null, para_birimi,
                    durum || 'Taslak', hk, aciklama || null, top.toplam_tutar,
                ]
            );
            const tid = baslik.rows[0].id;
            for (const s of satirlar) {
                await client.query(
                    `
                    INSERT INTO satis_teklif_satirlari
                        (teklif_id, sira_no, stok_id, miktar, birim, birim_fiyat,
                         iskonto_oran, iskonto_tutari, kdv_oran, kdv_tutari, mal_hizmet_tutari)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    `,
                    [
                        tid, s.sira_no, s.stok_id, s.miktar, s.birim, s.birim_fiyat,
                        s.iskonto_oran, s.iskonto_tutari, s.kdv_oran, s.kdv_tutari, s.mal_hizmet_tutari,
                    ]
                );
            }
            return tid;
        });
        res.status(201).json(await teklifGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { cari_id, teklif_tarihi, gecerlilik_tarihi, para_birimi, aciklama, hareket_kodu_id, durum } = req.body;
        const raw = req.body.satirlar || req.body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali'];
        if (durum && !allowed.includes(durum)) return res.status(400).json({ hata: 'Geçersiz durum.' });

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id, durum FROM satis_teklifleri WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('Teklif bulunamadı.');
                e.status = 404;
                throw e;
            }
            let toplam = null;
            let satirlar = null;
            if (Array.isArray(raw)) {
                satirlar = hazirSatirlar(raw);
                toplam = belgelerToplam(satirlar).toplam_tutar;
            }
            await client.query(
                `
                UPDATE satis_teklifleri SET
                    cari_id = COALESCE($2, cari_id),
                    teklif_tarihi = COALESCE($3::date, teklif_tarihi),
                    gecerlilik_tarihi = COALESCE($4::date, gecerlilik_tarihi),
                    para_birimi = COALESCE($5, para_birimi),
                    durum = COALESCE($6, durum),
                    hareket_kodu_id = COALESCE($7, hareket_kodu_id),
                    aciklama = COALESCE($8, aciklama),
                    toplam_tutar = COALESCE($9, toplam_tutar)
                WHERE id=$1
                `,
                [
                    req.params.id, cari_id || null, teklif_tarihi || null, gecerlilik_tarihi || null,
                    para_birimi || null, durum || null, hareket_kodu_id || null, aciklama ?? null, toplam,
                ]
            );
            if (satirlar) {
                await client.query('DELETE FROM satis_teklif_satirlari WHERE teklif_id=$1', [req.params.id]);
                for (const s of satirlar) {
                    await client.query(
                        `
                        INSERT INTO satis_teklif_satirlari
                            (teklif_id, sira_no, stok_id, miktar, birim, birim_fiyat,
                             iskonto_oran, iskonto_tutari, kdv_oran, kdv_tutari, mal_hizmet_tutari)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                        `,
                        [
                            req.params.id, s.sira_no, s.stok_id, s.miktar, s.birim, s.birim_fiyat,
                            s.iskonto_oran, s.iskonto_tutari, s.kdv_oran, s.kdv_tutari, s.mal_hizmet_tutari,
                        ]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await teklifGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Teklif → Satış Siparişi (P01 kaynak_belge + satır ref) */
router.post('/:id/siparise-donustur', async (req, res) => {
    try {
        const { BELGE_TIPI, hareketKoduBul } = require('../src/utils/belgeOmurga');
        const teklif = await teklifGetir(req.params.id);
        if (!teklif) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
        if (!['Onayli', 'Taslak'].includes(teklif.durum)) {
            return res.status(400).json({ hata: `Durum dönüşüme uygun değil: ${teklif.durum}` });
        }

        const siparisId = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATIS_SIPARIS');
            const hk = await hareketKoduBul(client, BELGE_TIPI.SATIS_SIPARIS);

            const sip = await client.query(
                `
                INSERT INTO siparisler
                    (siparis_no, cari_id, cari_kodu, cari_adi, siparis_tarihi, siparis_turu,
                     toplam_tutar, durum, teklif_id, hareket_kodu_id, para_birimi, aciklama,
                     kaynak_belge_tipi, kaynak_belge_id)
                VALUES ($1,$2,$3,$4,CURRENT_DATE,'SatisSiparis',$5,'Onayli',$6,$7,$8,$9,$10,$11)
                RETURNING id
                `,
                [
                    no, teklif.cari_id, teklif.cari_kodu, teklif.cari_adi, teklif.toplam_tutar,
                    teklif.id, hk?.id || null, teklif.para_birimi || 'TRY',
                    `Teklif ${teklif.teklif_no} dönüşümü`,
                    BELGE_TIPI.SATIS_TEKLIF, teklif.id,
                ]
            );
            const sid = sip.rows[0].id;
            for (const s of teklif.satirlar) {
                await client.query(
                    `
                    INSERT INTO siparis_detaylari
                        (siparis_id, stok_id, stok_kodu, stok_adi, stok_birimi, miktar, birim_fiyat, toplam_tutar,
                         iskonto_oran, iskonto_tutari, kdv_oran, kdv_tutari, sira_no, teklif_satir_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                    `,
                    [
                        sid, s.stok_id, s.stok_kodu, s.stok_adi, s.birim, s.miktar, s.birim_fiyat,
                        Number(s.mal_hizmet_tutari) + Number(s.kdv_tutari),
                        s.iskonto_oran, s.iskonto_tutari, s.kdv_oran, s.kdv_tutari, s.sira_no,
                        s.id,
                    ]
                );
            }
            await client.query(
                `UPDATE satis_teklifleri SET durum='SipariseDonustu' WHERE id=$1`,
                [teklif.id]
            );
            return sid;
        });

        const siparis = await pool.query('SELECT * FROM siparisler WHERE id=$1', [siparisId]);
        res.status(201).json({
            ok: true,
            siparis_id: siparisId,
            siparis_no: siparis.rows[0].siparis_no,
            teklif: await teklifGetir(teklif.id),
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM satis_teklifleri WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
