const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { registerIdCrud } = require('../src/utils/registerIdCrud');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.item_id) {
            params.push(Number(req.query.item_id));
            where.push(`p.item_id = $${params.length}`);
        }
        if (req.query.is_active === 'true') where.push('p.is_active = TRUE');
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`(p.company_id = $${params.length} OR s.company_id = $${params.length})`);
        }
        const sql = `
            SELECT p.*, s.item_code, s.item_name, s.lot_politika
            FROM item_lots p
            JOIN items s ON s.id = p.item_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY p.id DESC
        `;
        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query(
            `
            SELECT p.*, s.item_code, s.item_name, s.company_id AS stok_firma_id
            FROM item_lots p JOIN items s ON s.id = p.item_id
            WHERE p.id=$1
            `,
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Parti bulunamadı.' });
        const firmaId = firmaIdFromReq(req);
        const rowFirma = r.rows[0].company_id ?? r.rows[0].stok_firma_id;
        if (firmaId && rowFirma != null && Number(rowFirma) !== Number(firmaId)) {
            return res.status(404).json({ hata: 'Parti bulunamadı.' });
        }
        const hareketler = await pool.query(
            `
            SELECT h.movement_no, h.movement_type, h.movement_date, h.warehouse_id, d.warehouse_code,
                   s.quantity, s.direction, s.stock_status, s.uom_code
            FROM stock_movement_lines s
            JOIN stock_movements h ON h.id = s.movement_id
            JOIN warehouses d ON d.id = h.warehouse_id
            WHERE s.lot_id=$1
            ORDER BY h.id DESC
            LIMIT 200
            `,
            [req.params.id]
        );
        res.json({ ...r.rows[0], hareketler: hareketler.rows });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { item_id, lot_no, production_date, son_kullanma_date, description } = req.body;
        if (!item_id) return res.status(400).json({ hata: 'item_id zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const no = lot_no || (await sonrakiKod(client, 'PARTI'));
            const r = await client.query(
                `
                INSERT INTO item_lots (item_id, lot_no, production_date, son_kullanma_date, description)
                VALUES ($1,$2,$3,$4,$5) RETURNING id
                `,
                [item_id, no, production_date || null, son_kullanma_date || null, description || null]
            );
            return r.rows[0].id;
        });
        const row = await pool.query(`SELECT * FROM item_lots WHERE id=$1`, [id]);
        res.status(201).json(row.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { production_date, son_kullanma_date, description, is_active } = req.body;
        const r = await pool.query(
            `
            UPDATE item_lots SET
                production_date = COALESCE($2, production_date),
                son_kullanma_date = COALESCE($3, son_kullanma_date),
                description = COALESCE($4, description),
                is_active = COALESCE($5, is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, production_date, son_kullanma_date, description, is_active]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Parti bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

registerIdCrud(router, pool, {
  path: '',
  table: 'item_lots',
  notFound: 'Parti bulunamadı.',
  skipGet: true,
  skipPut: true,
  softDelete: true,
});

module.exports = router;
