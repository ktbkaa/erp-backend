const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { companyIdFromReq } = require('../src/utils/firmaScope');

async function getLead(id) {
    const a = await pool.query(
        `
        SELECT a.*,
               k.first_name AS sorumlu_ad, k.last_name AS sorumlu_soyad,
               TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS sorumlu_adi,
               c.partner_code, c.partner_name
        FROM crm_leads a
        LEFT JOIN users k ON k.id = a.owner_id
        LEFT JOIN partners c ON c.id = a.partner_id
        WHERE a.id = $1
        `,
        [id]
    );
    if (!a.rows[0]) return null;
    const [kontaklar, firsatlar, faaliyetler] = await Promise.all([
        pool.query(
            `SELECT * FROM crm_contacts WHERE lead_id=$1 ORDER BY is_primary DESC, id`,
            [id]
        ),
        pool.query(
            `
            SELECT f.id, f.firsat_code, f.firsat_name, f.status, f.expected_revenue,
                   asama.stage_code, asama.stage_name
            FROM crm_opportunities f
            JOIN crm_opportunity_stages asama ON asama.id = f.stage_id
            WHERE f.lead_id=$1 ORDER BY f.id DESC
            `,
            [id]
        ),
        pool.query(
            `
            SELECT fy.id, fy.activity_code, fy.subject, fy.status, fy.start_date,
                   t.type_name AS faaliyet_tipi_adi
            FROM crm_activities fy
            LEFT JOIN crm_activity_types t ON t.id = fy.activity_type_id
            WHERE fy.lead_id=$1 ORDER BY fy.start_date DESC LIMIT 50
            `,
            [id]
        ),
    ]);
    return {
        ...a.rows[0],
        kontaklar: kontaklar.rows,
        firsatlar: firsatlar.rows,
        faaliyetler: faaliyetler.rows,
    };
}

router.get('/', async (req, res) => {
    try {
        const { status, is_active } = req.query;
        const params = [];
        const where = [];
        if (status) {
            params.push(status);
            where.push(`a.status = $${params.length}`);
        }
        if (is_active === 'true') where.push('a.is_active = TRUE');
        if (is_active === 'false') where.push('a.is_active = FALSE');
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`a.company_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT a.*,
                   TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS sorumlu_adi,
                   c.partner_code
            FROM crm_leads a
            LEFT JOIN users k ON k.id = a.owner_id
            LEFT JOIN partners c ON c.id = a.partner_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY a.id DESC
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
        const row = await getLead(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.lead_name) return res.status(400).json({ hata: 'lead_name zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const kod = b.lead_code || (await nextSequenceCode(client, 'CRM_ADAY'));
            const firmaId = b.company_id || companyIdFromReq(req) || null;
            const r = await client.query(
                `
                INSERT INTO crm_leads
                    (lead_code, lead_name, status, owner_id, rating, preference_reason,
                     lead_source, priority, phone, mobile_phone, email, website, fax,
                     address, province, district, country, postal_code, industry_code, notes, is_active,
                     company_id)
                VALUES ($1,$2,COALESCE($3,'Yeni'),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                        $14,$15,$16,COALESCE($17,'TR'),$18,$19,$20,COALESCE($21,TRUE),$22)
                RETURNING id
                `,
                [
                    kod, b.lead_name, b.status || null, b.owner_id || null,
                    b.rating ?? null, b.preference_reason || null, b.lead_source || null,
                    b.priority || null, b.phone || null, b.mobile_phone || null, b.email || null,
                    b.website || null, b.fax || null, b.address || null, b.province || null,
                    b.district || null, b.country || null, b.postal_code || null, b.industry_code || null,
                    b.notes || null, b.is_active, firmaId,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await getLead(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const allowed = ['Yeni', 'Nitelikli', 'Kazanildi', 'Kaybedildi', 'Donusturuldu'];
        if (b.status && !allowed.includes(b.status)) {
            return res.status(400).json({ hata: `Geçersiz status: ${b.status}` });
        }
        const r = await pool.query(
            `
            UPDATE crm_leads SET
                lead_name = COALESCE($2, lead_name),
                status = COALESCE($3, status),
                owner_id = COALESCE($4, owner_id),
                rating = COALESCE($5, rating),
                preference_reason = COALESCE($6, preference_reason),
                lead_source = COALESCE($7, lead_source),
                priority = COALESCE($8, priority),
                phone = COALESCE($9, phone),
                mobile_phone = COALESCE($10, mobile_phone),
                email = COALESCE($11, email),
                website = COALESCE($12, website),
                fax = COALESCE($13, fax),
                address = COALESCE($14, address),
                province = COALESCE($15, province),
                district = COALESCE($16, district),
                country = COALESCE($17, country),
                postal_code = COALESCE($18, postal_code),
                industry_code = COALESCE($19, industry_code),
                notes = COALESCE($20, notes),
                is_active = COALESCE($21, is_active)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.lead_name || null, b.status || null, b.owner_id || null,
                b.rating ?? null, b.preference_reason ?? null, b.lead_source ?? null,
                b.priority ?? null, b.phone ?? null, b.mobile_phone ?? null, b.email ?? null,
                b.website ?? null, b.fax ?? null, b.address ?? null, b.province ?? null,
                b.district ?? null, b.country ?? null, b.postal_code ?? null, b.industry_code ?? null,
                b.notes ?? null, b.is_active,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        res.json(await getLead(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Aday → Cari (Musteri) dönüşümü
 * Body: { partner_code? }
 */
router.post('/:id/cariye-donustur', async (req, res) => {
    try {
        const aday = await getLead(req.params.id);
        if (!aday) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        if (aday.status === 'Donusturuldu' && aday.partner_id) {
            return res.status(400).json({
                hata: 'Aday zaten cariye dönüştürülmüş.',
                partner_id: aday.partner_id,
                cari: { id: aday.partner_id, partner_code: aday.partner_code, partner_name: aday.partner_name },
            });
        }
        // Donusturuldu ama cari yoksa (UI yarım kaldı) — yeniden dene

        const result = await withTransaction(pool, async (client) => {
            const kod = req.body.partner_code || (await nextSequenceCode(client, 'MUSTERI'));
            const cari = await client.query(
                `
                INSERT INTO partners
                    (partner_code, partner_name, partner_type, phone, email, address, province, district, country,
                     postal_code, website, fax, mobile_phone, is_active, notes)
                VALUES ($1,$2,'Musteri',$3,$4,$5,$6,$7,COALESCE($8,'TR'),$9,$10,$11,$12,TRUE,$13)
                RETURNING id, partner_code, partner_name
                `,
                [
                    kod, aday.lead_name, aday.phone, aday.email, aday.address, aday.province, aday.district,
                    aday.country, aday.postal_code, aday.website, aday.fax, aday.mobile_phone, aday.notes,
                ]
            );
            const cariId = cari.rows[0].id;
            await client.query(
                `
                UPDATE crm_leads SET
                    status='Donusturuldu', partner_id=$2, donusum_date=CURRENT_TIMESTAMP
                WHERE id=$1
                `,
                [aday.id, cariId]
            );
            // Kontakları cariye taşı
            await client.query(
                `UPDATE crm_contacts SET partner_id=$2 WHERE lead_id=$1 AND partner_id IS NULL`,
                [aday.id, cariId]
            );
            // Açık fırsatları cariye bağla
            await client.query(
                `
                UPDATE crm_opportunities SET customer_type='Musteri', partner_id=$2
                WHERE lead_id=$1 AND status='Acik'
                `,
                [aday.id, cariId]
            );
            return cari.rows[0];
        });

        res.status(201).json({
            ok: true,
            cari: result,
            aday: await getLead(aday.id),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_leads WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
