const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function kontakGetir(id) {
    const r = await pool.query(
        `
        SELECT k.*,
               c.cari_kodu, c.cari_adi,
               a.aday_kodu, a.aday_adi
        FROM crm_kontaklar k
        LEFT JOIN cariler c ON c.id = k.cari_id
        LEFT JOIN crm_adaylar a ON a.id = k.aday_id
        WHERE k.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const { cari_id, aday_id, aktif } = req.query;
        const params = [];
        const where = [];
        if (cari_id) {
            params.push(Number(cari_id));
            where.push(`k.cari_id = $${params.length}`);
        }
        if (aday_id) {
            params.push(Number(aday_id));
            where.push(`k.aday_id = $${params.length}`);
        }
        if (aktif === 'true') where.push('k.aktif = TRUE');
        const liste = await pool.query(
            `
            SELECT k.*,
                   c.cari_kodu, c.cari_adi,
                   a.aday_kodu, a.aday_adi
            FROM crm_kontaklar k
            LEFT JOIN cariler c ON c.id = k.cari_id
            LEFT JOIN crm_adaylar a ON a.id = k.aday_id
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
        if (!b.ad || !b.soyad) return res.status(400).json({ hata: 'ad ve soyad zorunlu.' });
        if (!b.cari_id && !b.aday_id) {
            return res.status(400).json({ hata: 'cari_id veya aday_id zorunlu.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const kod = b.kontak_kodu || (await sonrakiKod(client, 'CRM_KONTAK'));
            if (b.birincil) {
                if (b.cari_id) {
                    await client.query(
                        `UPDATE crm_kontaklar SET birincil=FALSE WHERE cari_id=$1`,
                        [b.cari_id]
                    );
                }
                if (b.aday_id) {
                    await client.query(
                        `UPDATE crm_kontaklar SET birincil=FALSE WHERE aday_id=$1`,
                        [b.aday_id]
                    );
                }
            }
            const r = await client.query(
                `
                INSERT INTO crm_kontaklar
                    (kontak_kodu, ad, soyad, unvan, email, telefon, cep_tel,
                     cari_id, aday_id, birincil, aktif, notlar)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,FALSE),COALESCE($11,TRUE),$12)
                RETURNING id
                `,
                [
                    kod, b.ad, b.soyad, b.unvan || null, b.email || null, b.telefon || null,
                    b.cep_tel || null, b.cari_id || null, b.aday_id || null, b.birincil,
                    b.aktif, b.notlar || null,
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
            UPDATE crm_kontaklar SET
                ad = COALESCE($2, ad),
                soyad = COALESCE($3, soyad),
                unvan = COALESCE($4, unvan),
                email = COALESCE($5, email),
                telefon = COALESCE($6, telefon),
                cep_tel = COALESCE($7, cep_tel),
                cari_id = COALESCE($8, cari_id),
                aday_id = COALESCE($9, aday_id),
                birincil = COALESCE($10, birincil),
                aktif = COALESCE($11, aktif),
                notlar = COALESCE($12, notlar)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.ad || null, b.soyad || null, b.unvan ?? null, b.email ?? null,
                b.telefon ?? null, b.cep_tel ?? null, b.cari_id || null, b.aday_id || null,
                b.birincil, b.aktif, b.notlar ?? null,
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
        const r = await pool.query('DELETE FROM crm_kontaklar WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kontak bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
