const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

async function agacSatirlari(agacId) {
    const sonuc = await pool.query(
        `
        SELECT s.*, st.stok_kodu, st.stok_adi, st.stok_tipi
        FROM urun_agaci_satirlari s
        JOIN stoklar st ON st.id = s.bilesen_stok_id
        WHERE s.urun_agaci_id = $1
        ORDER BY s.sira_no, s.id
        `,
        [agacId]
    );
    return sonuc.rows;
}

function nest(rows, parentId = null, seviye = 1, path = []) {
    const out = [];
    const children = rows.filter((r) => {
        const p = r.ust_satir_id == null ? null : Number(r.ust_satir_id);
        return p === parentId;
    });
    for (const c of children) {
        const nodePath = [...path, c.stok_kodu];
        const node = {
            seviye,
            agac_id: c.urun_agaci_id,
            satir_id: c.id,
            stok_id: c.bilesen_stok_id,
            stok_kodu: c.stok_kodu,
            stok_adi: c.stok_adi,
            stok_tipi: c.stok_tipi,
            miktar: c.miktar,
            birim: c.birim,
            yol: nodePath.join(' > '),
        };
        out.push(node);
        out.push(...nest(rows, Number(c.id), seviye + 1, nodePath));
    }
    return out;
}

/** BOMT05 — ürün ağacı seviye listesi */
router.get('/seviye-listesi', async (req, res) => {
    try {
        const { agac_id } = req.query;
        let agaclar;
        if (agac_id) {
            agaclar = await pool.query(
                `
                SELECT ua.*, s.stok_kodu AS mamul_kodu, s.stok_adi AS mamul_adi
                FROM urun_agaclari ua
                JOIN stoklar s ON s.id = ua.mamul_stok_id
                WHERE ua.id = $1
                `,
                [agac_id]
            );
        } else {
            agaclar = await pool.query(
                `
                SELECT ua.*, s.stok_kodu AS mamul_kodu, s.stok_adi AS mamul_adi
                FROM urun_agaclari ua
                JOIN stoklar s ON s.id = ua.mamul_stok_id
                ORDER BY ua.id
                `
            );
        }
        const sonuc = [];
        for (const a of agaclar.rows) {
            const satirlar = await agacSatirlari(a.id);
            const hasParent = satirlar.some((r) => r.ust_satir_id != null);
            let levels;
            if (hasParent) {
                levels = nest(satirlar, null, 1, [a.mamul_kodu]);
            } else {
                levels = satirlar.map((c) => ({
                    seviye: 1,
                    agac_id: a.id,
                    satir_id: c.id,
                    stok_id: c.bilesen_stok_id,
                    stok_kodu: c.stok_kodu,
                    stok_adi: c.stok_adi,
                    stok_tipi: c.stok_tipi,
                    miktar: c.miktar,
                    birim: c.birim,
                    yol: `${a.mamul_kodu} > ${c.stok_kodu}`,
                }));
            }
            for (const L of levels) {
                sonuc.push({
                    ...L,
                    agac_kodu: a.agac_kodu,
                    agac_adi: a.agac_adi,
                    mamul_kodu: a.mamul_kodu,
                    liste_kodu: `${a.agac_kodu}-${L.satir_id}`,
                    aciklama: L.yol,
                });
            }
        }
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** BOMT03 — malzeme değişikliği */
router.post('/malzeme-degistir', async (req, res) => {
    try {
        const { eski_stok_id, yeni_stok_id, agac_id } = req.body;
        if (!eski_stok_id || !yeni_stok_id) {
            return res.status(400).json({ hata: 'eski_stok_id ve yeni_stok_id zorunlu.' });
        }
        if (Number(eski_stok_id) === Number(yeni_stok_id)) {
            return res.status(400).json({ hata: 'Eski ve yeni stok aynı olamaz.' });
        }
        const result = await withTransaction(pool, async (client) => {
            const yeni = await client.query('SELECT id, stok_kodu FROM stoklar WHERE id=$1', [yeni_stok_id]);
            if (!yeni.rows[0]) throw new Error('Yeni stok bulunamadı.');
            const params = [eski_stok_id, yeni_stok_id];
            let sql = `
                UPDATE urun_agaci_satirlari
                SET bilesen_stok_id = $2
                WHERE bilesen_stok_id = $1
            `;
            if (agac_id) {
                params.push(agac_id);
                sql += ` AND urun_agaci_id = $3`;
            }
            sql += ' RETURNING id, urun_agaci_id';
            const upd = await client.query(sql, params);
            return {
                guncellenen_satir: upd.rowCount,
                satir_idler: upd.rows.map((r) => r.id),
                yeni_stok_kodu: yeni.rows[0].stok_kodu,
            };
        });
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** UI: malzeme değişikliği işlem geçmişi (oturum içi değil — sonuç kaydı döner) */
const degisiklikLog = [];

router.get('/malzeme-degisikligi', async (req, res) => {
    res.json(degisiklikLog.slice().reverse());
});

router.post('/malzeme-degisikligi', async (req, res) => {
    try {
        const { eski_stok_id, yeni_stok_id, agac_id, aciklama } = req.body;
        if (!eski_stok_id || !yeni_stok_id) {
            return res.status(400).json({ hata: 'eski_stok_id ve yeni_stok_id zorunlu.' });
        }
        req.url = '/malzeme-degistir';
        const result = await withTransaction(pool, async (client) => {
            const eski = await client.query('SELECT stok_kodu FROM stoklar WHERE id=$1', [eski_stok_id]);
            const yeni = await client.query('SELECT stok_kodu FROM stoklar WHERE id=$1', [yeni_stok_id]);
            if (!eski.rows[0] || !yeni.rows[0]) throw new Error('Stok bulunamadı.');
            const params = [eski_stok_id, yeni_stok_id];
            let sql = `UPDATE urun_agaci_satirlari SET bilesen_stok_id=$2 WHERE bilesen_stok_id=$1`;
            if (agac_id) {
                params.push(agac_id);
                sql += ` AND urun_agaci_id=$3`;
            }
            sql += ' RETURNING id';
            const upd = await client.query(sql, params);
            return {
                id: degisiklikLog.length + 1,
                islem_kodu: `MD${String(degisiklikLog.length + 1).padStart(5, '0')}`,
                eski_stok_id,
                yeni_stok_id,
                eski_stok_kodu: eski.rows[0].stok_kodu,
                yeni_stok_kodu: yeni.rows[0].stok_kodu,
                agac_id: agac_id || null,
                guncellenen_satir: upd.rowCount,
                aciklama: aciklama || `${eski.rows[0].stok_kodu} → ${yeni.rows[0].stok_kodu}`,
                kayit_tarihi: new Date().toISOString(),
            };
        });
        degisiklikLog.push(result);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
