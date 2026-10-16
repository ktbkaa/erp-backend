const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function planGetir(id) {
    const r = await pool.query(
        `
        SELECT p.*,
               tip.tip_kodu AS faaliyet_tipi_kodu, tip.tip_adi AS faaliyet_tipi_adi,
               c.cari_kodu, c.cari_adi,
               a.aday_kodu, a.aday_adi,
               f.firsat_kodu, f.firsat_adi,
               TRIM(CONCAT(COALESCE(g.ad,''),' ',COALESCE(g.soyad,''))) AS giren_adi,
               TRIM(CONCAT(COALESCE(y.ad,''),' ',COALESCE(y.soyad,''))) AS yapacak_adi,
               TRIM(CONCAT(COALESCE(kk.ad,''),' ',COALESCE(kk.soyad,''))) AS kontak_adi,
               iy.is_yeri_kodu, iy.is_yeri_adi
        FROM crm_faaliyet_planlari p
        LEFT JOIN crm_faaliyet_tipleri tip ON tip.id = p.faaliyet_tipi_id
        LEFT JOIN cariler c ON c.id = p.cari_id
        LEFT JOIN crm_adaylar a ON a.id = p.aday_id
        LEFT JOIN crm_firsatlar f ON f.id = p.firsat_id
        LEFT JOIN kisiler g ON g.id = p.giren_id
        LEFT JOIN kisiler y ON y.id = p.yapacak_id
        LEFT JOIN crm_kontaklar kk ON kk.id = p.kontak_id
        LEFT JOIN is_yerleri iy ON iy.id = p.is_yeri_id
        WHERE p.id = $1
        `,
        [id]
    );
    if (!r.rows[0]) return null;
    const faaliyetler = await pool.query(
        `
        SELECT id, faaliyet_kodu, konu, durum, baslangic_tarihi
        FROM crm_faaliyetler WHERE plan_id=$1 ORDER BY id DESC
        `,
        [id]
    );
    return { ...r.rows[0], faaliyetler: faaliyetler.rows };
}

router.get('/', async (req, res) => {
    try {
        const { cari_id, aday_id, firsat_id, durum } = req.query;
        const params = [];
        const where = [];
        if (cari_id) { params.push(Number(cari_id)); where.push(`p.cari_id=$${params.length}`); }
        if (aday_id) { params.push(Number(aday_id)); where.push(`p.aday_id=$${params.length}`); }
        if (firsat_id) { params.push(Number(firsat_id)); where.push(`p.firsat_id=$${params.length}`); }
        if (durum) { params.push(durum); where.push(`p.durum=$${params.length}`); }
        const liste = await pool.query(
            `
            SELECT p.*,
                   tip.tip_adi AS faaliyet_tipi_adi,
                   c.cari_adi, a.aday_adi, f.firsat_kodu,
                   TRIM(CONCAT(COALESCE(y.ad,''),' ',COALESCE(y.soyad,''))) AS yapacak_adi
            FROM crm_faaliyet_planlari p
            LEFT JOIN crm_faaliyet_tipleri tip ON tip.id = p.faaliyet_tipi_id
            LEFT JOIN cariler c ON c.id = p.cari_id
            LEFT JOIN crm_adaylar a ON a.id = p.aday_id
            LEFT JOIN crm_firsatlar f ON f.id = p.firsat_id
            LEFT JOIN kisiler y ON y.id = p.yapacak_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY p.baslangic_tarihi DESC, p.id DESC
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
        const musteriTipi = b.musteri_tipi || (b.aday_id && !b.cari_id ? 'Aday' : 'Musteri');
        if (musteriTipi === 'Musteri' && !b.cari_id && !b.firsat_id) {
            return res.status(400).json({ hata: 'cari_id veya firsat_id gerekli.' });
        }
        if (musteriTipi === 'Aday' && !b.aday_id && !b.firsat_id) {
            return res.status(400).json({ hata: 'aday_id veya firsat_id gerekli.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let cariId = b.cari_id || null;
            let adayId = b.aday_id || null;
            let tip = musteriTipi;
            if (b.firsat_id) {
                const f = await client.query(
                    'SELECT cari_id, aday_id, musteri_tipi FROM crm_firsatlar WHERE id=$1',
                    [b.firsat_id]
                );
                if (!f.rows[0]) throw new Error('Fırsat bulunamadı.');
                cariId = cariId || f.rows[0].cari_id;
                adayId = adayId || f.rows[0].aday_id;
                tip = f.rows[0].musteri_tipi;
            }
            const kod = b.plan_kodu || (await sonrakiKod(client, 'CRM_PLAN'));
            const r = await client.query(
                `
                INSERT INTO crm_faaliyet_planlari
                    (plan_kodu, musteri_tipi, cari_id, aday_id, firsat_id, kontak_id,
                     faaliyet_tipi_id, giren_id, yapacak_id, is_yeri_id,
                     baslangic_tarihi, bitis_tarihi, durum, konu, aciklama)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        COALESCE($11::timestamp,CURRENT_TIMESTAMP),$12,
                        COALESCE($13,'Planlandi'),$14,$15)
                RETURNING id
                `,
                [
                    kod, tip, cariId, adayId, b.firsat_id || null, b.kontak_id || null,
                    b.faaliyet_tipi_id || null, b.giren_id || null, b.yapacak_id || null,
                    b.is_yeri_id || null, b.baslangic_tarihi || null, b.bitis_tarihi || null,
                    b.durum || null, b.konu || null, b.aciklama || null,
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
            UPDATE crm_faaliyet_planlari SET
                musteri_tipi = COALESCE($2, musteri_tipi),
                cari_id = COALESCE($3, cari_id),
                aday_id = COALESCE($4, aday_id),
                firsat_id = COALESCE($5, firsat_id),
                kontak_id = COALESCE($6, kontak_id),
                faaliyet_tipi_id = COALESCE($7, faaliyet_tipi_id),
                giren_id = COALESCE($8, giren_id),
                yapacak_id = COALESCE($9, yapacak_id),
                is_yeri_id = COALESCE($10, is_yeri_id),
                baslangic_tarihi = COALESCE($11::timestamp, baslangic_tarihi),
                bitis_tarihi = COALESCE($12::timestamp, bitis_tarihi),
                durum = COALESCE($13, durum),
                konu = COALESCE($14, konu),
                aciklama = COALESCE($15, aciklama)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.musteri_tipi || null, b.cari_id || null, b.aday_id || null,
                b.firsat_id || null, b.kontak_id || null, b.faaliyet_tipi_id || null,
                b.giren_id || null, b.yapacak_id || null, b.is_yeri_id || null,
                b.baslangic_tarihi || null, b.bitis_tarihi || null, b.durum || null,
                b.konu ?? null, b.aciklama ?? null,
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
                INSERT INTO crm_faaliyetler
                    (faaliyet_kodu, musteri_tipi, cari_id, aday_id, firsat_id, plan_id, kontak_id,
                     faaliyet_tipi_id, giren_id, is_yeri_id, baslangic_tarihi,
                     konu, aciklama, durum)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,$11,$12,'Tamamlandi')
                RETURNING id
                `,
                [
                    kod, plan.musteri_tipi, plan.cari_id, plan.aday_id, plan.firsat_id, plan.id,
                    plan.kontak_id, plan.faaliyet_tipi_id, plan.yapacak_id || plan.giren_id,
                    plan.is_yeri_id, req.body.konu || plan.konu,
                    req.body.aciklama || plan.aciklama || `Plan ${plan.plan_kodu}`,
                ]
            );
            await client.query(
                `UPDATE crm_faaliyet_planlari SET durum='Tamamlandi' WHERE id=$1`,
                [plan.id]
            );
            return r.rows[0].id;
        });

        const faaliyet = await pool.query('SELECT * FROM crm_faaliyetler WHERE id=$1', [id]);
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
            'DELETE FROM crm_faaliyet_planlari WHERE id=$1 RETURNING id',
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet planı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
