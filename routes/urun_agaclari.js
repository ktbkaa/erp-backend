const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
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
        const firmaId = firmaIdFromReq(req);
        const params = [];
        const where = [];
        if (onlyMamul) where.push(`s.stok_tipi IN ('Mamul', 'YariMamul')`);
        if (firmaId) {
            params.push(firmaId);
            // Ağaç firma_id veya mamul stok firması (eski kayıtlarda firma_id boş olabilirdi)
            where.push(`(ua.firma_id = $${params.length} OR s.firma_id = $${params.length})`);
        }
        const liste = await pool.query(
            `
            SELECT ua.id
            FROM urun_agaclari ua
            JOIN stoklar s ON s.id = ua.mamul_stok_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY ua.id DESC
            `,
            params
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
        const {
            mamul_stok_id,
            agac_kodu,
            agac_adi,
            miktar,
            satirlar,
            gecerlilik_baslangic,
            gecerlilik_bitis,
            min_miktar,
            max_miktar,
        } = req.body;
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
            // firma_id: istek / mamul stok kartı (liste filtreleri için zorunlu)
            let firmaId = firmaIdFromReq(req) || Number(req.body.firma_id) || null;
            if (!firmaId) {
                const st = await client.query(
                    'SELECT firma_id FROM stoklar WHERE id=$1',
                    [mamul_stok_id]
                );
                firmaId = st.rows[0]?.firma_id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO urun_agaclari
                    (mamul_stok_id, agac_kodu, agac_adi, miktar,
                     gecerlilik_baslangic, gecerlilik_bitis, min_miktar, max_miktar, firma_id)
                VALUES ($1,$2,$3,COALESCE($4,1),$5,$6,$7,$8,$9)
                RETURNING id
                `,
                [
                    mamul_stok_id,
                    agac_kodu,
                    agac_adi,
                    miktar,
                    gecerlilik_baslangic || null,
                    gecerlilik_bitis || null,
                    min_miktar ?? 0,
                    max_miktar ?? 999999999,
                    firmaId,
                ]
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

router.put('/:id', async (req, res) => {
    try {
        const {
            agac_adi,
            miktar,
            satirlar,
            mamul_stok_id,
            gecerlilik_baslangic,
            gecerlilik_bitis,
            min_miktar,
            max_miktar,
        } = req.body;
        if (!agac_adi) return res.status(400).json({ hata: 'agac_adi zorunlu.' });

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
            const sid = ins.rows[0].id;
            let altSira = 10;
            for (const alt of satir.alt_satirlar || []) {
                await satirEkle(client, urunAgaciId, alt, sid, altSira);
                altSira += 10;
            }
            return sid;
        }

        const kayitId = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM urun_agaclari WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const err = new Error('Ürün ağacı bulunamadı.');
                err.status = 404;
                throw err;
            }
            await client.query(
                `UPDATE urun_agaclari SET
                    agac_adi=$2,
                    miktar=COALESCE($3, miktar),
                    mamul_stok_id=COALESCE($4, mamul_stok_id),
                    gecerlilik_baslangic=COALESCE($5, gecerlilik_baslangic),
                    gecerlilik_bitis=COALESCE($6, gecerlilik_bitis),
                    min_miktar=COALESCE($7, min_miktar),
                    max_miktar=COALESCE($8, max_miktar)
                 WHERE id=$1`,
                [
                    req.params.id,
                    agac_adi,
                    miktar ?? null,
                    mamul_stok_id || null,
                    gecerlilik_baslangic || null,
                    gecerlilik_bitis || null,
                    min_miktar ?? null,
                    max_miktar ?? null,
                ]
            );
            if (Array.isArray(satirlar)) {
                await client.query('DELETE FROM urun_agaci_satirlari WHERE urun_agaci_id=$1', [req.params.id]);
                let sira = 10;
                for (const s of satirlar) {
                    if (!s.bilesen_stok_id || s.miktar == null) continue;
                    await satirEkle(client, Number(req.params.id), s, null, sira);
                    sira += 10;
                }
            }
            return Number(req.params.id);
        });

        res.json(await agacGetir(kayitId));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM urun_agaclari WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
