const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');

async function firsatGetir(id) {
    const f = await pool.query(
        `
        SELECT f.*,
               asama.asama_kodu, asama.asama_adi, asama.kazanan, asama.kaybeden,
               c.cari_kodu, c.cari_adi,
               a.aday_kodu, a.aday_adi,
               TRIM(CONCAT(COALESCE(o.ad,''),' ',COALESCE(o.soyad,''))) AS olusturan_adi,
               TRIM(CONCAT(COALESCE(t.ad,''),' ',COALESCE(t.soyad,''))) AS takip_eden_adi,
               iy.is_yeri_kodu, iy.is_yeri_adi
        FROM crm_firsatlar f
        JOIN crm_firsat_asamalari asama ON asama.id = f.asama_id
        LEFT JOIN cariler c ON c.id = f.cari_id
        LEFT JOIN crm_adaylar a ON a.id = f.aday_id
        LEFT JOIN kisiler o ON o.id = f.olusturan_id
        LEFT JOIN kisiler t ON t.id = f.takip_eden_id
        LEFT JOIN is_yerleri iy ON iy.id = f.is_yeri_id
        WHERE f.id = $1
        `,
        [id]
    );
    if (!f.rows[0]) return null;

    const [satirlar, teklifler, faaliyetler, planlar, gorevler] = await Promise.all([
        pool.query(
            `
            SELECT s.*, st.stok_kodu, st.stok_adi
            FROM crm_firsat_satirlari s
            JOIN stoklar st ON st.id = s.stok_id
            WHERE s.firsat_id=$1 ORDER BY s.sira_no, s.id
            `,
            [id]
        ),
        pool.query(
            `
            SELECT t.id, t.teklif_no, t.durum, t.toplam_tutar, t.teklif_tarihi
            FROM satis_teklifleri t WHERE t.firsat_id=$1 ORDER BY t.id DESC
            `,
            [id]
        ),
        pool.query(
            `
            SELECT fy.id, fy.faaliyet_kodu, fy.konu, fy.durum, fy.baslangic_tarihi,
                   tip.tip_adi AS faaliyet_tipi_adi
            FROM crm_faaliyetler fy
            LEFT JOIN crm_faaliyet_tipleri tip ON tip.id = fy.faaliyet_tipi_id
            WHERE fy.firsat_id=$1 ORDER BY fy.baslangic_tarihi DESC LIMIT 50
            `,
            [id]
        ),
        pool.query(
            `
            SELECT p.id, p.plan_kodu, p.konu, p.durum, p.baslangic_tarihi,
                   tip.tip_adi AS faaliyet_tipi_adi
            FROM crm_faaliyet_planlari p
            LEFT JOIN crm_faaliyet_tipleri tip ON tip.id = p.faaliyet_tipi_id
            WHERE p.firsat_id=$1 ORDER BY p.baslangic_tarihi DESC LIMIT 50
            `,
            [id]
        ),
        pool.query(
            `SELECT id, gorev_kodu, baslik, durum, oncelik, son_tarih
             FROM crm_gorevler WHERE firsat_id=$1 ORDER BY id DESC LIMIT 50`,
            [id]
        ),
    ]);

    return {
        ...f.rows[0],
        satirlar: satirlar.rows,
        teklifler: teklifler.rows,
        faaliyetler: faaliyetler.rows,
        faaliyet_planlari: planlar.rows,
        gorevler: gorevler.rows,
    };
}

async function satirKaydet(client, firsatId, satirlar) {
    await client.query('DELETE FROM crm_firsat_satirlari WHERE firsat_id=$1', [firsatId]);
    if (!Array.isArray(satirlar)) return 0;
    let toplam = 0;
    let sira = 0;
    for (const s of satirlar) {
        if (!s.stok_id) continue;
        sira += 1;
        const miktar = Number(s.miktar || 1);
        const birimFiyat = Number(s.birim_fiyat || 0);
        const tutar = Number(s.tutar != null ? s.tutar : miktar * birimFiyat);
        toplam += tutar;
        await client.query(
            `
            INSERT INTO crm_firsat_satirlari
                (firsat_id, sira_no, stok_id, miktar, birim, birim_fiyat, tutar, aciklama)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
                firsatId, s.sira_no || sira, s.stok_id, miktar, s.birim || null,
                birimFiyat, tutar, s.aciklama || null,
            ]
        );
    }
    return toplam;
}

router.get('/', async (req, res) => {
    try {
        const { durum, cari_id, aday_id } = req.query;
        const params = [];
        const where = [];
        if (durum) {
            params.push(durum);
            where.push(`f.durum = $${params.length}`);
        }
        if (cari_id) {
            params.push(Number(cari_id));
            where.push(`f.cari_id = $${params.length}`);
        }
        if (aday_id) {
            params.push(Number(aday_id));
            where.push(`f.aday_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT f.id FROM crm_firsatlar f
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY f.id DESC
            `,
            params
        );
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await firsatGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await firsatGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Fırsat bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.firsat_adi) return res.status(400).json({ hata: 'firsat_adi zorunlu.' });
        const musteriTipi = b.musteri_tipi || (b.aday_id && !b.cari_id ? 'Aday' : 'Musteri');
        if (musteriTipi === 'Musteri' && !b.cari_id) {
            return res.status(400).json({ hata: 'Müşteri tipi için cari_id zorunlu.' });
        }
        if (musteriTipi === 'Aday' && !b.aday_id) {
            return res.status(400).json({ hata: 'Aday tipi için aday_id zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let asamaId = b.asama_id;
            if (!asamaId) {
                const def = await client.query(
                    `SELECT id FROM crm_firsat_asamalari WHERE asama_kodu='YENI' AND aktif LIMIT 1`
                );
                asamaId = def.rows[0]?.id;
            }
            if (!asamaId) throw new Error('Fırsat aşaması tanımlı değil.');

            const kod = b.firsat_kodu || (await sonrakiKod(client, 'CRM_FIRSAT'));
            const ins = await client.query(
                `
                INSERT INTO crm_firsatlar
                    (firsat_kodu, firsat_adi, konu, musteri_tipi, cari_id, aday_id, asama_id,
                     olusturan_id, takip_eden_id, beklenen_gelir, para_birimi, degerlendirme,
                     hedef_kapatma_tarihi, ulke, is_yeri_id, aciklama, durum)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,0),COALESCE($11,'TRY'),$12,
                        $13,COALESCE($14,'Türkiye'),$15,$16,'Acik')
                RETURNING id
                `,
                [
                    kod, b.firsat_adi, b.konu || null, musteriTipi,
                    musteriTipi === 'Musteri' ? b.cari_id : null,
                    musteriTipi === 'Aday' ? b.aday_id : (b.aday_id || null),
                    asamaId, b.olusturan_id || null, b.takip_eden_id || null,
                    b.beklenen_gelir, b.para_birimi, b.degerlendirme ?? null,
                    b.hedef_kapatma_tarihi || null, b.ulke || null, b.is_yeri_id || null,
                    b.aciklama || null,
                ]
            );
            const firsatId = ins.rows[0].id;
            const toplam = await satirKaydet(client, firsatId, b.satirlar || b.kalemler);
            if (toplam > 0 && (b.beklenen_gelir == null || b.beklenen_gelir === '')) {
                await client.query(
                    `UPDATE crm_firsatlar SET beklenen_gelir=$2 WHERE id=$1`,
                    [firsatId, toplam]
                );
            }
            return firsatId;
        });
        res.status(201).json(await firsatGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                'SELECT id FROM crm_firsatlar WHERE id=$1 FOR UPDATE',
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                const e = new Error('Fırsat bulunamadı.');
                e.status = 404;
                throw e;
            }
            await client.query(
                `
                UPDATE crm_firsatlar SET
                    firsat_adi = COALESCE($2, firsat_adi),
                    konu = COALESCE($3, konu),
                    musteri_tipi = COALESCE($4, musteri_tipi),
                    cari_id = COALESCE($5, cari_id),
                    aday_id = COALESCE($6, aday_id),
                    asama_id = COALESCE($7, asama_id),
                    olusturan_id = COALESCE($8, olusturan_id),
                    takip_eden_id = COALESCE($9, takip_eden_id),
                    beklenen_gelir = COALESCE($10, beklenen_gelir),
                    para_birimi = COALESCE($11, para_birimi),
                    degerlendirme = COALESCE($12, degerlendirme),
                    hedef_kapatma_tarihi = COALESCE($13::date, hedef_kapatma_tarihi),
                    ulke = COALESCE($14, ulke),
                    is_yeri_id = COALESCE($15, is_yeri_id),
                    aciklama = COALESCE($16, aciklama)
                WHERE id=$1
                `,
                [
                    req.params.id, b.firsat_adi || null, b.konu ?? null, b.musteri_tipi || null,
                    b.cari_id || null, b.aday_id || null, b.asama_id || null,
                    b.olusturan_id || null, b.takip_eden_id || null, b.beklenen_gelir ?? null,
                    b.para_birimi || null, b.degerlendirme ?? null, b.hedef_kapatma_tarihi || null,
                    b.ulke ?? null, b.is_yeri_id || null, b.aciklama ?? null,
                ]
            );
            if (Array.isArray(b.satirlar) || Array.isArray(b.kalemler)) {
                const toplam = await satirKaydet(client, Number(req.params.id), b.satirlar || b.kalemler);
                if (b.beklenen_gelir == null) {
                    await client.query(
                        `UPDATE crm_firsatlar SET beklenen_gelir=$2 WHERE id=$1`,
                        [req.params.id, toplam]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await firsatGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Fırsat kapat — Kazanıldı / Kaybedildi */
router.post('/:id/kapat', async (req, res) => {
    try {
        const sonuc = req.body.sonuc || req.body.durum; // Kazanildi | Kaybedildi
        if (!['Kazanildi', 'Kaybedildi'].includes(sonuc)) {
            return res.status(400).json({ hata: "sonuc 'Kazanildi' veya 'Kaybedildi' olmalı." });
        }
        const id = await withTransaction(pool, async (client) => {
            const asamaKod = sonuc === 'Kazanildi' ? 'KAZANILDI' : 'KAYBEDILDI';
            const asama = await client.query(
                `SELECT id FROM crm_firsat_asamalari WHERE asama_kodu=$1 AND aktif LIMIT 1`,
                [asamaKod]
            );
            if (!asama.rows[0]) throw new Error(`Aşama tanımlı değil: ${asamaKod}`);
            const upd = await client.query(
                `
                UPDATE crm_firsatlar SET
                    durum=$2,
                    asama_id=$3,
                    kapatma_tarihi=CURRENT_DATE,
                    kapanis_nedeni=COALESCE($4, kapanis_nedeni)
                WHERE id=$1 AND durum='Acik'
                RETURNING id
                `,
                [req.params.id, sonuc, asama.rows[0].id, req.body.kapanis_nedeni || null]
            );
            if (!upd.rows[0]) throw new Error('Fırsat kapatılamadı (bulunamadı veya zaten kapalı).');
            return upd.rows[0].id;
        });
        res.json(await firsatGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Fırsat → Satış teklifi
 * Ürün satırlarını teklife taşır; cari yoksa aday bağlı teklif (cari zorunluluğu için dönüşüm gerekir)
 */
router.post('/:id/teklife-donustur', async (req, res) => {
    try {
        const firsat = await firsatGetir(req.params.id);
        if (!firsat) return res.status(404).json({ hata: 'Fırsat bulunamadı.' });
        if (firsat.durum !== 'Acik') {
            return res.status(400).json({ hata: `Kapalı fırsattan teklif açılamaz: ${firsat.durum}` });
        }

        let cariId = firsat.cari_id || req.body.cari_id || null;
        if (!cariId && firsat.aday_id) {
            return res.status(400).json({
                hata: 'Aday bağlı fırsatta önce adayı cariye dönüştürün veya cari_id gönderin.',
                aday_id: firsat.aday_id,
            });
        }
        if (!cariId) return res.status(400).json({ hata: 'cari_id zorunlu.' });
        if (!firsat.satirlar?.length && !(req.body.satirlar || req.body.kalemler)?.length) {
            return res.status(400).json({ hata: 'Fırsatta ürün satırı yok; teklif için satır gerekli.' });
        }

        const teklifId = await withTransaction(pool, async (client) => {
            const raw = (req.body.satirlar || req.body.kalemler || firsat.satirlar).map((s) => ({
                stok_id: s.stok_id,
                miktar: s.miktar,
                birim: s.birim,
                birim_fiyat: s.birim_fiyat,
                iskonto_oran: s.iskonto_oran || 0,
                kdv_oran: s.kdv_oran != null ? s.kdv_oran : 20,
            }));
            const satirlar = raw.map((k, i) => {
                const h = satirHesapla(k);
                return { sira_no: i + 1, stok_id: k.stok_id, miktar: k.miktar, birim: k.birim, birim_fiyat: k.birim_fiyat, ...h };
            });
            const top = belgelerToplam(satirlar);
            const no = await sonrakiBelgeNo(client, 'SATIS_TEKLIF');
            let hk = req.body.hareket_kodu_id || null;
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
                     durum, hareket_kodu_id, aciklama, toplam_tutar,
                     kaynak_belge_tipi, kaynak_belge_id, firsat_id, aday_id)
                VALUES ($1,$2,CURRENT_DATE,$3,COALESCE($4,'TRY'),'Taslak',$5,$6,$7,
                        'CRM_FIRSAT',$8,$8,$9)
                RETURNING id
                `,
                [
                    no, cariId, req.body.gecerlilik_tarihi || null,
                    firsat.para_birimi || 'TRY', hk,
                    req.body.aciklama || `Fırsat ${firsat.firsat_kodu}`,
                    top.toplam_tutar, firsat.id, firsat.aday_id || null,
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
            // Aşamayı Teklif'e çek (açıksa)
            const teklifAsama = await client.query(
                `SELECT id FROM crm_firsat_asamalari WHERE asama_kodu='TEKLIF' AND aktif LIMIT 1`
            );
            if (teklifAsama.rows[0]) {
                await client.query(
                    `UPDATE crm_firsatlar SET asama_id=$2 WHERE id=$1 AND durum='Acik'`,
                    [firsat.id, teklifAsama.rows[0].id]
                );
            }
            return tid;
        });

        const teklif = await pool.query(
            `SELECT t.*, c.cari_kodu, c.cari_adi FROM satis_teklifleri t
             JOIN cariler c ON c.id=t.cari_id WHERE t.id=$1`,
            [teklifId]
        );
        res.status(201).json({
            ok: true,
            teklif_id: teklifId,
            teklif_no: teklif.rows[0].teklif_no,
            teklif: teklif.rows[0],
            firsat: await firsatGetir(firsat.id),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_firsatlar WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Fırsat bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
