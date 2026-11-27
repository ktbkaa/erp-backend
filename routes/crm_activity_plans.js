const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function planGetir(id) {
    const r = await pool.query(
        `
        SELECT p.*,
               type.type_code AS faaliyet_tipi_kodu, type.type_name AS faaliyet_tipi_adi,
               c.partner_code, c.partner_name,
               a.lead_code, a.lead_name,
               f.firsat_code, f.firsat_name,
               TRIM(CONCAT(COALESCE(g.first_name,''),' ',COALESCE(g.last_name,''))) AS giren_adi,
               TRIM(CONCAT(COALESCE(y.first_name,''),' ',COALESCE(y.last_name,''))) AS yapacak_adi,
               TRIM(CONCAT(COALESCE(kk.first_name,''),' ',COALESCE(kk.last_name,''))) AS kontak_adi,
               iy.plant_code, iy.plant_name
        FROM crm_activity_plans p
        LEFT JOIN crm_activity_types type ON type.id = p.faaliyet_type_id
        LEFT JOIN partners c ON c.id = p.partner_id
        LEFT JOIN crm_leads a ON a.id = p.lead_id
        LEFT JOIN crm_opportunities f ON f.id = p.firsat_id
        LEFT JOIN users g ON g.id = p.giren_id
        LEFT JOIN users y ON y.id = p.yapacak_id
        LEFT JOIN crm_contacts kk ON kk.id = p.kontak_id
        LEFT JOIN plants iy ON iy.id = p.plant_id
        WHERE p.id = $1
        `,
        [id]
    );
    if (!r.rows[0]) return null;
    const faaliyetler = await pool.query(
        `
        SELECT id, faaliyet_code, konu, status, start_date
        FROM crm_activities WHERE plan_id=$1 ORDER BY id DESC
        `,
        [id]
    );
    return { ...r.rows[0], faaliyetler: faaliyetler.rows };
}

router.get('/', async (req, res) => {
    try {
        const { partner_id, lead_id, firsat_id, status } = req.query;
        const params = [];
        const where = [];
        if (partner_id) { params.push(Number(partner_id)); where.push(`p.partner_id=$${params.length}`); }
        if (lead_id) { params.push(Number(lead_id)); where.push(`p.lead_id=$${params.length}`); }
        if (firsat_id) { params.push(Number(firsat_id)); where.push(`p.firsat_id=$${params.length}`); }
        if (status) { params.push(status); where.push(`p.status=$${params.length}`); }
        const liste = await pool.query(
            `
            SELECT p.*,
                   type.type_name AS faaliyet_tipi_adi,
                   c.partner_name, a.lead_name, f.firsat_code,
                   TRIM(CONCAT(COALESCE(y.first_name,''),' ',COALESCE(y.last_name,''))) AS yapacak_adi
            FROM crm_activity_plans p
            LEFT JOIN crm_activity_types type ON type.id = p.faaliyet_type_id
            LEFT JOIN partners c ON c.id = p.partner_id
            LEFT JOIN crm_leads a ON a.id = p.lead_id
            LEFT JOIN crm_opportunities f ON f.id = p.firsat_id
            LEFT JOIN users y ON y.id = p.yapacak_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY p.start_date DESC, p.id DESC
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
        const row = await planGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        const musteriTipi = b.customer_type || (b.lead_id && !b.partner_id ? 'Aday' : 'Musteri');
        if (musteriTipi === 'Musteri' && !b.partner_id && !b.firsat_id) {
            return res.status(400).json({ hata: 'partner_id veya firsat_id gerekli.' });
        }
        if (musteriTipi === 'Aday' && !b.lead_id && !b.firsat_id) {
            return res.status(400).json({ hata: 'lead_id veya firsat_id gerekli.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let cariId = b.partner_id || null;
            let adayId = b.lead_id || null;
            let type = musteriTipi;
            if (b.firsat_id) {
                const f = await client.query(
                    'SELECT partner_id, lead_id, customer_type FROM crm_opportunities WHERE id=$1',
                    [b.firsat_id]
                );
                if (!f.rows[0]) throw new Error('Fırsat bulunamadı.');
                cariId = cariId || f.rows[0].partner_id;
                adayId = adayId || f.rows[0].lead_id;
                type = f.rows[0].customer_type;
            }
            const kod = b.plan_code || (await sonrakiKod(client, 'CRM_PLAN'));
            const r = await client.query(
                `
                INSERT INTO crm_activity_plans
                    (plan_code, customer_type, partner_id, lead_id, firsat_id, kontak_id,
                     faaliyet_type_id, giren_id, yapacak_id, plant_id,
                     start_date, end_date, status, konu, description)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        COALESCE($11::timestamp,CURRENT_TIMESTAMP),$12,
                        COALESCE($13,'Planlandi'),$14,$15)
                RETURNING id
                `,
                [
                    kod, type, cariId, adayId, b.firsat_id || null, b.kontak_id || null,
                    b.faaliyet_type_id || null, b.giren_id || null, b.yapacak_id || null,
                    b.plant_id || null, b.start_date || null, b.end_date || null,
                    b.status || null, b.konu || null, b.description || null,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await planGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const r = await pool.query(
            `
            UPDATE crm_activity_plans SET
                customer_type = COALESCE($2, customer_type),
                partner_id = COALESCE($3, partner_id),
                lead_id = COALESCE($4, lead_id),
                firsat_id = COALESCE($5, firsat_id),
                kontak_id = COALESCE($6, kontak_id),
                faaliyet_type_id = COALESCE($7, faaliyet_type_id),
                giren_id = COALESCE($8, giren_id),
                yapacak_id = COALESCE($9, yapacak_id),
                plant_id = COALESCE($10, plant_id),
                start_date = COALESCE($11::timestamp, start_date),
                end_date = COALESCE($12::timestamp, end_date),
                status = COALESCE($13, status),
                konu = COALESCE($14, konu),
                description = COALESCE($15, description)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.customer_type || null, b.partner_id || null, b.lead_id || null,
                b.firsat_id || null, b.kontak_id || null, b.faaliyet_type_id || null,
                b.giren_id || null, b.yapacak_id || null, b.plant_id || null,
                b.start_date || null, b.end_date || null, b.status || null,
                b.konu ?? null, b.description ?? null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });
        res.json(await planGetir(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Plandan faaliyet oluştur */
router.post('/:id/faaliyet-olustur', async (req, res) => {
    try {
        const plan = await planGetir(req.params.id);
        if (!plan) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });

        const id = await withTransaction(pool, async (client) => {
            const kod = await sonrakiKod(client, 'CRM_FAALIYET');
            const r = await client.query(
                `
                INSERT INTO crm_activities
                    (faaliyet_code, customer_type, partner_id, lead_id, firsat_id, plan_id, kontak_id,
                     faaliyet_type_id, giren_id, plant_id, start_date,
                     konu, description, status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,$11,$12,'Tamamlandi')
                RETURNING id
                `,
                [
                    kod, plan.customer_type, plan.partner_id, plan.lead_id, plan.firsat_id, plan.id,
                    plan.kontak_id, plan.faaliyet_type_id, plan.yapacak_id || plan.giren_id,
                    plan.plant_id, req.body.konu || plan.konu,
                    req.body.description || plan.description || `Plan ${plan.plan_code}`,
                ]
            );
            await client.query(
                `UPDATE crm_activity_plans SET status='Tamamlandi' WHERE id=$1`,
                [plan.id]
            );
            return r.rows[0].id;
        });

        const faaliyet = await pool.query('SELECT * FROM crm_activities WHERE id=$1', [id]);
        res.status(201).json({
            ok: true,
            faaliyet: faaliyet.rows[0],
            plan: await planGetir(plan.id),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query(
            'DELETE FROM crm_activity_plans WHERE id=$1 RETURNING id',
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
