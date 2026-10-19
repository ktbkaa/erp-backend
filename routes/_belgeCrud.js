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
            ? `SELECT t.*, c.cari_kodu, c.cari_adi FROM ${table} t JOIN cariler c ON c.id = t.cari_id WHERE t.id = $1`
            : `SELECT * FROM ${table} WHERE id = $1`;
        const t = await pool.query(baslikSql, [id]);
        if (!t.rows[0]) return null;
        const satirlar = await pool.query(
            `
            SELECT ls.*, s.stok_kodu, s.stok_adi
            FROM ${lineTable} ls
            JOIN stoklar s ON s.id = ls.stok_id
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
                sql += ` WHERE firma_id = $${params.length}`;
            }
            sql += ' ORDER BY id DESC';
            const liste = await pool.query(sql, params);
            const sonuc = [];
            for (const r of liste.rows) sonuc.push(await getir(r.id));
            res.json(sonuc);
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
            const { cari_id, aciklama, satirlar } = req.body;
            if (requireCari && !cari_id) {
                return res.status(400).json({ hata: 'cari_id zorunludur.' });
            }
            if (!Array.isArray(satirlar) || satirlar.length === 0) {
                return res.status(400).json({ hata: 'satirlar zorunlu.' });
            }

            const id = await withTransaction(pool, async (client) => {
                const no = await sonrakiBelgeNo(client, seri);
                const cols = [noField];
                const vals = [no];
                if (requireCari) {
                    cols.push('cari_id');
                    vals.push(cari_id);
                }
                cols.push('aciklama');
                vals.push(aciklama || null);
                for (const f of extraFields) {
                    if (req.body[f] !== undefined) {
                        cols.push(f);
                        vals.push(req.body[f]);
                    } else if (defaults[f] !== undefined) {
                        cols.push(f);
                        vals.push(defaults[f]);
                    } else if (f === 'firma_id' && firmaIdFromReq(req)) {
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
                    if (!s.stok_id || s.miktar == null) throw new Error('Her satırda stok_id ve miktar zorunlu.');
                    const stok = await client.query('SELECT id, birim FROM stoklar WHERE id=$1', [s.stok_id]);
                    if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
                    if (linePrice) {
                        await client.query(
                            `INSERT INTO ${lineTable} (${fk}, stok_id, miktar, birim_fiyat, birim)
                             VALUES ($1,$2,$3,$4,$5)`,
                            [docId, s.stok_id, s.miktar, s.birim_fiyat ?? 0, s.birim || stok.rows[0].birim]
                        );
                    } else {
                        await client.query(
                            `INSERT INTO ${lineTable} (${fk}, stok_id, miktar, birim)
                             VALUES ($1,$2,$3,$4)`,
                            [docId, s.stok_id, s.miktar, s.birim || stok.rows[0].birim]
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
            const { aciklama, durum, cari_id, satirlar } = req.body;
            if (durum && allowedDurum && !allowedDurum.includes(durum)) {
                return res.status(400).json({ hata: `Geçersiz durum: ${durum}` });
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
                if (aciklama !== undefined) add('aciklama', aciklama);
                if (durum) add('durum', durum);
                if (requireCari && cari_id) add('cari_id', cari_id);
                for (const f of extraFields) {
                    if (req.body[f] !== undefined) add(f, req.body[f]);
                }
                if (sets.length) {
                    await client.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id=$1`, params);
                }
                if (Array.isArray(satirlar)) {
                    await client.query(`DELETE FROM ${lineTable} WHERE ${fk}=$1`, [req.params.id]);
                    for (const s of satirlar) {
                        if (!s.stok_id || s.miktar == null) continue;
                        const stok = await client.query('SELECT id, birim FROM stoklar WHERE id=$1', [s.stok_id]);
                        if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
                        if (linePrice) {
                            await client.query(
                                `INSERT INTO ${lineTable} (${fk}, stok_id, miktar, birim_fiyat, birim)
                                 VALUES ($1,$2,$3,$4,$5)`,
                                [req.params.id, s.stok_id, s.miktar, s.birim_fiyat ?? 0, s.birim || stok.rows[0].birim]
                            );
                        } else {
                            await client.query(
                                `INSERT INTO ${lineTable} (${fk}, stok_id, miktar, birim)
                                 VALUES ($1,$2,$3,$4)`,
                                [req.params.id, s.stok_id, s.miktar, s.birim || stok.rows[0].birim]
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
            const sonuc = await pool.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [req.params.id]);
            if (!sonuc.rows[0]) return res.status(404).json({ hata: notFound });
            res.json({ silindi: true, id: Number(req.params.id) });
        } catch (err) {
            res.status(500).json({ hata: err.message });
        }
    });

    return router;
}

module.exports = { createBelgeRouter };
