/**
 * Canias-benzeri belge omurgası yardımcıları.
 * DOCTYPE sabitleri + REFDOC alanları + hareket kodu çözümü.
 */

const BELGE_TIPI = Object.freeze({
    SATIS_TEKLIF: 'SATIS_TEKLIF',
    SATIS_SIPARIS: 'SATIS_SIPARIS',
    SEVK_EMRI: 'SEVK_EMRI',
    IRSALIYE: 'IRSALIYE',
    SATIS_FATURA: 'SATIS_FATURA',
    MAL_KABUL: 'MAL_KABUL',
    ALIS_FATURA: 'ALIS_FATURA',
    URETIM_EMRI: 'URETIM_EMRI',
    URETIM_GIRIS: 'URETIM_GIRIS',
    STOK_HAREKET: 'STOK_HAREKET',
    TRANSFER: 'TRANSFER',
    SAYIM: 'SAYIM',
});

/** hareket_kodlari.belge_tipi eşlemesi */
const HAREKET_BELGE_TIPI = Object.freeze({
    [BELGE_TIPI.SATIS_TEKLIF]: 'SatisTeklif',
    [BELGE_TIPI.SATIS_SIPARIS]: 'SatisSiparis',
    [BELGE_TIPI.SEVK_EMRI]: 'SevkEmri',
    [BELGE_TIPI.IRSALIYE]: 'SatisIrsaliye',
    [BELGE_TIPI.SATIS_FATURA]: 'SatisFatura',
    [BELGE_TIPI.MAL_KABUL]: 'MalKabul',
    [BELGE_TIPI.ALIS_FATURA]: 'AlisFatura',
    [BELGE_TIPI.URETIM_EMRI]: 'UretimEmri',
    [BELGE_TIPI.URETIM_GIRIS]: 'UretimGiris',
    [BELGE_TIPI.TRANSFER]: 'Transfer',
    [BELGE_TIPI.SAYIM]: 'Sayim',
    [BELGE_TIPI.STOK_HAREKET]: 'StokGiris',
    STOK_GIRIS: 'StokGiris',
    STOK_CIKIS: 'StokCikis',
});

async function hareketKoduBul(client, belgeTipiKod, verilenId = null) {
    if (verilenId) {
        const r = await client.query(
            `SELECT * FROM hareket_kodlari WHERE id=$1 AND aktif`,
            [verilenId]
        );
        if (r.rows[0]) return r.rows[0];
    }
    const hkBelge = HAREKET_BELGE_TIPI[belgeTipiKod] || belgeTipiKod;
    const r = await client.query(
        `SELECT * FROM hareket_kodlari
         WHERE belge_tipi=$1 AND aktif
         ORDER BY id LIMIT 1`,
        [hkBelge]
    );
    return r.rows[0] || null;
}

function kaynakBelgeAlanlari(tip, id) {
    if (!tip || id == null) return { kaynak_belge_tipi: null, kaynak_belge_id: null };
    return { kaynak_belge_tipi: tip, kaynak_belge_id: Number(id) };
}

function kalanMiktar(satir) {
    const miktar = Number(satir.miktar || 0);
    const sevk = Number(satir.sevk_edilen_miktar || 0);
    return Math.max(0, miktar - sevk);
}

async function stokNegatifIzinliMi(client) {
    const r = await client.query(
        `SELECT deger FROM sistem_parametreleri
         WHERE parametre_kodu='STOK_NEGATIF' AND aktif IS DISTINCT FROM FALSE
         LIMIT 1`
    );
    const v = String(r.rows[0]?.deger || 'Hayir').trim().toLowerCase();
    return ['evet', 'true', '1', 'yes', 'e'].includes(v);
}

/**
 * Depoda yetersiz stok varsa önerilen depoları döndür.
 */
async function onerilenDepolar(client, stokId, gerekenMiktar, haricDepoId = null) {
    const params = [stokId, gerekenMiktar];
    let haric = '';
    if (haricDepoId) {
        params.push(haricDepoId);
        haric = `AND h.depo_id <> $${params.length}`;
    }
    const r = await client.query(
        `
        SELECT h.depo_id, d.depo_kodu, d.depo_adi,
               COALESCE(SUM(s.miktar * s.yon), 0)::numeric AS bakiye
        FROM stok_hareket_satirlari s
        JOIN stok_hareketleri h ON h.id = s.hareket_id
        JOIN depolar d ON d.id = h.depo_id
        WHERE s.stok_id = $1 ${haric}
        GROUP BY h.depo_id, d.depo_kodu, d.depo_adi
        HAVING COALESCE(SUM(s.miktar * s.yon), 0) >= $2
        ORDER BY bakiye DESC
        LIMIT 5
        `,
        params
    );
    return r.rows;
}

module.exports = {
    BELGE_TIPI,
    HAREKET_BELGE_TIPI,
    hareketKoduBul,
    kaynakBelgeAlanlari,
    kalanMiktar,
    stokNegatifIzinliMi,
    onerilenDepolar,
};
