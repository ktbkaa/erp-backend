const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function adayGetir(id) {
    const a = await pool.query(
        `
        SELECT a.*,
               k.ad AS sorumlu_ad, k.soyad AS sorumlu_soyad,
               TRIM(CONCAT(COALESCE(k.ad,''),' ',COALESCE(k.soyad,''))) AS sorumlu_adi,
               c.cari_kodu, c.cari_adi
        FROM crm_adaylar a
        LEFT JOIN kisiler k ON k.id = a.sorumlu_id
        LEFT JOIN cariler c ON c.id = a.cari_id
        WHERE a.id = $1
        `,
        [id]
    );
    if (!a.rows[0]) return null;
    const [kontaklar, firsatlar, faaliyetler] = await Promise.all([
        pool.query(
            `SELECT * FROM crm_kontaklar WHERE aday_id=$1 ORDER BY birincil DESC, id`,
            [id]
        ),
        pool.query(
            `
            SELECT f.id, f.firsat_kodu, f.firsat_adi, f.durum, f.beklenen_gelir,
                   asama.asama_kodu, asama.asama_adi
            FROM crm_firsatlar f
            JOIN crm_firsat_asamalari asama ON asama.id = f.asama_id
            WHERE f.aday_id=$1 ORDER BY f.id DESC
            `,
            [id]
        ),
        pool.query(
            `
            SELECT fy.id, fy.faaliyet_kodu, fy.konu, fy.durum, fy.baslangic_tarihi,
                   t.tip_adi AS faaliyet_tipi_adi
            FROM crm_faaliyetler fy
            LEFT JOIN crm_faaliyet_tipleri t ON t.id = fy.faaliyet_tipi_id
            WHERE fy.aday_id=$1 ORDER BY fy.baslangic_tarihi DESC LIMIT 50
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
        const { durum, aktif } = req.query;
        const params = [];
        const where = [];
        if (durum) {
            params.push(durum);
            where.push(`a.durum = $${params.length}`);
        }
        if (aktif === 'true') where.push('a.aktif = TRUE');
        if (aktif === 'false') where.push('a.aktif = FALSE');
        const liste = await pool.query(
            `
            SELECT a.*,
                   TRIM(CONCAT(COALESCE(k.ad,''),' ',COALESCE(k.soyad,''))) AS sorumlu_adi,
                   c.cari_kodu
            FROM crm_adaylar a
            LEFT JOIN kisiler k ON k.id = a.sorumlu_id
            LEFT JOIN cariler c ON c.id = a.cari_id
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
        if (!b.aday_adi) return res.status(400).json({ hata: 'aday_adi zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const kod = b.aday_kodu || (await sonrakiKod(client, 'CRM_ADAY'));
            const r = await client.query(
                `
                INSERT INTO crm_adaylar
                    (aday_kodu, aday_adi, durum, sorumlu_id, degerlendirme, tercih_sebebi,
                     bulma_yontemi, oncelik, telefon, cep_tel, email, website, fax,
                     adres, il, ilce, ulke, posta_kodu, sektor_kodu, notlar, aktif)
                VALUES ($1,$2,COALESCE($3,'Yeni'),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                        $14,$15,$16,COALESCE($17,'Türkiye'),$18,$19,$20,COALESCE($21,TRUE))
                RETURNING id
                `,
                [
                    kod, b.aday_adi, b.durum || null, b.sorumlu_id || null,
                    b.degerlendirme ?? null, b.tercih_sebebi || null, b.bulma_yontemi || null,
                    b.oncelik || null, b.telefon || null, b.cep_tel || null, b.email || null,
                    b.website || null, b.fax || null, b.adres || null, b.il || null,
                    b.ilce || null, b.ulke || null, b.posta_kodu || null, b.sektor_kodu || null,
                    b.notlar || null, b.aktif,
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
        if (b.durum && !allowed.includes(b.durum)) {
            return res.status(400).json({ hata: `Geçersiz durum: ${b.durum}` });
        }
        const r = await pool.query(
            `
            UPDATE crm_adaylar SET
                aday_adi = COALESCE($2, aday_adi),
                durum = COALESCE($3, durum),
                sorumlu_id = COALESCE($4, sorumlu_id),
                degerlendirme = COALESCE($5, degerlendirme),
                tercih_sebebi = COALESCE($6, tercih_sebebi),
                bulma_yontemi = COALESCE($7, bulma_yontemi),
                oncelik = COALESCE($8, oncelik),
                telefon = COALESCE($9, telefon),
                cep_tel = COALESCE($10, cep_tel),
                email = COALESCE($11, email),
                website = COALESCE($12, website),
                fax = COALESCE($13, fax),
                adres = COALESCE($14, adres),
                il = COALESCE($15, il),
                ilce = COALESCE($16, ilce),
                ulke = COALESCE($17, ulke),
                posta_kodu = COALESCE($18, posta_kodu),
                sektor_kodu = COALESCE($19, sektor_kodu),
                notlar = COALESCE($20, notlar),
                aktif = COALESCE($21, aktif)
            WHERE id=$1 RETURNING id
            `,
            [
                req.params.id, b.aday_adi || null, b.durum || null, b.sorumlu_id || null,
                b.degerlendirme ?? null, b.tercih_sebebi ?? null, b.bulma_yontemi ?? null,
                b.oncelik ?? null, b.telefon ?? null, b.cep_tel ?? null, b.email ?? null,
                b.website ?? null, b.fax ?? null, b.adres ?? null, b.il ?? null,
                b.ilce ?? null, b.ulke ?? null, b.posta_kodu ?? null, b.sektor_kodu ?? null,
                b.notlar ?? null, b.aktif,
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
 * Body: { cari_kodu? }
 */
router.post('/:id/cariye-donustur', async (req, res) => {
    try {
        const aday = await adayGetir(req.params.id);
        if (!aday) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        if (aday.durum === 'Donusturuldu' && aday.cari_id) {
            return res.status(400).json({ hata: 'Aday zaten cariye dönüştürülmüş.', cari_id: aday.cari_id });
        }

        const sonuc = await withTransaction(pool, async (client) => {
            const kod = req.body.cari_kodu || (await sonrakiKod(client, 'MUSTERI'));
            const cari = await client.query(
                `
                INSERT INTO cariler
                    (cari_kodu, cari_adi, cari_turu, telefon, email, adres, il, ilce, ulke,
                     posta_kodu, website, fax, cep_tel, aktif, notlar)
                VALUES ($1,$2,'Musteri',$3,$4,$5,$6,$7,COALESCE($8,'Türkiye'),$9,$10,$11,$12,TRUE,$13)
                RETURNING id, cari_kodu, cari_adi
                `,
                [
                    kod, aday.aday_adi, aday.telefon, aday.email, aday.adres, aday.il, aday.ilce,
                    aday.ulke, aday.posta_kodu, aday.website, aday.fax, aday.cep_tel, aday.notlar,
                ]
            );
            const cariId = cari.rows[0].id;
            await client.query(
                `
                UPDATE crm_adaylar SET
                    durum='Donusturuldu', cari_id=$2, donusum_tarihi=CURRENT_TIMESTAMP
                WHERE id=$1
                `,
                [aday.id, cariId]
            );
            // Kontakları cariye taşı
            await client.query(
                `UPDATE crm_kontaklar SET cari_id=$2 WHERE aday_id=$1 AND cari_id IS NULL`,
                [aday.id, cariId]
            );
            // Açık fırsatları cariye bağla
            await client.query(
                `
                UPDATE crm_firsatlar SET musteri_tipi='Musteri', cari_id=$2
                WHERE aday_id=$1 AND durum='Acik'
                `,
                [aday.id, cariId]
            );
            return cari.rows[0];
        });

        res.status(201).json({
            ok: true,
            cari: sonuc,
            aday: await adayGetir(aday.id),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_adaylar WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Müşteri adayı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
