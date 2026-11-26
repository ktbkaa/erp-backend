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

const MANUEL_PARTI_KAYNAK = 'Manuel giriş';

function fmtQty(n) {
    const v = Math.round(Number(n) * 1e6) / 1e6;
    return String(v);
}

function formatLotSource(parts) {
    const list = (parts || []).filter((p) => p && Number(p.quantity) > 0);
    if (!list.length) return null;
    const name = (p) => p.lot_no || (p.lot_id ? `Parti#${p.lot_id}` : 'Partisiz');
    if (list.length === 1) return name(list[0]);
    return list.map((p) => `${name(p)} (${fmtQty(p.quantity)})`).join(' + ');
}

/**
 * Tüketim (çıkış) için parti dağılımı — veritabanına yazmaz.
 *  - lotId / lotNo verilmişse: yalnız o parti, kaynak "Manuel giriş"
 *  - verilmemişse: depodaki kullanılabilir partilerden FIFO (son kullanma, üretim tarihi, id)
 *    miktar kadar otomatik düşülür; kaynak = düşülen parti no(lar)ı
 * reserved: aynı işlemde önceki satırların ayırdığı miktarlar (depo:stok:parti → qty)
 */
async function allocateConsumptionLots(client, {
    depoId,
    itemId,
    quantity,
    lotId = null,
    lotNo = null,
    stokStatu = 'Kullanilabilir',
    reserved = null,
}) {
    const qty = Number(quantity) || 0;
    const stok = await itemLotPolicy(client, itemId);
    const politika = stok.lot_policy || 'Takipsiz';
    if (politika === 'Takipsiz' || !(qty > 0)) {
        return { lines: [{ lot_id: null, lot_no: null, quantity: qty }], source: null, manual: false, tracked: false };
    }

    const manuelNo = lotNo != null ? String(lotNo).trim() : '';
    if (lotId || manuelNo) {
        let row = null;
        if (lotId) {
            const r = await client.query(`SELECT id, lot_no FROM item_lots WHERE id=$1 AND item_id=$2`, [lotId, itemId]);
            row = r.rows[0] || null;
        } else {
            const r = await client.query(
                `SELECT id, lot_no FROM item_lots WHERE item_id=$1 AND lot_no=$2`,
                [itemId, manuelNo],
            );
            row = r.rows[0] || null;
        }
        if (!row) {
            const err = new Error(`Parti bulunamadı: ${manuelNo || lotId} (${stok.item_code})`);
            err.status = 400;
            err.code = 'PARTI_BULUNAMADI';
            throw err;
        }
        return {
            lines: [{ lot_id: row.id, lot_no: row.lot_no, quantity: qty }],
            source: MANUEL_PARTI_KAYNAK,
            manual: true,
            tracked: true,
        };
    }

    const bal = await client.query(
        `
        SELECT s.lot_id, l.lot_no, SUM(s.quantity * s.direction)::numeric AS bakiye
        FROM stock_movement_lines s
        JOIN stock_movements h ON h.id = s.movement_id
        LEFT JOIN item_lots l ON l.id = s.lot_id
        WHERE h.warehouse_id = $1 AND s.item_id = $2
          AND COALESCE(s.stock_status, 'Kullanilabilir') = $3
        GROUP BY s.lot_id, l.lot_no, l.expiry_date, l.production_date
        HAVING SUM(s.quantity * s.direction) > 0.000001
        ORDER BY (s.lot_id IS NULL), l.expiry_date NULLS LAST, l.production_date NULLS LAST, s.lot_id
        `,
        [depoId, itemId, stokStatu],
    );

    const lines = [];
    let kalan = qty;
    for (const b of bal.rows) {
        if (kalan <= 1e-9) break;
        const key = `${depoId}:${itemId}:${b.lot_id || 0}`;
        const kullanilan = reserved ? Number(reserved.get(key) || 0) : 0;
        const musait = Number(b.bakiye) - kullanilan;
        if (musait <= 1e-9) continue;
        const al = Math.min(musait, kalan);
        lines.push({ lot_id: b.lot_id || null, lot_no: b.lot_no || null, quantity: al });
        if (reserved) reserved.set(key, kullanilan + al);
        kalan -= al;
    }
    if (kalan > 1e-9) {
        // Yetersiz bakiye: kalan lotsuz satıra gider; stok servisi net hata mesajını üretir
        lines.push({ lot_id: null, lot_no: null, quantity: kalan });
    }
    return { lines, source: formatLotSource(lines), manual: false, tracked: true };
}

module.exports = {
    itemLotPolicy,
    resolveLot,
    allocateConsumptionLots,
    formatLotSource,
    MANUEL_PARTI_KAYNAK,
};
