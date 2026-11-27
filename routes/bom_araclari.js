const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

/** Seçili firmaya ait ağaçlar (ua.company_id veya mamul stok firması) */
function agacFirmaClause(firmaId, params) {
    if (!firmaId) return { sql: ' AND FALSE', /* firma seçilmeden veri yok */ params };
    params.push(firmaId);
    const p = `$${params.length}`;
    return {
        sql: ` AND (ua.company_id = ${p} OR s.company_id = ${p})`,
        params,
    };
}

async function agacSatirlari(agacId) {
    const result = await pool.query(
        `
        SELECT s.*, st.item_code, st.item_name, st.item_type
        FROM bom_lines s
        JOIN items st ON st.id = s.component_item_id
        WHERE s.product_bom_id = $1
        ORDER BY s.line_no, s.id
        `,
        [agacId]
    );
    return result.rows;
}

function nest(rows, parentId = null, level = 1, path = []) {
    const out = [];
    const children = rows.filter((r) => {
        const p = r.parent_line_id == null ? null : Number(r.parent_line_id);
        return p === parentId;
    });
    for (const c of children) {
        const nodePath = [...path, c.item_code];
        const node = {
            level,
            agac_id: c.product_bom_id,
            satir_id: c.id,
            item_id: c.component_item_id,
            item_code: c.item_code,
            item_name: c.item_name,
            item_type: c.item_type,
            quantity: c.quantity,
            uom_code: c.uom_code,
            yol: nodePath.join(' > '),
        };
        out.push(node);
        out.push(...nest(rows, Number(c.id), level + 1, nodePath));
    }
    return out;
}

/** Mamul/yarı için varsayılan (aktif) ürün ağacı — iş emri varsayılanı öncelikli */
async function pickBomForItem(itemId, firmaId) {
    if (!itemId) return null;
    const params = [itemId];
    let sql = `
        SELECT ua.*, s.item_code AS mamul_kodu, s.item_name AS mamul_adi, s.item_type AS mamul_tipi
        FROM boms ua
        JOIN items s ON s.id = ua.finished_good_item_id
        WHERE ua.finished_good_item_id = $1
          AND ua.is_active IS DISTINCT FROM FALSE
          AND COALESCE(ua.silindi, FALSE) = FALSE`;
    if (firmaId) {
        params.push(firmaId);
        sql += ` AND (ua.company_id = $${params.length} OR s.company_id = $${params.length})`;
    }
    sql += `
        ORDER BY ua.is_default_for_wo DESC NULLS LAST, ua.alt_no ASC, ua.id DESC
        LIMIT 1`;
    const r = await pool.query(sql, params);
    return r.rows[0] || null;
}

/**
 * BOM patlatma — mamul miktarına göre çok seviyeli ağaç + çapraz ağaç (yarı mamul BOM).
 * Query: agac_id | finished_good_item_id | bom_code, quantity (varsayılan 1),
 *        cross_bom=1 (varsayılan), max_depth=12
 */
router.get('/patlatma', async (req, res) => {
    try {
        const miktarBaz = Math.max(0, Number(req.query.quantity) || 1);
        const { agac_id, finished_good_item_id, bom_code } = req.query;
        const firmaId = firmaIdFromReq(req);
        const crossBom = String(req.query.cross_bom ?? '1') !== '0';
        const maxDepth = Math.min(20, Math.max(1, Number(req.query.max_depth) || 12));

        let agacSql = `
            SELECT ua.*, s.item_code AS mamul_kodu, s.item_name AS mamul_adi, s.item_type AS mamul_tipi,
                   s.uom_code AS mamul_uom
            FROM boms ua
            JOIN items s ON s.id = ua.finished_good_item_id
            WHERE ua.is_active IS DISTINCT FROM FALSE
              AND COALESCE(ua.silindi, FALSE) = FALSE`;
        const params = [];
        agacSql += agacFirmaClause(firmaId, params).sql;
        if (agac_id) {
            params.push(agac_id);
            agacSql += ` AND ua.id = $${params.length}`;
        } else if (finished_good_item_id) {
            params.push(finished_good_item_id);
            agacSql += ` AND ua.finished_good_item_id = $${params.length}`;
        } else if (bom_code) {
            params.push(String(bom_code).trim());
            agacSql += ` AND UPPER(ua.bom_code) = UPPER($${params.length})`;
        }
        agacSql += ' ORDER BY ua.is_default_for_wo DESC NULLS LAST, ua.bom_code, ua.id';
        const agaclar = await pool.query(agacSql, params);
        if (!agaclar.rows.length) {
            return res.json([]);
        }

        const bomCache = new Map();
        async function linesForBom(bomId) {
            if (bomCache.has(bomId)) return bomCache.get(bomId);
            const rows = await agacSatirlari(bomId);
            bomCache.set(bomId, rows);
            return rows;
        }

        async function explodeTree(rows, parentId, level, path, parentQty, rootAgac, visitedBomIds) {
            const out = [];
            if (level > maxDepth) return out;
            const children = rows.filter((r) => {
                const p = r.parent_line_id == null ? null : Number(r.parent_line_id);
                return p === parentId;
            });
            for (let idx = 0; idx < children.length; idx += 1) {
                const c = children[idx];
                const birimMiktar = Number(c.quantity) || 0;
                const scrap = Math.max(0, Number(c.scrap_pct) || 0);
                const toplam = birimMiktar * parentQty * (1 + scrap / 100);
                const nodePath = [...path, c.item_code];
                const line = {
                    level,
                    sira: idx + 1,
                    agac_id: rootAgac.id,
                    bom_code: rootAgac.bom_code,
                    bom_name: rootAgac.bom_name,
                    mamul_kodu: rootAgac.mamul_kodu,
                    mamul_adi: rootAgac.mamul_adi,
                    satir_id: c.id,
                    item_id: c.component_item_id,
                    item_code: c.item_code,
                    item_name: c.item_name,
                    item_type: c.item_type,
                    component_type: c.component_type || 'Stok',
                    scrap_pct: scrap,
                    operation_seq: c.operation_seq,
                    birim_miktar: birimMiktar,
                    quantity: toplam,
                    uom_code: c.uom_code,
                    yol: nodePath.join(' > '),
                    list_code: `${rootAgac.bom_code}-L${level}-${c.id}`,
                    description: `${nodePath.join(' › ')} × ${toplam}`,
                };
                out.push(line);

                // Patlatmayı durdur — alt seviye / çapraz BOM yok
                if (c.stop_explosion) continue;

                // Aynı ağaç içinde nested satırlar
                out.push(...await explodeTree(rows, Number(c.id), level + 1, nodePath, toplam, rootAgac, visitedBomIds));

                // Çapraz BOM: yarı mamul/mamul kendi ağacına patlar
                if (crossBom && !c.is_phantom && /mamul|yarı|yari/i.test(String(c.item_type || ''))) {
                    const childBom = await pickBomForItem(c.component_item_id, firmaId);
                    if (childBom && !visitedBomIds.has(childBom.id)) {
                        const nextVisited = new Set(visitedBomIds);
                        nextVisited.add(childBom.id);
                        const childRows = await linesForBom(childBom.id);
                        const childBase = Number(childBom.quantity) || 1;
                        const childFactor = toplam / childBase;
                        out.push(...await explodeTree(
                            childRows, null, level + 1, nodePath, childFactor, rootAgac, nextVisited
                        ));
                    }
                }
            }
            return out;
        }

        const result = [];
        for (const a of agaclar.rows) {
            const satirlar = await linesForBom(a.id);
            const bazAgac = Number(a.quantity) || 1;
            const kokCarpan = miktarBaz / bazAgac;
            result.push({
                level: 0,
                sira: 0,
                agac_id: a.id,
                bom_code: a.bom_code,
                bom_name: a.bom_name,
                category: a.category,
                alt_no: a.alt_no,
                mamul_kodu: a.mamul_kodu,
                mamul_adi: a.mamul_adi,
                satir_id: null,
                item_id: a.finished_good_item_id,
                item_code: a.mamul_kodu,
                item_name: a.mamul_adi,
                item_type: a.mamul_tipi || 'Mamul',
                birim_miktar: bazAgac,
                quantity: miktarBaz,
                uom_code: a.uom_code || a.mamul_uom || null,
                yol: a.mamul_kodu,
                list_code: `${a.bom_code}-KOK`,
                description: `Mamul ${a.mamul_kodu} × ${miktarBaz}`,
            });
            const visited = new Set([a.id]);
            result.push(...await explodeTree(satirlar, null, 1, [a.mamul_kodu], kokCarpan, a, visited));
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** BOMT05 — ürün ağacı level listesi (tüm ağaçların düz level dökümü; where-used / level raporu) */
router.get('/level-listesi', async (req, res) => {
    try {
        const { agac_id } = req.query;
        const firmaId = firmaIdFromReq(req);
        const params = [];
        let sql = `
            SELECT ua.*, s.item_code AS mamul_kodu, s.item_name AS mamul_adi
            FROM boms ua
            JOIN items s ON s.id = ua.finished_good_item_id
            WHERE 1=1`;
        sql += agacFirmaClause(firmaId, params).sql;
        if (agac_id) {
            params.push(agac_id);
            sql += ` AND ua.id = $${params.length}`;
        }
        sql += ' ORDER BY ua.id';
        const agaclar = await pool.query(sql, params);
        const result = [];
        for (const a of agaclar.rows) {
            const satirlar = await agacSatirlari(a.id);
            const hasParent = satirlar.some((r) => r.parent_line_id != null);
            let levels;
            if (hasParent) {
                levels = nest(satirlar, null, 1, [a.mamul_kodu]);
            } else {
                levels = satirlar.map((c) => ({
                    level: 1,
                    agac_id: a.id,
                    satir_id: c.id,
                    item_id: c.component_item_id,
                    item_code: c.item_code,
                    item_name: c.item_name,
                    item_type: c.item_type,
                    quantity: c.quantity,
                    uom_code: c.uom_code,
                    yol: `${a.mamul_kodu} > ${c.item_code}`,
                }));
            }
            for (const L of levels) {
                result.push({
                    ...L,
                    bom_code: a.bom_code,
                    bom_name: a.bom_name,
                    mamul_kodu: a.mamul_kodu,
                    list_code: `${a.bom_code}-${L.satir_id}`,
                    description: L.yol,
                });
            }
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** BOMT03 — malzeme değişikliği */
router.post('/malzeme-degistir', async (req, res) => {
    try {
        const { eski_stok_id, yeni_stok_id, agac_id } = req.body;
        if (!eski_stok_id || !yeni_stok_id) {
            return res.status(400).json({ hata: 'eski_stok_id ve yeni_stok_id zorunlu.' });
        }
        if (Number(eski_stok_id) === Number(yeni_stok_id)) {
            return res.status(400).json({ hata: 'Eski ve yeni stok aynı olamaz.' });
        }
        const result = await withTransaction(pool, async (client) => {
            const yeni = await client.query('SELECT id, item_code FROM items WHERE id=$1', [yeni_stok_id]);
            if (!yeni.rows[0]) throw new Error('Yeni stok bulunamadı.');
            const params = [eski_stok_id, yeni_stok_id];
            let sql = `
                UPDATE bom_lines
                SET component_item_id = $2
                WHERE component_item_id = $1
            `;
            if (agac_id) {
                params.push(agac_id);
                sql += ` AND product_bom_id = $3`;
            }
            sql += ' RETURNING id, product_bom_id';
            const upd = await client.query(sql, params);
            return {
                guncellenen_satir: upd.rowCount,
                satir_idler: upd.rows.map((r) => r.id),
                yeni_stok_kodu: yeni.rows[0].item_code,
            };
        });
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** UI: malzeme değişikliği işlem geçmişi (oturum içi değil — sonuç kaydı döner) */
const degisiklikLog = [];

router.get('/malzeme-degisikligi', async (req, res) => {
    res.json(degisiklikLog.slice().reverse());
});

router.post('/malzeme-degisikligi', async (req, res) => {
    try {
        const { eski_stok_id, yeni_stok_id, agac_id, description } = req.body;
        if (!eski_stok_id || !yeni_stok_id) {
            return res.status(400).json({ hata: 'eski_stok_id ve yeni_stok_id zorunlu.' });
        }
        req.url = '/malzeme-degistir';
        const result = await withTransaction(pool, async (client) => {
            const eski = await client.query('SELECT item_code FROM items WHERE id=$1', [eski_stok_id]);
            const yeni = await client.query('SELECT item_code FROM items WHERE id=$1', [yeni_stok_id]);
            if (!eski.rows[0] || !yeni.rows[0]) throw new Error('Stok bulunamadı.');
            const params = [eski_stok_id, yeni_stok_id];
            let sql = `UPDATE bom_lines SET component_item_id=$2 WHERE component_item_id=$1`;
            if (agac_id) {
                params.push(agac_id);
                sql += ` AND product_bom_id=$3`;
            }
            sql += ' RETURNING id';
            const upd = await client.query(sql, params);
            return {
                id: degisiklikLog.length + 1,
                islem_kodu: `MD${String(degisiklikLog.length + 1).padStart(5, '0')}`,
                eski_stok_id,
                yeni_stok_id,
                old_item_code: eski.rows[0].item_code,
                yeni_stok_kodu: yeni.rows[0].item_code,
                agac_id: agac_id || null,
                guncellenen_satir: upd.rowCount,
                description: description || `${eski.rows[0].item_code} → ${yeni.rows[0].item_code}`,
                created_at: new Date().toISOString(),
            };
        });
        degisiklikLog.push(result);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
