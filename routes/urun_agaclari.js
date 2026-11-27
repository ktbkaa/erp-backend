const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

function satirAgaciKur(duzSatirlar) {
    const map = new Map();
    for (const s of duzSatirlar) {
        map.set(s.id, { ...s, alt_satirlar: [] });
    }
    const kokler = [];
    for (const s of map.values()) {
        if (s.ust_satir_id && map.has(s.ust_satir_id)) {
            map.get(s.ust_satir_id).alt_satirlar.push(s);
        } else {
            kokler.push(s);
        }
    }
    return kokler;
}

async function agacGetir(id) {
    const baslik = await pool.query(
        `
        SELECT ua.*, s.stok_kodu, s.stok_adi, s.stok_tipi
        FROM urun_agaclari ua
        JOIN stoklar s ON s.id = ua.mamul_stok_id
        WHERE ua.id = $1
        `,
        [id]
    );
    if (!baslik.rows[0]) return null;

    const satirlar = await pool.query(
        `
        SELECT us.*, st.stok_kodu, st.stok_adi, st.stok_tipi
        FROM urun_agaci_satirlari us
        JOIN stoklar st ON st.id = us.bilesen_stok_id
        WHERE us.urun_agaci_id = $1
        ORDER BY us.sira_no, us.id
        `,
        [id]
    );

    return {
        ...baslik.rows[0],
        satirlar: satirlar.rows,
        agac: satirAgaciKur(satirlar.rows),
    };
}

router.get('/', async (req, res) => {
    try {
        // Varsayılan: mamul ağaçlarını göster (tek kök ürün ağacı bakışı)
        const onlyMamul = req.query.tip !== 'hepsi';
        const liste = await pool.query(
            `
            SELECT ua.id
            FROM urun_agaclari ua
            JOIN stoklar s ON s.id = ua.mamul_stok_id
            ${onlyMamul ? `WHERE s.stok_tipi = 'Mamul'` : ''}
            ORDER BY ua.id DESC
            `
        );
        const sonuc = [];
        for (const a of liste.rows) sonuc.push(await agacGetir(a.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const agac = await agacGetir(req.params.id);
        if (!agac) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
        res.json(agac);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Çok seviyeli ağaç kaydı.
 * satirlar: [
 *   { bilesen_stok_id, miktar, birim, sira_no, alt_satirlar: [...] }
 * ]
 */
router.post('/', async (req, res) => {
    try {
        const { mamul_stok_id, agac_kodu, agac_adi, miktar, satirlar } = req.body;
        if (!mamul_stok_id || !agac_kodu || !agac_adi || !Array.isArray(satirlar) || satirlar.length === 0) {
            return res.status(400).json({
                hata: 'mamul_stok_id, agac_kodu, agac_adi ve satirlar zorunlu.',
            });
        }

        async function satirEkle(client, urunAgaciId, satir, ustSatirId, siraNo) {
            const ins = await client.query(
                `
                INSERT INTO urun_agaci_satirlari
                    (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no, ust_satir_id)
                VALUES ($1,$2,$3,$4,$5,$6)
                RETURNING id
                `,
                [
                    urunAgaciId,
                    satir.bilesen_stok_id,
                    satir.miktar,
                    satir.birim || null,
                    satir.sira_no || siraNo,
                    ustSatirId,
                ]
            );
            const id = ins.rows[0].id;
            let altSira = 10;
            for (const alt of satir.alt_satirlar || []) {
                await satirEkle(client, urunAgaciId, alt, id, altSira);
                altSira += 10;
            }
            return id;
        }

        const kayitId = await withTransaction(pool, async (client) => {
            const baslik = await client.query(
                `
                INSERT INTO urun_agaclari (mamul_stok_id, agac_kodu, agac_adi, miktar)
                VALUES ($1,$2,$3,COALESCE($4,1))
                RETURNING id
                `,
                [mamul_stok_id, agac_kodu, agac_adi, miktar]
            );
            const uaId = baslik.rows[0].id;
            let sira = 10;
            for (const s of satirlar) {
                await satirEkle(client, uaId, s, null, sira);
                sira += 10;
            }
            return uaId;
        });

        res.status(201).json(await agacGetir(kayitId));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
