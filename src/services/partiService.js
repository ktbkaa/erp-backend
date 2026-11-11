const { nextSequenceCode } = require('../utils/kodUretici');

async function itemLotPolicy(client, stokId) {
    const r = await client.query(
        `SELECT id, item_code, lot_policy, quality_control_required, default_receipt_warehouse_id, default_issue_warehouse_id, safety_stock
         FROM items WHERE id=$1`,
        [stokId]
    );
    if (!r.rows[0]) throw new Error(`Stok bulunamadı: ${stokId}`);
    return r.rows[0];
}

/**
 * Giriş satırı için parti çözümle: mevcut seç veya otomatik oluştur.
 */
async function resolveLot(client, {
    stokId,
    partiId = null,
    partiNo = null,
    otomatik = true,
    kaynakTipi = null,
    kaynakId = null,
}) {
    const stok = await itemLotPolicy(client, stokId);
    const politika = stok.lot_policy || 'Takipsiz';

    if (politika === 'Takipsiz') {
        return { partiId: null, stok };
    }

    if (partiId) {
        const p = await client.query(
            `SELECT * FROM item_lots WHERE id=$1 AND item_id=$2`,
            [partiId, stokId]
        );
        if (!p.rows[0]) throw new Error(`Parti stok ile uyuşmuyor: lot_id=${partiId}`);
        return { partiId: p.rows[0].id, stok, parti: p.rows[0] };
    }

    if (partiNo) {
        const mevcut = await client.query(
            `SELECT * FROM item_lots WHERE item_id=$1 AND lot_no=$2`,
            [stokId, partiNo]
        );
        if (mevcut.rows[0]) return { partiId: mevcut.rows[0].id, stok, parti: mevcut.rows[0] };
        const ins = await client.query(
            `
            INSERT INTO item_lots (item_id, lot_no, source_type, source_id)
            VALUES ($1,$2,$3,$4) RETURNING *
            `,
            [stokId, partiNo, kaynakTipi, kaynakId]
        );
        return { partiId: ins.rows[0].id, stok, parti: ins.rows[0] };
    }

    if (politika === 'Zorunlu' || (politika === 'IstegeBagli' && otomatik)) {
        const kod = await nextSequenceCode(client, 'PARTI');
        const ins = await client.query(
            `
            INSERT INTO item_lots (item_id, lot_no, source_type, source_id)
            VALUES ($1,$2,$3,$4) RETURNING *
            `,
            [stokId, kod, kaynakTipi, kaynakId]
        );
        return { partiId: ins.rows[0].id, stok, parti: ins.rows[0] };
    }

    if (politika === 'Zorunlu') {
        throw new Error(`Parti zorunlu: item_id=${stokId} (${stok.item_code})`);
    }
    return { partiId: null, stok };
}

module.exports = {
    itemLotPolicy,
    resolveLot,
};
