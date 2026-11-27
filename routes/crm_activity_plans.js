const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { companyIdFromReq } = require('../src/utils/firmaScope');

async function getPlan(id) {
    const r = await pool.query(
        `
        SELECT p.*,
               type.type_code AS faaliyet_tipi_kodu, type.type_name AS faaliyet_tipi_adi,
               c.partner_code, c.partner_name,
               a.lead_code, a.lead_name,
               f.opportunity_code, f.opportunity_name,
               TRIM(CONCAT(COALESCE(g.first_name,''),' ',COALESCE(g.last_name,''))) AS giren_adi,
               TRIM(CONCAT(COALESCE(y.first_name,''),' ',COALESCE(y.last_name,''))) AS yapacak_adi,
               TRIM(CONCAT(COALESCE(kk.first_name,''),' ',COALESCE(kk.last_name,''))) AS kontak_adi,
               iy.plant_code, iy.plant_name
        FROM crm_activity_plans p
        LEFT JOIN crm_activity_types type ON type.id = p.activity_type_id
        LEFT JOIN partners c ON c.id = p.partner_id
        LEFT JOIN crm_leads a ON a.id = p.lead_id
        LEFT JOIN crm_opportunities f ON f.id = p.opportunity_id
        LEFT JOIN users g ON g.id = p.entered_by_id
        LEFT JOIN users y ON y.id = p.assignee_id
        LEFT JOIN crm_contacts kk ON kk.id = p.contact_id
        LEFT JOIN plants iy ON iy.id = p.plant_id
        WHERE p.id = $1
        `,
        [id]
    );
    if (!r.rows[0]) return null;
    const faaliyetler = await pool.query(
        `
        SELECT id, activity_code, subject, status, start_date
        FROM crm_activities WHERE plan_id=$1 ORDER BY id DESC
        `,
        [id]
    );
    return { ...r.rows[0], faaliyetler: faaliyetler.rows };
}

router.get('/', async (req, res) => {
    try {
        const { partner_id, lead_id, opportunity_id, status } = req.query;
        const params = [];
        const where = [];
        if (partner_id) { params.push(Number(partner_id)); where.push(`p.partner_id=$${params.length}`); }
        if (lead_id) { params.push(Number(lead_id)); where.push(`p.lead_id=$${params.length}`); }
        if (opportunity_id) { params.push(Number(opportunity_id)); where.push(`p.opportunity_id=$${params.length}`); }
        if (status) { params.push(status); where.push(`p.status=$${params.length}`); }
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`p.company_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT p.*,
                   type.type_name AS faaliyet_tipi_adi,
                   c.partner_name, a.lead_name, f.opportunity_code,
                   TRIM(CONCAT(COALESCE(y.first_name,''),' ',COALESCE(y.last_name,''))) AS yapacak_adi
            FROM crm_activity_plans p
            LEFT JOIN crm_activity_types type ON type.id = p.activity_type_id
            LEFT JOIN partners c ON c.id = p.partner_id
            LEFT JOIN crm_leads a ON a.id = p.lead_id
            LEFT JOIN crm_opportunities f ON f.id = p.opportunity_id
            LEFT JOIN users y ON y.id = p.assignee_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY p.start_date DESC, p.id DESC
            `,
            params
        );
        res.json(liste.rows);
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await getPlan(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });
        res.json(row);
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        const musteriTipi = b.customer_type || (b.lead_id && !b.partner_id ? 'Aday' : 'Musteri');
        if (musteriTipi === 'Musteri' && !b.partner_id && !b.opportunity_id) {
            return res.status(400).json({ hata: 'partner_id veya opportunity_id gerekli.' });
        }
        if (musteriTipi === 'Aday' && !b.lead_id && !b.opportunity_id) {
            return res.status(400).json({ hata: 'lead_id veya opportunity_id gerekli.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let cariId = b.partner_id || null;
            let adayId = b.lead_id || null;
            let type = musteriTipi;
            if (b.opportunity_id) {
                const f = await client.query(
                    'SELECT partner_id, lead_id, customer_type FROM crm_opportunities WHERE id=$1',
                    [b.opportunity_id]
                );
                if (!f.rows[0]) throw new Error('Fırsat bulunamadı.');
                cariId = cariId || f.rows[0].partner_id;
                adayId = adayId || f.rows[0].lead_id;
                type = f.rows[0].customer_type;
            }
            const kod = b.plan_code || (await nextSequenceCode(client, 'CRM_PLAN'));
            const firmaId = b.company_id || companyIdFromReq(req) || null;
            const r = await client.query(
                `
                INSERT INTO crm_activity_plans
                    (plan_code, customer_type, partner_id, lead_id, opportunity_id, contact_id,
                     activity_type_id, entered_by_id, assignee_id, plant_id,
                     start_date, end_date, status, subject, description, company_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        COALESCE($11::timestamp,CURRENT_TIMESTAMP),$12,
                        COALESCE($13,'Planlandi'),$14,$15,$16)
                RETURNING id
                `,
                [
                    kod, type, cariId, adayId, b.opportunity_id || null, b.contact_id || null,
                    b.activity_type_id || null, b.entered_by_id || null, b.assignee_id || null,
                    b.plant_id || null, b.start_date || null, b.end_date || null,
                    b.status || null, b.subject || null, b.description || null, firmaId,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await getPlan(id));
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
                opportunity_id = COALESCE($5, opportunity_id),
                contact_id = COALESCE($6, contact_id),
                activity_type_id = COALESCE($7, activity_type_id),
                entered_by_id = COALESCE($8, entered_by_id),
                assignee_id = COALESCE($9, assignee_id),
                plant_id = COALESCE($10, plant_id),
                start_date = COALESCE($11::timestamp, start_date),
                end_date = COALESCE($12::timestamp, end_date),
                status = COALESCE($13, status),
                subject = COALESCE($14, subject),
                description = COALESCE($15, description)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.customer_type || null, b.partner_id || null, b.lead_id || null,
                b.opportunity_id || null, b.contact_id || null, b.activity_type_id || null,
                b.entered_by_id || null, b.assignee_id || null, b.plant_id || null,
                b.start_date || null, b.end_date || null, b.status || null,
                b.subject ?? null, b.description ?? null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });
        res.json(await getPlan(r.rows[0].id));
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

/** Plandan faaliyet oluştur */
router.post('/:id/faaliyet-olustur', async (req, res) => {
    try {
        const plan = await getPlan(req.params.id);
        if (!plan) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });

        const id = await withTransaction(pool, async (client) => {
            const kod = await nextSequenceCode(client, 'CRM_FAALIYET');
            const r = await client.query(
                `
                INSERT INTO crm_activities
                    (activity_code, customer_type, partner_id, lead_id, opportunity_id, plan_id, contact_id,
                     activity_type_id, entered_by_id, plant_id, start_date,
                     subject, description, status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,$11,$12,'Tamamlandi')
                RETURNING id
                `,
                [
                    kod, plan.customer_type, plan.partner_id, plan.lead_id, plan.opportunity_id, plan.id,
                    plan.contact_id, plan.activity_type_id, plan.assignee_id || plan.entered_by_id,
                    plan.plant_id, req.body.subject || plan.subject,
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
            plan: await getPlan(plan.id),
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
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
