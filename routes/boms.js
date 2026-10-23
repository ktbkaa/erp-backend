const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

function satirAgaciKur(duzSatirlar) {
    const map = new Map();
    for (const s of duzSatirlar) {
        map.set(s.id, { ...s, alt_satirlar: [] });
    }
    const kokler = [];
    for (const s of map.values()) {
        if (s.parent_line_id && map.has(s.parent_line_id)) {
            map.get(s.parent_line_id).alt_satirlar.push(s);
        } else {
            kokler.push(s);
        }
    }
    return kokler;
}

async function agacGetir(id) {
    const baslik = await pool.query(
        `
        SELECT ua.*, s.item_code, s.item_name, s.item_type
        FROM boms ua
        JOIN items s ON s.id = ua.finished_good_item_id
        WHERE ua.id = $1
        `,
        [id]
    );
    if (!baslik.rows[0]) return null;

    const satirlar = await pool.query(
        `
        SELECT us.*, st.item_code, st.item_name, st.item_type
        FROM bom_lines us
        JOIN items st ON st.id = us.component_item_id
        WHERE us.product_bom_id = $1
        ORDER BY us.line_no, us.id
        `,
        [id]
    );

    return {
        ...baslik.rows[0],
        satirlar: satirlar.rows,
        agac: satirAgaciKur(satirlar.rows),
    };
}

router.get('/', async (req, res) => {
    try {
        // Varsayılan: mamul ağaçlarını göster (tek kök ürün ağacı bakışı)
        const onlyMamul = req.query.type !== 'hepsi';
        const firmaId = firmaIdFromReq(req);
        const params = [];
        const where = [];
        if (onlyMamul) where.push(`s.item_type IN ('Mamul', 'YariMamul')`);
        if (firmaId) {
            params.push(firmaId);
            // Ağaç company_id veya mamul stok firması (eski kayıtlarda company_id boş olabilirdi)
            where.push(`(ua.company_id = $${params.length} OR s.company_id = $${params.length})`);
        }
        const liste = await pool.query(
            `
            SELECT ua.id
            FROM boms ua
            JOIN items s ON s.id = ua.finished_good_item_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY ua.id DESC
            `,
            params
        );
        const result = [];
        for (const a of liste.rows) result.push(await agacGetir(a.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const agac = await agacGetir(req.params.id);
        if (!agac) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
        res.json(agac);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Çok seviyeli ağaç kaydı.
 * satirlar: [
 *   { component_item_id, quantity, uom_code, line_no, alt_satirlar: [...] }
 * ]
 */
router.post('/', async (req, res) => {
    try {
        const {
            finished_good_item_id,
            bom_code,
            bom_name,
            quantity,
            satirlar,
            valid_from,
            valid_to,
            min_quantity,
            max_quantity,
        } = req.body;
        if (!finished_good_item_id || !bom_code || !bom_name || !Array.isArray(satirlar) || satirlar.length === 0) {
            return res.status(400).json({
                hata: 'finished_good_item_id, bom_code, bom_name ve satirlar zorunlu.',
            });
        }

        async function satirEkle(client, urunAgaciId, satir, ustSatirId, siraNo) {
            const ins = await client.query(
                `
                INSERT INTO bom_lines
                    (product_bom_id, component_item_id, quantity, uom_code, line_no, parent_line_id)
                VALUES ($1,$2,$3,$4,$5,$6)
                RETURNING id
                `,
                [
                    urunAgaciId,
                    satir.component_item_id,
                    satir.quantity,
                    satir.uom_code || null,
                    satir.line_no || siraNo,
                    ustSatirId,
                ]
            );
            const id = ins.rows[0].id;
            let altSira = 10;
            for (const alt of satir.alt_satirlar || []) {
                await satirEkle(client, urunAgaciId, alt, id, altSira);
                altSira += 10;
            }
            return id;
        }

        const kayitId = await withTransaction(pool, async (client) => {
            // company_id: istek / mamul stok kartı (liste filtreleri için zorunlu)
            let firmaId = firmaIdFromReq(req) || Number(req.body.company_id) || null;
            if (!firmaId) {
                const st = await client.query(
                    'SELECT company_id FROM items WHERE id=$1',
                    [finished_good_item_id]
                );
                firmaId = st.rows[0]?.company_id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO boms
                    (finished_good_item_id, bom_code, bom_name, quantity,
                     valid_from, valid_to, min_quantity, max_quantity, company_id)
                VALUES ($1,$2,$3,COALESCE($4,1),$5,$6,$7,$8,$9)
                RETURNING id
                `,
                [
                    finished_good_item_id,
                    bom_code,
                    bom_name,
                    quantity,
                    valid_from || null,
                    valid_to || null,
                    min_quantity ?? 0,
                    max_quantity ?? 999999999,
                    firmaId,
                ]
            );
            const uaId = baslik.rows[0].id;
            let sira = 10;
            for (const s of satirlar) {
                await satirEkle(client, uaId, s, null, sira);
                sira += 10;
            }
            return uaId;
        });

        res.status(201).json(await agacGetir(kayitId));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            bom_name,
            quantity,
            satirlar,
            finished_good_item_id,
            valid_from,
            valid_to,
            min_quantity,
            max_quantity,
        } = req.body;
        if (!bom_name) return res.status(400).json({ hata: 'bom_name zorunlu.' });

        async function satirEkle(client, urunAgaciId, satir, ustSatirId, siraNo) {
            const ins = await client.query(
                `
                INSERT INTO bom_lines
                    (product_bom_id, component_item_id, quantity, uom_code, line_no, parent_line_id)
                VALUES ($1,$2,$3,$4,$5,$6)
                RETURNING id
                `,
                [
                    urunAgaciId,
                    satir.component_item_id,
                    satir.quantity,
                    satir.uom_code || null,
                    satir.line_no || siraNo,
                    ustSatirId,
                ]
            );
            const sid = ins.rows[0].id;
            let altSira = 10;
            for (const alt of satir.alt_satirlar || []) {
                await satirEkle(client, urunAgaciId, alt, sid, altSira);
                altSira += 10;
            }
            return sid;
        }

        const kayitId = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM boms WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const err = new Error('Ürün ağacı bulunamadı.');
                err.status = 404;
                throw err;
            }
            await client.query(
                `UPDATE boms SET
                    bom_name=$2,
                    quantity=COALESCE($3, quantity),
                    finished_good_item_id=COALESCE($4, finished_good_item_id),
                    valid_from=COALESCE($5, valid_from),
                    valid_to=COALESCE($6, valid_to),
                    min_quantity=COALESCE($7, min_quantity),
                    max_quantity=COALESCE($8, max_quantity)
                 WHERE id=$1`,
                [
                    req.params.id,
                    bom_name,
                    quantity ?? null,
                    finished_good_item_id || null,
                    valid_from || null,
                    valid_to || null,
                    min_quantity ?? null,
                    max_quantity ?? null,
                ]
            );
            if (Array.isArray(satirlar)) {
                await client.query('DELETE FROM bom_lines WHERE product_bom_id=$1', [req.params.id]);
                let sira = 10;
                for (const s of satirlar) {
                    if (!s.component_item_id || s.quantity == null) continue;
                    await satirEkle(client, Number(req.params.id), s, null, sira);
                    sira += 10;
                }
            }
            return Number(req.params.id);
        });

        res.json(await agacGetir(kayitId));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM boms WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
