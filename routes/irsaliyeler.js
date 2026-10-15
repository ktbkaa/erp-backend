const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');
const { sevkGetir } = require('./sevk_emirleri');

async function irsaliyeGetir(id) {
    const i = await pool.query(
        `
        SELECT ir.*, c.cari_kodu, c.cari_adi, c.vergi_no, c.vergi_dairesi,
               c.email AS cari_email, c.telefon AS cari_telefon,
               d.depo_kodu, d.depo_adi,
               sp.siparis_no, se.sevk_no,
               hk.hareket_kodu, hk.hareket_adi
        FROM irsaliyeler ir
        JOIN cariler c ON c.id = ir.cari_id
        JOIN depolar d ON d.id = ir.depo_id
        LEFT JOIN siparisler sp ON sp.id = ir.siparis_id
        LEFT JOIN sevk_emirleri se ON se.id = ir.sevk_emri_id
        LEFT JOIN hareket_kodlari hk ON hk.id = ir.hareket_kodu_id
        WHERE ir.id = $1
        `,
        [id]
    );
    if (!i.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.stok_kodu, st.stok_adi
        FROM irsaliye_satirlari s
        JOIN stoklar st ON st.id = s.stok_id
        WHERE s.irsaliye_id = $1
        ORDER BY s.sira_no, s.id
        `,
        [id]
    );
    return { ...i.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

function validateSevkAlanlari(body) {
    const eksik = [];
    if (!body.sevk_il) eksik.push('sevk_il');
    if (!body.sevk_ilce) eksik.push('sevk_ilce');
    if (!body.sevk_ulke) eksik.push('sevk_ulke');
    if (!body.sevk_posta_kodu) eksik.push('sevk_posta_kodu');
    const tasiyiciOk = Boolean(body.tasiyici_unvan || body.tasiyici_vkn);
    const soforOk = Boolean(body.sofor_adi && body.sofor_soyadi && body.sofor_tckn);
    if (!tasiyiciOk && !soforOk) {
        eksik.push('tasiyici (unvan/vkn) veya sofor (ad+soyad+tckn)');
    }
    return eksik;
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM irsaliyeler ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await irsaliyeGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await irsaliyeGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const satirlar = body.satirlar || body.kalemler;
        if (!body.cari_id || !body.depo_id) {
            return res.status(400).json({ hata: 'cari_id ve depo_id zorunlu.' });
        }
        if (!Array.isArray(satirlar) || !satirlar.length) {
            return res.status(400).json({ hata: 'satirlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const no = body.irsaliye_no || (await sonrakiBelgeNo(client, 'IRSALIYE'));
            let hk = body.hareket_kodu_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM hareket_kodlari WHERE belge_tipi='SatisIrsaliye' AND aktif ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO irsaliyeler
                    (irsaliye_no, ozellestirme_no, senaryo, irsaliye_tipi,
                     irsaliye_tarihi, irsaliye_zamani, sevk_tarihi, sevk_zamani,
                     cari_id, siparis_id, sevk_emri_id, depo_id, hareket_kodu_id,
                     sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
                     arac_plaka, dorse_plaka, sofor_adi, sofor_soyadi, sofor_tckn,
                     tasiyici_unvan, tasiyici_vkn, aciklama, durum)
                VALUES ($1, COALESCE($2,'TR1.2.1'), COALESCE($3,'TEMELIRSALIYE'), COALESCE($4,'SEVK'),
                        COALESCE($5::date,CURRENT_DATE), COALESCE($6::time,CURRENT_TIME),
                        COALESCE($7::date,CURRENT_DATE), COALESCE($8::time,CURRENT_TIME),
                        $9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'Türkiye'),$18,
                        $19,$20,$21,$22,$23,$24,$25,$26,COALESCE($27,'Taslak'))
                RETURNING id
                `,
                [
                    no, body.ozellestirme_no, body.senaryo, body.irsaliye_tipi,
                    body.irsaliye_tarihi, body.irsaliye_zamani, body.sevk_tarihi, body.sevk_zamani,
                    body.cari_id, body.siparis_id || null, body.sevk_emri_id || null, body.depo_id, hk,
                    body.sevk_adresi || null, body.sevk_il || null, body.sevk_ilce || null,
                    body.sevk_ulke, body.sevk_posta_kodu || null,
                    body.arac_plaka || null, body.dorse_plaka || null,
                    body.sofor_adi || null, body.sofor_soyadi || null, body.sofor_tckn || null,
                    body.tasiyici_unvan || null, body.tasiyici_vkn || null,
                    body.aciklama || null, body.durum,
                ]
            );
            const iid = baslik.rows[0].id;
            let sira = 1;
            for (const s of satirlar) {
                if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
                await client.query(
                    `
                    INSERT INTO irsaliye_satirlari (irsaliye_id, sira_no, stok_id, miktar, birim)
                    VALUES ($1,$2,$3,$4,$5)
                    `,
                    [iid, s.sira_no || sira++, s.stok_id, s.miktar, s.birim || null]
                );
            }
            return iid;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const body = req.body;
        const raw = body.satirlar || body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali'];
        if (body.durum && !allowed.includes(body.durum)) {
            return res.status(400).json({ hata: 'Geçersiz durum.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT * FROM irsaliyeler WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('İrsaliye bulunamadı.');
                e.status = 404;
                throw e;
            }
            await client.query(
                `
                UPDATE irsaliyeler SET
                    irsaliye_tarihi = COALESCE($2::date, irsaliye_tarihi),
                    irsaliye_zamani = COALESCE($3::time, irsaliye_zamani),
                    sevk_tarihi = COALESCE($4::date, sevk_tarihi),
                    sevk_zamani = COALESCE($5::time, sevk_zamani),
                    depo_id = COALESCE($6, depo_id),
                    sevk_adresi = COALESCE($7, sevk_adresi),
                    sevk_il = COALESCE($8, sevk_il),
                    sevk_ilce = COALESCE($9, sevk_ilce),
                    sevk_ulke = COALESCE($10, sevk_ulke),
                    sevk_posta_kodu = COALESCE($11, sevk_posta_kodu),
                    arac_plaka = COALESCE($12, arac_plaka),
                    dorse_plaka = COALESCE($13, dorse_plaka),
                    sofor_adi = COALESCE($14, sofor_adi),
                    sofor_soyadi = COALESCE($15, sofor_soyadi),
                    sofor_tckn = COALESCE($16, sofor_tckn),
                    tasiyici_unvan = COALESCE($17, tasiyici_unvan),
                    tasiyici_vkn = COALESCE($18, tasiyici_vkn),
                    aciklama = COALESCE($19, aciklama),
                    durum = COALESCE($20, durum),
                    hareket_kodu_id = COALESCE($21, hareket_kodu_id)
                WHERE id=$1
                `,
                [
                    req.params.id, body.irsaliye_tarihi, body.irsaliye_zamani, body.sevk_tarihi, body.sevk_zamani,
                    body.depo_id, body.sevk_adresi, body.sevk_il, body.sevk_ilce, body.sevk_ulke, body.sevk_posta_kodu,
                    body.arac_plaka, body.dorse_plaka, body.sofor_adi, body.sofor_soyadi, body.sofor_tckn,
                    body.tasiyici_unvan, body.tasiyici_vkn, body.aciklama, body.durum, body.hareket_kodu_id,
                ]
            );
            if (Array.isArray(raw)) {
                await client.query('DELETE FROM irsaliye_satirlari WHERE irsaliye_id=$1', [req.params.id]);
                let sira = 1;
                for (const s of raw) {
                    if (!s.stok_id || !s.miktar) continue;
                    await client.query(
                        `INSERT INTO irsaliye_satirlari (irsaliye_id, sira_no, stok_id, miktar, birim)
                         VALUES ($1,$2,$3,$4,$5)`,
                        [req.params.id, s.sira_no || sira++, s.stok_id, s.miktar, s.birim || null]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Onay + stok çıkışı (SATIS_CIKIS) */
router.post('/:id/onayla', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (ir.durum !== 'Taslak') return res.status(400).json({ hata: 'Sadece Taslak onaylanır.' });

        const eksik = validateSevkAlanlari(ir);
        if (eksik.length) {
            return res.status(400).json({
                hata: `e-İrsaliye zorunlu alanlar eksik: ${eksik.join(', ')}`,
            });
        }

        await withTransaction(pool, async (client) => {
            const hareket = await stokHareketOlustur(client, {
                hareketTipi: 'SATIS_CIKIS',
                depoId: ir.depo_id,
                belgeTipi: 'IRSALIYE',
                belgeId: ir.id,
                aciklama: `İrsaliye ${ir.irsaliye_no}`,
                satirlar: ir.satirlar.map((s) => ({
                    stok_id: s.stok_id,
                    miktar: s.miktar,
                    yon: -1,
                    birim: s.birim,
                })),
            });
            // hareket kodu bağla
            if (ir.hareket_kodu_id) {
                await client.query(
                    `UPDATE stok_hareketleri SET hareket_kodu_id=$2 WHERE id=$1`,
                    [hareket.hareket.id, ir.hareket_kodu_id]
                );
            }
            await client.query(
                `UPDATE irsaliyeler SET durum='Onayli', stok_hareket_id=$2 WHERE id=$1`,
                [ir.id, hareket.hareket.id]
            );
        });
        res.json(await irsaliyeGetir(ir.id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Sevk emrinden irsaliye */
router.post('/sevk-emrinden', async (req, res) => {
    try {
        const { sevk_emri_id } = req.body;
        if (!sevk_emri_id) return res.status(400).json({ hata: 'sevk_emri_id zorunlu.' });
        const sevk = await sevkGetir(sevk_emri_id);
        if (!sevk) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        if (!['Onayli', 'Taslak'].includes(sevk.durum)) {
            return res.status(400).json({ hata: `Sevk durumu uygun değil: ${sevk.durum}` });
        }

        const body = {
            ...req.body,
            cari_id: sevk.cari_id,
            depo_id: sevk.depo_id,
            siparis_id: sevk.siparis_id,
            sevk_emri_id: sevk.id,
            sevk_adresi: req.body.sevk_adresi || sevk.sevk_adresi,
            sevk_il: req.body.sevk_il || sevk.sevk_il,
            sevk_ilce: req.body.sevk_ilce || sevk.sevk_ilce,
            sevk_ulke: req.body.sevk_ulke || sevk.sevk_ulke || 'Türkiye',
            sevk_posta_kodu: req.body.sevk_posta_kodu || sevk.sevk_posta_kodu,
            aciklama: req.body.aciklama || `Sipariş No: ${sevk.siparis_no} — Sevk ${sevk.sevk_no}`,
            satirlar: sevk.satirlar.map((s) => ({
                sira_no: s.sira_no,
                stok_id: s.stok_id,
                miktar: s.miktar,
                birim: s.birim,
            })),
            durum: 'Taslak',
        };

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'IRSALIYE');
            let hk = body.hareket_kodu_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM hareket_kodlari WHERE belge_tipi='SatisIrsaliye' AND aktif ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO irsaliyeler
                    (irsaliye_no, cari_id, siparis_id, sevk_emri_id, depo_id, hareket_kodu_id,
                     sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
                     arac_plaka, dorse_plaka, sofor_adi, sofor_soyadi, sofor_tckn,
                     tasiyici_unvan, tasiyici_vkn, aciklama, durum)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'Türkiye'),$11,$12,$13,$14,$15,$16,$17,$18,$19,'Taslak')
                RETURNING id
                `,
                [
                    no, body.cari_id, body.siparis_id, body.sevk_emri_id, body.depo_id, hk,
                    body.sevk_adresi, body.sevk_il, body.sevk_ilce, body.sevk_ulke, body.sevk_posta_kodu,
                    body.arac_plaka || null, body.dorse_plaka || null,
                    body.sofor_adi || null, body.sofor_soyadi || null, body.sofor_tckn || null,
                    body.tasiyici_unvan || null, body.tasiyici_vkn || null, body.aciklama,
                ]
            );
            const iid = baslik.rows[0].id;
            for (const s of body.satirlar) {
                await client.query(
                    `INSERT INTO irsaliye_satirlari (irsaliye_id, sira_no, stok_id, miktar, birim)
                     VALUES ($1,$2,$3,$4,$5)`,
                    [iid, s.sira_no, s.stok_id, s.miktar, s.birim]
                );
            }
            await client.query(
                `UPDATE sevk_emirleri SET durum='IrsaliyeDonustu' WHERE id=$1`,
                [sevk.id]
            );
            return iid;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** İrsaliye → Satış faturası */
router.post('/:id/fatura-olustur', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (!['Onayli', 'Taslak'].includes(ir.durum)) {
            return res.status(400).json({ hata: `İrsaliye durumu uygun değil: ${ir.durum}` });
        }

        const kdvOran = req.body.kdv_oran != null ? Number(req.body.kdv_oran) : 20;
        const iskontoOran = req.body.iskonto_oran != null ? Number(req.body.iskonto_oran) : 0;

        const faturaId = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'FATURA');
            let hk = null;
            const d = await client.query(
                `SELECT id FROM hareket_kodlari WHERE belge_tipi='SatisFatura' AND aktif ORDER BY id LIMIT 1`
            );
            hk = d.rows[0]?.id || null;

            const kalemler = [];
            for (const s of ir.satirlar) {
                const stok = await client.query(
                    'SELECT satis_fiyati, birim FROM stoklar WHERE id=$1',
                    [s.stok_id]
                );
                const fiyat = req.body.birim_fiyatlar?.[s.stok_id]
                    ?? Number(stok.rows[0]?.satis_fiyati || 0);
                const h = satirHesapla({
                    miktar: s.miktar,
                    birim_fiyat: fiyat,
                    iskonto_oran: iskontoOran,
                    kdv_oran: kdvOran,
                });
                kalemler.push({
                    sira_no: s.sira_no,
                    stok_id: s.stok_id,
                    miktar: s.miktar,
                    birim: s.birim || stok.rows[0]?.birim,
                    birim_fiyat: fiyat,
                    ...h,
                });
            }
            const top = belgelerToplam(kalemler);

            const f = await client.query(
                `
                INSERT INTO faturalar
                    (fatura_no, cari_id, fatura_turu, fatura_tipi, senaryo, ozellestirme_no,
                     fatura_tarihi, para_birimi, irsaliye_id, siparis_id, hareket_kodu_id,
                     sevk_adresi, aciklama, toplam_tutar, mal_hizmet_toplam, toplam_iskonto,
                     toplam_kdv, odenecek_tutar, durum, ettn)
                VALUES ($1,$2,'Satis','SATIS','TICARIFATURA','TR1.2',
                        CURRENT_DATE,'TRY',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Taslak', gen_random_uuid())
                RETURNING id
                `,
                [
                    no, ir.cari_id, ir.id, ir.siparis_id, hk,
                    ir.sevk_adresi,
                    `İrsaliye No: ${ir.irsaliye_no}${ir.siparis_no ? ` / Sipariş: ${ir.siparis_no}` : ''}`,
                    top.toplam_tutar, top.mal_hizmet_toplam, top.toplam_iskonto,
                    top.toplam_kdv, top.odenecek_tutar,
                ]
            );
            const fid = f.rows[0].id;
            for (const k of kalemler) {
                await client.query(
                    `
                    INSERT INTO fatura_detaylari
                        (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar, sira_no, birim,
                         iskonto_oran, iskonto_tutari, kdv_oran, kdv_tutari, mal_hizmet_tutari)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                    `,
                    [
                        fid, k.stok_id, k.miktar, k.birim_fiyat, k.satir_toplam, k.sira_no, k.birim,
                        k.iskonto_oran, k.iskonto_tutari, k.kdv_oran, k.kdv_tutari, k.mal_hizmet_tutari,
                    ]
                );
            }
            await client.query(
                `UPDATE irsaliyeler SET durum='FaturayaDonustu' WHERE id=$1`,
                [ir.id]
            );
            return fid;
        });

        // reuse faturaGetir via query
        const faturaRoute = require('./faturalar');
        // faturalar doesn't export getir - inline
        const f = await pool.query(
            `SELECT f.*, c.cari_kodu, c.cari_adi FROM faturalar f JOIN cariler c ON c.id=f.cari_id WHERE f.id=$1`,
            [faturaId]
        );
        const kalemler = await pool.query(
            `SELECT fd.*, s.stok_kodu, s.stok_adi FROM fatura_detaylari fd
             JOIN stoklar s ON s.id=fd.stok_id WHERE fd.fatura_id=$1 ORDER BY fd.id`,
            [faturaId]
        );
        res.status(201).json({
            ok: true,
            fatura: { ...f.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows },
            irsaliye: await irsaliyeGetir(ir.id),
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const mevcut = await pool.query('SELECT durum FROM irsaliyeler WHERE id=$1', [req.params.id]);
        if (!mevcut.rows[0]) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (mevcut.rows[0].durum === 'Onayli' || mevcut.rows[0].durum === 'FaturayaDonustu') {
            return res.status(400).json({ hata: 'Onaylı/faturalanmış irsaliye silinemez.' });
        }
        await pool.query('DELETE FROM irsaliyeler WHERE id=$1', [req.params.id]);
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
