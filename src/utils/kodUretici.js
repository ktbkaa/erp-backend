/**
 * Ana veri / belge kod üretici.
 * Format: 1 harf + 5 rakam  →  M00001, H00001, T00001
 */
async function nextSequenceCode(client, seriKodu) {
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

/**
 * Önek + pad numaralı belge no (ör. STC-01-00001).
 * Seri yoksa oluşturur; onek UNIQUE çakışmalarında alternatif dener.
 */
async function nextPrefixedCode(client, {
    seriesCode,
    prefix,
    pad = 5,
    separator = '-',
    description = null,
    screenCode = null,
    screenName = null,
} = {}) {
    const seri = String(seriesCode || '').trim();
    const pref = String(prefix || '').trim().toUpperCase();
    if (!seri) throw new Error('Seri kodu zorunlu.');
    if (!pref) throw new Error('Belge no öneki zorunlu.');

    const existing = await client.query(
        `SELECT series_code, son_numara FROM number_series WHERE series_code = $1 FOR UPDATE`,
        [seri]
    );
    if (!existing.rows[0]) {
        let onek = pref.replace(/[^A-Z0-9]/gi, '').slice(0, 10) || 'HX';
        let n = 0;
        while (n < 50) {
            const clash = await client.query(`SELECT 1 FROM number_series WHERE onek = $1`, [onek]);
            if (!clash.rows[0]) break;
            n += 1;
            onek = `H${n}${onek}`.replace(/[^A-Z0-9]/gi, '').slice(0, 10);
        }
        await client.query(
            `
            INSERT INTO number_series (
                series_code, onek, description, son_numara, screen_code, screen_name, is_active
            ) VALUES ($1,$2,$3,0,$4,$5,TRUE)
            ON CONFLICT (series_code) DO NOTHING
            `,
            [
                seri,
                onek,
                description || `Belge no: ${pref}`,
                screenCode,
                screenName,
            ]
        );
    }
    const locked = await client.query(
        `SELECT series_code, son_numara FROM number_series WHERE series_code = $1 FOR UPDATE`,
        [seri]
    );
    if (!locked.rows[0]) throw new Error(`Kod serisi oluşturulamadı: ${seri}`);
    const yeniNo = Number(locked.rows[0].son_numara) + 1;
    await client.query(
        `UPDATE number_series SET son_numara = $1 WHERE series_code = $2`,
        [yeniNo, seri]
    );
    return `${pref}${separator}${String(yeniNo).padStart(pad, '0')}`;
}

/** Stok hareket no ayır: STC-01-00001 (sayacı artırır). */
async function nextStockMovementNo(client, movementCode) {
    const code = String(movementCode || '').trim().toUpperCase();
    if (!code) throw new Error('Hareket kodu zorunlu.');
    return nextPrefixedCode(client, {
        seriesCode: `STOK_HAREKET__${code}`,
        prefix: code,
        pad: 5,
        separator: '-',
        description: `Stok hareket ${code}`,
        screenCode: 'stok-hareketleri',
        screenName: 'Stok Hareketleri',
    });
}

/**
 * Önizleme: sayacı artırmadan bir sonraki no’yu gösterir (STC-01-00001).
 * Seri yoksa oluşturur (son_numara=0) ama ayırmaz.
 */
async function peekStockMovementNo(client, movementCode) {
    const code = String(movementCode || '').trim().toUpperCase();
    if (!code) throw new Error('Hareket kodu zorunlu.');
    const seriesCode = `STOK_HAREKET__${code}`;
    const pad = 5;
    const separator = '-';
    let row = (await client.query(
        `SELECT series_code, son_numara FROM number_series WHERE series_code = $1`,
        [seriesCode]
    )).rows[0];
    if (!row) {
        let onek = code.replace(/[^A-Z0-9]/gi, '').slice(0, 10) || 'HX';
        let n = 0;
        while (n < 50) {
            const clash = await client.query(`SELECT 1 FROM number_series WHERE onek = $1`, [onek]);
            if (!clash.rows[0]) break;
            n += 1;
            onek = `H${n}${onek}`.replace(/[^A-Z0-9]/gi, '').slice(0, 10);
        }
        await client.query(
            `
            INSERT INTO number_series (
                series_code, onek, description, son_numara, screen_code, screen_name, is_active
            ) VALUES ($1,$2,$3,0,$4,$5,TRUE)
            ON CONFLICT (series_code) DO NOTHING
            `,
            [seriesCode, onek, `Stok hareket ${code}`, 'stok-hareketleri', 'Stok Hareketleri']
        );
        row = (await client.query(
            `SELECT series_code, son_numara FROM number_series WHERE series_code = $1`,
            [seriesCode]
        )).rows[0];
    }
    if (!row) throw new Error(`Kod serisi oluşturulamadı: ${seriesCode}`);
    const next = Number(row.son_numara) + 1;
    return `${code}${separator}${String(next).padStart(pad, '0')}`;
}

function itemTypeFromSeriesCode(stokTipi) {
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

function partnerTypeFromSeriesCode(cariTuru) {
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

function isPartnerSupplier(cariTuru) {
    return cariTuru === 'Tedarikci' || cariTuru === 'HerIkisi';
}

function isPartnerCustomer(cariTuru) {
    return cariTuru === 'Musteri' || cariTuru === 'HerIkisi';
}

module.exports = {
    nextSequenceCode,
    nextPrefixedCode,
    nextStockMovementNo,
    peekStockMovementNo,
    itemTypeFromSeriesCode,
    partnerTypeFromSeriesCode,
    isPartnerSupplier,
    isPartnerCustomer,
};
