const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function kontakGetir(id) {
    const r = await pool.query(
        `
        SELECT k.*,
               c.partner_code, c.partner_name,
               a.lead_code, a.lead_name
        FROM crm_contacts k
        LEFT JOIN partners c ON c.id = k.partner_id
        LEFT JOIN crm_leads a ON a.id = k.lead_id
        WHERE k.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const { partner_id, lead_id, is_active } = req.query;
        const params = [];
        const where = [];
        if (partner_id) {
            params.push(Number(partner_id));
            where.push(`k.partner_id = $${params.length}`);
        }
        if (lead_id) {
            params.push(Number(lead_id));
            where.push(`k.lead_id = $${params.length}`);
        }
        if (is_active === 'true') where.push('k.is_active = TRUE');
        const liste = await pool.query(
            `
            SELECT k.*,
                   c.partner_code, c.partner_name,
                   a.lead_code, a.lead_name
            FROM crm_contacts k
            LEFT JOIN partners c ON c.id = k.partner_id
            LEFT JOIN crm_leads a ON a.id = k.lead_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY k.id DESC
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
        const row = await kontakGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Kontak bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.first_name || !b.last_name) return res.status(400).json({ hata: 'first_name ve last_name zorunlu.' });
        if (!b.partner_id && !b.lead_id) {
            return res.status(400).json({ hata: 'partner_id veya lead_id zorunlu.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const kod = b.kontak_code || (await sonrakiKod(client, 'CRM_KONTAK'));
            if (b.birincil) {
                if (b.partner_id) {
                    await client.query(
                        `UPDATE crm_contacts SET birincil=FALSE WHERE partner_id=$1`,
                        [b.partner_id]
                    );
                }
                if (b.lead_id) {
                    await client.query(
                        `UPDATE crm_contacts SET birincil=FALSE WHERE lead_id=$1`,
                        [b.lead_id]
                    );
                }
            }
            const r = await client.query(
                `
                INSERT INTO crm_contacts
                    (kontak_code, first_name, last_name, title, email, telefon, mobile_phone,
                     partner_id, lead_id, birincil, is_active, notlar)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,FALSE),COALESCE($11,TRUE),$12)
                RETURNING id
                `,
                [
                    kod, b.first_name, b.last_name, b.title || null, b.email || null, b.telefon || null,
                    b.mobile_phone || null, b.partner_id || null, b.lead_id || null, b.birincil,
                    b.is_active, b.notlar || null,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await kontakGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const r = await pool.query(
            `
            UPDATE crm_contacts SET
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                title = COALESCE($4, title),
                email = COALESCE($5, email),
                telefon = COALESCE($6, telefon),
                mobile_phone = COALESCE($7, mobile_phone),
                partner_id = COALESCE($8, partner_id),
                lead_id = COALESCE($9, lead_id),
                birincil = COALESCE($10, birincil),
                is_active = COALESCE($11, is_active),
                notlar = COALESCE($12, notlar)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.first_name || null, b.last_name || null, b.title ?? null, b.email ?? null,
                b.telefon ?? null, b.mobile_phone ?? null, b.partner_id || null, b.lead_id || null,
                b.birincil, b.is_active, b.notlar ?? null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kontak bulunamadı.' });
        res.json(await kontakGetir(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_contacts WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kontak bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
