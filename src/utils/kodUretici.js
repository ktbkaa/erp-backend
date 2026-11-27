/**
 * Ana veri / belge kod üretici.
 * Format: 1 harf + 5 rakam  →  M00001, H00001, T00001
 */
async function sonrakiKod(client, seriKodu) {
    const result = await client.query(
        `
        SELECT series_code, onek, son_numara
        FROM number_series
        WHERE series_code = $1
        FOR UPDATE
        `,
        [seriKodu]
    );

    if (result.rows.length === 0) {
        throw new Error(`Kod serisi tanımlı değil: ${seriKodu}`);
    }

    const { onek, son_numara } = result.rows[0];
    const yeniNo = Number(son_numara) + 1;

    await client.query(
        `UPDATE number_series SET son_numara = $1 WHERE series_code = $2`,
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
            throw new Error('partner_type Musteri, Tedarikci veya HerIkisi olmalı.');
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
