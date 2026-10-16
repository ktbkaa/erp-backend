const { sonrakiKod } = require('../utils/kodUretici');

async function stokPartiPolitika(client, stokId) {
    const r = await client.query(
        `SELECT id, stok_kodu, parti_politika, kalite_kontrol_gerekli, varsayilan_giris_depo_id, varsayilan_cikis_depo_id, emniyet_stok
         FROM stoklar WHERE id=$1`,
        [stokId]
    );
    if (!r.rows[0]) throw new Error(`Stok bulunamadı: ${stokId}`);
    return r.rows[0];
}

/**
 * Giriş satırı için parti çözümle: mevcut seç veya otomatik oluştur.
 */
async function partiCozumle(client, {
    stokId,
    partiId = null,
    partiNo = null,
    otomatik = true,
    kaynakTipi = null,
    kaynakId = null,
}) {
    const stok = await stokPartiPolitika(client, stokId);
    const politika = stok.parti_politika || 'Takipsiz';

    if (politika === 'Takipsiz') {
        return { partiId: null, stok };
    }

    if (partiId) {
        const p = await client.query(
            `SELECT * FROM stok_partileri WHERE id=$1 AND stok_id=$2`,
            [partiId, stokId]
        );
        if (!p.rows[0]) throw new Error(`Parti stok ile uyuşmuyor: parti_id=${partiId}`);
        return { partiId: p.rows[0].id, stok, parti: p.rows[0] };
    }

    if (partiNo) {
        const mevcut = await client.query(
            `SELECT * FROM stok_partileri WHERE stok_id=$1 AND parti_no=$2`,
            [stokId, partiNo]
        );
        if (mevcut.rows[0]) return { partiId: mevcut.rows[0].id, stok, parti: mevcut.rows[0] };
        const ins = await client.query(
            `
            INSERT INTO stok_partileri (stok_id, parti_no, kaynak_tipi, kaynak_id)
            VALUES ($1,$2,$3,$4) RETURNING *
            `,
            [stokId, partiNo, kaynakTipi, kaynakId]
        );
        return { partiId: ins.rows[0].id, stok, parti: ins.rows[0] };
    }

    if (politika === 'Zorunlu' || (politika === 'IstegeBagli' && otomatik)) {
        const kod = await sonrakiKod(client, 'PARTI');
        const ins = await client.query(
            `
            INSERT INTO stok_partileri (stok_id, parti_no, kaynak_tipi, kaynak_id)
            VALUES ($1,$2,$3,$4) RETURNING *
            `,
            [stokId, kod, kaynakTipi, kaynakId]
        );
        return { partiId: ins.rows[0].id, stok, parti: ins.rows[0] };
    }

    if (politika === 'Zorunlu') {
        throw new Error(`Parti zorunlu: stok_id=${stokId} (${stok.stok_kodu})`);
    }
    return { partiId: null, stok };
}

module.exports = {
    stokPartiPolitika,
    partiCozumle,
};
