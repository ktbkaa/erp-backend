const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function tipGetir(id) {
    const result = await pool.query('SELECT * FROM production_order_types WHERE id=$1', [id]);
    return result.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const onlyAktif = req.query.is_active === 'true';
        const result = await pool.query(
            `
            SELECT * FROM production_order_types
            ${onlyAktif ? 'WHERE is_active = TRUE' : ''}
            ORDER BY type_code
            `
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await tipGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Üretim emri tipi bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { type_code, type_name, planli_kesin, description, is_active } = req.body;
        if (!type_name) return res.status(400).json({ hata: 'type_name zorunlu.' });
        if (planli_kesin && !['Planli', 'Kesin'].includes(planli_kesin)) {
            return res.status(400).json({ hata: "planli_kesin 'Planli' veya 'Kesin' olmalı." });
        }
        const id = await withTransaction(pool, async (client) => {
            const kod = type_code || (await sonrakiKod(client, 'URETIM_EMRI_TIP'));
            const result = await client.query(
                `
                INSERT INTO production_order_types (type_code, type_name, planli_kesin, description, is_active)
                VALUES ($1,$2,COALESCE($3,'Kesin'),$4,COALESCE($5,TRUE))
                RETURNING id
                `,
                [kod, type_name, planli_kesin || null, description || null, is_active]
            );
            return result.rows[0].id;
        });
        res.status(201).json(await tipGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { type_name, planli_kesin, description, is_active } = req.body;
        if (planli_kesin && !['Planli', 'Kesin'].includes(planli_kesin)) {
            return res.status(400).json({ hata: "planli_kesin 'Planli' veya 'Kesin' olmalı." });
        }
        const result = await pool.query(
            `
            UPDATE production_order_types SET
                type_name = COALESCE($2, type_name),
                planli_kesin = COALESCE($3, planli_kesin),
                description = COALESCE($4, description),
                is_active = COALESCE($5, is_active)
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, type_name || null, planli_kesin || null, description ?? null, is_active]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Üretim emri tipi bulunamadı.' });
        res.json(await tipGetir(result.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM production_order_types WHERE id=$1 RETURNING id`,
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Üretim emri tipi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
