const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

async function rotaGetir(id) {
    const baslik = await pool.query(
        `
        SELECT r.*, s.stok_kodu, s.stok_adi, s.stok_tipi
        FROM rotalar r
        JOIN stoklar s ON s.id = r.stok_id
        WHERE r.id = $1
        `,
        [id]
    );
    if (!baslik.rows[0]) return null;

    const ops = await pool.query(
        `
        SELECT o.*,
               m.merkez_kodu, m.merkez_adi,
               cs.stok_kodu AS cikti_stok_kodu,
               cs.stok_adi AS cikti_stok_adi
        FROM rota_operasyonlari o
        LEFT JOIN is_merkezleri m ON m.id = o.is_merkezi_id
        LEFT JOIN stoklar cs ON cs.id = o.cikti_stok_id
        WHERE o.rota_id = $1
        ORDER BY o.sira_no
        `,
        [id]
    );

    const operasyonlar = [];
    for (const op of ops.rows) {
        const bilesenler = await pool.query(
            `
            SELECT b.*, st.stok_kodu, st.stok_adi, st.stok_tipi
            FROM rota_operasyon_bilesenleri b
            JOIN stoklar st ON st.id = b.stok_id
            WHERE b.operasyon_id = $1
            ORDER BY b.id
            `,
            [op.id]
        );
        const sonraki = ops.rows.find((x) => x.sira_no === op.sonraki_sira_no);
        operasyonlar.push({
            ...op,
            bilesenler: bilesenler.rows,
            sonraki_operasyon: sonraki
                ? {
                      sira_no: sonraki.sira_no,
                      operasyon_kodu: sonraki.operasyon_kodu,
                      operasyon_adi: sonraki.operasyon_adi,
                  }
                : null,
        });
    }

    return { ...baslik.rows[0], operasyonlar };
}

router.get('/', async (req, res) => {
    try {
        const onlyMamul = req.query.tip !== 'hepsi';
        const liste = await pool.query(
            `
            SELECT r.id
            FROM rotalar r
            JOIN stoklar s ON s.id = r.stok_id
            ${onlyMamul ? `WHERE s.stok_tipi = 'Mamul'` : ''}
            ORDER BY r.id DESC
            `
        );
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await rotaGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const rota = await rotaGetir(req.params.id);
        if (!rota) return res.status(404).json({ hata: 'Rota bulunamadı.' });
        res.json(rota);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * operasyonlar: [{
 *   sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk,
 *   cikti_stok_id, sonraki_sira_no,
 *   bilesenler: [{ stok_id, miktar, birim }]
 * }]
 */
router.post('/', async (req, res) => {
    try {
        const { stok_id, rota_kodu, rota_adi, operasyonlar } = req.body;
        if (!stok_id || !rota_kodu || !rota_adi || !Array.isArray(operasyonlar) || operasyonlar.length === 0) {
            return res.status(400).json({ hata: 'stok_id, rota_kodu, rota_adi ve operasyonlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const baslik = await client.query(
                `INSERT INTO rotalar (stok_id, rota_kodu, rota_adi) VALUES ($1,$2,$3) RETURNING id`,
                [stok_id, rota_kodu, rota_adi]
            );
            const rotaId = baslik.rows[0].id;

            for (const op of operasyonlar) {
                const opIns = await client.query(
                    `
                    INSERT INTO rota_operasyonlari
                        (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id,
                         sure_dk, cikti_stok_id, sonraki_sira_no)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    RETURNING id
                    `,
                    [
                        rotaId,
                        op.sira_no,
                        op.operasyon_kodu,
                        op.operasyon_adi,
                        op.is_merkezi_id || null,
                        op.sure_dk || 0,
                        op.cikti_stok_id || null,
                        op.sonraki_sira_no || null,
                    ]
                );
                for (const b of op.bilesenler || []) {
                    await client.query(
                        `
                        INSERT INTO rota_operasyon_bilesenleri (operasyon_id, stok_id, miktar, birim)
                        VALUES ($1,$2,$3,$4)
                        `,
                        [opIns.rows[0].id, b.stok_id, b.miktar, b.birim || null]
                    );
                }
            }
            return rotaId;
        });

        res.status(201).json(await rotaGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
