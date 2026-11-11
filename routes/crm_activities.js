const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { companyIdFromReq } = require('../src/utils/firmaScope');

async function getActivity(id) {
    const r = await pool.query(
        `
        SELECT fy.*,
               type.type_code AS faaliyet_tipi_kodu, type.type_name AS faaliyet_tipi_adi,
               c.partner_code, c.partner_name,
               a.lead_code, a.lead_name,
               f.opportunity_code, f.opportunity_name,
               p.plan_code,
               TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS giren_adi,
               TRIM(CONCAT(COALESCE(kk.first_name,''),' ',COALESCE(kk.last_name,''))) AS kontak_adi,
               iy.plant_code, iy.plant_name
        FROM crm_activities fy
        LEFT JOIN crm_activity_types type ON type.id = fy.activity_type_id
        LEFT JOIN partners c ON c.id = fy.partner_id
        LEFT JOIN crm_leads a ON a.id = fy.lead_id
        LEFT JOIN crm_opportunities f ON f.id = fy.opportunity_id
        LEFT JOIN crm_activity_plans p ON p.id = fy.plan_id
        LEFT JOIN users k ON k.id = fy.entered_by_id
        LEFT JOIN crm_contacts kk ON kk.id = fy.contact_id
        LEFT JOIN plants iy ON iy.id = fy.plant_id
        WHERE fy.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

function resolveCustomerType(b) {
    if (b.customer_type) return b.customer_type;
    if (b.lead_id && !b.partner_id) return 'Aday';
    return 'Musteri';
}

router.get('/', async (req, res) => {
    try {
        const { partner_id, lead_id, opportunity_id, status } = req.query;
        const params = [];
        const where = [];
        if (partner_id) { params.push(Number(partner_id)); where.push(`fy.partner_id=$${params.length}`); }
        if (lead_id) { params.push(Number(lead_id)); where.push(`fy.lead_id=$${params.length}`); }
        if (opportunity_id) { params.push(Number(opportunity_id)); where.push(`fy.opportunity_id=$${params.length}`); }
        if (status) { params.push(status); where.push(`fy.status=$${params.length}`); }
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`fy.company_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT fy.*,
                   type.type_name AS faaliyet_tipi_adi,
                   c.partner_name, a.lead_name, f.opportunity_code,
                   TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS giren_adi
            FROM crm_activities fy
            LEFT JOIN crm_activity_types type ON type.id = fy.activity_type_id
            LEFT JOIN partners c ON c.id = fy.partner_id
            LEFT JOIN crm_leads a ON a.id = fy.lead_id
            LEFT JOIN crm_opportunities f ON f.id = fy.opportunity_id
            LEFT JOIN users k ON k.id = fy.entered_by_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY fy.start_date DESC, fy.id DESC
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
        const row = await getActivity(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Faaliyet bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.description && !b.subject) {
            return res.status(400).json({ hata: 'konu veya açıklama zorunlu.' });
        }
        const musteriTipi = resolveCustomerType(b);
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
            if (b.plan_id) {
                await client.query(
                    `UPDATE crm_activity_plans SET status='Tamamlandi'
                     WHERE id=$1 AND status IN ('Planlandi','Devam')`,
                    [b.plan_id]
                );
            }
            const kod = b.activity_code || (await nextSequenceCode(client, 'CRM_FAALIYET'));
            const firmaId = b.company_id || companyIdFromReq(req) || null;
            const r = await client.query(
                `
                INSERT INTO crm_activities
                    (activity_code, customer_type, partner_id, lead_id, opportunity_id, plan_id, contact_id,
                     activity_type_id, entered_by_id, plant_id, start_date, end_date,
                     spent_minutes, subject, description, rating, status, company_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        COALESCE($11::timestamp,CURRENT_TIMESTAMP),$12,
                        COALESCE($13,0),$14,$15,$16,COALESCE($17,'Tamamlandi'),$18)
                RETURNING id
                `,
                [
                    kod, type, cariId, adayId, b.opportunity_id || null, b.plan_id || null,
                    b.contact_id || null, b.activity_type_id || null, b.entered_by_id || null,
                    b.plant_id || null, b.start_date || null, b.end_date || null,
                    b.spent_minutes, b.subject || null, b.description || null, b.rating || null,
                    b.status || null, firmaId,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await getActivity(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const r = await pool.query(
            `
            UPDATE crm_activities SET
                customer_type = COALESCE($2, customer_type),
                partner_id = COALESCE($3, partner_id),
                lead_id = COALESCE($4, lead_id),
                opportunity_id = COALESCE($5, opportunity_id),
                plan_id = COALESCE($6, plan_id),
                contact_id = COALESCE($7, contact_id),
                activity_type_id = COALESCE($8, activity_type_id),
                entered_by_id = COALESCE($9, entered_by_id),
                plant_id = COALESCE($10, plant_id),
                start_date = COALESCE($11::timestamp, start_date),
                end_date = COALESCE($12::timestamp, end_date),
                spent_minutes = COALESCE($13, spent_minutes),
                subject = COALESCE($14, subject),
                description = COALESCE($15, description),
                rating = COALESCE($16, rating),
                status = COALESCE($17, status)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.customer_type || null, b.partner_id || null, b.lead_id || null,
                b.opportunity_id || null, b.plan_id || null, b.contact_id || null,
                b.activity_type_id || null, b.entered_by_id || null, b.plant_id || null,
                b.start_date || null, b.end_date || null, b.spent_minutes ?? null,
                b.subject ?? null, b.description ?? null, b.rating ?? null, b.status || null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet bulunamadı.' });
        res.json(await getActivity(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_activities WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
