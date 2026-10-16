const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function faaliyetGetir(id) {
    const r = await pool.query(
        `
        SELECT fy.*,
               tip.tip_kodu AS faaliyet_tipi_kodu, tip.tip_adi AS faaliyet_tipi_adi,
               c.cari_kodu, c.cari_adi,
               a.aday_kodu, a.aday_adi,
               f.firsat_kodu, f.firsat_adi,
               p.plan_kodu,
               TRIM(CONCAT(COALESCE(k.ad,''),' ',COALESCE(k.soyad,''))) AS giren_adi,
               TRIM(CONCAT(COALESCE(kk.ad,''),' ',COALESCE(kk.soyad,''))) AS kontak_adi,
               iy.is_yeri_kodu, iy.is_yeri_adi
        FROM crm_faaliyetler fy
        LEFT JOIN crm_faaliyet_tipleri tip ON tip.id = fy.faaliyet_tipi_id
        LEFT JOIN cariler c ON c.id = fy.cari_id
        LEFT JOIN crm_adaylar a ON a.id = fy.aday_id
        LEFT JOIN crm_firsatlar f ON f.id = fy.firsat_id
        LEFT JOIN crm_faaliyet_planlari p ON p.id = fy.plan_id
        LEFT JOIN kisiler k ON k.id = fy.giren_id
        LEFT JOIN crm_kontaklar kk ON kk.id = fy.kontak_id
        LEFT JOIN is_yerleri iy ON iy.id = fy.is_yeri_id
        WHERE fy.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

function resolveMusteriTipi(b) {
    if (b.musteri_tipi) return b.musteri_tipi;
    if (b.aday_id && !b.cari_id) return 'Aday';
    return 'Musteri';
}

router.get('/', async (req, res) => {
    try {
        const { cari_id, aday_id, firsat_id, durum } = req.query;
        const params = [];
        const where = [];
        if (cari_id) { params.push(Number(cari_id)); where.push(`fy.cari_id=$${params.length}`); }
        if (aday_id) { params.push(Number(aday_id)); where.push(`fy.aday_id=$${params.length}`); }
        if (firsat_id) { params.push(Number(firsat_id)); where.push(`fy.firsat_id=$${params.length}`); }
        if (durum) { params.push(durum); where.push(`fy.durum=$${params.length}`); }
        const liste = await pool.query(
            `
            SELECT fy.*,
                   tip.tip_adi AS faaliyet_tipi_adi,
                   c.cari_adi, a.aday_adi, f.firsat_kodu,
                   TRIM(CONCAT(COALESCE(k.ad,''),' ',COALESCE(k.soyad,''))) AS giren_adi
            FROM crm_faaliyetler fy
            LEFT JOIN crm_faaliyet_tipleri tip ON tip.id = fy.faaliyet_tipi_id
            LEFT JOIN cariler c ON c.id = fy.cari_id
            LEFT JOIN crm_adaylar a ON a.id = fy.aday_id
            LEFT JOIN crm_firsatlar f ON f.id = fy.firsat_id
            LEFT JOIN kisiler k ON k.id = fy.giren_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY fy.baslangic_tarihi DESC, fy.id DESC
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
        const row = await faaliyetGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Faaliyet bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const b = req.body;
        if (!b.aciklama && !b.konu) {
            return res.status(400).json({ hata: 'konu veya aciklama zorunlu.' });
        }
        const musteriTipi = resolveMusteriTipi(b);
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
            if (b.plan_id) {
                await client.query(
                    `UPDATE crm_faaliyet_planlari SET durum='Tamamlandi'
                     WHERE id=$1 AND durum IN ('Planlandi','Devam')`,
                    [b.plan_id]
                );
            }
            const kod = b.faaliyet_kodu || (await sonrakiKod(client, 'CRM_FAALIYET'));
            const r = await client.query(
                `
                INSERT INTO crm_faaliyetler
                    (faaliyet_kodu, musteri_tipi, cari_id, aday_id, firsat_id, plan_id, kontak_id,
                     faaliyet_tipi_id, giren_id, is_yeri_id, baslangic_tarihi, bitis_tarihi,
                     harcanan_dk, konu, aciklama, degerlendirme, durum)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                        COALESCE($11::timestamp,CURRENT_TIMESTAMP),$12,
                        COALESCE($13,0),$14,$15,$16,COALESCE($17,'Tamamlandi'))
                RETURNING id
                `,
                [
                    kod, tip, cariId, adayId, b.firsat_id || null, b.plan_id || null,
                    b.kontak_id || null, b.faaliyet_tipi_id || null, b.giren_id || null,
                    b.is_yeri_id || null, b.baslangic_tarihi || null, b.bitis_tarihi || null,
                    b.harcanan_dk, b.konu || null, b.aciklama || null, b.degerlendirme || null,
                    b.durum || null,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await faaliyetGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body;
        const r = await pool.query(
            `
            UPDATE crm_faaliyetler SET
                musteri_tipi = COALESCE($2, musteri_tipi),
                cari_id = COALESCE($3, cari_id),
                aday_id = COALESCE($4, aday_id),
                firsat_id = COALESCE($5, firsat_id),
                plan_id = COALESCE($6, plan_id),
                kontak_id = COALESCE($7, kontak_id),
                faaliyet_tipi_id = COALESCE($8, faaliyet_tipi_id),
                giren_id = COALESCE($9, giren_id),
                is_yeri_id = COALESCE($10, is_yeri_id),
                baslangic_tarihi = COALESCE($11::timestamp, baslangic_tarihi),
                bitis_tarihi = COALESCE($12::timestamp, bitis_tarihi),
                harcanan_dk = COALESCE($13, harcanan_dk),
                konu = COALESCE($14, konu),
                aciklama = COALESCE($15, aciklama),
                degerlendirme = COALESCE($16, degerlendirme),
                durum = COALESCE($17, durum)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.musteri_tipi || null, b.cari_id || null, b.aday_id || null,
                b.firsat_id || null, b.plan_id || null, b.kontak_id || null,
                b.faaliyet_tipi_id || null, b.giren_id || null, b.is_yeri_id || null,
                b.baslangic_tarihi || null, b.bitis_tarihi || null, b.harcanan_dk ?? null,
                b.konu ?? null, b.aciklama ?? null, b.degerlendirme ?? null, b.durum || null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet bulunamadı.' });
        res.json(await faaliyetGetir(r.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_faaliyetler WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
