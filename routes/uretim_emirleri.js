const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { kkEmriOlustur, ckkDepoCozumle, depoBulKodVeyaRol } = require('../src/services/kaliteService');

async function tipCozumle(client, emirTipiId, siparisId) {
    if (emirTipiId) {
        const t = await client.query(
            'SELECT id, tip_kodu, planli_kesin FROM uretim_emri_tipleri WHERE id=$1 AND aktif=TRUE',
            [emirTipiId]
        );
        if (!t.rows[0]) throw new Error('Üretim emri tipi bulunamadı veya pasif.');
        return t.rows[0];
    }
    const kod = siparisId ? 'SIP' : 'STD';
    const t = await client.query(
        'SELECT id, tip_kodu, planli_kesin FROM uretim_emri_tipleri WHERE tip_kodu=$1 AND aktif=TRUE',
        [kod]
    );
    return t.rows[0] || null;
}

function tarihGun(v) {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
}

/** BOM / rota geçerlilik + miktar aralığı kontrolü (Uyumsoft uyarlaması) */
async function bomRotaDogrula(client, { urunAgaciId, rotaId, stokId, miktar, tarih }) {
    const gun = tarihGun(tarih) || new Date().toISOString().slice(0, 10);
    const agac = await client.query(
        'SELECT * FROM urun_agaclari WHERE id=$1 AND mamul_stok_id=$2',
        [urunAgaciId, stokId]
    );
    if (!agac.rows[0]) throw new Error('Ürün ağacı mamul stok ile eşleşmiyor.');
    const a = agac.rows[0];
    const aBas = tarihGun(a.gecerlilik_baslangic);
    const aBit = tarihGun(a.gecerlilik_bitis);
    if (aBas && gun < aBas) {
        throw new Error(`Ürün ağacı henüz geçerli değil (başlangıç: ${aBas}).`);
    }
    if (aBit && gun > aBit) {
        throw new Error(`Ürün ağacı geçerlilik süresi dolmuş (bitiş: ${aBit}).`);
    }
    const mq = Number(miktar);
    if (a.min_miktar != null && mq < Number(a.min_miktar)) {
        throw new Error(`Planlanan miktar ağaç min (${a.min_miktar}) altında.`);
    }
    if (a.max_miktar != null && mq > Number(a.max_miktar)) {
        throw new Error(`Planlanan miktar ağaç max (${a.max_miktar}) üstünde.`);
    }

    const rota = await client.query('SELECT * FROM rotalar WHERE id=$1', [rotaId]);
    if (!rota.rows[0]) throw new Error('Rota bulunamadı.');
    const r = rota.rows[0];
    if (Number(r.stok_id) !== Number(stokId) && !r.sablon) {
        throw new Error('Rota stok ile eşleşmiyor (şablon değil).');
    }
    const rBas = tarihGun(r.gecerlilik_baslangic);
    const rBit = tarihGun(r.gecerlilik_bitis);
    if (rBas && gun < rBas) {
        throw new Error(`Rota henüz geçerli değil (başlangıç: ${rBas}).`);
    }
    if (rBit && gun > rBit) {
        throw new Error(`Rota geçerlilik süresi dolmuş (bitiş: ${rBit}).`);
    }

    const rotaOps = await client.query(
        'SELECT * FROM rota_operasyonlari WHERE rota_id=$1 ORDER BY sira_no',
        [rotaId]
    );
    if (rotaOps.rows.length === 0) throw new Error('Rotada operasyon yok.');
    return { agac: a, rota: r, rotaOps: rotaOps.rows };
}

/** BOM satırlarından emir malzemelerini yazar (önce mevcut malzemeleri siler). */
async function emirMalzemeleriDoldur(client, emirId, { urunAgaciId, planlananMiktar, agacMiktar, hammaddeDepoId }) {
    await client.query('DELETE FROM uretim_emri_bilesenleri WHERE emir_id=$1', [emirId]);
    const carpan = Number(planlananMiktar) / Number(agacMiktar || 1);
    const satirlar = await client.query(
        `
        SELECT s.*, st.birim AS stok_birim
        FROM urun_agaci_satirlari s
        JOIN stoklar st ON st.id = s.bilesen_stok_id
        WHERE s.urun_agaci_id = $1
        ORDER BY COALESCE(s.sira_no, 0), s.id
        `,
        [urunAgaciId],
    );
    let sira = 1;
    for (const sat of satirlar.rows) {
        await client.query(
            `
            INSERT INTO uretim_emri_bilesenleri
                (emir_id, stok_id, planlanan_miktar, tuketilen_miktar, birim, sira_no, depo_id)
            VALUES ($1,$2,$3,0,$4,$5,$6)
            `,
            [
                emirId,
                sat.bilesen_stok_id,
                Number(sat.miktar) * carpan,
                sat.birim || sat.stok_birim || null,
                sat.sira_no != null ? sat.sira_no : sira,
                hammaddeDepoId || null,
            ],
        );
        sira += 1;
    }
    return satirlar.rows.length;
}

/** Rota operasyonlarını emre yazar (önce mevcut operasyonları siler). */
async function emirOperasyonlariDoldur(client, emirId, { rotaOps, planlananMiktar, bilesenCarpan }) {
    await client.query('DELETE FROM uretim_emri_operasyonlari WHERE emir_id=$1', [emirId]);
    const plan = Number(planlananMiktar);
    const carpan = Number(bilesenCarpan) > 0 ? Number(bilesenCarpan) : plan;
    let ilk = true;
    let n = 0;
    for (const op of rotaOps) {
        const opIns = await client.query(
            `
            INSERT INTO uretim_emri_operasyonlari
                (emir_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id,
                 cikti_stok_id, sonraki_sira_no, planlanan_miktar, durum)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING id
            `,
            [
                emirId,
                op.sira_no,
                op.operasyon_kodu,
                op.operasyon_adi,
                op.is_merkezi_id,
                op.cikti_stok_id,
                op.sonraki_sira_no,
                plan,
                ilk ? 'Hazir' : 'Bekliyor',
            ],
        );
        ilk = false;
        n += 1;
        const bilesenler = await client.query(
            'SELECT * FROM rota_operasyon_bilesenleri WHERE operasyon_id=$1',
            [op.id],
        );
        for (const b of bilesenler.rows) {
            await client.query(
                `
                INSERT INTO uretim_emri_operasyon_bilesenleri
                    (operasyon_id, stok_id, planlanan_miktar, birim)
                VALUES ($1,$2,$3,$4)
                `,
                [opIns.rows[0].id, b.stok_id, Number(b.miktar) * carpan, b.birim],
            );
        }
    }
    return n;
}

async function emirDetayDoldurulabilirMi(client, emirId) {
    const emir = await client.query(
        `SELECT id, durum, baslatildi, uretilen_miktar FROM uretim_emirleri WHERE id=$1 FOR UPDATE`,
        [emirId],
    );
    if (!emir.rows[0]) throw new Error('Üretim emri bulunamadı.');
    const e = emir.rows[0];
    if (['Kapali', 'Iptal'].includes(e.durum)) {
        throw new Error('Kapalı/iptal emirde detay yenilenemez.');
    }
    if (e.baslatildi || Number(e.uretilen_miktar) > 0) {
        throw new Error('Başlatılmış veya üretimi olan emirde detaylar silinip yeniden doldurulamaz.');
    }
    const tuk = await client.query(
        `SELECT COALESCE(SUM(tuketilen_miktar),0)::numeric AS t FROM uretim_emri_bilesenleri WHERE emir_id=$1`,
        [emirId],
    );
    if (Number(tuk.rows[0].t) > 0) {
        throw new Error('Tüketimi olan malzemeler varken detay yenilenemez.');
    }
    return e;
}

async function emirOlustur(client, opts) {
    const {
        stok_id,
        urun_agaci_id,
        rota_id,
        is_yeri_id,
        hammadde_depo_id,
        yari_mamul_depo_id,
        mamul_depo_id,
        planlanan_miktar,
        siparis_id,
        emir_tipi_id,
        durum,
        baslatildi,
        cikis_tipi,
        giris_tipi,
        silindi,
        kaynak_belge_tipi,
        kaynak_belge_id,
        emir_tarihi,
        plan_baslangic,
        plan_bitis,
        bitis_tarihi,
        birim,
        acik_kapali,
        onayli,
        yayinlandi,
        yazdirildi,
        urun_girisi_tamamlandi,
        aciklama,
        planli_kesin,
    } = opts;

    const tip = await tipCozumle(client, emir_tipi_id, siparis_id);
    const { agac, rotaOps } = await bomRotaDogrula(client, {
        urunAgaciId: urun_agaci_id,
        rotaId: rota_id,
        stokId: stok_id,
        miktar: planlanan_miktar,
        tarih: emir_tarihi,
    });

    const stok = await client.query('SELECT birim FROM stoklar WHERE id=$1', [stok_id]);
    const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
    const durumVal = durum || (siparis_id ? 'OnayBekliyor' : 'Acik');
    const emir = await client.query(
        `
        INSERT INTO uretim_emirleri
            (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
             hammadde_depo_id, yari_mamul_depo_id, mamul_depo_id,
             planlanan_miktar, durum, siparis_id, emir_tipi_id, planli_kesin,
             baslatildi, cikis_tipi, giris_tipi, silindi,
             kaynak_belge_tipi, kaynak_belge_id,
             emir_tarihi, baslangic_tarihi, plan_baslangic, plan_bitis, bitis_tarihi,
             birim, acik_kapali, onayli, yayinlandi, yazdirildi, urun_girisi_tamamlandi, aciklama)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
        RETURNING id
        `,
        [
            no,
            stok_id,
            urun_agaci_id,
            rota_id,
            is_yeri_id || null,
            hammadde_depo_id,
            yari_mamul_depo_id || null,
            mamul_depo_id,
            planlanan_miktar,
            durumVal,
            siparis_id || null,
            tip?.id || null,
            planli_kesin || tip?.planli_kesin || 'Kesin',
            typeof baslatildi === 'boolean' ? baslatildi : false,
            cikis_tipi || 'Manuel',
            giris_tipi || 'Manuel',
            typeof silindi === 'boolean' ? silindi : false,
            kaynak_belge_tipi || null,
            kaynak_belge_id || null,
            tarihGun(emir_tarihi) || new Date().toISOString().slice(0, 10),
            tarihGun(emir_tarihi) || new Date().toISOString().slice(0, 10),
            plan_baslangic || null,
            plan_bitis || null,
            tarihGun(bitis_tarihi),
            birim || stok.rows[0]?.birim || null,
            acik_kapali || (durumVal === 'Kapali' || durumVal === 'Iptal' ? 'Kapali' : 'Acik'),
            !!onayli,
            !!yayinlandi,
            !!yazdirildi,
            !!urun_girisi_tamamlandi,
            aciklama || null,
        ],
    );
    const emirId = emir.rows[0].id;
    const carpan = Number(planlanan_miktar) / Number(agac.miktar || 1);
    await emirOperasyonlariDoldur(client, emirId, {
        rotaOps,
        planlananMiktar: planlanan_miktar,
        bilesenCarpan: carpan,
    });
    await emirMalzemeleriDoldur(client, emirId, {
        urunAgaciId: urun_agaci_id,
        planlananMiktar: planlanan_miktar,
        agacMiktar: agac.miktar,
        hammaddeDepoId: hammadde_depo_id,
    });
    return emirId;
}

async function emirGetir(id) {
    const e = await pool.query(
        `
        SELECT ue.*, s.stok_kodu, s.stok_adi, s.stok_tipi,
               hd.depo_kodu AS hammadde_depo_kodu,
               md.depo_kodu AS mamul_depo_kodu,
               yd.depo_kodu AS yari_mamul_depo_kodu,
               ua.agac_kodu, r.rota_kodu,
               tip.tip_kodu AS emir_tipi_kodu,
               tip.tip_adi AS emir_tipi_adi,
               sp.siparis_no
        FROM uretim_emirleri ue
        JOIN stoklar s ON s.id = ue.stok_id
        LEFT JOIN depolar hd ON hd.id = ue.hammadde_depo_id
        LEFT JOIN depolar md ON md.id = ue.mamul_depo_id
        LEFT JOIN depolar yd ON yd.id = ue.yari_mamul_depo_id
        LEFT JOIN urun_agaclari ua ON ua.id = ue.urun_agaci_id
        LEFT JOIN rotalar r ON r.id = ue.rota_id
        LEFT JOIN uretim_emri_tipleri tip ON tip.id = ue.emir_tipi_id
        LEFT JOIN siparisler sp ON sp.id = ue.siparis_id
        WHERE ue.id = $1
        `,
        [id]
    );
    if (!e.rows[0]) return null;

    const ops = await pool.query(
        `
        SELECT o.*,
               m.merkez_kodu, m.merkez_adi,
               cs.stok_kodu AS cikti_stok_kodu,
               cs.stok_adi AS cikti_stok_adi
        FROM uretim_emri_operasyonlari o
        LEFT JOIN is_merkezleri m ON m.id = o.is_merkezi_id
        LEFT JOIN stoklar cs ON cs.id = o.cikti_stok_id
        WHERE o.emir_id = $1
        ORDER BY o.sira_no
        `,
        [id]
    );

    const operasyonlar = [];
    for (const op of ops.rows) {
        const bilesenler = await pool.query(
            `
            SELECT b.*, st.stok_kodu, st.stok_adi, st.stok_tipi
            FROM uretim_emri_operasyon_bilesenleri b
            JOIN stoklar st ON st.id = b.stok_id
            WHERE b.operasyon_id = $1
            ORDER BY b.id
            `,
            [op.id]
        );
        const sonraki = ops.rows.find((x) => x.sira_no === op.sonraki_sira_no);
        operasyonlar.push({
            ...op,
            bilesenler: bilesenler.rows,
            sonraki_operasyon: sonraki
                ? {
                      sira_no: sonraki.sira_no,
                      operasyon_kodu: sonraki.operasyon_kodu,
                      operasyon_adi: sonraki.operasyon_adi,
                      durum: sonraki.durum,
                  }
                : null,
        });
    }

    const aktif = operasyonlar.find((o) => o.durum === 'Hazir') || null;
    const minSira = operasyonlar.length ? Math.min(...operasyonlar.map((o) => Number(o.sira_no) || 0)) : null;
    const maxSira = operasyonlar.length ? Math.max(...operasyonlar.map((o) => Number(o.sira_no) || 0)) : null;
    const opsEnrich = operasyonlar.map((o) => ({
        ...o,
        ilk_operasyon: minSira != null && Number(o.sira_no) === minSira,
        son_operasyon: maxSira != null && Number(o.sira_no) === maxSira,
        is_merkezi_kodu: o.merkez_kodu || null,
        is_merkezi_adi: o.merkez_adi || null,
    }));

    const malz = await pool.query(
        `
        SELECT b.*, st.stok_kodu, st.stok_adi, st.stok_tipi,
               d.depo_kodu, d.depo_adi
        FROM uretim_emri_bilesenleri b
        JOIN stoklar st ON st.id = b.stok_id
        LEFT JOIN depolar d ON d.id = b.depo_id
        WHERE b.emir_id = $1
        ORDER BY COALESCE(b.sira_no, 0), b.id
        `,
        [id],
    );

    return {
        ...e.rows[0],
        operasyonlar: opsEnrich,
        malzemeler: malz.rows,
        bilesenler: malz.rows,
        aktif_operasyon: aktif,
    };
}

router.get('/', async (req, res) => {
    try {
        const liste = await (() => { const firmaId = firmaIdFromReq(req); const params = []; let sql = 'SELECT id FROM uretim_emirleri'; if (firmaId) { params.push(firmaId); sql += ' WHERE firma_id = $' + params.length; } sql += ' ORDER BY id DESC'; return pool.query(sql, params); })();
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await emirGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Açık satış siparişi kalemleri — iş emrine aday (Uyumsoft sipariş→iş emri uyarlaması)
 * id = siparis_detay.id
 */
router.get('/siparis-adaylari', async (req, res) => {
    try {
        const sonuc = await pool.query(
            `
            SELECT
                sd.id,
                sd.id AS siparis_detay_id,
                s.id AS siparis_id,
                s.siparis_no,
                s.durum AS siparis_durum,
                s.siparis_tarihi,
                c.cari_kodu, c.cari_adi,
                sd.stok_id,
                st.stok_kodu, st.stok_adi, st.stok_tipi,
                sd.miktar AS siparis_miktar,
                COALESCE(ue_sum.uretim_plan, 0) AS uretim_planlanan,
                GREATEST(sd.miktar - COALESCE(ue_sum.uretim_plan, 0), 0) AS kalan_miktar,
                ua.id AS onerilen_agac_id,
                ua.agac_kodu AS onerilen_agac_kodu,
                r.id AS onerilen_rota_id,
                r.rota_kodu AS onerilen_rota_kodu
            FROM siparis_detaylari sd
            JOIN siparisler s ON s.id = sd.siparis_id
            JOIN stoklar st ON st.id = sd.stok_id
            LEFT JOIN cariler c ON c.id = s.cari_id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(ue.planlanan_miktar),0) AS uretim_plan
                FROM uretim_emirleri ue
                WHERE ue.siparis_id = s.id AND ue.stok_id = sd.stok_id
                  AND ue.durum NOT IN ('Iptal')
            ) ue_sum ON TRUE
            LEFT JOIN LATERAL (
                SELECT ua2.id, ua2.agac_kodu
                FROM urun_agaclari ua2
                WHERE ua2.mamul_stok_id = sd.stok_id
                  AND (ua2.gecerlilik_baslangic IS NULL OR ua2.gecerlilik_baslangic <= CURRENT_DATE)
                  AND (ua2.gecerlilik_bitis IS NULL OR ua2.gecerlilik_bitis >= CURRENT_DATE)
                ORDER BY ua2.id DESC LIMIT 1
            ) ua ON TRUE
            LEFT JOIN LATERAL (
                SELECT r2.id, r2.rota_kodu
                FROM rotalar r2
                WHERE r2.stok_id = sd.stok_id
                  AND (r2.gecerlilik_baslangic IS NULL OR r2.gecerlilik_baslangic <= CURRENT_DATE)
                  AND (r2.gecerlilik_bitis IS NULL OR r2.gecerlilik_bitis >= CURRENT_DATE)
                ORDER BY r2.varsayilan DESC NULLS LAST, r2.id DESC LIMIT 1
            ) r ON TRUE
            WHERE s.siparis_turu IN ('SatisSiparis', 'AlinanSiparis')
              AND s.durum IN ('Onayli', 'Acik', 'KismiSevk', 'SevkEdildi')
              AND st.stok_tipi IN ('Mamul', 'YariMamul')
              AND sd.miktar > COALESCE(ue_sum.uretim_plan, 0)
            ORDER BY s.siparis_tarihi DESC NULLS LAST, s.id DESC, sd.id
            `
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/siparis-adaylari/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(
            `
            SELECT
                sd.id,
                sd.id AS siparis_detay_id,
                s.id AS siparis_id,
                s.siparis_no,
                s.durum AS siparis_durum,
                sd.stok_id,
                st.stok_kodu, st.stok_adi,
                sd.miktar AS siparis_miktar,
                GREATEST(sd.miktar - COALESCE((
                    SELECT SUM(ue.planlanan_miktar) FROM uretim_emirleri ue
                    WHERE ue.siparis_id=s.id AND ue.stok_id=sd.stok_id AND ue.durum<>'Iptal'
                ),0),0) AS kalan_miktar
            FROM siparis_detaylari sd
            JOIN siparisler s ON s.id = sd.siparis_id
            JOIN stoklar st ON st.id = sd.stok_id
            WHERE sd.id = $1
            `,
            [req.params.id]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Sipariş kalemi bulunamadı.' });
        res.json(sonuc.rows[0]);
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
 * PRDT13 — satış siparişinden iş emri
 */
router.post('/satis-siparisinden', async (req, res) => {
    try {
        const {
            siparis_id,
            stok_id,
            urun_agaci_id,
            rota_id,
            is_yeri_id,
            hammadde_depo_id,
            yari_mamul_depo_id,
            mamul_depo_id,
            planlanan_miktar,
            emir_tipi_id,
        } = req.body;
        if (!siparis_id || !stok_id || !urun_agaci_id || !rota_id || !hammadde_depo_id || !mamul_depo_id) {
            return res.status(400).json({
                hata: 'siparis_id, stok_id, urun_agaci_id, rota_id, hammadde_depo_id, mamul_depo_id zorunlu.',
            });
        }

        const siparis = await pool.query(
            `SELECT s.*,
                    (SELECT COALESCE(SUM(sd.miktar),0) FROM siparis_detaylari sd
                     WHERE sd.siparis_id=s.id AND sd.stok_id=$2) AS kalem_miktar
             FROM siparisler s WHERE s.id=$1`,
            [siparis_id, stok_id]
        );
        if (!siparis.rows[0]) return res.status(404).json({ hata: 'Satış siparişi bulunamadı.' });
        const miktar = planlanan_miktar || Number(siparis.rows[0].kalem_miktar);
        if (!miktar || miktar <= 0) {
            return res.status(400).json({ hata: 'Sipariş kaleminde miktar yok; planlanan_miktar verin.' });
        }

        const id = await withTransaction(pool, async (client) =>
            emirOlustur(client, {
                stok_id,
                urun_agaci_id,
                rota_id,
                is_yeri_id,
                hammadde_depo_id,
                yari_mamul_depo_id,
                mamul_depo_id,
                planlanan_miktar: miktar,
                siparis_id,
                emir_tipi_id,
                durum: 'OnayBekliyor',
            })
        );

        res.status(201).json(await emirGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Toplu iş emri — birden fazla sipariş kaleminden
 * Body: { ortak?: { depolar, tip }, kalemler: [{ siparis_id, stok_id, ... }] }
 */
router.post('/toplu', async (req, res) => {
    try {
        const ortak = req.body.ortak || {};
        const kalemler = req.body.kalemler || req.body.satirlar || [];
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'kalemler zorunlu (en az 1).' });
        }

        const olusturulan = [];
        const hatalar = [];

        await withTransaction(pool, async (client) => {
            for (let i = 0; i < kalemler.length; i += 1) {
                const k = kalemler[i];
                const siparis_id = k.siparis_id || ortak.siparis_id;
                const stok_id = k.stok_id;
                const urun_agaci_id = k.urun_agaci_id || ortak.urun_agaci_id;
                const rota_id = k.rota_id || ortak.rota_id;
                const hammadde_depo_id = k.hammadde_depo_id || ortak.hammadde_depo_id;
                const mamul_depo_id = k.mamul_depo_id || ortak.mamul_depo_id;
                const yari_mamul_depo_id = k.yari_mamul_depo_id || ortak.yari_mamul_depo_id;
                const is_yeri_id = k.is_yeri_id || ortak.is_yeri_id;
                const emir_tipi_id = k.emir_tipi_id || ortak.emir_tipi_id;
                let planlanan_miktar = k.planlanan_miktar;

                try {
                    if (!stok_id || !urun_agaci_id || !rota_id || !hammadde_depo_id || !mamul_depo_id) {
                        throw new Error('stok_id, urun_agaci_id, rota_id, depolar zorunlu.');
                    }
                    if (!planlanan_miktar && siparis_id) {
                        const mq = await client.query(
                            `SELECT COALESCE(SUM(miktar),0) AS m FROM siparis_detaylari
                             WHERE siparis_id=$1 AND stok_id=$2`,
                            [siparis_id, stok_id]
                        );
                        planlanan_miktar = Number(mq.rows[0].m);
                    }
                    if (!planlanan_miktar || planlanan_miktar <= 0) {
                        throw new Error('planlanan_miktar yok.');
                    }
                    const id = await emirOlustur(client, {
                        stok_id,
                        urun_agaci_id,
                        rota_id,
                        is_yeri_id,
                        hammadde_depo_id,
                        yari_mamul_depo_id,
                        mamul_depo_id,
                        planlanan_miktar,
                        siparis_id: siparis_id || null,
                        emir_tipi_id,
                        durum: siparis_id ? 'OnayBekliyor' : 'Acik',
                    });
                    const noRow = await client.query('SELECT emir_no FROM uretim_emirleri WHERE id=$1', [id]);
                    olusturulan.push({ index: i, id, emir_no: noRow.rows[0]?.emir_no });
                } catch (e) {
                    hatalar.push({ index: i, hata: e.message, stok_id, siparis_id });
                }
            }
            if (olusturulan.length === 0) {
                throw new Error(
                    hatalar.map((h) => `#${h.index + 1}: ${h.hata}`).join('; ') || 'Hiç emir oluşmadı.'
                );
            }
        });

        res.status(201).json({
            olusturulan_sayisi: olusturulan.length,
            hata_sayisi: hatalar.length,
            olusturulan,
            hatalar,
            emirler: await Promise.all(olusturulan.map((o) => emirGetir(o.id))),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Mamul için tek iş emri: rota operasyonları sırayla kopyalanır.
 */
router.post('/', async (req, res) => {
    try {
        const b = req.body || {};
        const {
            stok_id,
            urun_agaci_id,
            rota_id,
            hammadde_depo_id,
            mamul_depo_id,
            planlanan_miktar,
        } = b;

        if (!stok_id || !urun_agaci_id || !rota_id || !hammadde_depo_id || !mamul_depo_id || !planlanan_miktar) {
            return res.status(400).json({
                hata: 'stok_id, urun_agaci_id, rota_id, hammadde_depo_id, mamul_depo_id, planlanan_miktar zorunlu.',
            });
        }

        const id = await withTransaction(pool, async (client) => emirOlustur(client, b));

        res.status(201).json(await emirGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

function tuketimDepoSec(emir, stokTipi) {
    // Hammadde Ana depodan; yarı mamul YM depodan
    if (stokTipi === 'YariMamul') {
        return emir.yari_mamul_depo_id || emir.hammadde_depo_id;
    }
    return emir.hammadde_depo_id;
}

function ciktiDepoSec(emir, ciktiStokTipi) {
    if (ciktiStokTipi === 'Mamul') return emir.mamul_depo_id;
    if (ciktiStokTipi === 'YariMamul') return emir.yari_mamul_depo_id || emir.mamul_depo_id;
    return emir.mamul_depo_id;
}

/**
 * Sıradaki (Hazir) operasyonu tamamla.
 * Body: { miktar? } — yoksa operasyon planlanan miktarı
 */
router.post('/:id/operasyon-tamamla', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        const sonuc = await withTransaction(pool, async (client) => {
            const emirRes = await client.query(
                'SELECT * FROM uretim_emirleri WHERE id=$1 FOR UPDATE',
                [emirId]
            );
            const emir = emirRes.rows[0];
            if (!emir) throw new Error('Üretim emri bulunamadı.');
            if (['Kapali', 'Iptal'].includes(emir.durum)) {
                throw new Error(`Emir kapalı/iptal: ${emir.durum}`);
            }

            const opRes = await client.query(
                `
                SELECT * FROM uretim_emri_operasyonlari
                WHERE emir_id=$1 AND durum='Hazir'
                ORDER BY sira_no LIMIT 1 FOR UPDATE
                `,
                [emirId]
            );
            const op = opRes.rows[0];
            if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

            const miktar = Number(req.body.miktar || op.planlanan_miktar);
            if (miktar <= 0) throw new Error('miktar > 0 olmalı.');
            const kalan = Number(op.planlanan_miktar) - Number(op.uretilen_miktar);
            if (miktar - kalan > 1e-9) throw new Error(`Fazla üretim engellendi. Kalan=${kalan}`);

            const oran = miktar / Number(op.planlanan_miktar);
            const bilesenler = await client.query(
                `
                SELECT b.*, st.stok_tipi, st.birim AS stok_birimi
                FROM uretim_emri_operasyon_bilesenleri b
                JOIN stoklar st ON st.id = b.stok_id
                WHERE b.operasyon_id=$1 FOR UPDATE
                `,
                [op.id]
            );

            // Bileşenleri tipine göre depodan grupla ve tüket
            const depoGrup = new Map();
            for (const b of bilesenler.rows) {
                const depoId = tuketimDepoSec(emir, b.stok_tipi);
                if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
                depoGrup.get(depoId).push({
                    stok_id: b.stok_id,
                    miktar: Number(b.planlanan_miktar) * oran,
                    yon: -1,
                    birim: b.birim || b.stok_birimi,
                });
                await client.query(
                    `UPDATE uretim_emri_operasyon_bilesenleri
                     SET tuketilen_miktar = tuketilen_miktar + $1 WHERE id=$2`,
                    [Number(b.planlanan_miktar) * oran, b.id]
                );
            }

            let tuketimHareketId = null;
            for (const [depoId, satirlar] of depoGrup.entries()) {
                const h = await stokHareketOlustur(client, {
                    hareketTipi: 'URETIM_TUKETIM',
                    isYeriId: emir.is_yeri_id,
                    depoId,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    aciklama: `${emir.emir_no} / ${op.operasyon_kodu} tüketim`,
                    satirlar,
                });
                tuketimHareketId = h.hareket.id;
            }

            // Çıktı stoğu ilgili depoya (KK gerekliyse ÇKK + Kalitede)
            let mamulHareketId = null;
            if (op.cikti_stok_id) {
                const cikti = await client.query(
                    'SELECT id, birim, stok_tipi, kalite_kontrol_gerekli FROM stoklar WHERE id=$1',
                    [op.cikti_stok_id]
                );
                const kkGerekli = Boolean(cikti.rows[0].kalite_kontrol_gerekli);
                let ciktiDepo = ciktiDepoSec(emir, cikti.rows[0].stok_tipi);
                let hedefMamul = null;
                if (kkGerekli) {
                    const ckk = await ckkDepoCozumle(client);
                    if (!ckk) throw new Error('ÇKK deposu tanımlı değil (CKK_DEPO_KODU / depo_rolu=CKK).');
                    ciktiDepo = ckk.id;
                    const mam = await depoBulKodVeyaRol(client, { kodParam: 'MAMUL_DEPO_KODU', rol: 'Mamul' });
                    hedefMamul = mam?.id || null;
                }
                const h = await stokHareketOlustur(client, {
                    hareketTipi: 'URETIM_GIRIS',
                    isYeriId: emir.is_yeri_id,
                    depoId: ciktiDepo,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    aciklama: `${emir.emir_no} / ${op.operasyon_kodu} çıktı`,
                    satirlar: [{
                        stok_id: op.cikti_stok_id,
                        miktar,
                        yon: 1,
                        birim: cikti.rows[0].birim,
                        stok_statu: kkGerekli ? 'Kalitede' : 'Kullanilabilir',
                    }],
                });
                mamulHareketId = h.hareket.id;
                if (kkGerekli) {
                    await kkEmriOlustur(client, {
                        yon: 'CKK',
                        stokId: op.cikti_stok_id,
                        partiId: h.satirlar[0]?.parti_id || null,
                        depoId: ciktiDepo,
                        hedefDepoId: hedefMamul,
                        miktar,
                        kaynakTipi: 'URETIM_EMRI',
                        kaynakId: emirId,
                        stokHareketId: mamulHareketId,
                        aciklama: `${emir.emir_no} ÇKK`,
                    });
                }
            }

            const yeniUretilen = Number(op.uretilen_miktar) + miktar;
            const opDurum = yeniUretilen + 1e-9 >= Number(op.planlanan_miktar) ? 'Tamamlandi' : 'Hazir';
            await client.query(
                `UPDATE uretim_emri_operasyonlari
                 SET uretilen_miktar=$1, durum=$2 WHERE id=$3`,
                [yeniUretilen, opDurum, op.id]
            );

            // Sıradaki operasyonu Hazir yap
            if (opDurum === 'Tamamlandi' && op.sonraki_sira_no) {
                await client.query(
                    `
                    UPDATE uretim_emri_operasyonlari
                    SET durum='Hazir'
                    WHERE emir_id=$1 AND sira_no=$2 AND durum='Bekliyor'
                    `,
                    [emirId, op.sonraki_sira_no]
                );
            }

            // Tüm ops tamamsa emri kapat; mamul miktarını güncelle
            if (op.cikti_stok_id === emir.stok_id) {
                await client.query(
                    `UPDATE uretim_emirleri
                     SET uretilen_miktar = uretilen_miktar + $1, durum='Uretimde'
                     WHERE id=$2`,
                    [miktar, emirId]
                );
            }

            const kalanOps = await client.query(
                `SELECT COUNT(*)::int AS c FROM uretim_emri_operasyonlari
                 WHERE emir_id=$1 AND durum <> 'Tamamlandi'`,
                [emirId]
            );
            if (kalanOps.rows[0].c === 0) {
                await client.query(
                    `UPDATE uretim_emirleri SET durum='Kapali' WHERE id=$1`,
                    [emirId]
                );
            }

            const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
            await client.query(
                `
                INSERT INTO uretim_girisleri
                    (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
                VALUES ($1,$2,$3,$4,$5)
                `,
                [girisNo, emirId, miktar, tuketimHareketId, mamulHareketId]
            );

            return { operasyon_id: op.id, operasyon_kodu: op.operasyon_kodu, miktar };
        });

        res.status(201).json({
            tamamlanan: sonuc,
            emir: await emirGetir(emirId),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

// Tüm Hazir operasyonları sırayla bitir (demo/kolay yol)
router.post('/:id/uretim-giris', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        let emir = await emirGetir(emirId);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });

        const adimlar = [];
        while (emir.aktif_operasyon) {
            const r = await tamamlaOperasyonInternal(emirId, req.body.miktar);
            adimlar.push(r.tamamlanan);
            emir = r.emir;
            if (emir.durum === 'Kapali') break;
        }
        res.status(201).json({ adimlar, emir });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

async function tamamlaOperasyonInternal(emirId, miktarOpsiyonel) {
    const sonuc = await withTransaction(pool, async (client) => {
        const emirRes = await client.query(
            'SELECT * FROM uretim_emirleri WHERE id=$1 FOR UPDATE',
            [emirId]
        );
        const emir = emirRes.rows[0];
        if (!emir) throw new Error('Üretim emri bulunamadı.');

        const opRes = await client.query(
            `
            SELECT * FROM uretim_emri_operasyonlari
            WHERE emir_id=$1 AND durum='Hazir'
            ORDER BY sira_no LIMIT 1 FOR UPDATE
            `,
            [emirId]
        );
        const op = opRes.rows[0];
        if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

        const miktar = Number(miktarOpsiyonel || op.planlanan_miktar);
        const oran = miktar / Number(op.planlanan_miktar);

        const bilesenler = await client.query(
            `
            SELECT b.*, st.stok_tipi, st.birim AS stok_birimi
            FROM uretim_emri_operasyon_bilesenleri b
            JOIN stoklar st ON st.id = b.stok_id
            WHERE b.operasyon_id=$1 FOR UPDATE
            `,
            [op.id]
        );

        const depoGrup = new Map();
        for (const b of bilesenler.rows) {
            const depoId = tuketimDepoSec(emir, b.stok_tipi);
            if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
            depoGrup.get(depoId).push({
                stok_id: b.stok_id,
                miktar: Number(b.planlanan_miktar) * oran,
                yon: -1,
                birim: b.birim || b.stok_birimi,
            });
            await client.query(
                `UPDATE uretim_emri_operasyon_bilesenleri
                 SET tuketilen_miktar = tuketilen_miktar + $1 WHERE id=$2`,
                [Number(b.planlanan_miktar) * oran, b.id]
            );
        }

        let tuketimHareketId = null;
        for (const [depoId, satirlar] of depoGrup.entries()) {
            const h = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_TUKETIM',
                isYeriId: emir.is_yeri_id,
                depoId,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                aciklama: `${emir.emir_no} / ${op.operasyon_kodu} tüketim`,
                satirlar,
            });
            tuketimHareketId = h.hareket.id;
        }

        let mamulHareketId = null;
        if (op.cikti_stok_id) {
            const cikti = await client.query(
                'SELECT id, birim, stok_tipi FROM stoklar WHERE id=$1',
                [op.cikti_stok_id]
            );
            const ciktiDepo = ciktiDepoSec(emir, cikti.rows[0].stok_tipi);
            const h = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_GIRIS',
                isYeriId: emir.is_yeri_id,
                depoId: ciktiDepo,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                aciklama: `${emir.emir_no} / ${op.operasyon_kodu} çıktı`,
                satirlar: [{
                    stok_id: op.cikti_stok_id,
                    miktar,
                    yon: 1,
                    birim: cikti.rows[0].birim,
                }],
            });
            mamulHareketId = h.hareket.id;
        }

        await client.query(
            `UPDATE uretim_emri_operasyonlari
             SET uretilen_miktar = uretilen_miktar + $1, durum='Tamamlandi' WHERE id=$2`,
            [miktar, op.id]
        );

        if (op.sonraki_sira_no) {
            await client.query(
                `
                UPDATE uretim_emri_operasyonlari
                SET durum='Hazir'
                WHERE emir_id=$1 AND sira_no=$2 AND durum='Bekliyor'
                `,
                [emirId, op.sonraki_sira_no]
            );
        }

        if (op.cikti_stok_id === emir.stok_id) {
            await client.query(
                `UPDATE uretim_emirleri
                 SET uretilen_miktar = uretilen_miktar + $1, durum='Uretimde' WHERE id=$2`,
                [miktar, emirId]
            );
        }

        const kalanOps = await client.query(
            `SELECT COUNT(*)::int AS c FROM uretim_emri_operasyonlari
             WHERE emir_id=$1 AND durum <> 'Tamamlandi'`,
            [emirId]
        );
        if (kalanOps.rows[0].c === 0) {
            await client.query(`UPDATE uretim_emirleri SET durum='Kapali' WHERE id=$1`, [emirId]);
        }

        const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
        await client.query(
            `
            INSERT INTO uretim_girisleri
                (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
            VALUES ($1,$2,$3,$4,$5)
            `,
            [girisNo, emirId, miktar, tuketimHareketId, mamulHareketId]
        );

        return { operasyon_kodu: op.operasyon_kodu, miktar };
    });

    return { tamamlanan: sonuc, emir: await emirGetir(emirId) };
}

router.put('/:id', async (req, res) => {
    try {
        const b = req.body || {};
        const allowed = ['Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'];
        if (b.durum && !allowed.includes(b.durum)) {
            return res.status(400).json({ hata: `Geçersiz durum. İzin verilen: ${allowed.join(', ')}` });
        }
        if (b.planli_kesin && !['Planli', 'Kesin'].includes(b.planli_kesin)) {
            return res.status(400).json({ hata: "planli_kesin 'Planli' veya 'Kesin' olmalı." });
        }
        if (b.acik_kapali && !['Acik', 'Kapali'].includes(b.acik_kapali)) {
            return res.status(400).json({ hata: "acik_kapali 'Acik' veya 'Kapali' olmalı." });
        }
        let tipPlanli = b.planli_kesin || null;
        if (b.emir_tipi_id && !tipPlanli) {
            const t = await pool.query('SELECT planli_kesin FROM uretim_emri_tipleri WHERE id=$1', [b.emir_tipi_id]);
            tipPlanli = t.rows[0]?.planli_kesin || null;
        }

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                `SELECT * FROM uretim_emirleri WHERE id=$1 FOR UPDATE`,
                [req.params.id],
            );
            if (!mevcut.rows[0]) {
                const err = new Error('Üretim emri bulunamadı.');
                err.status = 404;
                throw err;
            }
            const m = mevcut.rows[0];
            const yeniAgac = b.urun_agaci_id != null ? Number(b.urun_agaci_id) : Number(m.urun_agaci_id);
            const yeniRota = b.rota_id != null ? Number(b.rota_id) : Number(m.rota_id);
            const yeniStok = b.stok_id != null ? Number(b.stok_id) : Number(m.stok_id);
            const yeniMiktar = b.planlanan_miktar != null ? Number(b.planlanan_miktar) : Number(m.planlanan_miktar);

            if (b.urun_agaci_id != null || b.rota_id != null || b.stok_id != null) {
                await bomRotaDogrula(client, {
                    urunAgaciId: yeniAgac,
                    rotaId: yeniRota,
                    stokId: yeniStok,
                    miktar: yeniMiktar,
                    tarih: b.emir_tarihi || m.emir_tarihi,
                });
            }

            let acikKapali = b.acik_kapali || null;
            if (!acikKapali && b.durum) {
                acikKapali = ['Kapali', 'Iptal'].includes(b.durum) ? 'Kapali' : 'Acik';
            }

            const upd = await client.query(
                `
                UPDATE uretim_emirleri SET
                    planlanan_miktar = COALESCE($2, planlanan_miktar),
                    durum = COALESCE($3, durum),
                    siparis_id = COALESCE($4, siparis_id),
                    emir_tipi_id = COALESCE($5, emir_tipi_id),
                    planli_kesin = COALESCE($6, planli_kesin),
                    baslatildi = COALESCE($7, baslatildi),
                    cikis_tipi = COALESCE($8, cikis_tipi),
                    giris_tipi = COALESCE($9, giris_tipi),
                    silindi = COALESCE($10, silindi),
                    kaynak_belge_tipi = COALESCE($11, kaynak_belge_tipi),
                    kaynak_belge_id = COALESCE($12, kaynak_belge_id),
                    is_yeri_id = COALESCE($13, is_yeri_id),
                    hammadde_depo_id = COALESCE($14, hammadde_depo_id),
                    yari_mamul_depo_id = COALESCE($15, yari_mamul_depo_id),
                    mamul_depo_id = COALESCE($16, mamul_depo_id),
                    stok_id = COALESCE($17, stok_id),
                    urun_agaci_id = COALESCE($18, urun_agaci_id),
                    rota_id = COALESCE($19, rota_id),
                    emir_tarihi = COALESCE($20, emir_tarihi),
                    baslangic_tarihi = COALESCE($20, baslangic_tarihi),
                    plan_baslangic = COALESCE($21, plan_baslangic),
                    plan_bitis = COALESCE($22, plan_bitis),
                    bitis_tarihi = COALESCE($23, bitis_tarihi),
                    birim = COALESCE($24, birim),
                    acik_kapali = COALESCE($25, acik_kapali),
                    onayli = COALESCE($26, onayli),
                    yayinlandi = COALESCE($27, yayinlandi),
                    yazdirildi = COALESCE($28, yazdirildi),
                    urun_girisi_tamamlandi = COALESCE($29, urun_girisi_tamamlandi),
                    aciklama = COALESCE($30, aciklama)
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    b.planlanan_miktar ?? null,
                    b.durum || null,
                    b.siparis_id !== undefined ? b.siparis_id : null,
                    b.emir_tipi_id || null,
                    tipPlanli,
                    typeof b.baslatildi === 'boolean' ? b.baslatildi : null,
                    b.cikis_tipi || null,
                    b.giris_tipi || null,
                    typeof b.silindi === 'boolean' ? b.silindi : null,
                    b.kaynak_belge_tipi || null,
                    b.kaynak_belge_id !== undefined ? b.kaynak_belge_id : null,
                    b.is_yeri_id || null,
                    b.hammadde_depo_id || null,
                    b.yari_mamul_depo_id !== undefined ? b.yari_mamul_depo_id : null,
                    b.mamul_depo_id || null,
                    b.stok_id || null,
                    b.urun_agaci_id || null,
                    b.rota_id || null,
                    tarihGun(b.emir_tarihi),
                    b.plan_baslangic || null,
                    b.plan_bitis || null,
                    tarihGun(b.bitis_tarihi),
                    b.birim || null,
                    acikKapali,
                    typeof b.onayli === 'boolean' ? b.onayli : null,
                    typeof b.yayinlandi === 'boolean' ? b.yayinlandi : null,
                    typeof b.yazdirildi === 'boolean' ? b.yazdirildi : null,
                    typeof b.urun_girisi_tamamlandi === 'boolean' ? b.urun_girisi_tamamlandi : null,
                    b.aciklama !== undefined ? b.aciklama : null,
                ],
            );

            const malzemeler = Array.isArray(b.malzemeler) ? b.malzemeler
                : (Array.isArray(b.bilesenler) ? b.bilesenler : null);
            if (malzemeler) {
                await client.query('DELETE FROM uretim_emri_bilesenleri WHERE emir_id=$1', [req.params.id]);
                let sira = 1;
                for (const row of malzemeler) {
                    if (!row?.stok_id) continue;
                    await client.query(
                        `
                        INSERT INTO uretim_emri_bilesenleri
                            (emir_id, stok_id, planlanan_miktar, tuketilen_miktar, birim, sira_no, depo_id)
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                        `,
                        [
                            req.params.id,
                            row.stok_id,
                            row.planlanan_miktar ?? row.miktar ?? 0,
                            row.tuketilen_miktar ?? 0,
                            row.birim || null,
                            row.sira_no != null ? row.sira_no : sira,
                            row.depo_id || null,
                        ],
                    );
                    sira += 1;
                }
            }

            if (Array.isArray(b.operasyonlar)) {
                for (const op of b.operasyonlar) {
                    if (!op?.id) continue;
                    await client.query(
                        `
                        UPDATE uretim_emri_operasyonlari SET
                            planlanan_miktar = COALESCE($2, planlanan_miktar),
                            operasyon_adi = COALESCE($3, operasyon_adi),
                            is_merkezi_id = COALESCE($4, is_merkezi_id),
                            durum = COALESCE($5, durum)
                        WHERE id=$1 AND emir_id=$6
                        `,
                        [
                            op.id,
                            op.planlanan_miktar ?? null,
                            op.operasyon_adi || null,
                            op.is_merkezi_id || null,
                            op.durum || null,
                            req.params.id,
                        ],
                    );
                }
            }

            return upd.rows[0].id;
        });

        res.json(await emirGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** BOM + rota + miktardan malzeme ve operasyon satırlarını yeniden üretir. */
router.post('/:id/detaylari-doldur', async (req, res) => {
    try {
        const sonuc = await withTransaction(pool, async (client) => {
            await emirDetayDoldurulabilirMi(client, req.params.id);
            const emir = await client.query('SELECT * FROM uretim_emirleri WHERE id=$1', [req.params.id]);
            const e = emir.rows[0];
            const { agac, rotaOps } = await bomRotaDogrula(client, {
                urunAgaciId: e.urun_agaci_id,
                rotaId: e.rota_id,
                stokId: e.stok_id,
                miktar: e.planlanan_miktar,
                tarih: e.emir_tarihi,
            });
            const carpan = Number(e.planlanan_miktar) / Number(agac.miktar || 1);
            const opN = await emirOperasyonlariDoldur(client, e.id, {
                rotaOps,
                planlananMiktar: e.planlanan_miktar,
                bilesenCarpan: carpan,
            });
            const malN = await emirMalzemeleriDoldur(client, e.id, {
                urunAgaciId: e.urun_agaci_id,
                planlananMiktar: e.planlanan_miktar,
                agacMiktar: agac.miktar,
                hammaddeDepoId: e.hammadde_depo_id,
            });
            return { operasyon: opN, malzeme: malN };
        });
        const emir = await emirGetir(req.params.id);
        res.json({ ...emir, _doldurulan: sonuc });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Emir üzerinde ürün ağacı / rota değişikliği.
 * Body: { urun_agaci_id?, rota_id?, detaylari_doldur?: true }
 */
router.post('/:id/bom-rota-degistir', async (req, res) => {
    try {
        const { urun_agaci_id, rota_id, detaylari_doldur = true } = req.body || {};
        if (urun_agaci_id == null && rota_id == null) {
            return res.status(400).json({ hata: 'urun_agaci_id veya rota_id gerekli.' });
        }
        await withTransaction(pool, async (client) => {
            await emirDetayDoldurulabilirMi(client, req.params.id);
            const emir = await client.query('SELECT * FROM uretim_emirleri WHERE id=$1', [req.params.id]);
            const e = emir.rows[0];
            const yeniAgac = urun_agaci_id != null ? Number(urun_agaci_id) : Number(e.urun_agaci_id);
            const yeniRota = rota_id != null ? Number(rota_id) : Number(e.rota_id);
            const { agac, rotaOps } = await bomRotaDogrula(client, {
                urunAgaciId: yeniAgac,
                rotaId: yeniRota,
                stokId: e.stok_id,
                miktar: e.planlanan_miktar,
                tarih: e.emir_tarihi,
            });
            await client.query(
                `UPDATE uretim_emirleri SET urun_agaci_id=$2, rota_id=$3 WHERE id=$1`,
                [e.id, yeniAgac, yeniRota],
            );
            if (detaylari_doldur) {
                const carpan = Number(e.planlanan_miktar) / Number(agac.miktar || 1);
                await emirOperasyonlariDoldur(client, e.id, {
                    rotaOps,
                    planlananMiktar: e.planlanan_miktar,
                    bilesenCarpan: carpan,
                });
                await emirMalzemeleriDoldur(client, e.id, {
                    urunAgaciId: yeniAgac,
                    planlananMiktar: e.planlanan_miktar,
                    agacMiktar: agac.miktar,
                    hammaddeDepoId: e.hammadde_depo_id,
                });
            }
        });
        res.json(await emirGetir(req.params.id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/** PRDT02 / PRDT03 — iş emri onay */
router.post('/:id/onayla', async (req, res) => {
    try {
        const upd = await pool.query(
            `
            UPDATE uretim_emirleri
            SET durum = 'Acik', onayli = TRUE, acik_kapali = 'Acik'
            WHERE id = $1 AND durum IN ('Taslak', 'OnayBekliyor')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!upd.rows[0]) {
            return res.status(400).json({
                hata: 'Emir onaylanamadı (bulunamadı veya durum Taslak/OnayBekliyor değil).',
            });
        }
        res.json(await emirGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** İş emrini başlat (baslatildi = true) */
router.post('/:id/baslat', async (req, res) => {
    try {
        const upd = await pool.query(
            `
            UPDATE uretim_emirleri
            SET baslatildi = TRUE,
                durum = CASE WHEN durum = 'Acik' THEN 'Uretimde' ELSE durum END
            WHERE id = $1
              AND COALESCE(baslatildi, FALSE) = FALSE
              AND durum IN ('Acik', 'Uretimde', 'OnayBekliyor')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!upd.rows[0]) {
            return res.status(400).json({
                hata: 'Emir başlatılamadı (bulunamadı, zaten başlatılmış veya durum uygun değil).',
            });
        }
        res.json(await emirGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM uretim_emirleri WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
