const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const {
    sonrakiKod,
    cariSeriKodundanTur,
    cariTedarikciMi,
    cariMusteriMi,
} = require('../src/utils/kodUretici');

async function cariGetir(id) {
    const c = await pool.query(
        `
        SELECT c.*, i.is_yeri_kodu, i.is_yeri_adi
        FROM cariler c
        LEFT JOIN is_yerleri i ON i.id = c.is_yeri_id
        WHERE c.id = $1
        `,
        [id]
    );
    if (!c.rows[0]) return null;
    const detaylar = await pool.query(
        'SELECT * FROM cari_detaylari WHERE cari_id = $1 ORDER BY id',
        [id]
    );
    return {
        ...c.rows[0],
        tedarikci_mi: cariTedarikciMi(c.rows[0].cari_turu),
        musteri_mi: cariMusteriMi(c.rows[0].cari_turu),
        cari_detaylari: detaylar.rows,
    };
}

router.get('/', async (req, res) => {
    try {
        const { tur, aktif } = req.query;
        const params = [];
        const where = [];

        if (tur === 'Musteri') {
            where.push(`cari_turu IN ('Musteri', 'HerIkisi')`);
        } else if (tur === 'Tedarikci') {
            where.push(`cari_turu IN ('Tedarikci', 'HerIkisi')`);
        } else if (tur === 'HerIkisi' || tur === 'MusteriOnly' || tur === 'TedarikciOnly') {
            // exact
            if (tur === 'MusteriOnly') where.push(`cari_turu = 'Musteri'`);
            else if (tur === 'TedarikciOnly') where.push(`cari_turu = 'Tedarikci'`);
            else where.push(`cari_turu = 'HerIkisi'`);
        }

        if (aktif === 'true') where.push('aktif = TRUE');
        if (aktif === 'false') where.push('aktif = FALSE');

        const sql = `
            SELECT id FROM cariler
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC
        `;
        const liste = await pool.query(sql, params);
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await cariGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const cari = await cariGetir(req.params.id);
        if (!cari) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        res.json(cari);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            cari_kodu,
            cari_adi,
            cari_turu,
            telefon,
            email,
            vergi_no,
            vergi_dairesi,
            yetkili_adi,
            yetkili_telefon,
            adres,
            fatura_adresi,
            il,
            ilce,
            ulke,
            posta_kodu,
            para_birimi,
            odeme_vadesi_gun,
            aktif,
            notlar,
            is_yeri_id,
            cari_detaylari,
        } = req.body;

        if (!cari_adi || !cari_turu) {
            return res.status(400).json({ hata: 'cari_adi ve cari_turu zorunludur.' });
        }
        if (!['Musteri', 'Tedarikci', 'HerIkisi'].includes(cari_turu)) {
            return res.status(400).json({
                hata: "cari_turu 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı.",
            });
        }

        const id = await withTransaction(pool, async (client) => {
            const kod = cari_kodu || (await sonrakiKod(client, cariSeriKodundanTur(cari_turu)));

            const cariSonuc = await client.query(
                `
                INSERT INTO cariler (
                    cari_kodu, cari_adi, cari_turu, telefon, email,
                    vergi_no, vergi_dairesi, yetkili_adi, yetkili_telefon,
                    adres, fatura_adresi, il, ilce, ulke, posta_kodu,
                    para_birimi, odeme_vadesi_gun, aktif, notlar, is_yeri_id
                ) VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,
                    $10,$11,$12,$13,$14,$15,
                    $16,$17,COALESCE($18,TRUE),$19,$20
                )
                RETURNING id
                `,
                [
                    kod,
                    cari_adi,
                    cari_turu,
                    telefon || null,
                    email || null,
                    vergi_no || null,
                    vergi_dairesi || null,
                    yetkili_adi || null,
                    yetkili_telefon || null,
                    adres || null,
                    fatura_adresi || null,
                    il || null,
                    ilce || null,
                    ulke || 'Türkiye',
                    posta_kodu || null,
                    para_birimi || 'TRY',
                    odeme_vadesi_gun ?? 0,
                    aktif,
                    notlar || null,
                    is_yeri_id || null,
                ]
            );
            const cariId = cariSonuc.rows[0].id;

            // İsteğe bağlı ek adres satırları (eski yapı)
            if (Array.isArray(cari_detaylari)) {
                for (const d of cari_detaylari) {
                    await client.query(
                        `
                        INSERT INTO cari_detaylari
                            (cari_id, adres, fatura_adresi, yetkili_adi, yetkili_telefon)
                        VALUES ($1,$2,$3,$4,$5)
                        `,
                        [
                            cariId,
                            d.adres || null,
                            d.fatura_adresi || null,
                            d.yetkili_adi || null,
                            d.yetkili_telefon || null,
                        ]
                    );
                }
            }

            return cariId;
        });

        res.status(201).json(await cariGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
