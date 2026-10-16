const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, depoStokBakiye } = require('../src/services/stokHareketService');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');
const { sevkGetir } = require('./sevk_emirleri');
const {
    BELGE_TIPI,
    hareketKoduBul,
    onerilenDepolar,
} = require('../src/utils/belgeOmurga');

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

/** Onay öncesi depo bakiyesi kontrolü (UI için) */
async function depoKontrolEt(client, depoId, satirlar) {
    const sonuclar = [];
    let uygun = true;
    for (const s of satirlar) {
        const bakiye = await depoStokBakiye(client, depoId, s.stok_id);
        const istenen = Number(s.miktar);
        const ok = bakiye + 1e-9 >= istenen;
        if (!ok) uygun = false;
        const oneriler = ok ? [] : await onerilenDepolar(client, s.stok_id, istenen, depoId);
        sonuclar.push({
            stok_id: s.stok_id,
            stok_kodu: s.stok_kodu,
            stok_adi: s.stok_adi,
            miktar: istenen,
            bakiye,
            yeterli: ok,
            onerilen_depolar: oneriler,
        });
    }
    return { uygun, satirlar: sonuclar, depo_id: depoId };
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

/** Depo bakiyesi ön kontrol (P04) */
router.get('/:id/depo-kontrol', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        const depoId = Number(req.query.depo_id || ir.depo_id);
        const sonuc = await depoKontrolEt(pool, depoId, ir.satirlar);
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Belge zinciri timeline */
router.get('/:id/zincir', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        const adimlar = [];
        if (ir.siparis_id) {
            const sp = await pool.query(
                `SELECT id, siparis_no AS no, durum, teklif_id, kaynak_belge_tipi, kaynak_belge_id
                 FROM siparisler WHERE id=$1`,
                [ir.siparis_id]
            );
            if (sp.rows[0]?.teklif_id) {
                const tk = await pool.query(
                    `SELECT id, teklif_no AS no, durum FROM satis_teklifleri WHERE id=$1`,
                    [sp.rows[0].teklif_id]
                );
                if (tk.rows[0]) adimlar.push({ tip: BELGE_TIPI.SATIS_TEKLIF, ...tk.rows[0] });
            }
            if (sp.rows[0]) adimlar.push({ tip: BELGE_TIPI.SATIS_SIPARIS, ...sp.rows[0] });
        }
        if (ir.sevk_emri_id) {
            const se = await pool.query(
                `SELECT id, sevk_no AS no, durum FROM sevk_emirleri WHERE id=$1`,
                [ir.sevk_emri_id]
            );
            if (se.rows[0]) adimlar.push({ tip: BELGE_TIPI.SEVK_EMRI, ...se.rows[0] });
        }
        adimlar.push({
            tip: BELGE_TIPI.IRSALIYE,
            id: ir.id,
            no: ir.irsaliye_no,
            durum: ir.durum,
            kaynak_belge_tipi: ir.kaynak_belge_tipi,
            kaynak_belge_id: ir.kaynak_belge_id,
        });
        const fat = await pool.query(
            `SELECT id, fatura_no AS no, durum FROM faturalar WHERE irsaliye_id=$1 ORDER BY id`,
            [ir.id]
        );
        for (const f of fat.rows) adimlar.push({ tip: BELGE_TIPI.SATIS_FATURA, ...f });
        res.json({ irsaliye_id: ir.id, adimlar });
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
            const hk = await hareketKoduBul(client, BELGE_TIPI.IRSALIYE, body.hareket_kodu_id || null);
            if (!hk) throw new Error('Satış irsaliye hareket kodu tanımlı değil (SIR-01).');

            let kaynakTip = body.kaynak_belge_tipi || null;
            let kaynakId = body.kaynak_belge_id || null;
            if (!kaynakTip && body.sevk_emri_id) {
                kaynakTip = BELGE_TIPI.SEVK_EMRI;
                kaynakId = body.sevk_emri_id;
            } else if (!kaynakTip && body.siparis_id) {
                kaynakTip = BELGE_TIPI.SATIS_SIPARIS;
                kaynakId = body.siparis_id;
            }

            const baslik = await client.query(
                `
                INSERT INTO irsaliyeler
                    (irsaliye_no, ozellestirme_no, senaryo, irsaliye_tipi,
                     irsaliye_tarihi, irsaliye_zamani, sevk_tarihi, sevk_zamani,
                     cari_id, siparis_id, sevk_emri_id, depo_id, hareket_kodu_id,
                     sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
                     arac_plaka, dorse_plaka, sofor_adi, sofor_soyadi, sofor_tckn,
                     tasiyici_unvan, tasiyici_vkn, aciklama, durum,
                     kaynak_belge_tipi, kaynak_belge_id)
                VALUES ($1, COALESCE($2,'TR1.2.1'), COALESCE($3,'TEMELIRSALIYE'), COALESCE($4,'SEVK'),
                        COALESCE($5::date,CURRENT_DATE), COALESCE($6::time,CURRENT_TIME),
                        COALESCE($7::date,CURRENT_DATE), COALESCE($8::time,CURRENT_TIME),
                        $9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'Türkiye'),$18,
                        $19,$20,$21,$22,$23,$24,$25,$26,COALESCE($27,'Taslak'),$28,$29)
                RETURNING id
                `,
                [
                    no, body.ozellestirme_no, body.senaryo, body.irsaliye_tipi,
                    body.irsaliye_tarihi, body.irsaliye_zamani, body.sevk_tarihi, body.sevk_zamani,
                    body.cari_id, body.siparis_id || null, body.sevk_emri_id || null, body.depo_id, hk.id,
                    body.sevk_adresi || null, body.sevk_il || null, body.sevk_ilce || null,
                    body.sevk_ulke, body.sevk_posta_kodu || null,
                    body.arac_plaka || null, body.dorse_plaka || null,
                    body.sofor_adi || null, body.sofor_soyadi || null, body.sofor_tckn || null,
                    body.tasiyici_unvan || null, body.tasiyici_vkn || null,
                    body.aciklama || null, body.durum, kaynakTip, kaynakId,
                ]
            );
            const iid = baslik.rows[0].id;
            let sira = 1;
            for (const s of satirlar) {
                if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
                await client.query(
                    `
                    INSERT INTO irsaliye_satirlari
                        (irsaliye_id, sira_no, stok_id, miktar, birim,
                         sevk_emri_satir_id, siparis_detay_id,
                         kaynak_belge_tipi, kaynak_belge_id, kaynak_belge_satir_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    `,
                    [
                        iid, s.sira_no || sira++, s.stok_id, s.miktar, s.birim || null,
                        s.sevk_emri_satir_id || null, s.siparis_detay_id || null,
                        s.kaynak_belge_tipi || kaynakTip, s.kaynak_belge_id || kaynakId,
                        s.kaynak_belge_satir_id || s.sevk_emri_satir_id || s.siparis_detay_id || null,
                    ]
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
            if (mevcut.rows[0].durum !== 'Taslak' && body.durum && body.durum !== mevcut.rows[0].durum) {
                // durum geçişleri onay/fatura endpoint'lerinden
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
                        `INSERT INTO irsaliye_satirlari
                            (irsaliye_id, sira_no, stok_id, miktar, birim,
                             sevk_emri_satir_id, siparis_detay_id,
                             kaynak_belge_tipi, kaynak_belge_id, kaynak_belge_satir_id)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                        [
                            req.params.id, s.sira_no || sira++, s.stok_id, s.miktar, s.birim || null,
                            s.sevk_emri_satir_id || null, s.siparis_detay_id || null,
                            s.kaynak_belge_tipi || null, s.kaynak_belge_id || null,
                            s.kaynak_belge_satir_id || null,
                        ]
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

/** Onay + stok çıkışı (SATIS_CIKIS) — P02 hareket bağ, P04 depo doğrulama */
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

        const depoId = Number(req.body.depo_id || ir.depo_id);
        if (!depoId) return res.status(400).json({ hata: 'depo_id zorunlu.' });

        // Ön kontrol — UI'ya detaylı yanıt
        const kontrol = await depoKontrolEt(pool, depoId, ir.satirlar);
        if (!kontrol.uygun && req.body.zorla !== true) {
            // STOK_NEGATIF / eksi izin stok motorunda da kontrol edilecek;
            // burada erken ve zengin hata dönüyoruz.
            const hk = await hareketKoduBul(pool, BELGE_TIPI.IRSALIYE, ir.hareket_kodu_id);
            const param = await pool.query(
                `SELECT deger FROM sistem_parametreleri WHERE parametre_kodu='STOK_NEGATIF' LIMIT 1`
            );
            const negatifOk = Boolean(hk?.eksi_bakiye_izin)
                || ['evet', 'true', '1', 'yes', 'e'].includes(
                    String(param.rows[0]?.deger || '').trim().toLowerCase()
                );
            if (!negatifOk) {
                return res.status(400).json({
                    hata: 'Yetersiz depo bakiyesi. Depo seçimini değiştirin veya stok girişi yapın.',
                    kod: 'YETERSIZ_STOK',
                    depo_kontrol: kontrol,
                });
            }
        }

        await withTransaction(pool, async (client) => {
            if (depoId !== Number(ir.depo_id)) {
                await client.query(`UPDATE irsaliyeler SET depo_id=$2 WHERE id=$1`, [ir.id, depoId]);
            }

            let hkId = ir.hareket_kodu_id;
            if (!hkId) {
                const hk = await hareketKoduBul(client, BELGE_TIPI.IRSALIYE);
                if (!hk) throw new Error('Satış irsaliye hareket kodu zorunlu (SIR-01).');
                hkId = hk.id;
                await client.query(`UPDATE irsaliyeler SET hareket_kodu_id=$2 WHERE id=$1`, [ir.id, hkId]);
            }

            const hareket = await stokHareketOlustur(client, {
                hareketTipi: 'SATIS_CIKIS',
                depoId,
                belgeTipi: 'IRSALIYE',
                belgeId: ir.id,
                aciklama: `İrsaliye ${ir.irsaliye_no}`,
                hareketKoduId: hkId,
                satirlar: ir.satirlar.map((s) => ({
                    stok_id: s.stok_id,
                    miktar: s.miktar,
                    yon: -1,
                    birim: s.birim,
                })),
            });

            // Açık miktar: sipariş satırlarında irsaliye_edilen artır
            for (const s of ir.satirlar) {
                if (s.siparis_detay_id) {
                    await client.query(
                        `UPDATE siparis_detaylari
                         SET irsaliye_edilen_miktar = COALESCE(irsaliye_edilen_miktar,0) + $2
                         WHERE id=$1`,
                        [s.siparis_detay_id, s.miktar]
                    );
                }
            }

            await client.query(
                `UPDATE irsaliyeler SET durum='Onayli', stok_hareket_id=$2, depo_id=$3 WHERE id=$1`,
                [ir.id, hareket.hareket.id, depoId]
            );
        });
        res.json(await irsaliyeGetir(ir.id));
    } catch (err) {
        const status = err.code === 'YETERSIZ_STOK' ? 400 : 500;
        res.status(status).json({
            hata: err.message,
            kod: err.code || undefined,
            detay: err.detay || undefined,
        });
    }
});

/** Sevk emrinden irsaliye — P01 ref omurga + satır bağ */
router.post('/sevk-emrinden', async (req, res) => {
    try {
        const { sevk_emri_id } = req.body;
        if (!sevk_emri_id) return res.status(400).json({ hata: 'sevk_emri_id zorunlu.' });
        const sevk = await sevkGetir(sevk_emri_id);
        if (!sevk) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        if (!['Onayli', 'Taslak'].includes(sevk.durum)) {
            return res.status(400).json({ hata: `Sevk durumu uygun değil: ${sevk.durum}` });
        }

        const depoId = Number(req.body.depo_id || sevk.depo_id);
        if (!depoId) return res.status(400).json({ hata: 'depo_id zorunlu.' });

        const body = {
            ...req.body,
            cari_id: sevk.cari_id,
            depo_id: depoId,
            siparis_id: sevk.siparis_id,
            sevk_emri_id: sevk.id,
            sevk_adresi: req.body.sevk_adresi || sevk.sevk_adresi,
            sevk_il: req.body.sevk_il || sevk.sevk_il,
            sevk_ilce: req.body.sevk_ilce || sevk.sevk_ilce,
            sevk_ulke: req.body.sevk_ulke || sevk.sevk_ulke || 'Türkiye',
            sevk_posta_kodu: req.body.sevk_posta_kodu || sevk.sevk_posta_kodu,
            aciklama: req.body.aciklama || `Sipariş No: ${sevk.siparis_no} — Sevk ${sevk.sevk_no}`,
            durum: 'Taslak',
        };

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'IRSALIYE');
            const hk = await hareketKoduBul(client, BELGE_TIPI.IRSALIYE, body.hareket_kodu_id || null);
            if (!hk) throw new Error('Satış irsaliye hareket kodu tanımlı değil.');

            const baslik = await client.query(
                `
                INSERT INTO irsaliyeler
                    (irsaliye_no, cari_id, siparis_id, sevk_emri_id, depo_id, hareket_kodu_id,
                     sevk_adresi, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
                     arac_plaka, dorse_plaka, sofor_adi, sofor_soyadi, sofor_tckn,
                     tasiyici_unvan, tasiyici_vkn, aciklama, durum,
                     kaynak_belge_tipi, kaynak_belge_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'Türkiye'),$11,$12,$13,$14,$15,$16,$17,$18,$19,'Taslak',
                        $20,$21)
                RETURNING id
                `,
                [
                    no, body.cari_id, body.siparis_id, body.sevk_emri_id, body.depo_id, hk.id,
                    body.sevk_adresi, body.sevk_il, body.sevk_ilce, body.sevk_ulke, body.sevk_posta_kodu,
                    body.arac_plaka || null, body.dorse_plaka || null,
                    body.sofor_adi || null, body.sofor_soyadi || null, body.sofor_tckn || null,
                    body.tasiyici_unvan || null, body.tasiyici_vkn || null, body.aciklama,
                    BELGE_TIPI.SEVK_EMRI, sevk.id,
                ]
            );
            const iid = baslik.rows[0].id;
            for (const s of sevk.satirlar) {
                await client.query(
                    `INSERT INTO irsaliye_satirlari
                        (irsaliye_id, sira_no, stok_id, miktar, birim,
                         sevk_emri_satir_id, siparis_detay_id,
                         kaynak_belge_tipi, kaynak_belge_id, kaynak_belge_satir_id)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                    [
                        iid, s.sira_no, s.stok_id, s.miktar, s.birim,
                        s.id, s.siparis_detay_id || null,
                        BELGE_TIPI.SEVK_EMRI, sevk.id, s.id,
                    ]
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

/** İrsaliye → Satış faturası — P39: yalnız Onayli */
router.post('/:id/fatura-olustur', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (ir.durum !== 'Onayli') {
            return res.status(400).json({
                hata: `Fatura yalnızca Onaylı irsaliyeden oluşturulur (mevcut: ${ir.durum}). Önce irsaliyeyi onaylayın.`,
                kod: 'IRSALIYE_DURUM_KILIDI',
            });
        }

        const kdvOran = req.body.kdv_oran != null ? Number(req.body.kdv_oran) : 20;
        const iskontoOran = req.body.iskonto_oran != null ? Number(req.body.iskonto_oran) : 0;

        const faturaId = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'FATURA');
            const hk = await hareketKoduBul(client, BELGE_TIPI.SATIS_FATURA);

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
                    irsaliye_satir_id: s.id,
                    siparis_detay_id: s.siparis_detay_id || null,
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
                     toplam_kdv, odenecek_tutar, durum, ettn,
                     kaynak_belge_tipi, kaynak_belge_id)
                VALUES ($1,$2,'Satis','SATIS','TICARIFATURA','TR1.2',
                        CURRENT_DATE,'TRY',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Taslak', gen_random_uuid(),
                        $13,$14)
                RETURNING id
                `,
                [
                    no, ir.cari_id, ir.id, ir.siparis_id, hk?.id || null,
                    ir.sevk_adresi,
                    `İrsaliye No: ${ir.irsaliye_no}${ir.siparis_no ? ` / Sipariş: ${ir.siparis_no}` : ''}`,
                    top.toplam_tutar, top.mal_hizmet_toplam, top.toplam_iskonto,
                    top.toplam_kdv, top.odenecek_tutar,
                    BELGE_TIPI.IRSALIYE, ir.id,
                ]
            );
            const fid = f.rows[0].id;
            for (const k of kalemler) {
                await client.query(
                    `
                    INSERT INTO fatura_detaylari
                        (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar, sira_no, birim,
                         iskonto_oran, iskonto_tutari, kdv_oran, kdv_tutari, mal_hizmet_tutari,
                         irsaliye_satir_id, siparis_detay_id,
                         kaynak_belge_tipi, kaynak_belge_id, kaynak_belge_satir_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                    `,
                    [
                        fid, k.stok_id, k.miktar, k.birim_fiyat, k.satir_toplam, k.sira_no, k.birim,
                        k.iskonto_oran, k.iskonto_tutari, k.kdv_oran, k.kdv_tutari, k.mal_hizmet_tutari,
                        k.irsaliye_satir_id, k.siparis_detay_id,
                        BELGE_TIPI.IRSALIYE, ir.id, k.irsaliye_satir_id,
                    ]
                );
                if (k.siparis_detay_id) {
                    await client.query(
                        `UPDATE siparis_detaylari
                         SET fatura_edilen_miktar = COALESCE(fatura_edilen_miktar,0) + $2
                         WHERE id=$1`,
                        [k.siparis_detay_id, k.miktar]
                    );
                }
            }
            await client.query(
                `UPDATE irsaliyeler SET durum='FaturayaDonustu' WHERE id=$1`,
                [ir.id]
            );
            return fid;
        });

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
module.exports.irsaliyeGetir = irsaliyeGetir;
