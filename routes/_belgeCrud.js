/**
 * Basit master-detail belge CRUD fabrikası (PUR teklif/anlaşma vb.)
 */
const express = require('express');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

function createBelgeRouter(cfg) {
    const router = express.Router();
    const {
        table,
        lineTable,
        fk,
        noField,
        seri,
        notFound,
        defaults = {},
        allowedDurum,
        requireCari = false,
        linePrice = false,
        extraFields = [],
    } = cfg;

    async function getir(id) {
        const baslikSql = requireCari
            ? `SELECT t.*, c.partner_code, c.partner_name FROM ${table} t JOIN partners c ON c.id = t.partner_id WHERE t.id = $1`
            : `SELECT * FROM ${table} WHERE id = $1`;
        const t = await pool.query(baslikSql, [id]);
        if (!t.rows[0]) return null;
        const satirlar = await pool.query(
            `
            SELECT ls.*, s.item_code, s.item_name
            FROM ${lineTable} ls
            JOIN items s ON s.id = ls.item_id
            WHERE ls.${fk} = $1
            ORDER BY ls.id
            `,
            [id]
        );
        return { ...t.rows[0], satirlar: satirlar.rows };
    }

    router.get('/', async (req, res) => {
        try {
            const params = [];
            let sql = `SELECT id FROM ${table}`;
            const firmaId = firmaIdFromReq(req);
            if (firmaId) {
                params.push(firmaId);
                sql += ` WHERE company_id = $${params.length}`;
            }
            sql += ' ORDER BY id DESC';
            const liste = await pool.query(sql, params);
            const result = [];
            for (const r of liste.rows) result.push(await getir(r.id));
            res.json(result);
        } catch (err) {
            res.status(500).json({ hata: err.message });
        }
    });

    router.get('/:id', async (req, res) => {
        try {
            const row = await getir(req.params.id);
            if (!row) return res.status(404).json({ hata: notFound });
            res.json(row);
        } catch (err) {
            res.status(500).json({ hata: err.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { partner_id, description, satirlar } = req.body;
            if (requireCari && !partner_id) {
                return res.status(400).json({ hata: 'partner_id zorunludur.' });
            }
            if (!Array.isArray(satirlar) || satirlar.length === 0) {
                return res.status(400).json({ hata: 'satirlar zorunlu.' });
            }

            const id = await withTransaction(pool, async (client) => {
                const no = await sonrakiBelgeNo(client, seri);
                const cols = [noField];
                const vals = [no];
                if (requireCari) {
                    cols.push('partner_id');
                    vals.push(partner_id);
                }
                cols.push('description');
                vals.push(description || null);
                for (const f of extraFields) {
                    if (req.body[f] !== undefined) {
                        cols.push(f);
                        vals.push(req.body[f]);
                    } else if (defaults[f] !== undefined) {
                        cols.push(f);
                        vals.push(defaults[f]);
                    } else if (f === 'company_id' && firmaIdFromReq(req)) {
                        cols.push(f);
                        vals.push(firmaIdFromReq(req));
                    }
                }
                const ph = cols.map((_, i) => `$${i + 1}`).join(',');
                const baslik = await client.query(
                    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) RETURNING id`,
                    vals
                );
                const docId = baslik.rows[0].id;
                for (const s of satirlar) {
                    if (!s.item_id || s.quantity == null) throw new Error('Her satırda item_id ve quantity zorunlu.');
                    const stok = await client.query('SELECT id, uom_code FROM items WHERE id=$1', [s.item_id]);
                    if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.item_id}`);
                    if (linePrice) {
                        await client.query(
                            `INSERT INTO ${lineTable} (${fk}, item_id, quantity, unit_price, uom_code)
                             VALUES ($1,$2,$3,$4,$5)`,
                            [docId, s.item_id, s.quantity, s.unit_price ?? 0, s.uom_code || stok.rows[0].uom_code]
                        );
                    } else {
                        await client.query(
                            `INSERT INTO ${lineTable} (${fk}, item_id, quantity, uom_code)
                             VALUES ($1,$2,$3,$4)`,
                            [docId, s.item_id, s.quantity, s.uom_code || stok.rows[0].uom_code]
                        );
                    }
                }
                return docId;
            });
            res.status(201).json(await getir(id));
        } catch (err) {
            res.status(500).json({ hata: err.message });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { description, status, partner_id, satirlar } = req.body;
            if (status && allowedDurum && !allowedDurum.includes(status)) {
                return res.status(400).json({ hata: `Geçersiz status: ${status}` });
            }
            const id = await withTransaction(pool, async (client) => {
                const mevcut = await client.query(
                    `SELECT id FROM ${table} WHERE id=$1 FOR UPDATE`,
                    [req.params.id]
                );
                if (!mevcut.rows[0]) {
                    const e = new Error(notFound);
                    e.status = 404;
                    throw e;
                }
                const sets = [];
                const params = [req.params.id];
                const add = (col, val) => {
                    params.push(val);
                    sets.push(`${col}=$${params.length}`);
                };
                if (description !== undefined) add('description', description);
                if (status) add('status', status);
                if (requireCari && partner_id) add('partner_id', partner_id);
                for (const f of extraFields) {
                    if (req.body[f] !== undefined) add(f, req.body[f]);
                }
                if (sets.length) {
                    await client.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id=$1`, params);
                }
                if (Array.isArray(satirlar)) {
                    await client.query(`DELETE FROM ${lineTable} WHERE ${fk}=$1`, [req.params.id]);
                    for (const s of satirlar) {
                        if (!s.item_id || s.quantity == null) continue;
                        const stok = await client.query('SELECT id, uom_code FROM items WHERE id=$1', [s.item_id]);
                        if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.item_id}`);
                        if (linePrice) {
                            await client.query(
                                `INSERT INTO ${lineTable} (${fk}, item_id, quantity, unit_price, uom_code)
                                 VALUES ($1,$2,$3,$4,$5)`,
                                [req.params.id, s.item_id, s.quantity, s.unit_price ?? 0, s.uom_code || stok.rows[0].uom_code]
                            );
                        } else {
                            await client.query(
                                `INSERT INTO ${lineTable} (${fk}, item_id, quantity, uom_code)
                                 VALUES ($1,$2,$3,$4)`,
                                [req.params.id, s.item_id, s.quantity, s.uom_code || stok.rows[0].uom_code]
                            );
                        }
                    }
                }
                return Number(req.params.id);
            });
            res.json(await getir(id));
        } catch (err) {
            res.status(err.status || 500).json({ hata: err.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const result = await pool.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [req.params.id]);
            if (!result.rows[0]) return res.status(404).json({ hata: notFound });
            res.json({ silindi: true, id: Number(req.params.id) });
        } catch (err) {
            res.status(500).json({ hata: err.message });
        }
    });

    return router;
}

module.exports = { createBelgeRouter };
