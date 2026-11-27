const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function adayGetir(id) {
    const a = await pool.query(
        `
        SELECT a.*,
               k.first_name AS sorumlu_ad, k.last_name AS sorumlu_soyad,
               TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS sorumlu_adi,
               c.partner_code, c.partner_name
        FROM crm_leads a
        LEFT JOIN users k ON k.id = a.sorumlu_id
        LEFT JOIN partners c ON c.id = a.partner_id
        WHERE a.id = $1
        `,
        [id]
    );
    if (!a.rows[0]) return null;
    const [kontaklar, firsatlar, faaliyetler] = await Promise.all([
        pool.query(
            `SELECT * FROM crm_contacts WHERE lead_id=$1 ORDER BY birincil DESC, id`,
            [id]
        ),
        pool.query(
            `
            SELECT f.id, f.firsat_code, f.firsat_name, f.status, f.beklenen_gelir,
                   asama.stage_code, asama.stage_name
            FROM crm_opportunities f
            JOIN crm_opportunity_stages asama ON asama.id = f.stage_id
            WHERE f.lead_id=$1 ORDER BY f.id DESC
            `,
            [id]
        ),
        pool.query(
            `
            SELECT fy.id, fy.faaliyet_code, fy.konu, fy.status, fy.start_date,
                   t.type_name AS faaliyet_tipi_adi
            FROM crm_activities fy
            LEFT JOIN crm_activity_types t ON t.id = fy.faaliyet_type_id
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
        const liste = await pool.query(
            `
            SELECT a.*,
                   TRIM(CONCAT(COALESCE(k.first_name,''),' ',COALESCE(k.last_name,''))) AS sorumlu_adi,
                   c.partner_code
            FROM crm_leads a
            LEFT JOIN users k ON k.id = a.sorumlu_id
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
        const row = await adayGetir(req.params.id);
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
            const kod = b.lead_code || (await sonrakiKod(client, 'CRM_ADAY'));
            const r = await client.query(
                `
                INSERT INTO crm_leads
                    (lead_code, lead_name, status, sorumlu_id, degerlendirme, tercih_sebebi,
                     bulma_yontemi, priority, telefon, mobile_phone, email, website, fax,
                     address, il, district, country, postal_code, sektor_code, notlar, is_active)
                VALUES ($1,$2,COALESCE($3,'Yeni'),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                        $14,$15,$16,COALESCE($17,'TR'),$18,$19,$20,COALESCE($21,TRUE))
                RETURNING id
                `,
                [
                    kod, b.lead_name, b.status || null, b.sorumlu_id || null,
                    b.degerlendirme ?? null, b.tercih_sebebi || null, b.bulma_yontemi || null,
                    b.priority || null, b.telefon || null, b.mobile_phone || null, b.email || null,
                    b.website || null, b.fax || null, b.address || null, b.il || null,
                    b.district || null, b.country || null, b.postal_code || null, b.sektor_code || null,
                    b.notlar || null, b.is_active,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await adayGetir(id));
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
                sorumlu_id = COALESCE($4, sorumlu_id),
                degerlendirme = COALESCE($5, degerlendirme),
                tercih_sebebi = COALESCE($6, tercih_sebebi),
                bulma_yontemi = COALESCE($7, bulma_yontemi),
                priority = COALESCE($8, priority),
                telefon = COALESCE($9, telefon),
                mobile_phone = COALESCE($10, mobile_phone),
                email = COALESCE($11, email),
                website = COALESCE($12, website),
                fax = COALESCE($13, fax),
                address = COALESCE($14, address),
                il = COALESCE($15, il),
                district = COALESCE($16, district),
                country = COALESCE($17, country),
                postal_code = COALESCE($18, postal_code),
                sektor_code = COALESCE($19, sektor_code),
                notlar = COALESCE($20, notlar),
                is_active = COALESCE($21, is_active)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.lead_name || null, b.status || null, b.sorumlu_id || null,
                b.degerlendirme ?? null, b.tercih_sebebi ?? null, b.bulma_yontemi ?? null,
                b.priority ?? null, b.telefon ?? null, b.mobile_phone ?? null, b.email ?? null,
                b.website ?? null, b.fax ?? null, b.address ?? null, b.il ?? null,
                b.district ?? null, b.country ?? null, b.postal_code ?? null, b.sektor_code ?? null,
                b.notlar ?? null, b.is_active,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        res.json(await adayGetir(r.rows[0].id));
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
        const aday = await adayGetir(req.params.id);
        if (!aday) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        if (aday.status === 'Donusturuldu' && aday.partner_id) {
            return res.status(400).json({ hata: 'Aday zaten cariye dönüştürülmüş.', partner_id: aday.partner_id });
        }

        const result = await withTransaction(pool, async (client) => {
            const kod = req.body.partner_code || (await sonrakiKod(client, 'MUSTERI'));
            const cari = await client.query(
                `
                INSERT INTO partners
                    (partner_code, partner_name, partner_type, telefon, email, address, il, district, country,
                     postal_code, website, fax, mobile_phone, is_active, notlar)
                VALUES ($1,$2,'Musteri',$3,$4,$5,$6,$7,COALESCE($8,'TR'),$9,$10,$11,$12,TRUE,$13)
                RETURNING id, partner_code, partner_name
                `,
                [
                    kod, aday.lead_name, aday.telefon, aday.email, aday.address, aday.il, aday.district,
                    aday.country, aday.postal_code, aday.website, aday.fax, aday.mobile_phone, aday.notlar,
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
            aday: await adayGetir(aday.id),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_leads WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
