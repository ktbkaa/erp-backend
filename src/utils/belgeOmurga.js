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

/** movement_codes.document_type eşlemesi */
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
            `SELECT * FROM movement_codes WHERE id=$1 AND is_active`,
            [verilenId]
        );
        if (r.rows[0]) return r.rows[0];
    }
    const hkBelge = HAREKET_BELGE_TIPI[belgeTipiKod] || belgeTipiKod;
    const r = await client.query(
        `SELECT * FROM movement_codes
         WHERE document_type=$1 AND is_active
         ORDER BY id LIMIT 1`,
        [hkBelge]
    );
    return r.rows[0] || null;
}

function kaynakBelgeAlanlari(type, id) {
    if (!type || id == null) return { source_document_type: null, source_document_id: null };
    return { source_document_type: type, source_document_id: Number(id) };
}

function kalanMiktar(satir) {
    const quantity = Number(satir.quantity || 0);
    const sevk = Number(satir.shipped_quantity || 0);
    return Math.max(0, quantity - sevk);
}

async function stokNegatifIzinliMi(client) {
    const r = await client.query(
        `SELECT value FROM system_parameters
         WHERE parametre_code='STOK_NEGATIF' AND is_active IS DISTINCT FROM FALSE
         LIMIT 1`
    );
    const v = String(r.rows[0]?.value || 'Hayir').trim().toLowerCase();
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
        haric = `AND h.warehouse_id <> $${params.length}`;
    }
    const r = await client.query(
        `
        SELECT h.warehouse_id, d.warehouse_code, d.warehouse_name,
               COALESCE(SUM(s.quantity * s.direction), 0)::numeric AS bakiye
        FROM stock_movement_lines s
        JOIN stock_movements h ON h.id = s.movement_id
        JOIN warehouses d ON d.id = h.warehouse_id
        WHERE s.item_id = $1 ${haric}
        GROUP BY h.warehouse_id, d.warehouse_code, d.warehouse_name
        HAVING COALESCE(SUM(s.quantity * s.direction), 0) >= $2
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
