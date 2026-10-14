const { sonrakiBelgeNo } = require('../utils/belgeNo');

/**
 * Merkezi stok hareket oluşturucu.
 * miktar her zaman pozitif; yön +1 giriş / -1 çıkış.
 */
async function stokHareketOlustur(client, {
    hareketTipi,
    isYeriId = null,
    depoId,
    belgeTipi = null,
    belgeId = null,
    aciklama = null,
    satirlar,
}) {
    if (!depoId) throw new Error('Stok hareketi için depo_id zorunludur.');
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
        throw new Error('Stok hareketi için en az bir satır gerekli.');
    }

    const hareketNo = await sonrakiBelgeNo(client, 'STOK_HAREKET');

    const hareketRes = await client.query(
        `
        INSERT INTO stok_hareketleri
            (hareket_no, hareket_tipi, is_yeri_id, depo_id, belge_tipi, belge_id, aciklama)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
        `,
        [hareketNo, hareketTipi, isYeriId, depoId, belgeTipi, belgeId, aciklama]
    );
    const hareket = hareketRes.rows[0];

    const eklenen = [];
    for (const s of satirlar) {
        if (!s.stok_id || !s.miktar || !s.yon) {
            throw new Error('Hareket satırında stok_id, miktar ve yon zorunludur.');
        }
        if (Number(s.miktar) <= 0) throw new Error('Hareket miktarı 0 dan büyük olmalı.');
        if (![1, -1].includes(Number(s.yon))) throw new Error('yon sadece 1 veya -1 olabilir.');

        // Çıkışta yeterli bakiye var mı?
        if (Number(s.yon) === -1) {
            const bakiye = await depoStokBakiye(client, depoId, s.stok_id);
            if (bakiye + 1e-9 < Number(s.miktar)) {
                throw new Error(
                    `Yetersiz stok. Depo=${depoId}, stok_id=${s.stok_id}, bakiye=${bakiye}, istenen=${s.miktar}`
                );
            }
        }

        const satirRes = await client.query(
            `
            INSERT INTO stok_hareket_satirlari
                (hareket_id, stok_id, miktar, yon, birim)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
            `,
            [hareket.id, s.stok_id, s.miktar, s.yon, s.birim || null]
        );
        eklenen.push(satirRes.rows[0]);
    }

    return { hareket, satirlar: eklenen };
}

async function depoStokBakiye(clientOrPool, depoId, stokId) {
    const res = await clientOrPool.query(
        `
        SELECT COALESCE(SUM(s.miktar * s.yon), 0)::numeric AS bakiye
        FROM stok_hareket_satirlari s
        JOIN stok_hareketleri h ON h.id = s.hareket_id
        WHERE h.depo_id = $1 AND s.stok_id = $2
        `,
        [depoId, stokId]
    );
    return Number(res.rows[0].bakiye);
}

async function depoBakiyeListesi(pool, depoId = null) {
    const params = [];
    let where = '';
    if (depoId) {
        params.push(depoId);
        where = `WHERE h.depo_id = $1`;
    }

    const res = await pool.query(
        `
        SELECT
            h.depo_id,
            d.depo_kodu,
            d.depo_adi,
            s.stok_id,
            st.stok_kodu,
            st.stok_adi,
            st.stok_tipi,
            COALESCE(SUM(s.miktar * s.yon), 0)::numeric AS bakiye
        FROM stok_hareket_satirlari s
        JOIN stok_hareketleri h ON h.id = s.hareket_id
        JOIN depolar d ON d.id = h.depo_id
        JOIN stoklar st ON st.id = s.stok_id
        ${where}
        GROUP BY h.depo_id, d.depo_kodu, d.depo_adi, s.stok_id, st.stok_kodu, st.stok_adi, st.stok_tipi
        HAVING COALESCE(SUM(s.miktar * s.yon), 0) <> 0
        ORDER BY d.depo_kodu, st.stok_kodu
        `,
        params
    );
    return res.rows;
}

module.exports = {
    stokHareketOlustur,
    depoStokBakiye,
    depoBakiyeListesi,
};
