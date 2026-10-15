/** Satır tutarları: miktar × birim_fiyat − iskonto + KDV */
function satirHesapla({ miktar, birim_fiyat, iskonto_oran = 0, kdv_oran = 20 }) {
    const m = Number(miktar) || 0;
    const f = Number(birim_fiyat) || 0;
    const iskOran = Number(iskonto_oran) || 0;
    const kdvOran = Number(kdv_oran) || 0;
    const brut = m * f;
    const iskonto_tutari = Math.round(brut * (iskOran / 100) * 100) / 100;
    const mal_hizmet_tutari = Math.round((brut - iskonto_tutari) * 100) / 100;
    const kdv_tutari = Math.round(mal_hizmet_tutari * (kdvOran / 100) * 100) / 100;
    return {
        iskonto_oran: iskOran,
        iskonto_tutari,
        kdv_oran: kdvOran,
        kdv_tutari,
        mal_hizmet_tutari,
        satir_toplam: mal_hizmet_tutari + kdv_tutari,
    };
}

function belgelerToplam(satirlar) {
    let mal = 0;
    let isk = 0;
    let kdv = 0;
    let odenecek = 0;
    for (const s of satirlar) {
        mal += Number(s.mal_hizmet_tutari) || 0;
        isk += Number(s.iskonto_tutari) || 0;
        kdv += Number(s.kdv_tutari) || 0;
        odenecek += Number(s.satir_toplam ?? (Number(s.mal_hizmet_tutari) + Number(s.kdv_tutari))) || 0;
    }
    return {
        mal_hizmet_toplam: Math.round(mal * 100) / 100,
        toplam_iskonto: Math.round(isk * 100) / 100,
        toplam_kdv: Math.round(kdv * 100) / 100,
        odenecek_tutar: Math.round(odenecek * 100) / 100,
        toplam_tutar: Math.round(odenecek * 100) / 100,
    };
}

module.exports = { satirHesapla, belgelerToplam };
