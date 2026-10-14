/**
 * Ana veri / belge kod üretici.
 * Format: 1 harf + 5 rakam  →  M00001, H00001, T00001
 */
async function sonrakiKod(client, seriKodu) {
    const sonuc = await client.query(
        `
        SELECT seri_kodu, onek, son_numara
        FROM kod_serileri
        WHERE seri_kodu = $1
        FOR UPDATE
        `,
        [seriKodu]
    );

    if (sonuc.rows.length === 0) {
        throw new Error(`Kod serisi tanımlı değil: ${seriKodu}`);
    }

    const { onek, son_numara } = sonuc.rows[0];
    const yeniNo = Number(son_numara) + 1;

    await client.query(
        `UPDATE kod_serileri SET son_numara = $1 WHERE seri_kodu = $2`,
        [yeniNo, seriKodu]
    );

    return `${onek}${String(yeniNo).padStart(5, '0')}`;
}

function stokSeriKodundanTip(stokTipi) {
    switch (stokTipi) {
        case 'Hammadde':
            return 'HAMMADDE';
        case 'YariMamul':
            return 'YARIMAMUL';
        case 'Mamul':
            return 'MAMUL';
        case 'Ticari':
            return 'TICARI';
        case 'Hizmet':
            return 'TICARI';
        default:
            return 'TICARI';
    }
}

function cariSeriKodundanTur(cariTuru) {
    switch (cariTuru) {
        case 'Musteri':
            return 'MUSTERI';
        case 'Tedarikci':
            return 'TEDARIKCI';
        case 'HerIkisi':
            return 'CARI_HERIKISI';
        default:
            throw new Error('cari_turu Musteri, Tedarikci veya HerIkisi olmalı.');
    }
}

function cariTedarikciMi(cariTuru) {
    return cariTuru === 'Tedarikci' || cariTuru === 'HerIkisi';
}

function cariMusteriMi(cariTuru) {
    return cariTuru === 'Musteri' || cariTuru === 'HerIkisi';
}

module.exports = {
    sonrakiKod,
    stokSeriKodundanTip,
    cariSeriKodundanTur,
    cariTedarikciMi,
    cariMusteriMi,
};
