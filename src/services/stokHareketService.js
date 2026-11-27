const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { stokNegatifIzinliMi, onerilenDepolar } = require('../utils/belgeOmurga');
const { parametreAl } = require('../utils/yetki');
const { partiCozumle } = require('./partiService');

const STATULER = ['Kullanilabilir', 'Kalitede', 'Bloke'];

/**
 * Merkezi stok hareket oluşturucu.
 * quantity pozitif; direction +1 giriş / -1 çıkış.
 * stock_status: Kullanilabilir | Kalitede | Bloke (çıkışta yalnızca Kullanilabilir)
 * lot_id / lot_no / otomatikParti desteklenir.
 */
async function stokHareketOlustur(client, {
    hareketTipi,
    isYeriId = null,
    depoId,
    hedefDepoId = null,
    belgeTipi = null,
    belgeId = null,
    description = null,
    hareketKoduId = null,
    satirlar,
    bagliHareketId = null,
    depoZorunluAtla = false,
    firmaId = null,
    cariId = null,
    kullaniciKodu = null,
    referansNo = null,
}) {
    if (!depoId) throw new Error('Stok hareketi için warehouse_id zorunludur.');
    if (!Array.isArray(satirlar) || satirlar.length === 0) {
        throw new Error('Stok hareketi için en az bir satır gerekli.');
    }

    let hareketKodu = null;
    if (hareketKoduId) {
        const hk = await client.query(`SELECT * FROM movement_codes WHERE id=$1`, [hareketKoduId]);
        hareketKodu = hk.rows[0] || null;
        if (!hareketKodu) throw new Error(`Hareket kodu bulunamadı: id=${hareketKoduId}`);
    }

    const paramNegatif = await stokNegatifIzinliMi(client);
    const eksiIzin = Boolean(hareketKodu?.eksi_balance_izin) || paramNegatif;
    const depoZorunlu = !depoZorunluAtla
        && String(await parametreAl(client, 'STOK_DEPO_ZORUNLU', 'Evet')).toLowerCase() === 'evet';

    const hareketNo = await sonrakiBelgeNo(client, 'STOK_HAREKET');

    const cols = ['movement_no', 'movement_type', 'plant_id', 'warehouse_id', 'document_type', 'document_id', 'description', 'movement_code_id'];
    const vals = [hareketNo, hareketTipi, isYeriId, depoId, belgeTipi, belgeId, description, hareketKoduId || null];
    // target_warehouse_id / bagli_movement_id 015'te
    // company_id: açık parametre veya stok satırından türet
    let resolvedFirmaId = firmaId || null;
    if (!resolvedFirmaId && satirlar[0]?.item_id) {
        const fr = await client.query(`SELECT company_id FROM items WHERE id=$1`, [satirlar[0].item_id]);
        resolvedFirmaId = fr.rows[0]?.company_id || null;
    }

    const hareketRes = await client.query(
        `
        INSERT INTO stock_movements
            (movement_no, movement_type, plant_id, warehouse_id, document_type, document_id, description, movement_code_id,
             target_warehouse_id, bagli_movement_id, company_id, partner_id, user_code, ref_no)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *;
        `,
        [
            ...vals, hedefDepoId || null, bagliHareketId || null,
            resolvedFirmaId, cariId || null, kullaniciKodu || null, referansNo || null,
        ]
    );
    const hareket = hareketRes.rows[0];

    const eklenen = [];
    for (const s of satirlar) {
        if (!s.item_id || !s.quantity || !s.direction) {
            throw new Error('Hareket satırında item_id, quantity ve direction zorunludur.');
        }
        if (Number(s.quantity) <= 0) throw new Error('Hareket miktarı 0 dan büyük olmalı.');
        if (![1, -1].includes(Number(s.direction))) throw new Error('direction sadece 1 veya -1 olabilir.');

        const statu = s.stock_status || (Number(s.direction) === 1 ? 'Kullanilabilir' : 'Kullanilabilir');
        if (!STATULER.includes(statu)) {
            throw new Error(`Geçersiz stock_status: ${statu}`);
        }

        if (depoZorunlu) {
            await assertStokDepoIzin(client, s.item_id, depoId);
            if (hedefDepoId) await assertStokDepoIzin(client, s.item_id, hedefDepoId);
        }

        let partiId = s.lot_id || null;
        if (Number(s.direction) === 1) {
            const coz = await partiCozumle(client, {
                stokId: s.item_id,
                partiId: s.lot_id,
                partiNo: s.lot_no,
                otomatik: s.otomatik_parti !== false,
                kaynakTipi: belgeTipi,
                kaynakId: belgeId,
            });
            partiId = coz.partiId;
        } else if (partiId) {
            const p = await client.query(
                `SELECT id FROM item_lots WHERE id=$1 AND item_id=$2`,
                [partiId, s.item_id]
            );
            if (!p.rows[0]) throw new Error(`Çıkış partisi stok ile uyuşmuyor: ${partiId}`);
        }

        // Çıkış: yalnızca Kullanilabilir (veya açıkça verilen statü bakiyesi)
        const cikisStatu = s.stock_status || 'Kullanilabilir';
        if (Number(s.direction) === -1) {
            if (cikisStatu !== 'Kullanilabilir' && !s.statu_cikis_izin) {
                const err = new Error(
                    `Kalitede/Bloke stok çıkışa kapalı. item_id=${s.item_id}, statu=${cikisStatu}`
                );
                err.code = 'STATU_CIKIS_ENGEL';
                throw err;
            }
            if (!eksiIzin) {
                const bakiye = await depoStokBakiye(client, depoId, s.item_id, {
                    stokStatu: cikisStatu,
                    partiId,
                });
                if (bakiye + 1e-9 < Number(s.quantity)) {
                    const oneriler = await onerilenDepolar(client, s.item_id, Number(s.quantity), depoId);
                    const err = new Error(
                        `Yetersiz kullanılabilir stok. Depo=${depoId}, item_id=${s.item_id}, statu=${cikisStatu}, bakiye=${bakiye}, istenen=${s.quantity}.`
                    );
                    err.code = 'YETERSIZ_STOK';
                    err.detay = { warehouse_id: depoId, item_id: s.item_id, bakiye, istenen: Number(s.quantity), stock_status: cikisStatu, onerilen_depolar: oneriler };
                    throw err;
                }
            }
        }

        const satirRes = await client.query(
            `
            INSERT INTO stock_movement_lines
                (movement_id, item_id, quantity, direction, uom_code, lot_id, stock_status, raf_code, konum_code)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *;
            `,
            [
                hareket.id, s.item_id, s.quantity, s.direction, s.uom_code || null, partiId,
                Number(s.direction) === -1 ? cikisStatu : statu,
                s.raf_code || null, s.konum_code || null,
            ]
        );
        eklenen.push(satirRes.rows[0]);

        // Ortalama maliyet (INV-011) — girişte uom_cost verilirse
        if (Number(s.direction) === 1 && s.uom_cost != null) {
            try {
                const { maliyetGuncelleGiris } = require('./maliyetService');
                await maliyetGuncelleGiris(client, {
                    stokId: s.item_id,
                    quantity: s.quantity,
                    birimMaliyet: s.uom_cost,
                    hareketId: hareket.id,
                });
            } catch (_) { /* maliyet tablosu yoksa sessiz */ }
        }
    }

    return { hareket, satirlar: eklenen };
}

async function assertStokDepoIzin(client, stokId, depoId) {
    const r = await client.query(
        `SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2 AND is_active=TRUE`,
        [stokId, depoId]
    );
    if (!r.rows[0]) {
        // Tanım hiç yoksa: malzeme için hiç item_warehouses yoksa da engelle
        const err = new Error(
            `Malzeme-depo tanımı yok veya is_inactive. item_id=${stokId}, warehouse_id=${depoId}`
        );
        err.code = 'STOK_DEPO_YOK';
        err.status = 400;
        throw err;
    }
}

async function depoStokBakiye(clientOrPool, depoId, stokId, { stokStatu = null, partiId = null } = {}) {
    const params = [depoId, stokId];
    let extra = '';
    if (stokStatu) {
        params.push(stokStatu);
        extra += ` AND COALESCE(s.stock_status,'Kullanilabilir') = $${params.length}`;
    }
    if (partiId) {
        params.push(partiId);
        extra += ` AND s.lot_id = $${params.length}`;
    }
    const res = await clientOrPool.query(
        `
        SELECT COALESCE(SUM(s.quantity * s.direction), 0)::numeric AS bakiye
        FROM stock_movement_lines s
        JOIN stock_movements h ON h.id = s.movement_id
        WHERE h.warehouse_id = $1 AND s.item_id = $2
        ${extra}
        `,
        params
    );
    return Number(res.rows[0].bakiye);
}

async function depoBakiyeListesi(pool, depoIdOrOpts = null) {
    const opts = (depoIdOrOpts && typeof depoIdOrOpts === 'object')
        ? depoIdOrOpts
        : { depoId: depoIdOrOpts };
    const {
        depoId = null, stokStatu = null, stokId = null, firmaId = null,
        depoKodu = null, stokKodu = null, stokAdi = null, stokTipi = null,
        partiNo = null, yalnizcaStokta = true,
    } = opts;
    const params = [];
    const where = [];
    if (depoId) {
        params.push(depoId);
        where.push(`h.warehouse_id = $${params.length}`);
    }
    if (depoKodu) {
        params.push(`%${depoKodu}%`);
        where.push(`d.warehouse_code ILIKE $${params.length}`);
    }
    if (stokId) {
        params.push(stokId);
        where.push(`s.item_id = $${params.length}`);
    }
    if (stokKodu) {
        params.push(`%${stokKodu}%`);
        where.push(`st.item_code ILIKE $${params.length}`);
    }
    if (stokAdi) {
        params.push(`%${stokAdi}%`);
        where.push(`st.item_name ILIKE $${params.length}`);
    }
    if (stokTipi) {
        params.push(stokTipi);
        where.push(`st.item_type = $${params.length}`);
    }
    if (stokStatu) {
        params.push(stokStatu);
        where.push(`COALESCE(s.stock_status,'Kullanilabilir') = $${params.length}`);
    }
    if (partiNo) {
        params.push(`%${partiNo}%`);
        where.push(`p.lot_no ILIKE $${params.length}`);
    }
    if (firmaId) {
        params.push(firmaId);
        where.push(`(st.company_id = $${params.length} OR h.company_id = $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const havingSql = yalnizcaStokta
        ? 'HAVING COALESCE(SUM(s.quantity * s.direction), 0) <> 0'
        : '';

    const res = await pool.query(
        `
        SELECT
            h.warehouse_id,
            d.warehouse_code,
            d.warehouse_name,
            d.warehouse_rolu,
            s.item_id,
            st.item_code,
            st.item_name,
            st.item_type,
            st.safety_stock,
            COALESCE(s.stock_status, 'Kullanilabilir') AS stock_status,
            s.lot_id,
            p.lot_no,
            COALESCE(SUM(s.quantity * s.direction), 0)::numeric AS bakiye
        FROM stock_movement_lines s
        JOIN stock_movements h ON h.id = s.movement_id
        JOIN warehouses d ON d.id = h.warehouse_id
        JOIN items st ON st.id = s.item_id
        LEFT JOIN item_lots p ON p.id = s.lot_id
        ${whereSql}
        GROUP BY h.warehouse_id, d.warehouse_code, d.warehouse_name, d.warehouse_rolu,
                 s.item_id, st.item_code, st.item_name, st.item_type, st.safety_stock,
                 COALESCE(s.stock_status, 'Kullanilabilir'), s.lot_id, p.lot_no
        ${havingSql}
        ORDER BY d.warehouse_code, st.item_code, stock_status, p.lot_no NULLS FIRST
        `,
        params
    );
    // Liste seçimi için benzersiz satır anahtarı (id yoksa tüm satırlar selected olurdu)
    return res.rows.map((r) => ({
        ...r,
        id: [
            r.warehouse_id,
            r.item_id,
            r.stock_status || 'Kullanilabilir',
            r.lot_id || 0,
        ].join(':'),
    }));
}

/**
 * Statü transferi: aynı depoda Kalitede→Kullanilabilir veya Bloke vb.
 * Çıkış (eski statü -1) + giriş (yeni statü +1) aynı harekette.
 */
async function stokStatuTransfer(client, {
    depoId,
    isYeriId = null,
    stokId,
    quantity,
    uom_code = null,
    partiId = null,
    kaynakStatu,
    hedefStatu,
    belgeTipi = null,
    belgeId = null,
    description = null,
}) {
    if (!STATULER.includes(kaynakStatu) || !STATULER.includes(hedefStatu)) {
        throw new Error('Geçersiz statü transferi.');
    }
    return stokHareketOlustur(client, {
        hareketTipi: 'DUZELTME',
        isYeriId,
        depoId,
        belgeTipi,
        belgeId,
        description: description || `Statü ${kaynakStatu} → ${hedefStatu}`,
        depoZorunluAtla: true,
        satirlar: [
            {
                item_id: stokId,
                quantity,
                direction: -1,
                uom_code,
                lot_id: partiId,
                stock_status: kaynakStatu,
                statu_cikis_izin: true,
            },
            {
                item_id: stokId,
                quantity,
                direction: 1,
                uom_code,
                lot_id: partiId,
                stock_status: hedefStatu,
                otomatik_parti: false,
            },
        ],
    });
}

/**
 * Depo transferi: source depodan -1, hedef depoya +1 (aynı statü).
 */
async function depoTransfer(client, {
    kaynakDepoId,
    hedefDepoId,
    isYeriId = null,
    stokId,
    quantity,
    uom_code = null,
    partiId = null,
    stokStatu = 'Kullanilabilir',
    belgeTipi = null,
    belgeId = null,
    description = null,
    statuCikisIzin = false,
    depoZorunluAtla = false,
}) {
    // Çıkış
    const cikis = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId,
        depoId: kaynakDepoId,
        hedefDepoId,
        belgeTipi,
        belgeId,
        description: description || `Transfer → depo ${hedefDepoId}`,
        depoZorunluAtla,
        satirlar: [{
            item_id: stokId,
            quantity,
            direction: -1,
            uom_code,
            lot_id: partiId,
            stock_status: stokStatu,
            statu_cikis_izin: statuCikisIzin,
        }],
    });
    const giris = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId,
        depoId: hedefDepoId,
        belgeTipi,
        belgeId,
        description: description || `Transfer ← depo ${kaynakDepoId}`,
        bagliHareketId: cikis.hareket.id,
        depoZorunluAtla,
        satirlar: [{
            item_id: stokId,
            quantity,
            direction: 1,
            uom_code,
            lot_id: partiId,
            stock_status: stokStatu,
            otomatik_parti: false,
        }],
    });
    return { cikis, giris };
}

module.exports = {
    stokHareketOlustur,
    depoStokBakiye,
    depoBakiyeListesi,
    stokStatuTransfer,
    depoTransfer,
    assertStokDepoIzin,
    STATULER,
};
