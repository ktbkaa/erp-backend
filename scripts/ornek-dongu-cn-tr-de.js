/**
 * Örnek tam döngü (ekran sırasıyla, HTTP API üzerinden):
 * 1) Sabit/ana veri kontrol
 * 2) Tedarikçiler (CN / TR / DE) + müşteri
 * 3) Stok kartları: HM Çin, HM Türkiye, YM Almanya (satınalma), Mamul
 * 4) Satınalma talebi → sipariş → onay → mal kabul (HM Ana, YM YM depo)
 * 5) Ürün ağacı + rota + iş merkezi
 * 6) Üretim emri → üretim girişi
 * 7) Satış siparişi Onaylı (sevkiyata hazır)
 */
require('dotenv').config();

const BASE = process.env.ERP_BASE || 'http://127.0.0.1:3000';

async function api(path, opts = {}) {
    const r = await fetch(BASE + path, {
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        ...opts,
    });
    const text = await r.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    if (!r.ok) {
        const msg = body?.hata || body?.detay || text || r.statusText;
        throw new Error(`${opts.method || 'GET'} ${path} → ${r.status}: ${msg}`);
    }
    return body;
}

function step(n, title) {
    console.log(`\n=== ${n}. ${title} ===`);
}

function logRec(label, obj, fields) {
    const bits = fields.map((f) => `${f}=${obj?.[f] ?? '—'}`).join(' | ');
    console.log(`  ✓ ${label}: ${bits}`);
}

async function findOrCreateCari(payload) {
    const liste = await api('/cariler');
    const mevcut = liste.find((c) => c.cari_adi === payload.cari_adi);
    if (mevcut) {
        const upd = await api(`/cariler/${mevcut.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...mevcut, ...payload }),
        });
        return upd;
    }
    // kod ayır
    const seri = payload.cari_turu === 'Musteri' ? 'MUSTERI'
        : payload.cari_turu === 'Tedarikci' ? 'TEDARIKCI' : 'CARI_HERIKISI';
    const ayir = await api(`/kod-serileri/${seri}/ayir`, { method: 'POST', body: '{}' });
    return api('/cariler', {
        method: 'POST',
        body: JSON.stringify({ ...payload, cari_kodu: ayir.kod || ayir.yeni_kod || ayir }),
    });
}

async function createStok(payload) {
    const tipSeri = {
        Hammadde: 'HAMMADDE',
        YariMamul: 'YARIMAMUL',
        Mamul: 'MAMUL',
        Ticari: 'TICARI',
    }[payload.stok_tipi] || 'TICARI';
    const ayir = await api(`/kod-serileri/${tipSeri}/ayir`, { method: 'POST', body: '{}' });
    const kod = ayir.kod || ayir.yeni_kod || ayir;
    return api('/stoklar', {
        method: 'POST',
        body: JSON.stringify({ ...payload, stok_kodu: kod }),
    });
}

async function main() {
    console.log('Örnek döngü başlıyor →', BASE);

    // 1) Ana veri
    step(1, 'Ana veri (Firma / İş Yeri / Depo / Ülke)');
    const firma = (await api('/firmalar'))[0];
    const isYeri = (await api('/is-yerleri'))[0];
    const depolar = await api('/depolar');
    const anaDepo = depolar.find((d) => /hammadde|ana/i.test(d.depo_adi)) || depolar[0];
    const ymDepo = depolar.find((d) => /yarı|yari/i.test(d.depo_adi)) || depolar[1] || anaDepo;
    const mmDepo = depolar.find((d) => /mamul/i.test(d.depo_adi) && !/yarı|yari/i.test(d.depo_adi))
        || depolar[2] || anaDepo;
    const ulkeler = await api('/ulkeler');
    logRec('Firma', firma, ['firma_kodu', 'firma_adi']);
    logRec('İş yeri', isYeri, ['is_yeri_kodu', 'is_yeri_adi']);
    logRec('Ana depo', anaDepo, ['depo_kodu', 'depo_adi']);
    logRec('YM depo', ymDepo, ['depo_kodu', 'depo_adi']);
    logRec('Mamul depo', mmDepo, ['depo_kodu', 'depo_adi']);
    console.log('  ✓ Ülkeler:', ulkeler.map((u) => u.ulke_kodu).join(', '));

    // 2) Cariler
    step(2, 'Cari kartları — tedarikçiler (CN/TR/DE) + müşteri');
    const tedCn = await findOrCreateCari({
        cari_adi: 'Shenzhen Parts Co. (CN)',
        cari_turu: 'Tedarikci',
        ulke: 'CN',
        il: 'Shenzhen',
        telefon: '+86-755-1000',
        email: 'sales@szparts.cn',
        vergi_no: 'CN990011',
        firma_id: firma.id,
        is_yeri_id: isYeri.id,
        aktif: true,
        firma_parametreleri: [{
            firma_id: firma.id,
            muhasebe_hesap_kodu: '320.CN',
            para_birimi: 'USD',
            risk_grup_kodu: 'B',
            nakit_akisa_dahil: true,
        }],
        dil_tanimlari: [{ dil_kodu: 'EN', dil_adi: 'English', cari_adi: 'Shenzhen Parts Co.', varsayilan: true }],
    });
    const tedTr = await findOrCreateCari({
        cari_adi: 'Anadolu Metal A.Ş. (TR)',
        cari_turu: 'Tedarikci',
        ulke: 'TR',
        il: 'Kocaeli',
        ilce: 'Gebze',
        telefon: '0262-555-0101',
        email: 'siparis@anadolumetal.com.tr',
        vergi_no: '1112223334',
        firma_id: firma.id,
        is_yeri_id: isYeri.id,
        aktif: true,
        firma_parametreleri: [{
            firma_id: firma.id,
            muhasebe_hesap_kodu: '320.TR',
            para_birimi: 'TRY',
            risk_grup_kodu: 'A',
            nakit_akisa_dahil: true,
        }],
    });
    const tedDe = await findOrCreateCari({
        cari_adi: 'Bayerische Antrieb GmbH (DE)',
        cari_turu: 'Tedarikci',
        ulke: 'DE',
        il: 'München',
        telefon: '+49-89-4000',
        email: 'order@bayerische-antrieb.de',
        vergi_no: 'DE556677',
        firma_id: firma.id,
        is_yeri_id: isYeri.id,
        aktif: true,
        firma_parametreleri: [{
            firma_id: firma.id,
            muhasebe_hesap_kodu: '320.DE',
            para_birimi: 'EUR',
            risk_grup_kodu: 'A',
            nakit_akisa_dahil: true,
        }],
        dil_tanimlari: [{ dil_kodu: 'DE', dil_adi: 'Deutsch', cari_adi: 'Bayerische Antrieb GmbH', varsayilan: true }],
    });
    const musteri = await findOrCreateCari({
        cari_adi: 'Marmara Endüstri Müşteri A.Ş.',
        cari_turu: 'Musteri',
        ulke: 'TR',
        il: 'İstanbul',
        ilce: 'Kartal',
        telefon: '0216-444-0909',
        email: 'satin@marmaraendustri.com',
        vergi_no: '9988776655',
        firma_id: firma.id,
        is_yeri_id: isYeri.id,
        aktif: true,
        sevk_adresleri: [{
            adres_adi: 'Sevk — Kartal Depo',
            adres1: 'Organize Sanayi 12. Cad.',
            il: 'İstanbul',
            ilce: 'Kartal',
            ulke: 'TR',
            varsayilan: true,
        }],
    });
    logRec('Tedarikçi CN', tedCn, ['cari_kodu', 'cari_adi', 'ulke']);
    logRec('Tedarikçi TR', tedTr, ['cari_kodu', 'cari_adi', 'ulke']);
    logRec('Tedarikçi DE', tedDe, ['cari_kodu', 'cari_adi', 'ulke']);
    logRec('Müşteri', musteri, ['cari_kodu', 'cari_adi']);

    // 3) Stok kartları
    step(3, 'Stok kartları — HM(CN), HM(TR), YM(DE satınalma), Mamul');
    const hmCn = await createStok({
        stok_adi: 'HM Bobin — Çin Menşei',
        stok_tipi: 'Hammadde',
        tedarik_tipi: 'Satinalma',
        birim: 'AD',
        stok_takip_birimi: 'AD',
        ulke_mensei: 'CN',
        temin_sekli: 'SATINALMA',
        satis_fiyati: 12,
        aktif: true,
        is_yeri_baglari: [{ is_yeri_id: isYeri.id, aktif: true }],
        barkodlar: [{ barkod: '869CN-BOBIN-01', birim_kodu: 'AD', varsayilan: true }],
        dil_tanimlari: [{ dil_kodu: 'EN', dil_adi: 'English', stok_adi: 'Coil — China Origin', varsayilan: false }],
        birim_tanimlari: [{ birim_kodu: 'AD', katsayi: 1, cevrilecek_birim: 'AD', takip_birimi_mi: true }],
    });
    const hmTr = await createStok({
        stok_adi: 'HM Alüminyum Profil — TR Menşei',
        stok_tipi: 'Hammadde',
        tedarik_tipi: 'Satinalma',
        birim: 'AD',
        stok_takip_birimi: 'AD',
        ulke_mensei: 'TR',
        temin_sekli: 'SATINALMA',
        satis_fiyati: 8,
        aktif: true,
        is_yeri_baglari: [{ is_yeri_id: isYeri.id, aktif: true }],
        barkodlar: [{ barkod: '869TR-PROFIL-01', birim_kodu: 'AD', varsayilan: true }],
        birim_tanimlari: [{ birim_kodu: 'AD', katsayi: 1, cevrilecek_birim: 'AD', takip_birimi_mi: true }],
    });
    const ymDe = await createStok({
        stok_adi: 'YM Motor Ünitesi — Almanya Satınalma',
        stok_tipi: 'YariMamul',
        tedarik_tipi: 'Satinalma',
        birim: 'AD',
        stok_takip_birimi: 'AD',
        ulke_mensei: 'DE',
        temin_sekli: 'SATINALMA',
        satis_fiyati: 180,
        aktif: true,
        is_yeri_baglari: [{ is_yeri_id: isYeri.id, aktif: true }],
        barkodlar: [{ barkod: '869DE-MOTOR-01', birim_kodu: 'AD', varsayilan: true }],
        dil_tanimlari: [{ dil_kodu: 'DE', dil_adi: 'Deutsch', stok_adi: 'Motoreinheit — DE', varsayilan: true }],
        birim_tanimlari: [{ birim_kodu: 'AD', katsayi: 1, cevrilecek_birim: 'AD', takip_birimi_mi: true }],
    });
    const mamul = await createStok({
        stok_adi: 'Mamul — KTB Kompakt Sürücü',
        stok_tipi: 'Mamul',
        tedarik_tipi: 'Uretim',
        birim: 'AD',
        stok_takip_birimi: 'AD',
        ulke_mensei: 'TR',
        satis_fiyati: 1250,
        aktif: true,
        is_yeri_baglari: [{ is_yeri_id: isYeri.id, aktif: true }],
        barkodlar: [{ barkod: '869TR-KTB-SURUCU-01', birim_kodu: 'AD', varsayilan: true }],
        birim_tanimlari: [{ birim_kodu: 'AD', katsayi: 1, cevrilecek_birim: 'AD', takip_birimi_mi: true }],
    });
    logRec('HM Çin', hmCn, ['stok_kodu', 'stok_adi', 'ulke_mensei']);
    logRec('HM TR', hmTr, ['stok_kodu', 'stok_adi', 'ulke_mensei']);
    logRec('YM DE', ymDe, ['stok_kodu', 'stok_adi', 'ulke_mensei', 'tedarik_tipi']);
    logRec('Mamul', mamul, ['stok_kodu', 'stok_adi', 'tedarik_tipi']);

    // 4) Satınalma talepleri
    step(4, 'Satınalma talepleri');
    const talepHm = await api('/satin-alma-talepleri', {
        method: 'POST',
        body: JSON.stringify({
            is_yeri_id: isYeri.id,
            aciklama: 'CN+TR hammadde talebi — örnek döngü',
            satirlar: [
                { stok_id: hmCn.id, miktar: 20, birim: 'AD' },
                { stok_id: hmTr.id, miktar: 20, birim: 'AD' },
            ],
        }),
    });
    const talepYm = await api('/satin-alma-talepleri', {
        method: 'POST',
        body: JSON.stringify({
            is_yeri_id: isYeri.id,
            aciklama: 'DE yarı mamul satınalma talebi — örnek döngü',
            satirlar: [
                { stok_id: ymDe.id, miktar: 10, birim: 'AD' },
            ],
        }),
    });
    await api(`/satin-alma-talepleri/${talepHm.id}/onayla`, { method: 'POST', body: '{}' });
    await api(`/satin-alma-talepleri/${talepYm.id}/onayla`, { method: 'POST', body: '{}' });
    logRec('Talep HM', await api(`/satin-alma-talepleri/${talepHm.id}`), ['talep_no', 'durum']);
    logRec('Talep YM', await api(`/satin-alma-talepleri/${talepYm.id}`), ['talep_no', 'durum']);

    // 5) Satınalma siparişleri (tedarikçiye göre ayrık)
    step(5, 'Satınalma siparişleri + onay');
    const sasCn = await api('/satin-alma-siparisleri', {
        method: 'POST',
        body: JSON.stringify({
            cari_id: tedCn.id,
            is_yeri_id: isYeri.id,
            talep_id: talepHm.id,
            durum: 'Taslak',
            satirlar: [{ stok_id: hmCn.id, miktar: 20, birim: 'AD', birim_fiyat: 12 }],
        }),
    });
    const sasTr = await api('/satin-alma-siparisleri', {
        method: 'POST',
        body: JSON.stringify({
            cari_id: tedTr.id,
            is_yeri_id: isYeri.id,
            talep_id: talepHm.id,
            durum: 'Taslak',
            satirlar: [{ stok_id: hmTr.id, miktar: 20, birim: 'AD', birim_fiyat: 8 }],
        }),
    });
    const sasDe = await api('/satin-alma-siparisleri', {
        method: 'POST',
        body: JSON.stringify({
            cari_id: tedDe.id,
            is_yeri_id: isYeri.id,
            talep_id: talepYm.id,
            durum: 'Taslak',
            satirlar: [{ stok_id: ymDe.id, miktar: 10, birim: 'AD', birim_fiyat: 180 }],
        }),
    });
    await api(`/satin-alma-siparisleri/${sasCn.id}/onayla`, { method: 'POST', body: '{}' });
    await api(`/satin-alma-siparisleri/${sasTr.id}/onayla`, { method: 'POST', body: '{}' });
    await api(`/satin-alma-siparisleri/${sasDe.id}/onayla`, { method: 'POST', body: '{}' });
    logRec('SAS CN', await api(`/satin-alma-siparisleri/${sasCn.id}`), ['siparis_no', 'cari_adi', 'durum']);
    logRec('SAS TR', await api(`/satin-alma-siparisleri/${sasTr.id}`), ['siparis_no', 'cari_adi', 'durum']);
    logRec('SAS DE', await api(`/satin-alma-siparisleri/${sasDe.id}`), ['siparis_no', 'cari_adi', 'durum']);

    // 6) Mal kabul
    step(6, 'Mal kabuller (HM → Ana Depo, YM → YM Depo)');
    const mkCn = await api('/mal-kabuller', {
        method: 'POST',
        body: JSON.stringify({ siparis_id: sasCn.id, depo_id: anaDepo.id }),
    });
    const mkTr = await api('/mal-kabuller', {
        method: 'POST',
        body: JSON.stringify({ siparis_id: sasTr.id, depo_id: anaDepo.id }),
    });
    const mkDe = await api('/mal-kabuller', {
        method: 'POST',
        body: JSON.stringify({ siparis_id: sasDe.id, depo_id: ymDepo.id }),
    });
    logRec('Mal kabul CN', mkCn, ['kabul_no', 'depo_kodu']);
    logRec('Mal kabul TR', mkTr, ['kabul_no', 'depo_kodu']);
    logRec('Mal kabul DE', mkDe, ['kabul_no', 'depo_kodu']);

    const bakiyeler = await api('/stok-bakiyeleri');
    const ilgili = bakiyeler.filter((b) =>
        [hmCn.stok_kodu, hmTr.stok_kodu, ymDe.stok_kodu].includes(b.stok_kodu)
    );
    console.log('  ✓ Depo bakiyeleri:');
    for (const b of ilgili) {
        console.log(`      ${b.depo_kodu} | ${b.stok_kodu} | ${b.bakiye}`);
    }

    // 7) İş merkezi
    step(7, 'İş merkezi');
    let merkezler = await api('/is-merkezleri');
    let merkez = merkezler[0];
    if (!merkez) {
        const ayir = await api('/kod-serileri/IS_MERKEZI/ayir', { method: 'POST', body: '{}' });
        merkez = await api('/is-merkezleri', {
            method: 'POST',
            body: JSON.stringify({
                merkez_kodu: ayir.kod || ayir.yeni_kod || ayir,
                merkez_adi: 'Montaj Hattı 1',
                is_yeri_id: isYeri.id,
            }),
        });
    }
    logRec('İş merkezi', merkez, ['merkez_kodu', 'merkez_adi']);

    // 8) Ürün ağacı
    step(8, 'Ürün ağacı (Mamul = HM-CN + HM-TR + YM-DE)');
    const agacAyir = await api('/kod-serileri/URUN_AGACI/ayir', { method: 'POST', body: '{}' });
    const agac = await api('/urun-agaclari', {
        method: 'POST',
        body: JSON.stringify({
            mamul_stok_id: mamul.id,
            agac_kodu: agacAyir.kod || agacAyir.yeni_kod || agacAyir,
            agac_adi: 'KTB Kompakt Sürücü Ağacı',
            miktar: 1,
            satirlar: [
                { bilesen_stok_id: hmCn.id, miktar: 2, birim: 'AD', sira_no: 10 },
                { bilesen_stok_id: hmTr.id, miktar: 2, birim: 'AD', sira_no: 20 },
                { bilesen_stok_id: ymDe.id, miktar: 1, birim: 'AD', sira_no: 30 },
            ],
        }),
    });
    logRec('Ürün ağacı', agac, ['agac_kodu', 'agac_adi', 'stok_kodu']);
    console.log('  ✓ Satırlar:', agac.satirlar.map((s) => `${s.stok_kodu} x${s.miktar}`).join(', '));

    // 9) Rota
    step(9, 'Rota (tek operasyon: montaj → mamul)');
    const rotaAyir = await api('/kod-serileri/ROTA/ayir', { method: 'POST', body: '{}' });
    const rota = await api('/rotalar', {
        method: 'POST',
        body: JSON.stringify({
            stok_id: mamul.id,
            rota_kodu: rotaAyir.kod || rotaAyir.yeni_kod || rotaAyir,
            rota_adi: 'KTB Kompakt Montaj Rotası',
            operasyonlar: [{
                sira_no: 10,
                operasyon_kodu: 'OP10',
                operasyon_adi: 'Final Montaj',
                is_merkezi_id: merkez.id,
                sure_dk: 45,
                cikti_stok_id: mamul.id,
                sonraki_sira_no: null,
                bilesenler: [
                    { stok_id: hmCn.id, miktar: 2, birim: 'AD' },
                    { stok_id: hmTr.id, miktar: 2, birim: 'AD' },
                    { stok_id: ymDe.id, miktar: 1, birim: 'AD' },
                ],
            }],
        }),
    });
    logRec('Rota', rota, ['rota_kodu', 'rota_adi', 'stok_kodu']);
    console.log('  ✓ Operasyonlar:', rota.operasyonlar.map((o) => o.operasyon_kodu).join(', '));

    // 10) Üretim emri + giriş
    step(10, 'Üretim emri + üretim girişi');
    const emir = await api('/uretim-emirleri', {
        method: 'POST',
        body: JSON.stringify({
            stok_id: mamul.id,
            urun_agaci_id: agac.id,
            rota_id: rota.id,
            is_yeri_id: isYeri.id,
            hammadde_depo_id: anaDepo.id,
            yari_mamul_depo_id: ymDepo.id,
            mamul_depo_id: mmDepo.id,
            planlanan_miktar: 5,
        }),
    });
    logRec('Üretim emri', emir, ['emir_no', 'durum', 'planlanan_miktar']);

    // Operasyon tamamla (Hazir)
    const tamam = await api(`/uretim-emirleri/${emir.id}/operasyon-tamamla`, {
        method: 'POST',
        body: JSON.stringify({ miktar: 5 }),
    });
    const emirSon = tamam.emir || await api(`/uretim-emirleri/${emir.id}`);
    logRec('Emir sonrası', emirSon, ['emir_no', 'durum', 'uretilen_miktar']);

    const girisler = await api('/uretim-girisleri');
    const sonGiris = girisler.find((g) => g.emir_id === emir.id) || girisler[0];
    if (sonGiris) logRec('Üretim girişi', sonGiris, ['giris_no', 'emir_no', 'miktar']);

    const bak2 = await api('/stok-bakiyeleri');
    const mmBakiye = bak2.filter((b) => b.stok_kodu === mamul.stok_kodu);
    console.log('  ✓ Mamul bakiyesi:', mmBakiye.map((b) => `${b.depo_kodu}:${b.bakiye}`).join(', ') || 'yok');

    // 11) Satış siparişi sevkiyata hazır
    step(11, 'Satış siparişi (Onaylı = sevkiyata hazır)');
    const sip = await api('/siparisler', {
        method: 'POST',
        body: JSON.stringify({
            cari_id: musteri.id,
            siparis_turu: 'SatisSiparis',
            durum: 'Onayli',
            siparis_tarihi: new Date().toISOString().slice(0, 10),
            kalemler: [{
                stok_id: mamul.id,
                miktar: 5,
                birim_fiyat: mamul.satis_fiyati,
            }],
        }),
    });
    logRec('Satış siparişi', sip, ['siparis_no', 'cari_adi', 'durum', 'toplam_tutar']);
    console.log('  ✓ Kalemler:', (sip.kalemler || []).map((k) => `${k.stok_kodu} x${k.miktar}`).join(', '));

    // 12) Özet
    step(12, 'Döngü özeti');
    const ozet = {
        tedarikciler: {
            cn: tedCn.cari_kodu,
            tr: tedTr.cari_kodu,
            de: tedDe.cari_kodu,
        },
        musteri: musteri.cari_kodu,
        stoklar: {
            hm_cn: hmCn.stok_kodu,
            hm_tr: hmTr.stok_kodu,
            ym_de: ymDe.stok_kodu,
            mamul: mamul.stok_kodu,
        },
        satinalma: {
            talep_hm: talepHm.talep_no,
            talep_ym: talepYm.talep_no,
            sas_cn: sasCn.siparis_no,
            sas_tr: sasTr.siparis_no,
            sas_de: sasDe.siparis_no,
            mk_cn: mkCn.kabul_no,
            mk_tr: mkTr.kabul_no,
            mk_de: mkDe.kabul_no,
        },
        uretim: {
            agac: agac.agac_kodu,
            rota: rota.rota_kodu,
            emir: emir.emir_no,
            giris: sonGiris?.giris_no || null,
        },
        satis: {
            siparis: sip.siparis_no,
            durum: sip.durum,
            tutar: sip.toplam_tutar,
        },
    };
    console.log(JSON.stringify(ozet, null, 2));
    console.log('\nDöngü tamam: satınalma → stok → üretim → satış siparişi Onaylı (sevkiyata hazır).');
    return ozet;
}

main().catch((err) => {
    console.error('\nDÖNGÜ HATASI:', err.message);
    process.exit(1);
});
