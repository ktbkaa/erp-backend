const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
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
const { rezervasyonTuket } = require('../src/services/rezervasyonService');
const { belgeHtml } = require('../src/services/belgePdfService');
const {
    pickFields,
    appendInsert,
    FATURA_BASLIK,
    FATURA_SATIR,
} = require('../src/utils/belgeAlanlari');

function nOrNull(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}

function boolOr(v, fallback = false) {
    if (typeof v === 'boolean') return v;
    if (v === undefined || v === null || v === '') return fallback;
    return ['1', 'true', 'evet', 'e', 'yes'].includes(String(v).trim().toLowerCase());
}

function satirHesapPaketi(s, kurBelge = 1) {
    const h = satirHesapla({
        miktar: s.miktar,
        birim_fiyat: s.birim_fiyat,
        iskonto_oran: s.iskonto_oran,
        iskonto_oran2: s.iskonto_oran2,
        iskonto_oran3: s.iskonto_oran3,
        kdv_oran: s.kdv_oran != null ? s.kdv_oran : 20,
        kdv_durumu: s.kdv_durumu || 'Haric',
        tevkifat_oran: s.tevkifat_oran,
        otv_oran: s.otv_oran,
        kur: s.kur != null ? s.kur : kurBelge,
    });
    const bandrolOran = Number(s.bandrol_oran) || 0;
    const bandrol_tutari = Math.round(((Number(h.mal_hizmet_tutari) || 0) * bandrolOran / 100) * 100) / 100;
    return { ...h, bandrol_oran: bandrolOran, bandrol_tutari };
}

async function irsaliyeSatirYaz(client, irsaliyeId, s, sira, kaynakTip, kaynakId, kurBelge = 1) {
    const h = satirHesapPaketi(s, kurBelge);
    await client.query(
        `
        INSERT INTO irsaliye_satirlari
            (irsaliye_id, sira_no, satir_tipi, stok_id, depo_id, miktar, birim,
             birim_fiyat, fiyat_liste_id, para_birimi, kur_tipi, kur,
             yerel_birim_fiyat, yerel_para_tutari,
             iskonto_oran, iskonto_oran2, iskonto_oran3,
             iskonto_tutari, iskonto_tutari2, iskonto_tutari3,
             kdv_kodu, kdv_oran, kdv_durumu, kdv_tutari,
             tevkifat_kodu, tevkifat_oran, tevkifat_tutari,
             otv_kodu, otv_oran, otv_tutari,
             bandrol_oran, bandrol_tutari, vergi_semasi,
             vade_tarihi, vade_gun,
             satir_aciklama, satir_aciklama2, satir_aciklama3, musteri_referans_kod,
             parti_id, parti_no, seri_no, stok_statu, raf_kodu, konum_kodu,
             fatura_edilen_miktar, siparis_no,
             tutar_ht, tutar_ttc,
             sevk_emri_satir_id, siparis_detay_id,
             kaynak_belge_tipi, kaynak_belge_id, kaynak_belge_satir_id)
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,
            $13,$14,
            $15,$16,$17,
            $18,$19,$20,
            $21,$22,$23,$24,
            $25,$26,$27,
            $28,$29,$30,
            $31,$32,$33,
            $34,$35,
            $36,$37,$38,$39,
            $40,$41,$42,$43,$44,$45,
            $46,$47,
            $48,$49,
            $50,$51,
            $52,$53,$54
        )
        `,
        [
            irsaliyeId,
            s.sira_no != null ? s.sira_no : sira,
            s.satir_tipi || 'S',
            s.stok_id,
            s.depo_id || null,
            s.miktar,
            s.birim || null,
            s.birim_fiyat ?? 0,
            s.fiyat_liste_id || null,
            s.para_birimi || null,
            s.kur_tipi || null,
            s.kur != null ? s.kur : kurBelge,
            h.yp_birim_fiyat,
            h.yp_tutar,
            h.iskonto_oran,
            h.iskonto_oran2,
            h.iskonto_oran3,
            h.iskonto_tutari,
            h.iskonto_tutari2,
            h.iskonto_tutari3,
            s.kdv_kodu || null,
            h.kdv_oran,
            h.kdv_durumu,
            h.kdv_tutari,
            s.tevkifat_kodu || null,
            h.tevkifat_oran,
            h.tevkifat_tutari,
            s.otv_kodu || null,
            h.otv_oran,
            h.otv_tutari,
            h.bandrol_oran,
            h.bandrol_tutari,
            s.vergi_semasi || null,
            s.vade_tarihi || null,
            nOrNull(s.vade_gun),
            s.satir_aciklama || null,
            s.satir_aciklama2 || null,
            s.satir_aciklama3 || null,
            s.musteri_referans_kod || null,
            s.parti_id || null,
            s.parti_no || null,
            s.seri_no || null,
            s.stok_statu || 'Kullanilabilir',
            s.raf_kodu || null,
            s.konum_kodu || null,
            s.fatura_edilen_miktar ?? 0,
            s.siparis_no || null,
            h.tutar_ht,
            h.tutar_ttc,
            s.sevk_emri_satir_id || null,
            s.siparis_detay_id || null,
            s.kaynak_belge_tipi || kaynakTip,
            s.kaynak_belge_id || kaynakId,
            s.kaynak_belge_satir_id || s.sevk_emri_satir_id || s.siparis_detay_id || null,
        ],
    );
    return { ...s, ...h };
}

async function irsaliyeToplamlariGuncelle(client, irsaliyeId, satirHesaplari, altiIskonto = 0) {
    const t = belgelerToplam(satirHesaplari);
    const bandrol = satirHesaplari.reduce((a, s) => a + (Number(s.bandrol_tutari) || 0), 0);
    const alti = Number(altiIskonto) || 0;
    const genel = Math.round(((Number(t.genel_toplam) || 0) - alti) * 100) / 100;
    await client.query(
        `
        UPDATE irsaliyeler SET
            ara_toplam = $2,
            toplam_iskonto = $3,
            toplam_kdv = $4,
            toplam_otv = $5,
            toplam_tevkifat = $6,
            toplam_bandrol = $7,
            irsaliye_alti_iskonto = $8,
            genel_toplam = $9,
            guncelleme_tarihi = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [
            irsaliyeId,
            t.ara_toplam,
            t.toplam_iskonto,
            t.toplam_kdv,
            t.toplam_otv,
            t.toplam_tevkifat,
            Math.round(bandrol * 100) / 100,
            alti,
            genel,
        ],
    );
}

async function irsaliyeGetir(id) {
    const i = await pool.query(
        `
        SELECT ir.*, c.cari_kodu, c.cari_adi,
               COALESCE(ir.vergi_no, c.vergi_no) AS vergi_no,
               COALESCE(ir.vergi_dairesi, c.vergi_dairesi) AS vergi_dairesi,
               c.email AS cari_email, c.telefon AS cari_telefon,
               d.depo_kodu, d.depo_adi,
               sp.siparis_no, se.sevk_no,
               hk.hareket_kodu, hk.hareket_adi,
               sc.cari_kodu AS sevk_cari_kodu, sc.cari_adi AS sevk_cari_adi
        FROM irsaliyeler ir
        JOIN cariler c ON c.id = ir.cari_id
        JOIN depolar d ON d.id = ir.depo_id
        LEFT JOIN siparisler sp ON sp.id = ir.siparis_id
        LEFT JOIN sevk_emirleri se ON se.id = ir.sevk_emri_id
        LEFT JOIN hareket_kodlari hk ON hk.id = ir.hareket_kodu_id
        LEFT JOIN cariler sc ON sc.id = ir.sevk_cari_id
        WHERE ir.id = $1
        `,
        [id]
    );
    if (!i.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.stok_kodu, st.stok_adi,
               dd.depo_kodu AS satir_depo_kodu, dd.depo_adi AS satir_depo_adi,
               fl.liste_kodu AS fiyat_liste_kodu, fl.liste_adi AS fiyat_liste_adi
        FROM irsaliye_satirlari s
        JOIN stoklar st ON st.id = s.stok_id
        LEFT JOIN depolar dd ON dd.id = s.depo_id
        LEFT JOIN fiyat_listeleri fl ON fl.id = s.fiyat_liste_id
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
        const firmaId = firmaIdFromReq(req);
        const params = [];
        let sql = 'SELECT id FROM irsaliyeler';
        if (firmaId) { params.push(firmaId); sql += ` WHERE firma_id = $${params.length}`; }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
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

function baslikKaynak(body) {
    let kaynakTip = body.kaynak_belge_tipi || null;
    let kaynakId = body.kaynak_belge_id || null;
    if (!kaynakTip && body.sevk_emri_id) {
        kaynakTip = BELGE_TIPI.SEVK_EMRI;
        kaynakId = body.sevk_emri_id;
    } else if (!kaynakTip && body.siparis_id) {
        kaynakTip = BELGE_TIPI.SATIS_SIPARIS;
        kaynakId = body.siparis_id;
    }
    return { kaynakTip, kaynakId };
}

async function irsaliyeBaslikUpsert(client, { id, body, hkId, no, kaynakTip, kaynakId }) {
    const vals = {
        ozellestirme_no: body.ozellestirme_no || 'TR1.2.1',
        senaryo: body.senaryo || 'TEMELIRSALIYE',
        irsaliye_tipi: body.irsaliye_tipi || 'SEVK',
        irsaliye_tarihi: body.irsaliye_tarihi || null,
        irsaliye_zamani: body.irsaliye_zamani || null,
        sevk_tarihi: body.sevk_tarihi || null,
        sevk_zamani: body.sevk_zamani || null,
        fiili_sevk_tarihi: body.fiili_sevk_tarihi || body.sevk_tarihi || null,
        fiili_sevk_zamani: body.fiili_sevk_zamani || body.sevk_zamani || null,
        cari_id: body.cari_id,
        siparis_id: body.siparis_id || null,
        sevk_emri_id: body.sevk_emri_id || null,
        depo_id: body.depo_id,
        hareket_kodu_id: hkId,
        firma_id: body.firma_id || null,
        is_yeri_id: body.is_yeri_id || null,
        proje_kodu: body.proje_kodu || null,
        bolge: body.bolge || null,
        para_birimi: body.para_birimi || 'TRY',
        kur_tipi: body.kur_tipi || 'TCMB-SATIS',
        kur: body.kur != null ? body.kur : 1,
        kur_secenegi: body.kur_secenegi || 'SevkTarihi',
        e_belge_durum: body.e_belge_durum || 'Hazir',
        vade_tarihi: body.vade_tarihi || null,
        vade_gun: nOrNull(body.vade_gun),
        odeme_plani: body.odeme_plani || null,
        odeme_sekli: body.odeme_sekli || null,
        teslimat_kosulu: body.teslimat_kosulu || null,
        nakliye_sirketi: body.nakliye_sirketi || null,
        nakliyeci: body.nakliyeci || null,
        satis_temsilcisi: body.satis_temsilcisi || null,
        fatura_durumu: body.fatura_durumu || 'Irsaliye',
        yazdirildi: boolOr(body.yazdirildi, false),
        yerel_para_cikti: boolOr(body.yerel_para_cikti, false),
        belge_seri: body.belge_seri || null,
        belge_sira: body.belge_sira || null,
        gib_no: body.gib_no || null,
        ettn: body.ettn || null,
        posta_kutusu_alias: body.posta_kutusu_alias || null,
        alis_on_irsaliye: body.alis_on_irsaliye || null,
        matbu_seri: body.matbu_seri || null,
        matbu_sira: body.matbu_sira || null,
        matbu_belge_tarihi: body.matbu_belge_tarihi || null,
        portal_iletildigi_tarih: body.portal_iletildigi_tarih || null,
        e_ticaret_web: body.e_ticaret_web || null,
        e_ticaret_ad: body.e_ticaret_ad || null,
        e_ticaret_soyad: body.e_ticaret_soyad || null,
        e_ticaret_email: body.e_ticaret_email || null,
        sevk_cari_id: body.sevk_cari_id || null,
        sevk_adres_tipi: body.sevk_adres_tipi || null,
        sevk_ad: body.sevk_ad || null,
        sevk_soyad: body.sevk_soyad || null,
        sevk_adresi: body.sevk_adresi || null,
        sevk_adres1: body.sevk_adres1 || null,
        sevk_adres2: body.sevk_adres2 || null,
        sevk_adres3: body.sevk_adres3 || null,
        sevk_il: body.sevk_il || null,
        sevk_ilce: body.sevk_ilce || null,
        sevk_ulke: body.sevk_ulke || 'TR',
        sevk_posta_kodu: body.sevk_posta_kodu || null,
        sevk_tel1: body.sevk_tel1 || null,
        sevk_tel2: body.sevk_tel2 || null,
        gumruk: body.gumruk || null,
        fatura_adres1: body.fatura_adres1 || null,
        fatura_adres2: body.fatura_adres2 || null,
        fatura_adres3: body.fatura_adres3 || null,
        fatura_posta_kodu: body.fatura_posta_kodu || null,
        fatura_ulke: body.fatura_ulke || null,
        fatura_il: body.fatura_il || null,
        fatura_ilce: body.fatura_ilce || null,
        sozlesme_kodu: body.sozlesme_kodu || null,
        cari_unvan: body.cari_unvan || null,
        cari_unvan2: body.cari_unvan2 || null,
        vergi_dairesi: body.vergi_dairesi || null,
        vergi_no: body.vergi_no || null,
        tevkifat_kodu: body.tevkifat_kodu || null,
        tevkifat_oran: body.tevkifat_oran ?? 0,
        tevkifat_tutari: body.tevkifat_tutari ?? 0,
        vergi_semasi: body.vergi_semasi || null,
        ozel_hareket_tipi: body.ozel_hareket_tipi || null,
        fin_vade_tarihi: body.fin_vade_tarihi || null,
        fin_vade_gun: nOrNull(body.fin_vade_gun),
        stok_tarihi: body.stok_tarihi || null,
        arac_kodu: body.arac_kodu || null,
        arac_plaka: body.arac_plaka || null,
        dorse_plaka: body.dorse_plaka || null,
        teslim_eden: body.teslim_eden || null,
        sofor_adi: body.sofor_adi || null,
        sofor_soyadi: body.sofor_soyadi || null,
        sofor_tckn: body.sofor_tckn || null,
        sofor_cep: body.sofor_cep || null,
        kargo_no: body.kargo_no || null,
        arac_aciklama: body.arac_aciklama || null,
        tasiyici_unvan: body.tasiyici_unvan || null,
        tasiyici_vkn: body.tasiyici_vkn || null,
        aciklama: body.aciklama || null,
        aciklama_2: body.aciklama_2 || null,
        aciklama_3: body.aciklama_3 || null,
        not_public: body.not_public || null,
        not_internal: body.not_internal || null,
        irsaliye_alti_iskonto: body.irsaliye_alti_iskonto ?? 0,
        durum: body.durum || 'Taslak',
        kaynak_belge_tipi: kaynakTip,
        kaynak_belge_id: kaynakId,
        iade_mi: boolOr(body.iade_mi, false),
    };

    if (!id) {
        const ins = await client.query(
            `
            INSERT INTO irsaliyeler (
                irsaliye_no, ozellestirme_no, senaryo, irsaliye_tipi,
                irsaliye_tarihi, irsaliye_zamani, sevk_tarihi, sevk_zamani,
                fiili_sevk_tarihi, fiili_sevk_zamani,
                cari_id, siparis_id, sevk_emri_id, depo_id, hareket_kodu_id,
                firma_id, is_yeri_id, proje_kodu, bolge,
                para_birimi, kur_tipi, kur, kur_secenegi, e_belge_durum,
                vade_tarihi, vade_gun, odeme_plani, odeme_sekli, teslimat_kosulu,
                nakliye_sirketi, nakliyeci, satis_temsilcisi, fatura_durumu,
                yazdirildi, yerel_para_cikti, belge_seri, belge_sira, gib_no,
                posta_kutusu_alias, alis_on_irsaliye, matbu_seri, matbu_sira,
                matbu_belge_tarihi, portal_iletildigi_tarih,
                e_ticaret_web, e_ticaret_ad, e_ticaret_soyad, e_ticaret_email,
                sevk_cari_id, sevk_adres_tipi, sevk_ad, sevk_soyad, sevk_adresi,
                sevk_adres1, sevk_adres2, sevk_adres3, sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu,
                sevk_tel1, sevk_tel2, gumruk,
                fatura_adres1, fatura_adres2, fatura_adres3, fatura_posta_kodu, fatura_ulke, fatura_il, fatura_ilce,
                sozlesme_kodu, cari_unvan, cari_unvan2, vergi_dairesi, vergi_no,
                tevkifat_kodu, tevkifat_oran, tevkifat_tutari, vergi_semasi, ozel_hareket_tipi,
                fin_vade_tarihi, fin_vade_gun, stok_tarihi,
                arac_kodu, arac_plaka, dorse_plaka, teslim_eden,
                sofor_adi, sofor_soyadi, sofor_tckn, sofor_cep, kargo_no, arac_aciklama,
                tasiyici_unvan, tasiyici_vkn,
                aciklama, aciklama_2, aciklama_3, not_public, not_internal,
                irsaliye_alti_iskonto, durum, kaynak_belge_tipi, kaynak_belge_id, iade_mi
            ) VALUES (
                $1,$2,$3,$4,
                COALESCE($5::date,CURRENT_DATE), COALESCE($6::time,CURRENT_TIME),
                COALESCE($7::date,CURRENT_DATE), COALESCE($8::time,CURRENT_TIME),
                COALESCE($9::date,CURRENT_DATE), COALESCE($10::time,CURRENT_TIME),
                $11,$12,$13,$14,$15,
                $16,$17,$18,$19,
                $20,$21,$22,$23,$24,
                $25,$26,$27,$28,$29,
                $30,$31,$32,$33,
                $34,$35,$36,$37,$38,
                $39,$40,$41,$42,
                $43,$44,
                $45,$46,$47,$48,
                $49,$50,$51,$52,$53,
                $54,$55,$56,$57,$58,COALESCE($59,'TR'),$60,
                $61,$62,$63,
                $64,$65,$66,$67,$68,$69,$70,
                $71,$72,$73,$74,$75,
                $76,$77,$78,$79,$80,
                $81,$82,$83,
                $84,$85,$86,$87,
                $88,$89,$90,$91,$92,$93,
                $94,$95,
                $96,$97,$98,$99,$100,
                $101,COALESCE($102,'Taslak'),$103,$104,$105
            ) RETURNING id
            `,
            [
                no, vals.ozellestirme_no, vals.senaryo, vals.irsaliye_tipi,
                vals.irsaliye_tarihi, vals.irsaliye_zamani, vals.sevk_tarihi, vals.sevk_zamani,
                vals.fiili_sevk_tarihi, vals.fiili_sevk_zamani,
                vals.cari_id, vals.siparis_id, vals.sevk_emri_id, vals.depo_id, vals.hareket_kodu_id,
                vals.firma_id, vals.is_yeri_id, vals.proje_kodu, vals.bolge,
                vals.para_birimi, vals.kur_tipi, vals.kur, vals.kur_secenegi, vals.e_belge_durum,
                vals.vade_tarihi, vals.vade_gun, vals.odeme_plani, vals.odeme_sekli, vals.teslimat_kosulu,
                vals.nakliye_sirketi, vals.nakliyeci, vals.satis_temsilcisi, vals.fatura_durumu,
                vals.yazdirildi, vals.yerel_para_cikti, vals.belge_seri, vals.belge_sira, vals.gib_no,
                vals.posta_kutusu_alias, vals.alis_on_irsaliye, vals.matbu_seri, vals.matbu_sira,
                vals.matbu_belge_tarihi, vals.portal_iletildigi_tarih,
                vals.e_ticaret_web, vals.e_ticaret_ad, vals.e_ticaret_soyad, vals.e_ticaret_email,
                vals.sevk_cari_id, vals.sevk_adres_tipi, vals.sevk_ad, vals.sevk_soyad, vals.sevk_adresi,
                vals.sevk_adres1, vals.sevk_adres2, vals.sevk_adres3, vals.sevk_il, vals.sevk_ilce, vals.sevk_ulke, vals.sevk_posta_kodu,
                vals.sevk_tel1, vals.sevk_tel2, vals.gumruk,
                vals.fatura_adres1, vals.fatura_adres2, vals.fatura_adres3, vals.fatura_posta_kodu, vals.fatura_ulke, vals.fatura_il, vals.fatura_ilce,
                vals.sozlesme_kodu, vals.cari_unvan, vals.cari_unvan2, vals.vergi_dairesi, vals.vergi_no,
                vals.tevkifat_kodu, vals.tevkifat_oran, vals.tevkifat_tutari, vals.vergi_semasi, vals.ozel_hareket_tipi,
                vals.fin_vade_tarihi, vals.fin_vade_gun, vals.stok_tarihi,
                vals.arac_kodu, vals.arac_plaka, vals.dorse_plaka, vals.teslim_eden,
                vals.sofor_adi, vals.sofor_soyadi, vals.sofor_tckn, vals.sofor_cep, vals.kargo_no, vals.arac_aciklama,
                vals.tasiyici_unvan, vals.tasiyici_vkn,
                vals.aciklama, vals.aciklama_2, vals.aciklama_3, vals.not_public, vals.not_internal,
                vals.irsaliye_alti_iskonto, vals.durum, vals.kaynak_belge_tipi, vals.kaynak_belge_id, vals.iade_mi,
            ],
        );
        return ins.rows[0].id;
    }

    await client.query(
        `
        UPDATE irsaliyeler SET
            ozellestirme_no=COALESCE($2, ozellestirme_no),
            senaryo=COALESCE($3, senaryo),
            irsaliye_tipi=COALESCE($4, irsaliye_tipi),
            irsaliye_tarihi=COALESCE($5::date, irsaliye_tarihi),
            irsaliye_zamani=COALESCE($6::time, irsaliye_zamani),
            sevk_tarihi=COALESCE($7::date, sevk_tarihi),
            sevk_zamani=COALESCE($8::time, sevk_zamani),
            fiili_sevk_tarihi=COALESCE($9::date, fiili_sevk_tarihi),
            fiili_sevk_zamani=COALESCE($10::time, fiili_sevk_zamani),
            cari_id=COALESCE($11, cari_id),
            siparis_id=$12, sevk_emri_id=$13,
            depo_id=COALESCE($14, depo_id),
            hareket_kodu_id=COALESCE($15, hareket_kodu_id),
            firma_id=$16, is_yeri_id=$17, proje_kodu=$18, bolge=$19,
            para_birimi=COALESCE($20, para_birimi),
            kur_tipi=COALESCE($21, kur_tipi),
            kur=COALESCE($22, kur),
            kur_secenegi=COALESCE($23, kur_secenegi),
            e_belge_durum=COALESCE($24, e_belge_durum),
            vade_tarihi=$25, vade_gun=$26, odeme_plani=$27, odeme_sekli=$28, teslimat_kosulu=$29,
            nakliye_sirketi=$30, nakliyeci=$31, satis_temsilcisi=$32, fatura_durumu=COALESCE($33, fatura_durumu),
            yazdirildi=COALESCE($34, yazdirildi), yerel_para_cikti=COALESCE($35, yerel_para_cikti),
            belge_seri=$36, belge_sira=$37, gib_no=$38,
            posta_kutusu_alias=$39, alis_on_irsaliye=$40, matbu_seri=$41, matbu_sira=$42,
            matbu_belge_tarihi=$43, portal_iletildigi_tarih=$44,
            e_ticaret_web=$45, e_ticaret_ad=$46, e_ticaret_soyad=$47, e_ticaret_email=$48,
            sevk_cari_id=$49, sevk_adres_tipi=$50, sevk_ad=$51, sevk_soyad=$52, sevk_adresi=$53,
            sevk_adres1=$54, sevk_adres2=$55, sevk_adres3=$56, sevk_il=$57, sevk_ilce=$58,
            sevk_ulke=COALESCE($59, sevk_ulke), sevk_posta_kodu=$60,
            sevk_tel1=$61, sevk_tel2=$62, gumruk=$63,
            fatura_adres1=$64, fatura_adres2=$65, fatura_adres3=$66, fatura_posta_kodu=$67,
            fatura_ulke=$68, fatura_il=$69, fatura_ilce=$70,
            sozlesme_kodu=$71, cari_unvan=$72, cari_unvan2=$73, vergi_dairesi=$74, vergi_no=$75,
            tevkifat_kodu=$76, tevkifat_oran=COALESCE($77, tevkifat_oran), tevkifat_tutari=COALESCE($78, tevkifat_tutari),
            vergi_semasi=$79, ozel_hareket_tipi=$80,
            fin_vade_tarihi=$81, fin_vade_gun=$82, stok_tarihi=$83,
            arac_kodu=$84, arac_plaka=$85, dorse_plaka=$86, teslim_eden=$87,
            sofor_adi=$88, sofor_soyadi=$89, sofor_tckn=$90, sofor_cep=$91, kargo_no=$92, arac_aciklama=$93,
            tasiyici_unvan=$94, tasiyici_vkn=$95,
            aciklama=$96, aciklama_2=$97, aciklama_3=$98, not_public=$99, not_internal=$100,
            irsaliye_alti_iskonto=COALESCE($101, irsaliye_alti_iskonto),
            durum=COALESCE($102, durum),
            kaynak_belge_tipi=COALESCE($103, kaynak_belge_tipi),
            kaynak_belge_id=COALESCE($104, kaynak_belge_id),
            iade_mi=COALESCE($105, iade_mi),
            guncelleme_tarihi=CURRENT_TIMESTAMP
        WHERE id=$1
        `,
        [
            id,
            vals.ozellestirme_no, vals.senaryo, vals.irsaliye_tipi,
            vals.irsaliye_tarihi, vals.irsaliye_zamani, vals.sevk_tarihi, vals.sevk_zamani,
            vals.fiili_sevk_tarihi, vals.fiili_sevk_zamani,
            vals.cari_id, vals.siparis_id, vals.sevk_emri_id, vals.depo_id, vals.hareket_kodu_id,
            vals.firma_id, vals.is_yeri_id, vals.proje_kodu, vals.bolge,
            vals.para_birimi, vals.kur_tipi, vals.kur, vals.kur_secenegi, vals.e_belge_durum,
            vals.vade_tarihi, vals.vade_gun, vals.odeme_plani, vals.odeme_sekli, vals.teslimat_kosulu,
            vals.nakliye_sirketi, vals.nakliyeci, vals.satis_temsilcisi, vals.fatura_durumu,
            vals.yazdirildi, vals.yerel_para_cikti, vals.belge_seri, vals.belge_sira, vals.gib_no,
            vals.posta_kutusu_alias, vals.alis_on_irsaliye, vals.matbu_seri, vals.matbu_sira,
            vals.matbu_belge_tarihi, vals.portal_iletildigi_tarih,
            vals.e_ticaret_web, vals.e_ticaret_ad, vals.e_ticaret_soyad, vals.e_ticaret_email,
            vals.sevk_cari_id, vals.sevk_adres_tipi, vals.sevk_ad, vals.sevk_soyad, vals.sevk_adresi,
            vals.sevk_adres1, vals.sevk_adres2, vals.sevk_adres3, vals.sevk_il, vals.sevk_ilce,
            vals.sevk_ulke, vals.sevk_posta_kodu,
            vals.sevk_tel1, vals.sevk_tel2, vals.gumruk,
            vals.fatura_adres1, vals.fatura_adres2, vals.fatura_adres3, vals.fatura_posta_kodu,
            vals.fatura_ulke, vals.fatura_il, vals.fatura_ilce,
            vals.sozlesme_kodu, vals.cari_unvan, vals.cari_unvan2, vals.vergi_dairesi, vals.vergi_no,
            vals.tevkifat_kodu, vals.tevkifat_oran, vals.tevkifat_tutari, vals.vergi_semasi, vals.ozel_hareket_tipi,
            vals.fin_vade_tarihi, vals.fin_vade_gun, vals.stok_tarihi,
            vals.arac_kodu, vals.arac_plaka, vals.dorse_plaka, vals.teslim_eden,
            vals.sofor_adi, vals.sofor_soyadi, vals.sofor_tckn, vals.sofor_cep, vals.kargo_no, vals.arac_aciklama,
            vals.tasiyici_unvan, vals.tasiyici_vkn,
            vals.aciklama, vals.aciklama_2, vals.aciklama_3, vals.not_public, vals.not_internal,
            vals.irsaliye_alti_iskonto, vals.durum, vals.kaynak_belge_tipi, vals.kaynak_belge_id, vals.iade_mi,
        ],
    );
    return id;
}

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
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
            const { kaynakTip, kaynakId } = baslikKaynak(body);
            const iid = await irsaliyeBaslikUpsert(client, {
                id: null, body, hkId: hk.id, no, kaynakTip, kaynakId,
            });
            const kurBelge = body.kur != null ? Number(body.kur) : 1;
            const hesaplar = [];
            let sira = 1;
            for (const s of satirlar) {
                if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
                hesaplar.push(await irsaliyeSatirYaz(client, iid, s, sira++, kaynakTip, kaynakId, kurBelge));
            }
            await irsaliyeToplamlariGuncelle(client, iid, hesaplar, body.irsaliye_alti_iskonto);
            return iid;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const body = req.body || {};
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
            const m = mevcut.rows[0];
            const merged = {
                ...m,
                ...body,
                cari_id: body.cari_id != null ? body.cari_id : m.cari_id,
                depo_id: body.depo_id != null ? body.depo_id : m.depo_id,
            };
            const { kaynakTip, kaynakId } = baslikKaynak(merged);
            await irsaliyeBaslikUpsert(client, {
                id: Number(req.params.id),
                body: merged,
                hkId: body.hareket_kodu_id || m.hareket_kodu_id,
                no: m.irsaliye_no,
                kaynakTip: kaynakTip || m.kaynak_belge_tipi,
                kaynakId: kaynakId || m.kaynak_belge_id,
            });
            if (Array.isArray(raw)) {
                await client.query('DELETE FROM irsaliye_satirlari WHERE irsaliye_id=$1', [req.params.id]);
                const kurBelge = merged.kur != null ? Number(merged.kur) : 1;
                const hesaplar = [];
                let sira = 1;
                for (const s of raw) {
                    if (!s.stok_id || !s.miktar) continue;
                    hesaplar.push(await irsaliyeSatirYaz(
                        client,
                        Number(req.params.id),
                        s,
                        sira++,
                        s.kaynak_belge_tipi || kaynakTip || m.kaynak_belge_tipi,
                        s.kaynak_belge_id || kaynakId || m.kaynak_belge_id,
                        kurBelge,
                    ));
                }
                await irsaliyeToplamlariGuncelle(client, Number(req.params.id), hesaplar, merged.irsaliye_alti_iskonto);
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

            // Açık miktar: sipariş satırlarında irsaliye_edilen artır + rezervasyon tüket
            for (const s of ir.satirlar) {
                if (s.siparis_detay_id) {
                    await client.query(
                        `UPDATE siparis_detaylari
                         SET irsaliye_edilen_miktar = COALESCE(irsaliye_edilen_miktar,0) + $2
                         WHERE id=$1`,
                        [s.siparis_detay_id, s.miktar]
                    );
                    await rezervasyonTuket(client, {
                        siparisDetayId: s.siparis_detay_id,
                        miktar: s.miktar,
                    });
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
            sevk_ulke: req.body.sevk_ulke || sevk.sevk_ulke || 'TR',
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
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'TR'),$11,$12,$13,$14,$15,$16,$17,$18,$19,'Taslak',
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

/** İrsaliye → Satış faturası — Onaylı + GİB gönderildi; numaratörden no kabul edilir */
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
        if (String(ir.e_belge_durum || '') !== 'Gonderildi') {
            return res.status(400).json({
                hata: 'Fatura oluşturmak için irsaliyenin e-belge durumu GİB’e gönderilmiş (Gonderildi) olmalıdır.',
                kod: 'IRSALIYE_GIB_KILIDI',
                e_belge_durum: ir.e_belge_durum || null,
            });
        }

        const faturaId = await withTransaction(pool, async (client) => {
            const no = (req.body.fatura_no && String(req.body.fatura_no).trim())
                || (await sonrakiBelgeNo(client, 'FATURA'));
            const hk = await hareketKoduBul(client, BELGE_TIPI.SATIS_FATURA);
            const kurBelge = Number(ir.kur) > 0 ? Number(ir.kur) : 1;

            const kalemler = [];
            for (const s of (ir.satirlar || [])) {
                const stok = await client.query(
                    'SELECT satis_fiyati, birim FROM stoklar WHERE id=$1',
                    [s.stok_id]
                );
                const fiyat = req.body.birim_fiyatlar?.[s.stok_id]
                    ?? (s.birim_fiyat != null && Number(s.birim_fiyat) > 0
                        ? Number(s.birim_fiyat)
                        : Number(stok.rows[0]?.satis_fiyati || 0));
                const h = satirHesapPaketi({
                    ...s,
                    birim_fiyat: fiyat,
                    miktar: s.miktar,
                    kdv_oran: s.kdv_oran != null ? s.kdv_oran : (req.body.kdv_oran ?? 20),
                    iskonto_oran: s.iskonto_oran != null ? s.iskonto_oran : (req.body.iskonto_oran ?? 0),
                }, kurBelge);
                kalemler.push({
                    sira_no: s.sira_no,
                    stok_id: s.stok_id,
                    miktar: s.miktar,
                    birim: s.birim || stok.rows[0]?.birim,
                    birim_fiyat: fiyat,
                    depo_id: s.depo_id || ir.depo_id || null,
                    fiyat_liste_id: s.fiyat_liste_id || null,
                    para_birimi: s.para_birimi || ir.para_birimi || 'TRY',
                    kur_tipi: s.kur_tipi || ir.kur_tipi || null,
                    kur: h.kur,
                    yerel_birim_fiyat: h.yp_birim_fiyat,
                    yerel_para_tutari: h.yp_tutar,
                    kdv_kodu: s.kdv_kodu || null,
                    tevkifat_kodu: s.tevkifat_kodu || null,
                    otv_kodu: s.otv_kodu || null,
                    vergi_semasi: s.vergi_semasi || null,
                    satir_tipi: s.satir_tipi || 'S',
                    satir_aciklama: s.satir_aciklama || null,
                    satir_aciklama2: s.satir_aciklama2 || null,
                    satir_aciklama3: s.satir_aciklama3 || null,
                    musteri_referans_kod: s.musteri_referans_kod || null,
                    vade_tarihi: s.vade_tarihi || null,
                    vade_gun: s.vade_gun != null ? s.vade_gun : null,
                    siparis_no: s.siparis_no || null,
                    seri_no: s.seri_no || null,
                    irsaliye_satir_id: s.id,
                    siparis_detay_id: s.siparis_detay_id || null,
                    ...h,
                });
            }
            const top = belgelerToplam(kalemler);
            const bandrol = kalemler.reduce((a, k) => a + (Number(k.bandrol_tutari) || 0), 0);
            const vadeGun = ir.vade_gun != null ? ir.vade_gun : ir.fin_vade_gun;

            const baslikKaynak = {
                fatura_tipi: 'SATIS',
                senaryo: 'TICARIFATURA',
                ozellestirme_no: 'TR1.2',
                fatura_tarihi: req.body.fatura_tarihi || ir.irsaliye_tarihi
                    || new Date().toISOString().slice(0, 10),
                para_birimi: ir.para_birimi || 'TRY',
                kur: kurBelge,
                kur_tipi: ir.kur_tipi || 'TCMB-SATIS',
                kur_secenegi: ir.kur_secenegi || 'BelgeTarihi',
                bolge: ir.bolge || null,
                irsaliye_id: ir.id,
                siparis_id: ir.siparis_id || null,
                hareket_kodu_id: hk?.id || null,
                firma_id: ir.firma_id || null,
                is_yeri_id: ir.is_yeri_id || null,
                depo_id: ir.depo_id || null,
                fiyat_liste_id: ir.fiyat_liste_id || null,
                proje_kodu: ir.proje_kodu || null,
                satis_temsilcisi: ir.satis_temsilcisi || null,
                odeme_sekli: ir.odeme_sekli || null,
                odeme_plani: ir.odeme_plani || null,
                odeme_kosulu: ir.odeme_kosulu || null,
                teslimat_kosulu: ir.teslimat_kosulu || null,
                vade_tarihi: ir.vade_tarihi || ir.fin_vade_tarihi || null,
                vade_gun: vadeGun,
                odeme_vadesi_gun: vadeGun,
                e_belge_durum: 'Hazir',
                belge_seri: ir.belge_seri || null,
                belge_sira: ir.belge_sira || null,
                gib_no: ir.gib_no || null,
                sevk_adresi: ir.sevk_adresi || null,
                sevk_cari_id: ir.sevk_cari_id || null,
                sevk_adres_tipi: ir.sevk_adres_tipi || null,
                sevk_ad: ir.sevk_ad || null,
                sevk_soyad: ir.sevk_soyad || null,
                sevk_adres1: ir.sevk_adres1 || null,
                sevk_adres2: ir.sevk_adres2 || null,
                sevk_adres3: ir.sevk_adres3 || null,
                sevk_tel1: ir.sevk_tel1 || null,
                sevk_tel2: ir.sevk_tel2 || null,
                sevk_il: ir.sevk_il || null,
                sevk_ilce: ir.sevk_ilce || null,
                sevk_ulke: ir.sevk_ulke || null,
                sevk_posta_kodu: ir.sevk_posta_kodu || null,
                gumruk: ir.gumruk || null,
                fatura_adres1: ir.fatura_adres1 || null,
                fatura_adres2: ir.fatura_adres2 || null,
                fatura_adres3: ir.fatura_adres3 || null,
                fatura_posta_kodu: ir.fatura_posta_kodu || null,
                fatura_ulke: ir.fatura_ulke || null,
                fatura_il: ir.fatura_il || null,
                fatura_ilce: ir.fatura_ilce || null,
                sozlesme_kodu: ir.sozlesme_kodu || null,
                cari_unvan: ir.cari_unvan || null,
                cari_unvan2: ir.cari_unvan2 || null,
                vergi_dairesi: ir.vergi_dairesi || null,
                vergi_no: ir.vergi_no || null,
                tevkifat_kodu: ir.tevkifat_kodu || null,
                tevkifat_oran: ir.tevkifat_oran ?? 0,
                tevkifat_tutari: ir.tevkifat_tutari ?? 0,
                vergi_semasi: ir.vergi_semasi || null,
                ozel_hareket_tipi: ir.ozel_hareket_tipi || null,
                fin_vade_tarihi: ir.fin_vade_tarihi || null,
                fin_vade_gun: ir.fin_vade_gun ?? null,
                stok_tarihi: ir.stok_tarihi || null,
                aciklama: ir.aciklama || `İrsaliye No: ${ir.irsaliye_no}`,
                aciklama_2: ir.aciklama_2 || null,
                aciklama_3: ir.aciklama_3 || null,
                not_public: ir.not_public || null,
                not_internal: ir.not_internal || null,
                fatura_alti_iskonto: ir.irsaliye_alti_iskonto ?? 0,
                toplam_otv: top.toplam_otv || 0,
                toplam_tevkifat: top.toplam_tevkifat || 0,
                toplam_bandrol: bandrol,
                kalan_tutar: top.odenecek_tutar,
                durum: 'Taslak',
                kaynak_belge_tipi: BELGE_TIPI.IRSALIYE,
                kaynak_belge_id: ir.id,
            };
            const extras = pickFields(baslikKaynak, FATURA_BASLIK);
            delete extras.ettn;
            const baslik = appendInsert(
                ['fatura_no', 'cari_id', 'fatura_turu', 'toplam_tutar', 'mal_hizmet_toplam',
                    'toplam_iskonto', 'toplam_kdv', 'odenecek_tutar', 'ettn'],
                [no, ir.cari_id, 'Satis', top.toplam_tutar, top.mal_hizmet_toplam,
                    top.toplam_iskonto, top.toplam_kdv, top.odenecek_tutar, null],
                extras
            );
            const cols = [];
            const vals = [];
            const ph = [];
            baslik.cols.forEach((c, i) => {
                cols.push(c);
                if (c === 'ettn') {
                    ph.push('gen_random_uuid()');
                } else {
                    vals.push(baslik.vals[i]);
                    ph.push(`$${vals.length}`);
                }
            });
            const fIns = await client.query(
                `INSERT INTO faturalar (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING id`,
                vals
            );
            const fid = fIns.rows[0].id;
            for (const k of kalemler) {
                const satirEx = pickFields({
                    ...k,
                    net_birim_fiyat: k.birim_fiyat,
                    kaynak_belge_tipi: BELGE_TIPI.IRSALIYE,
                    kaynak_belge_id: ir.id,
                    kaynak_belge_satir_id: k.irsaliye_satir_id,
                }, FATURA_SATIR);
                const sat = appendInsert(
                    ['fatura_id', 'stok_id', 'miktar', 'birim_fiyat', 'toplam_tutar', 'mal_hizmet_tutari'],
                    [fid, k.stok_id, k.miktar, k.birim_fiyat, k.satir_toplam, k.mal_hizmet_tutari],
                    satirEx
                );
                await client.query(
                    `INSERT INTO fatura_detaylari (${sat.cols.join(',')}) VALUES (${sat.placeholders})`,
                    sat.vals
                );
                if (k.siparis_detay_id) {
                    await client.query(
                        `UPDATE siparis_detaylari
                         SET fatura_edilen_miktar = COALESCE(fatura_edilen_miktar,0) + $2
                         WHERE id=$1`,
                        [k.siparis_detay_id, k.miktar]
                    );
                }
                if (k.irsaliye_satir_id) {
                    await client.query(
                        `UPDATE irsaliye_satirlari
                         SET fatura_edilen_miktar = COALESCE(fatura_edilen_miktar,0) + $2
                         WHERE id=$1`,
                        [k.irsaliye_satir_id, k.miktar]
                    ).catch(() => {});
                }
            }
            await client.query(
                `UPDATE irsaliyeler
                 SET durum='FaturayaDonustu', fatura_durumu='Faturalandi'
                 WHERE id=$1`,
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
            yonlendir: 'fatura-yonetimi',
            mesaj: 'Fatura ekranına yönlendiriliyorsunuz',
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** GET /irsaliyeler/:id/yazdir — HTML+QR yazdırma (SAL-010) */
router.get('/:id/yazdir', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        const html = belgeHtml({
            baslik: 'Satış İrsaliyesi',
            belgeNo: ir.irsaliye_no,
            tarih: ir.irsaliye_tarihi || ir.kayit_tarihi,
            cari: ir,
            satirlar: ir.satirlar || ir.kalemler || [],
            ekstra: { ettn: ir.ettn, aciklama: ir.aciklama },
        });
        res.type('html').send(html);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});
router.get('/:id/pdf', (req, res) => res.redirect(302, `/irsaliyeler/${req.params.id}/yazdir`));

/** POST /irsaliyeler/:id/iade — satış iade irsaliyesi (ters stok girişi) */
router.post('/:id/iade', async (req, res) => {
    try {
        const kaynak = await irsaliyeGetir(req.params.id);
        if (!kaynak) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (kaynak.durum !== 'Onayli' && kaynak.durum !== 'FaturayaDonustu') {
            return res.status(400).json({ hata: 'Yalnızca onaylı irsaliyeden iade oluşturulur.' });
        }
        const depoId = Number(req.body.depo_id || kaynak.depo_id);
        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'IRSALIYE').catch(() => `SIA-${Date.now()}`);
            const baslik = await client.query(
                `
                INSERT INTO irsaliyeler
                  (irsaliye_no, cari_id, depo_id, siparis_id, durum, aciklama,
                   kaynak_belge_tipi, kaynak_belge_id, irsaliye_tarihi)
                VALUES ($1,$2,$3,$4,'Taslak',$5,'SATIS_IADE',$6,CURRENT_DATE)
                RETURNING id
                `,
                [
                    no, kaynak.cari_id, depoId, kaynak.siparis_id,
                    `İade ← ${kaynak.irsaliye_no}`, kaynak.id,
                ]
            ).catch(async (err) => {
                // minimal kolon seti
                if (String(err.message).includes('column')) {
                    return client.query(
                        `INSERT INTO irsaliyeler (irsaliye_no, cari_id, depo_id, durum, aciklama)
                         VALUES ($1,$2,$3,'Taslak',$4) RETURNING id`,
                        [no, kaynak.cari_id, depoId, `İade ← ${kaynak.irsaliye_no}`]
                    );
                }
                throw err;
            });
            const iadeId = baslik.rows[0].id;
            let sira = 1;
            for (const s of kaynak.satirlar || []) {
                const miktar = req.body.miktarlar?.[s.id] != null
                    ? Number(req.body.miktarlar[s.id])
                    : Number(s.miktar);
                if (miktar <= 0) continue;
                await client.query(
                    `
                    INSERT INTO irsaliye_satirlari
                      (irsaliye_id, sira_no, stok_id, miktar, birim, siparis_detay_id)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [iadeId, sira++, s.stok_id, miktar, s.birim || null, s.siparis_detay_id || null]
                ).catch(async () => {
                    await client.query(
                        `INSERT INTO irsaliye_satirlari (irsaliye_id, stok_id, miktar, birim)
                         VALUES ($1,$2,$3,$4)`,
                        [iadeId, s.stok_id, miktar, s.birim || null]
                    );
                });
            }
            // Stok girişi (iade)
            const satirlar = await client.query(
                `SELECT * FROM irsaliye_satirlari WHERE irsaliye_id=$1`,
                [iadeId]
            );
            if (satirlar.rows.length) {
                const hareket = await stokHareketOlustur(client, {
                    hareketTipi: 'IADE_GIRIS',
                    depoId,
                    belgeTipi: 'SATIS_IADE',
                    belgeId: iadeId,
                    aciklama: `Satış iade ${no}`,
                    depoZorunluAtla: true,
                    satirlar: satirlar.rows.map((s) => ({
                        stok_id: s.stok_id,
                        miktar: s.miktar,
                        yon: 1,
                        birim: s.birim,
                    })),
                });
                await client.query(
                    `UPDATE irsaliyeler SET durum='Onayli', stok_hareket_id=$2 WHERE id=$1`,
                    [iadeId, hareket.hareket.id]
                ).catch(() =>
                    client.query(`UPDATE irsaliyeler SET durum='Onayli' WHERE id=$1`, [iadeId])
                );
            }
            return iadeId;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message, kod: err.code, detay: err.detay });
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
