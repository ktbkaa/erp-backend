const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

async function rotaGetir(id) {
    const baslik = await pool.query(
        `
        SELECT r.*,
               s.stok_kodu, s.stok_adi, s.stok_tipi,
               ua.agac_kodu, ua.agac_adi
        FROM rotalar r
        JOIN stoklar s ON s.id = r.stok_id
        LEFT JOIN urun_agaclari ua ON ua.id = r.urun_agaci_id
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
        const firmaId = firmaIdFromReq(req);
        const params = [];
        const where = [];
        if (onlyMamul) where.push(`s.stok_tipi = 'Mamul'`);
        if (firmaId) {
            params.push(firmaId);
            where.push(`r.firma_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT r.id
            FROM rotalar r
            JOIN stoklar s ON s.id = r.stok_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY r.id DESC
            `,
            params
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
        const {
            stok_id,
            urun_agaci_id,
            rota_kodu,
            rota_adi,
            operasyonlar,
            sablon,
            varsayilan,
            gecerlilik_baslangic,
            gecerlilik_bitis,
        } = req.body;
        if (!stok_id || !rota_kodu || !rota_adi || !Array.isArray(operasyonlar) || operasyonlar.length === 0) {
            return res.status(400).json({ hata: 'stok_id, rota_kodu, rota_adi ve operasyonlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let firmaId = firmaIdFromReq(req) || Number(req.body.firma_id) || null;
            if (!firmaId) {
                const st = await client.query('SELECT firma_id FROM stoklar WHERE id=$1', [stok_id]);
                firmaId = st.rows[0]?.firma_id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO rotalar
                    (stok_id, urun_agaci_id, rota_kodu, rota_adi, sablon, varsayilan,
                     gecerlilik_baslangic, gecerlilik_bitis, firma_id)
                VALUES ($1,$2,$3,$4,COALESCE($5,FALSE),COALESCE($6,FALSE),$7,$8,$9)
                RETURNING id
                `,
                [
                    stok_id,
                    urun_agaci_id || null,
                    rota_kodu,
                    rota_adi,
                    sablon,
                    varsayilan,
                    gecerlilik_baslangic || null,
                    gecerlilik_bitis || null,
                    firmaId,
                ]
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

router.put('/:id', async (req, res) => {
    try {
        const {
            rota_adi,
            stok_id,
            urun_agaci_id,
            operasyonlar,
            sablon,
            varsayilan,
            gecerlilik_baslangic,
            gecerlilik_bitis,
        } = req.body;
        if (!rota_adi) return res.status(400).json({ hata: 'rota_adi zorunlu.' });

        const kayitId = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM rotalar WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const err = new Error('Rota bulunamadı.');
                err.status = 404;
                throw err;
            }
            const agacGuncelle = Object.prototype.hasOwnProperty.call(req.body, 'urun_agaci_id');
            await client.query(
                `
                UPDATE rotalar SET
                    rota_adi=$2,
                    stok_id=COALESCE($3, stok_id),
                    urun_agaci_id=CASE WHEN $4::boolean THEN $5 ELSE urun_agaci_id END,
                    sablon=COALESCE($6, sablon),
                    varsayilan=COALESCE($7, varsayilan),
                    gecerlilik_baslangic=COALESCE($8, gecerlilik_baslangic),
                    gecerlilik_bitis=COALESCE($9, gecerlilik_bitis)
                WHERE id=$1
                `,
                [
                    req.params.id,
                    rota_adi,
                    stok_id || null,
                    agacGuncelle,
                    urun_agaci_id || null,
                    sablon,
                    varsayilan,
                    gecerlilik_baslangic || null,
                    gecerlilik_bitis || null,
                ]
            );
            if (Array.isArray(operasyonlar)) {
                const eskiOps = await client.query(
                    'SELECT id FROM rota_operasyonlari WHERE rota_id=$1',
                    [req.params.id]
                );
                for (const op of eskiOps.rows) {
                    await client.query('DELETE FROM rota_operasyon_bilesenleri WHERE operasyon_id=$1', [op.id]);
                }
                await client.query('DELETE FROM rota_operasyonlari WHERE rota_id=$1', [req.params.id]);

                for (const op of operasyonlar) {
                    if (!op.operasyon_kodu && !op.operasyon_adi) continue;
                    const opIns = await client.query(
                        `
                        INSERT INTO rota_operasyonlari
                            (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id,
                             sure_dk, cikti_stok_id, sonraki_sira_no)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                        RETURNING id
                        `,
                        [
                            req.params.id,
                            op.sira_no || 10,
                            op.operasyon_kodu || null,
                            op.operasyon_adi || null,
                            op.is_merkezi_id || null,
                            op.sure_dk || 0,
                            op.cikti_stok_id || null,
                            op.sonraki_sira_no || null,
                        ]
                    );
                    for (const b of op.bilesenler || []) {
                        if (!b.stok_id) continue;
                        await client.query(
                            `
                            INSERT INTO rota_operasyon_bilesenleri (operasyon_id, stok_id, miktar, birim)
                            VALUES ($1,$2,$3,$4)
                            `,
                            [opIns.rows[0].id, b.stok_id, b.miktar || 0, b.birim || null]
                        );
                    }
                }
            }
            return Number(req.params.id);
        });

        res.json(await rotaGetir(kayitId));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM rotalar WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Rota bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
