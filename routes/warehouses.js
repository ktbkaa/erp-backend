const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

// Tüm depoları listele (firma + iş yeri bilgisiyle)
router.get('/', async (req, res) => {
    try {
        const firmaId = firmaIdFromReq(req);
        const params = [];
        let firmaWhere = '';
        if (firmaId) {
            params.push(firmaId);
            firmaWhere = `WHERE i.company_id = $${params.length}`;
        }
        let result = await pool.query(
            `
            SELECT d.*, i.plant_code, i.plant_name, f.company_code, f.company_name
            FROM warehouses d
            JOIN plants i ON d.plant_id = i.id
            JOIN companies f ON i.company_id = f.id
            ${firmaWhere}
            ORDER BY d.plant_id ASC, d.varsayilan DESC, d.id ASC
            `,
            params
        );
        // ?yetkili=1 → kullanıcı depo yetkisi filtresi (PLT-008)
        if (String(req.query.yetkili || '') === '1' && req.user) {
            const { parseJsonArr } = require('../src/middleware/authJwt');
            const list = parseJsonArr(req.user.warehouse_yetkileri, ['*']);
            if (!list.includes('*')) {
                result = {
                    rows: result.rows.filter(
                        (d) => list.includes(String(d.id)) || list.includes(d.warehouse_code)
                    ),
                };
            } else {
                const kd = await pool.query(
                    `SELECT warehouse_id FROM user_warehouses WHERE kisi_id=$1`,
                    [req.user.id]
                ).catch(() => ({ rows: [] }));
                if (kd.rows.length) {
                    const ids = new Set(kd.rows.map((r) => r.warehouse_id));
                    result = { rows: result.rows.filter((d) => ids.has(d.id)) };
                }
            }
        }
        res.json(result.rows);
    } catch (err) {
        console.error('Depo listeleme hatası:', err);
        res.status(500).json({ hata: 'Depolar çekilirken bir pürüz çıktı.', detay: err.message });
    }
});

// Tek depo
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT d.*, i.plant_code, i.plant_name, f.company_code, f.company_name
            FROM warehouses d
            JOIN plants i ON d.plant_id = i.id
            JOIN companies f ON i.company_id = f.id
            WHERE d.id = $1
            `,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ hata: 'Depo bulunamadı.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Depo getirme hatası:', err);
        res.status(500).json({ hata: 'Depo getirilirken bir pürüz çıktı.', detay: err.message });
    }
});

// Yeni depo
router.post('/', async (req, res) => {
    try {
        const { plant_id, warehouse_code, warehouse_name, is_active, varsayilan, raf_code, konum_code, warehouse_rolu } = req.body;

        const kod = typeof warehouse_code === 'string' ? warehouse_code.trim() : warehouse_code;
        if (!plant_id || !warehouse_name) {
            return res.status(400).json({
                hata: 'plant_id ve warehouse_name zorunludur.',
            });
        }
        if (!kod) {
            return res.status(400).json({ hata: 'warehouse_code zorunludur.' });
        }

        const yeniDepo = await withTransaction(pool, async (client) => {
            const isYeri = await client.query(
                'SELECT id FROM plants WHERE id = $1',
                [plant_id]
            );
            if (isYeri.rows.length === 0) {
                throw Object.assign(
                    new Error(`İş yeri bulunamadı (id=${plant_id}). Önce /is-yerleri ile kontrol et.`),
                    { status: 400 }
                );
            }

            const anaDepoMu = varsayilan === true || varsayilan === 'true';

            // Bu iş yerinde ilk depo ise otomatik varsayılan yap
            const mevcut = await client.query(
                'SELECT COUNT(*)::int AS adet FROM warehouses WHERE plant_id = $1',
                [plant_id]
            );
            const ilkDepo = mevcut.rows[0].adet === 0;
            const varsayilanOlacak = anaDepoMu || ilkDepo;

            if (varsayilanOlacak) {
                await client.query(
                    'UPDATE warehouses SET varsayilan = FALSE WHERE plant_id = $1',
                    [plant_id]
                );
            }

            const result = await client.query(
                `
                INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, varsayilan, raf_code, konum_code, warehouse_rolu)
                VALUES ($1, $2, $3, COALESCE($4, TRUE), $5, $6, $7, COALESCE($8, 'Normal'))
                RETURNING *;
                `,
                [
                    plant_id, kod, warehouse_name, is_active, varsayilanOlacak,
                    raf_code || null, konum_code || null, warehouse_rolu || 'Normal',
                ]
            );
            return result.rows[0];
        });

        res.status(201).json(yeniDepo);
    } catch (err) {
        console.error('Depo kayıt hatası:', err);
        const status = err.status || 500;
        res.status(status).json({
            hata: err.message || 'Depo eklenirken bir pürüz çıktı.',
            detay: err.detail || undefined,
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { warehouse_name, is_active, varsayilan, plant_id, raf_code, konum_code, warehouse_rolu } = req.body;
        if (!warehouse_name) return res.status(400).json({ hata: 'warehouse_name zorunludur.' });

        const row = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT * FROM warehouses WHERE id = $1', [req.params.id]);
            if (!mevcut.rows[0]) throw Object.assign(new Error('Depo bulunamadı.'), { status: 404 });

            const isYeriId = plant_id || mevcut.rows[0].plant_id;
            const anaDepoMu = varsayilan === true || varsayilan === 'true';
            if (anaDepoMu) {
                await client.query('UPDATE warehouses SET varsayilan = FALSE WHERE plant_id = $1', [isYeriId]);
            }

            const result = await client.query(
                `
                UPDATE warehouses SET
                    plant_id = $2,
                    warehouse_name = $3,
                    is_active = COALESCE($4, is_active),
                    varsayilan = COALESCE($5, varsayilan),
                    raf_code = COALESCE($6, raf_code),
                    konum_code = COALESCE($7, konum_code),
                    warehouse_rolu = COALESCE($8, warehouse_rolu)
                WHERE id = $1
                RETURNING *
                `,
                [
                    req.params.id,
                    isYeriId,
                    warehouse_name,
                    typeof is_active === 'boolean' ? is_active : null,
                    typeof varsayilan === 'boolean' ? varsayilan : null,
                    raf_code !== undefined ? (raf_code || null) : null,
                    konum_code !== undefined ? (konum_code || null) : null,
                    warehouse_rolu || null,
                ]
            );
            return result.rows[0];
        });

        const full = await pool.query(
            `
            SELECT d.*, i.plant_code, i.plant_name, f.company_code, f.company_name
            FROM warehouses d
            JOIN plants i ON d.plant_id = i.id
            JOIN companies f ON i.company_id = f.id
            WHERE d.id = $1
            `,
            [row.id]
        );
        res.json(full.rows[0]);
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM warehouses WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Depo bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
