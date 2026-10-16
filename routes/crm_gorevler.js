const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function gorevGetir(id) {
    const r = await pool.query(
        `
        SELECT g.*,
               TRIM(CONCAT(COALESCE(k.ad,''),' ',COALESCE(k.soyad,''))) AS sorumlu_adi,
               c.cari_kodu, c.cari_adi,
               a.aday_kodu, a.aday_adi,
               f.firsat_kodu, f.firsat_adi,
               fy.faaliyet_kodu
        FROM crm_gorevler g
        LEFT JOIN kisiler k ON k.id = g.sorumlu_id
        LEFT JOIN cariler c ON c.id = g.cari_id
        LEFT JOIN crm_adaylar a ON a.id = g.aday_id
        LEFT JOIN crm_firsatlar f ON f.id = g.firsat_id
        LEFT JOIN crm_faaliyetler fy ON fy.id = g.faaliyet_id
        WHERE g.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const { durum, sorumlu_id, firsat_id, cari_id } = req.query;
        const params = [];
        const where = [];
        if (durum) { params.push(durum); where.push(`g.durum=$${params.length}`); }
        if (sorumlu_id) { params.push(Number(sorumlu_id)); where.push(`g.sorumlu_id=$${params.length}`); }
        if (firsat_id) { params.push(Number(firsat_id)); where.push(`g.firsat_id=$${params.length}`); }
        if (cari_id) { params.push(Number(cari_id)); where.push(`g.cari_id=$${params.length}`); }
        const liste = await pool.query(
            `
            SELECT g.*,
                   TRIM(CONCAT(COALESCE(k.ad,''),' ',COALESCE(k.soyad,''))) AS sorumlu_adi,
                   c.cari_adi, a.aday_adi, f.firsat_kodu
            FROM crm_gorevler g
            LEFT JOIN kisiler k ON k.id = g.sorumlu_id
            LEFT JOIN cariler c ON c.id = g.cari_id
            LEFT JOIN crm_adaylar a ON a.id = g.aday_id
            LEFT JOIN crm_firsatlar f ON f.id = g.firsat_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY
                CASE g.durum WHEN 'Acik' THEN 0 WHEN 'Devam' THEN 1 ELSE 2 END,
                g.son_tarih NULLS LAST, g.id DESC
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
            const kod = b.gorev_kodu || (await sonrakiKod(client, 'CRM_GOREV'));
            const r = await client.query(
                `
                INSERT INTO crm_gorevler
                    (gorev_kodu, baslik, aciklama, sorumlu_id, cari_id, aday_id, firsat_id,
                     faaliyet_id, oncelik, durum, son_tarih)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'Normal'),COALESCE($10,'Acik'),$11)
                RETURNING id
                `,
                [
                    kod, b.baslik, b.aciklama || null, b.sorumlu_id || null, b.cari_id || null,
                    b.aday_id || null, b.firsat_id || null, b.faaliyet_id || null,
                    b.oncelik || null, b.durum || null, b.son_tarih || null,
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
        if (b.durum === 'Tamamlandi') tamamlanma = new Date();
        const r = await pool.query(
            `
            UPDATE crm_gorevler SET
                baslik = COALESCE($2, baslik),
                aciklama = COALESCE($3, aciklama),
                sorumlu_id = COALESCE($4, sorumlu_id),
                cari_id = COALESCE($5, cari_id),
                aday_id = COALESCE($6, aday_id),
                firsat_id = COALESCE($7, firsat_id),
                faaliyet_id = COALESCE($8, faaliyet_id),
                oncelik = COALESCE($9, oncelik),
                durum = COALESCE($10, durum),
                son_tarih = COALESCE($11::date, son_tarih),
                tamamlanma_tarihi = CASE
                    WHEN $10 = 'Tamamlandi' THEN COALESCE(tamamlanma_tarihi, CURRENT_TIMESTAMP)
                    WHEN $10 IS NOT NULL AND $10 <> 'Tamamlandi' THEN NULL
                    ELSE tamamlanma_tarihi
                END
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.baslik || null, b.aciklama ?? null, b.sorumlu_id || null,
                b.cari_id || null, b.aday_id || null, b.firsat_id || null, b.faaliyet_id || null,
                b.oncelik || null, b.durum || null, b.son_tarih || null,
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
            UPDATE crm_gorevler SET
                durum='Tamamlandi', tamamlanma_tarihi=CURRENT_TIMESTAMP
            WHERE id=$1 AND durum IN ('Acik','Devam')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!r.rows[0]) {
            return res.status(400).json({ hata: 'Görev tamamlanamadı (bulunamadı veya uygun değil).' });
        }
        res.json(await gorevGetir(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_gorevler WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Görev bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
