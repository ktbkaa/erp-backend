const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function gorevGetir(id) {
    const r = await pool.query(
        `
        SELECT g.*,
               TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS sorumlu_adi,
               c.partner_code, c.partner_name,
               a.lead_code, a.lead_name,
               f.firsat_code, f.firsat_name,
               fy.faaliyet_code
        FROM crm_tasks g
        LEFT JOIN users k ON k.id = g.sorumlu_id
        LEFT JOIN partners c ON c.id = g.partner_id
        LEFT JOIN crm_leads a ON a.id = g.lead_id
        LEFT JOIN crm_opportunities f ON f.id = g.firsat_id
        LEFT JOIN crm_activities fy ON fy.id = g.faaliyet_id
        WHERE g.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const { status, sorumlu_id, firsat_id, partner_id } = req.query;
        const params = [];
        const where = [];
        if (status) { params.push(status); where.push(`g.status=$${params.length}`); }
        if (sorumlu_id) { params.push(Number(sorumlu_id)); where.push(`g.sorumlu_id=$${params.length}`); }
        if (firsat_id) { params.push(Number(firsat_id)); where.push(`g.firsat_id=$${params.length}`); }
        if (partner_id) { params.push(Number(partner_id)); where.push(`g.partner_id=$${params.length}`); }
        const liste = await pool.query(
            `
            SELECT g.*,
                   TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS sorumlu_adi,
                   c.partner_name, a.lead_name, f.firsat_code
            FROM crm_tasks g
            LEFT JOIN users k ON k.id = g.sorumlu_id
            LEFT JOIN partners c ON c.id = g.partner_id
            LEFT JOIN crm_leads a ON a.id = g.lead_id
            LEFT JOIN crm_opportunities f ON f.id = g.firsat_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY
                CASE g.status WHEN 'Acik' THEN 0 WHEN 'Devam' THEN 1 ELSE 2 END,
                g.son_date NULLS LAST, g.id DESC
            `,
            params
        );
        res.json(liste.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await gorevGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Görev bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.baslik) return res.status(400).json({ hata: 'baslik zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const kod = b.gorev_code || (await sonrakiKod(client, 'CRM_GOREV'));
            const r = await client.query(
                `
                INSERT INTO crm_tasks
                    (gorev_code, baslik, description, sorumlu_id, partner_id, lead_id, firsat_id,
                     faaliyet_id, priority, status, son_date)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'Normal'),COALESCE($10,'Acik'),$11)
                RETURNING id
                `,
                [
                    kod, b.baslik, b.description || null, b.sorumlu_id || null, b.partner_id || null,
                    b.lead_id || null, b.firsat_id || null, b.faaliyet_id || null,
                    b.priority || null, b.status || null, b.son_date || null,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await gorevGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        let tamamlanma = null;
        if (b.status === 'Tamamlandi') tamamlanma = new Date();
        const r = await pool.query(
            `
            UPDATE crm_tasks SET
                baslik = COALESCE($2, baslik),
                description = COALESCE($3, description),
                sorumlu_id = COALESCE($4, sorumlu_id),
                partner_id = COALESCE($5, partner_id),
                lead_id = COALESCE($6, lead_id),
                firsat_id = COALESCE($7, firsat_id),
                faaliyet_id = COALESCE($8, faaliyet_id),
                priority = COALESCE($9, priority),
                status = COALESCE($10, status),
                son_date = COALESCE($11::date, son_date),
                tamamlanma_date = CASE
                    WHEN $10 = 'Tamamlandi' THEN COALESCE(tamamlanma_date, CURRENT_TIMESTAMP)
                    WHEN $10 IS NOT NULL AND $10 <> 'Tamamlandi' THEN NULL
                    ELSE tamamlanma_date
                END
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.baslik || null, b.description ?? null, b.sorumlu_id || null,
                b.partner_id || null, b.lead_id || null, b.firsat_id || null, b.faaliyet_id || null,
                b.priority || null, b.status || null, b.son_date || null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Görev bulunamadı.' });
        res.json(await gorevGetir(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/:id/tamamla', async (req, res) => {
    try {
        const r = await pool.query(
            `
            UPDATE crm_tasks SET
                status='Tamamlandi', tamamlanma_date=CURRENT_TIMESTAMP
            WHERE id=$1 AND status IN ('Acik','Devam')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!r.rows[0]) {
            return res.status(400).json({ hata: 'Görev tamamlanamadı (bulunamadı veya accepted değil).' });
        }
        res.json(await gorevGetir(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_tasks WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Görev bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
