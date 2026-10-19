const express = require('express');
const router = express.Router();
const pool = require('../db');
const { mrpHesapla, mrpCalistir } = require('../src/services/mrpService');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { sonrakiKod } = require('../src/utils/kodUretici');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** Anlık MRP listesi (çalışma kaydetmeden) */
router.get('/', async (req, res, next) => {
    try {
        const liste = await mrpHesapla(pool, {
            isYeriId: req.query.is_yeri_id ? Number(req.query.is_yeri_id) : null,
            firmaId: req.query.firma_id ? Number(req.query.firma_id) : null,
            stokId: req.query.stok_id ? Number(req.query.stok_id) : null,
        });
        res.json(liste);
    } catch (err) {
        next(err);
    }
});

/** Bağımsız ihtiyaç listesi */
router.get('/bagimsiz-ihtiyaclar', async (req, res, next) => {
    try {
        const where = ['1=1'];
        const params = [];
        if (req.query.aktif === 'true') where.push('b.aktif = TRUE');
        if (req.query.aktif === 'false') where.push('b.aktif = FALSE');
        if (req.query.stok_id) {
            params.push(Number(req.query.stok_id));
            where.push(`b.stok_id = $${params.length}`);
        }
        if (req.query.is_yeri_id) {
            params.push(Number(req.query.is_yeri_id));
            where.push(`b.is_yeri_id = $${params.length}`);
        }
        const r = await pool.query(
            `SELECT b.*, s.stok_kodu, s.stok_adi, s.birim AS stok_birim
             FROM mrp_bagimsiz_ihtiyaclar b
             JOIN stoklar s ON s.id = b.stok_id
             WHERE ${where.join(' AND ')}
             ORDER BY b.ihtiyac_tarihi, b.id DESC`,
            params
        );
        res.json(r.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/bagimsiz-ihtiyaclar/:id', async (req, res, next) => {
    try {
        const r = await pool.query(
            `SELECT b.*, s.stok_kodu, s.stok_adi
             FROM mrp_bagimsiz_ihtiyaclar b
             JOIN stoklar s ON s.id = b.stok_id
             WHERE b.id = $1`,
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Bağımsız ihtiyaç bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/bagimsiz-ihtiyaclar', async (req, res, next) => {
    try {
        const stok_id = num(req.body.stok_id);
        const miktar = num(req.body.miktar);
        if (!stok_id || !miktar || miktar <= 0) {
            return res.status(400).json({ hata: 'stok_id ve miktar zorunlu.' });
        }
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.ihtiyac_no) || (await sonrakiKod(client, 'MRP_BI'));
            const ins = await client.query(
                `INSERT INTO mrp_bagimsiz_ihtiyaclar
                    (ihtiyac_no, stok_id, miktar, birim, ihtiyac_tarihi, kaynak,
                     siparis_id, firma_id, is_yeri_id, aciklama, aktif)
                 VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),COALESCE($6,'Manuel'),
                         $7,$8,$9,$10,COALESCE($11,TRUE))
                 RETURNING *`,
                [
                    kod, stok_id, miktar,
                    trimOrNull(req.body.birim),
                    req.body.ihtiyac_tarihi || null,
                    trimOrNull(req.body.kaynak) || 'Manuel',
                    num(req.body.siparis_id),
                    num(req.body.firma_id),
                    num(req.body.is_yeri_id),
                    trimOrNull(req.body.aciklama),
                    typeof req.body.aktif === 'boolean' ? req.body.aktif : true,
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İhtiyaç no zaten var.' });
        next(err);
    }
});

router.put('/bagimsiz-ihtiyaclar/:id', async (req, res, next) => {
    try {
        const miktar = num(req.body.miktar);
        if (!miktar || miktar <= 0) return res.status(400).json({ hata: 'miktar zorunlu.' });
        const upd = await pool.query(
            `UPDATE mrp_bagimsiz_ihtiyaclar SET
                stok_id = COALESCE($2, stok_id),
                miktar = $3,
                birim = COALESCE($4, birim),
                ihtiyac_tarihi = COALESCE($5::date, ihtiyac_tarihi),
                kaynak = COALESCE($6, kaynak),
                firma_id = COALESCE($7, firma_id),
                is_yeri_id = COALESCE($8, is_yeri_id),
                aciklama = COALESCE($9, aciklama),
                aktif = COALESCE($10, aktif)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                num(req.body.stok_id),
                miktar,
                trimOrNull(req.body.birim),
                req.body.ihtiyac_tarihi || null,
                trimOrNull(req.body.kaynak),
                num(req.body.firma_id),
                num(req.body.is_yeri_id),
                trimOrNull(req.body.aciklama),
                typeof req.body.aktif === 'boolean' ? req.body.aktif : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Bağımsız ihtiyaç bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete('/bagimsiz-ihtiyaclar/:id', async (req, res, next) => {
    try {
        const r = await pool.query(
            'DELETE FROM mrp_bagimsiz_ihtiyaclar WHERE id=$1 RETURNING id',
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Bağımsız ihtiyaç bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        next(err);
    }
});

/** Çalışma listesi */
router.get('/calismalar', async (req, res, next) => {
    try {
        const r = await pool.query(
            `SELECT * FROM mrp_calismalari ORDER BY id DESC LIMIT 100`
        );
        res.json(r.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/calismalar/:id', async (req, res, next) => {
    try {
        const c = await pool.query('SELECT * FROM mrp_calismalari WHERE id=$1', [req.params.id]);
        if (!c.rows[0]) return res.status(404).json({ hata: 'MRP çalışması bulunamadı.' });
        const s = await pool.query(
            `SELECT ms.*, st.stok_kodu, st.stok_adi, st.tedarik_tipi,
                    ks.stok_kodu AS kaynak_stok_kodu
             FROM mrp_sonuclar ms
             JOIN stoklar st ON st.id = ms.stok_id
             LEFT JOIN stoklar ks ON ks.id = ms.kaynak_stok_id
             WHERE ms.calisma_id = $1
             ORDER BY ms.net_ihtiyac DESC, st.stok_kodu`,
            [req.params.id]
        );
        res.json({ ...c.rows[0], sonuclar: s.rows });
    } catch (err) {
        next(err);
    }
});

router.get('/calismalar/:id/sonuclar', async (req, res, next) => {
    try {
        const s = await pool.query(
            `SELECT ms.*, st.stok_kodu, st.stok_adi, st.tedarik_tipi,
                    ks.stok_kodu AS kaynak_stok_kodu
             FROM mrp_sonuclar ms
             JOIN stoklar st ON st.id = ms.stok_id
             LEFT JOIN stoklar ks ON ks.id = ms.kaynak_stok_id
             WHERE ms.calisma_id = $1
             ORDER BY ms.net_ihtiyac DESC, st.stok_kodu`,
            [req.params.id]
        );
        res.json(s.rows);
    } catch (err) {
        next(err);
    }
});

/** MRP çalıştır ve kaydet */
router.post('/calistir', async (req, res, next) => {
    try {
        const sonuc = await withTransaction(pool, async (client) => mrpCalistir(client, {
            firmaId: num(req.body.firma_id) || (req.headers['x-firma-id'] ? Number(req.headers['x-firma-id']) : null),
            isYeriId: num(req.body.is_yeri_id),
            aciklama: trimOrNull(req.body.aciklama),
            olusturan: trimOrNull(req.headers['x-kullanici-kodu']) || trimOrNull(req.body.olusturan),
            parametre: req.body.parametre || {},
        }));
        res.status(201).json(sonuc);
    } catch (err) {
        next(err);
    }
});

/**
 * Net ihtiyaçtan satınalma talebi
 * body: { stok_idler?, calisma_id?, is_yeri_id? }
 */
router.post('/talep-olustur', async (req, res, next) => {
    try {
        const filtreIds = Array.isArray(req.body.stok_idler)
            ? req.body.stok_idler.map(Number)
            : (req.body.stok_id ? [Number(req.body.stok_id)] : null);
        const calismaId = num(req.body.calisma_id);

        let adaylar;
        if (calismaId) {
            const r = await pool.query(
                `SELECT ms.*, st.birim, st.stok_kodu, st.stok_adi
                 FROM mrp_sonuclar ms
                 JOIN stoklar st ON st.id = ms.stok_id
                 WHERE ms.calisma_id = $1
                   AND ms.oneri = 'Satınalma'
                   AND ms.net_ihtiyac > 0
                   AND ms.donusturuldu IS DISTINCT FROM TRUE`,
                [calismaId]
            );
            adaylar = r.rows.filter((row) => !filtreIds || filtreIds.includes(Number(row.stok_id)));
        } else {
            const liste = await mrpHesapla(pool, {
                isYeriId: num(req.body.is_yeri_id),
                firmaId: num(req.body.firma_id),
            });
            adaylar = liste.filter((row) => {
                if (row.net_ihtiyac <= 0 || row.oneri !== 'Satınalma') return false;
                if (filtreIds && !filtreIds.includes(Number(row.stok_id))) return false;
                return true;
            }).map((row) => ({
                ...row,
                onerilen_miktar: row.onerilen_miktar || row.net_ihtiyac,
            }));
        }

        if (!adaylar.length) {
            return res.status(400).json({ hata: 'Satınalma önerisi olan net ihtiyaç satırı yok.' });
        }

        const talepId = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATINALMA_TALEP');
            let isYeriId = num(req.body.is_yeri_id);
            if (!isYeriId) {
                const iy = await client.query('SELECT id FROM is_yerleri ORDER BY id LIMIT 1');
                isYeriId = iy.rows[0]?.id || null;
            }
            const t = await client.query(
                `INSERT INTO satin_alma_talepleri (talep_no, is_yeri_id, durum, aciklama)
                 VALUES ($1,$2,'Acik',$3) RETURNING id`,
                [no, isYeriId, `MRP — ${adaylar.length} kalem`]
            );
            const id = t.rows[0].id;
            for (const a of adaylar) {
                await client.query(
                    `INSERT INTO satin_alma_talep_satirlari (talep_id, stok_id, miktar, birim)
                     VALUES ($1,$2,$3,$4)`,
                    [id, a.stok_id, a.onerilen_miktar || a.net_ihtiyac, a.birim || null]
                );
                if (a.id && calismaId) {
                    await client.query(
                        `UPDATE mrp_sonuclar SET
                            donusturuldu = TRUE,
                            donusum_tipi = 'SatinAlmaTalep',
                            donusum_belge_id = $2,
                            donusum_belge_no = $3
                         WHERE id = $1`,
                        [a.id, id, no]
                    );
                }
            }
            return id;
        });

        const talep = await pool.query('SELECT * FROM satin_alma_talepleri WHERE id=$1', [talepId]);
        const satirlar = await pool.query(
            `SELECT ts.*, s.stok_kodu, s.stok_adi FROM satin_alma_talep_satirlari ts
             JOIN stoklar s ON s.id = ts.stok_id WHERE ts.talep_id=$1 ORDER BY ts.id`,
            [talepId]
        );
        res.status(201).json({ ...talep.rows[0], satirlar: satirlar.rows, kaynak: 'MRP' });
    } catch (err) {
        next(err);
    }
});

/**
 * Üretim önerisinden üretim emri oluştur
 * body: { stok_idler?, calisma_id?, is_yeri_id?, hammadde_depo_id?, mamul_depo_id? }
 */
router.post('/uretim-emri-olustur', async (req, res, next) => {
    try {
        const filtreIds = Array.isArray(req.body.stok_idler)
            ? req.body.stok_idler.map(Number)
            : (req.body.stok_id ? [Number(req.body.stok_id)] : null);
        const calismaId = num(req.body.calisma_id);

        let adaylar;
        if (calismaId) {
            const r = await pool.query(
                `SELECT ms.*, st.birim, st.stok_kodu
                 FROM mrp_sonuclar ms
                 JOIN stoklar st ON st.id = ms.stok_id
                 WHERE ms.calisma_id = $1
                   AND ms.oneri = 'Üretim emri'
                   AND ms.net_ihtiyac > 0
                   AND ms.donusturuldu IS DISTINCT FROM TRUE`,
                [calismaId]
            );
            adaylar = r.rows.filter((row) => !filtreIds || filtreIds.includes(Number(row.stok_id)));
        } else {
            const liste = await mrpHesapla(pool, {
                isYeriId: num(req.body.is_yeri_id),
                firmaId: num(req.body.firma_id),
            });
            adaylar = liste.filter((row) => {
                if (row.net_ihtiyac <= 0 || row.oneri !== 'Üretim emri') return false;
                if (filtreIds && !filtreIds.includes(Number(row.stok_id))) return false;
                return true;
            }).map((row) => ({
                ...row,
                onerilen_miktar: row.onerilen_miktar || row.net_ihtiyac,
            }));
        }

        if (!adaylar.length) {
            return res.status(400).json({ hata: 'Üretim önerisi olan satır yok.' });
        }

        // uretim_emirleri.emirOlustur'u kullanmak için route içi tekrar yerine doğrudan SQL + bom
        const { withTransaction: wt } = require('../src/utils/withTransaction');
        const created = await wt(pool, async (client) => {
            const out = [];
            let isYeriId = num(req.body.is_yeri_id);
            if (!isYeriId) {
                const iy = await client.query('SELECT id FROM is_yerleri ORDER BY id LIMIT 1');
                isYeriId = iy.rows[0]?.id || null;
            }
            let hmDepo = num(req.body.hammadde_depo_id);
            let mamDepo = num(req.body.mamul_depo_id);
            if (!hmDepo || !mamDepo) {
                const d = await client.query(
                    `SELECT id, depo_kodu FROM depolar
                     WHERE ($1::int IS NULL OR is_yeri_id = $1)
                     ORDER BY id LIMIT 10`,
                    [isYeriId]
                );
                const rows = d.rows;
                if (!hmDepo) {
                    hmDepo = rows.find((x) => /HMD|HAM/i.test(x.depo_kodu))?.id || rows[0]?.id;
                }
                if (!mamDepo) {
                    mamDepo = rows.find((x) => /MAM/i.test(x.depo_kodu))?.id || rows[rows.length - 1]?.id || rows[0]?.id;
                }
            }

            for (const a of adaylar) {
                const bom = await client.query(
                    `SELECT id FROM urun_agaclari WHERE mamul_stok_id=$1 AND aktif IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
                    [a.stok_id]
                );
                const rota = await client.query(
                    `SELECT id FROM rotalar WHERE stok_id=$1 AND aktif IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
                    [a.stok_id]
                );
                if (!bom.rows[0] || !rota.rows[0]) {
                    throw new Error(`${a.stok_kodu || a.stok_id}: ürün ağacı veya rota yok.`);
                }
                const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
                const miktar = a.onerilen_miktar || a.net_ihtiyac;
                const emir = await client.query(
                    `INSERT INTO uretim_emirleri
                        (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
                         hammadde_depo_id, mamul_depo_id, planlanan_miktar, durum, planli_kesin)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik','Planli')
                     RETURNING id, emir_no`,
                    [no, a.stok_id, bom.rows[0].id, rota.rows[0].id, isYeriId, hmDepo, mamDepo, miktar]
                );
                // bileşenler BOM'dan
                const agac = await client.query('SELECT miktar FROM urun_agaclari WHERE id=$1', [bom.rows[0].id]);
                const carpan = Number(miktar) / Number(agac.rows[0]?.miktar || 1);
                const sat = await client.query(
                    `SELECT bilesen_stok_id, miktar, birim FROM urun_agaci_satirlari
                     WHERE urun_agaci_id=$1 AND ust_satir_id IS NULL`,
                    [bom.rows[0].id]
                );
                for (const s of sat.rows) {
                    await client.query(
                        `INSERT INTO uretim_emri_bilesenleri (emir_id, stok_id, planlanan_miktar, birim)
                         VALUES ($1,$2,$3,$4)`,
                        [emir.rows[0].id, s.bilesen_stok_id, Number(s.miktar) * carpan, s.birim]
                    );
                }
                if (a.id && calismaId) {
                    await client.query(
                        `UPDATE mrp_sonuclar SET
                            donusturuldu = TRUE,
                            donusum_tipi = 'UretimEmri',
                            donusum_belge_id = $2,
                            donusum_belge_no = $3
                         WHERE id = $1`,
                        [a.id, emir.rows[0].id, emir.rows[0].emir_no]
                    );
                }
                out.push(emir.rows[0]);
            }
            return out;
        });

        res.status(201).json({ olusan: created.length, emirler: created, kaynak: 'MRP' });
    } catch (err) {
        next(err);
    }
});

router.get('/:stokId', async (req, res, next) => {
    try {
        // sayısal id değilse diğer route'lara düşmesin diye kontrol
        if (!/^\d+$/.test(String(req.params.stokId))) {
            return res.status(404).json({ hata: 'Endpoint bulunamadı.' });
        }
        const liste = await mrpHesapla(pool, { stokId: Number(req.params.stokId) });
        res.json(liste[0] || null);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
