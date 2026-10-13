const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');

async function emirGetir(id) {
    const e = await pool.query(
        `
        SELECT ue.*, s.stok_kodu, s.stok_adi, s.stok_tipi,
               hd.depo_kodu AS hammadde_depo_kodu,
               md.depo_kodu AS mamul_depo_kodu,
               yd.depo_kodu AS yari_mamul_depo_kodu,
               ua.agac_kodu, r.rota_kodu
        FROM uretim_emirleri ue
        JOIN stoklar s ON s.id = ue.stok_id
        LEFT JOIN depolar hd ON hd.id = ue.hammadde_depo_id
        LEFT JOIN depolar md ON md.id = ue.mamul_depo_id
        LEFT JOIN depolar yd ON yd.id = ue.yari_mamul_depo_id
        LEFT JOIN urun_agaclari ua ON ua.id = ue.urun_agaci_id
        LEFT JOIN rotalar r ON r.id = ue.rota_id
        WHERE ue.id = $1
        `,
        [id]
    );
    if (!e.rows[0]) return null;

    const ops = await pool.query(
        `
        SELECT o.*,
               m.merkez_kodu, m.merkez_adi,
               cs.stok_kodu AS cikti_stok_kodu,
               cs.stok_adi AS cikti_stok_adi
        FROM uretim_emri_operasyonlari o
        LEFT JOIN is_merkezleri m ON m.id = o.is_merkezi_id
        LEFT JOIN stoklar cs ON cs.id = o.cikti_stok_id
        WHERE o.emir_id = $1
        ORDER BY o.sira_no
        `,
        [id]
    );

    const operasyonlar = [];
    for (const op of ops.rows) {
        const bilesenler = await pool.query(
            `
            SELECT b.*, st.stok_kodu, st.stok_adi, st.stok_tipi
            FROM uretim_emri_operasyon_bilesenleri b
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
                      durum: sonraki.durum,
                  }
                : null,
        });
    }

    const aktif = operasyonlar.find((o) => o.durum === 'Hazir') || null;

    return {
        ...e.rows[0],
        operasyonlar,
        aktif_operasyon: aktif,
    };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM uretim_emirleri ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await emirGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const emir = await emirGetir(req.params.id);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json(emir);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Mamul için tek iş emri: rota operasyonları sırayla kopyalanır.
 * Body: stok_id, urun_agaci_id, rota_id, is_yeri_id,
 *       hammadde_depo_id, yari_mamul_depo_id, mamul_depo_id, planlanan_miktar
 */
router.post('/', async (req, res) => {
    try {
        const {
            stok_id,
            urun_agaci_id,
            rota_id,
            is_yeri_id,
            hammadde_depo_id,
            yari_mamul_depo_id,
            mamul_depo_id,
            planlanan_miktar,
        } = req.body;

        if (!stok_id || !urun_agaci_id || !rota_id || !hammadde_depo_id || !mamul_depo_id || !planlanan_miktar) {
            return res.status(400).json({
                hata: 'stok_id, urun_agaci_id, rota_id, hammadde_depo_id, mamul_depo_id, planlanan_miktar zorunlu.',
            });
        }

        const id = await withTransaction(pool, async (client) => {
            const agac = await client.query(
                'SELECT * FROM urun_agaclari WHERE id=$1 AND mamul_stok_id=$2',
                [urun_agaci_id, stok_id]
            );
            if (!agac.rows[0]) throw new Error('Ürün ağacı mamul stok ile eşleşmiyor.');

            const rotaOps = await client.query(
                'SELECT * FROM rota_operasyonlari WHERE rota_id=$1 ORDER BY sira_no',
                [rota_id]
            );
            if (rotaOps.rows.length === 0) throw new Error('Rotada operasyon yok.');

            const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
            const emir = await client.query(
                `
                INSERT INTO uretim_emirleri
                    (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
                     hammadde_depo_id, yari_mamul_depo_id, mamul_depo_id,
                     planlanan_miktar, durum)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Acik')
                RETURNING id
                `,
                [
                    no,
                    stok_id,
                    urun_agaci_id,
                    rota_id,
                    is_yeri_id || null,
                    hammadde_depo_id,
                    yari_mamul_depo_id || null,
                    mamul_depo_id,
                    planlanan_miktar,
                ]
            );
            const emirId = emir.rows[0].id;
            const carpan = Number(planlanan_miktar) / Number(agac.rows[0].miktar || 1);

            let ilk = true;
            for (const op of rotaOps.rows) {
                const opIns = await client.query(
                    `
                    INSERT INTO uretim_emri_operasyonlari
                        (emir_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id,
                         cikti_stok_id, sonraki_sira_no, planlanan_miktar, durum)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                    RETURNING id
                    `,
                    [
                        emirId,
                        op.sira_no,
                        op.operasyon_kodu,
                        op.operasyon_adi,
                        op.is_merkezi_id,
                        op.cikti_stok_id,
                        op.sonraki_sira_no,
                        planlanan_miktar,
                        ilk ? 'Hazir' : 'Bekliyor',
                    ]
                );
                ilk = false;

                const bilesenler = await client.query(
                    'SELECT * FROM rota_operasyon_bilesenleri WHERE operasyon_id=$1',
                    [op.id]
                );
                for (const b of bilesenler.rows) {
                    await client.query(
                        `
                        INSERT INTO uretim_emri_operasyon_bilesenleri
                            (operasyon_id, stok_id, planlanan_miktar, birim)
                        VALUES ($1,$2,$3,$4)
                        `,
                        [opIns.rows[0].id, b.stok_id, Number(b.miktar) * carpan, b.birim]
                    );
                }
            }

            return emirId;
        });

        res.status(201).json(await emirGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

function tuketimDepoSec(emir, stokTipi) {
    // Hammadde Ana depodan; yarı mamul YM depodan
    if (stokTipi === 'YariMamul') {
        return emir.yari_mamul_depo_id || emir.hammadde_depo_id;
    }
    return emir.hammadde_depo_id;
}

function ciktiDepoSec(emir, ciktiStokTipi) {
    if (ciktiStokTipi === 'Mamul') return emir.mamul_depo_id;
    if (ciktiStokTipi === 'YariMamul') return emir.yari_mamul_depo_id || emir.mamul_depo_id;
    return emir.mamul_depo_id;
}

/**
 * Sıradaki (Hazir) operasyonu tamamla.
 * Body: { miktar? } — yoksa operasyon planlanan miktarı
 */
router.post('/:id/operasyon-tamamla', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        const sonuc = await withTransaction(pool, async (client) => {
            const emirRes = await client.query(
                'SELECT * FROM uretim_emirleri WHERE id=$1 FOR UPDATE',
                [emirId]
            );
            const emir = emirRes.rows[0];
            if (!emir) throw new Error('Üretim emri bulunamadı.');
            if (['Kapali', 'Iptal'].includes(emir.durum)) {
                throw new Error(`Emir kapalı/iptal: ${emir.durum}`);
            }

            const opRes = await client.query(
                `
                SELECT * FROM uretim_emri_operasyonlari
                WHERE emir_id=$1 AND durum='Hazir'
                ORDER BY sira_no LIMIT 1 FOR UPDATE
                `,
                [emirId]
            );
            const op = opRes.rows[0];
            if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

            const miktar = Number(req.body.miktar || op.planlanan_miktar);
            if (miktar <= 0) throw new Error('miktar > 0 olmalı.');
            const kalan = Number(op.planlanan_miktar) - Number(op.uretilen_miktar);
            if (miktar - kalan > 1e-9) throw new Error(`Fazla üretim engellendi. Kalan=${kalan}`);

            const oran = miktar / Number(op.planlanan_miktar);
            const bilesenler = await client.query(
                `
                SELECT b.*, st.stok_tipi, st.birim AS stok_birimi
                FROM uretim_emri_operasyon_bilesenleri b
                JOIN stoklar st ON st.id = b.stok_id
                WHERE b.operasyon_id=$1 FOR UPDATE
                `,
                [op.id]
            );

            // Bileşenleri tipine göre depodan grupla ve tüket
            const depoGrup = new Map();
            for (const b of bilesenler.rows) {
                const depoId = tuketimDepoSec(emir, b.stok_tipi);
                if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
                depoGrup.get(depoId).push({
                    stok_id: b.stok_id,
                    miktar: Number(b.planlanan_miktar) * oran,
                    yon: -1,
                    birim: b.birim || b.stok_birimi,
                });
                await client.query(
                    `UPDATE uretim_emri_operasyon_bilesenleri
                     SET tuketilen_miktar = tuketilen_miktar + $1 WHERE id=$2`,
                    [Number(b.planlanan_miktar) * oran, b.id]
                );
            }

            let tuketimHareketId = null;
            for (const [depoId, satirlar] of depoGrup.entries()) {
                const h = await stokHareketOlustur(client, {
                    hareketTipi: 'URETIM_TUKETIM',
                    isYeriId: emir.is_yeri_id,
                    depoId,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    aciklama: `${emir.emir_no} / ${op.operasyon_kodu} tüketim`,
                    satirlar,
                });
                tuketimHareketId = h.hareket.id;
            }

            // Çıktı stoğu ilgili depoya
            let mamulHareketId = null;
            if (op.cikti_stok_id) {
                const cikti = await client.query(
                    'SELECT id, birim, stok_tipi FROM stoklar WHERE id=$1',
                    [op.cikti_stok_id]
                );
                const ciktiDepo = ciktiDepoSec(emir, cikti.rows[0].stok_tipi);
                const h = await stokHareketOlustur(client, {
                    hareketTipi: 'URETIM_GIRIS',
                    isYeriId: emir.is_yeri_id,
                    depoId: ciktiDepo,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    aciklama: `${emir.emir_no} / ${op.operasyon_kodu} çıktı`,
                    satirlar: [{
                        stok_id: op.cikti_stok_id,
                        miktar,
                        yon: 1,
                        birim: cikti.rows[0].birim,
                    }],
                });
                mamulHareketId = h.hareket.id;
            }

            const yeniUretilen = Number(op.uretilen_miktar) + miktar;
            const opDurum = yeniUretilen + 1e-9 >= Number(op.planlanan_miktar) ? 'Tamamlandi' : 'Hazir';
            await client.query(
                `UPDATE uretim_emri_operasyonlari
                 SET uretilen_miktar=$1, durum=$2 WHERE id=$3`,
                [yeniUretilen, opDurum, op.id]
            );

            // Sıradaki operasyonu Hazir yap
            if (opDurum === 'Tamamlandi' && op.sonraki_sira_no) {
                await client.query(
                    `
                    UPDATE uretim_emri_operasyonlari
                    SET durum='Hazir'
                    WHERE emir_id=$1 AND sira_no=$2 AND durum='Bekliyor'
                    `,
                    [emirId, op.sonraki_sira_no]
                );
            }

            // Tüm ops tamamsa emri kapat; mamul miktarını güncelle
            if (op.cikti_stok_id === emir.stok_id) {
                await client.query(
                    `UPDATE uretim_emirleri
                     SET uretilen_miktar = uretilen_miktar + $1, durum='Uretimde'
                     WHERE id=$2`,
                    [miktar, emirId]
                );
            }

            const kalanOps = await client.query(
                `SELECT COUNT(*)::int AS c FROM uretim_emri_operasyonlari
                 WHERE emir_id=$1 AND durum <> 'Tamamlandi'`,
                [emirId]
            );
            if (kalanOps.rows[0].c === 0) {
                await client.query(
                    `UPDATE uretim_emirleri SET durum='Kapali' WHERE id=$1`,
                    [emirId]
                );
            }

            const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
            await client.query(
                `
                INSERT INTO uretim_girisleri
                    (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
                VALUES ($1,$2,$3,$4,$5)
                `,
                [girisNo, emirId, miktar, tuketimHareketId, mamulHareketId]
            );

            return { operasyon_id: op.id, operasyon_kodu: op.operasyon_kodu, miktar };
        });

        res.status(201).json({
            tamamlanan: sonuc,
            emir: await emirGetir(emirId),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

// Tüm Hazir operasyonları sırayla bitir (demo/kolay yol)
router.post('/:id/uretim-giris', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        let emir = await emirGetir(emirId);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });

        const adimlar = [];
        while (emir.aktif_operasyon) {
            const r = await tamamlaOperasyonInternal(emirId, req.body.miktar);
            adimlar.push(r.tamamlanan);
            emir = r.emir;
            if (emir.durum === 'Kapali') break;
        }
        res.status(201).json({ adimlar, emir });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

async function tamamlaOperasyonInternal(emirId, miktarOpsiyonel) {
    const sonuc = await withTransaction(pool, async (client) => {
        const emirRes = await client.query(
            'SELECT * FROM uretim_emirleri WHERE id=$1 FOR UPDATE',
            [emirId]
        );
        const emir = emirRes.rows[0];
        if (!emir) throw new Error('Üretim emri bulunamadı.');

        const opRes = await client.query(
            `
            SELECT * FROM uretim_emri_operasyonlari
            WHERE emir_id=$1 AND durum='Hazir'
            ORDER BY sira_no LIMIT 1 FOR UPDATE
            `,
            [emirId]
        );
        const op = opRes.rows[0];
        if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

        const miktar = Number(miktarOpsiyonel || op.planlanan_miktar);
        const oran = miktar / Number(op.planlanan_miktar);

        const bilesenler = await client.query(
            `
            SELECT b.*, st.stok_tipi, st.birim AS stok_birimi
            FROM uretim_emri_operasyon_bilesenleri b
            JOIN stoklar st ON st.id = b.stok_id
            WHERE b.operasyon_id=$1 FOR UPDATE
            `,
            [op.id]
        );

        const depoGrup = new Map();
        for (const b of bilesenler.rows) {
            const depoId = tuketimDepoSec(emir, b.stok_tipi);
            if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
            depoGrup.get(depoId).push({
                stok_id: b.stok_id,
                miktar: Number(b.planlanan_miktar) * oran,
                yon: -1,
                birim: b.birim || b.stok_birimi,
            });
            await client.query(
                `UPDATE uretim_emri_operasyon_bilesenleri
                 SET tuketilen_miktar = tuketilen_miktar + $1 WHERE id=$2`,
                [Number(b.planlanan_miktar) * oran, b.id]
            );
        }

        let tuketimHareketId = null;
        for (const [depoId, satirlar] of depoGrup.entries()) {
            const h = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_TUKETIM',
                isYeriId: emir.is_yeri_id,
                depoId,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                aciklama: `${emir.emir_no} / ${op.operasyon_kodu} tüketim`,
                satirlar,
            });
            tuketimHareketId = h.hareket.id;
        }

        let mamulHareketId = null;
        if (op.cikti_stok_id) {
            const cikti = await client.query(
                'SELECT id, birim, stok_tipi FROM stoklar WHERE id=$1',
                [op.cikti_stok_id]
            );
            const ciktiDepo = ciktiDepoSec(emir, cikti.rows[0].stok_tipi);
            const h = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_GIRIS',
                isYeriId: emir.is_yeri_id,
                depoId: ciktiDepo,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                aciklama: `${emir.emir_no} / ${op.operasyon_kodu} çıktı`,
                satirlar: [{
                    stok_id: op.cikti_stok_id,
                    miktar,
                    yon: 1,
                    birim: cikti.rows[0].birim,
                }],
            });
            mamulHareketId = h.hareket.id;
        }

        await client.query(
            `UPDATE uretim_emri_operasyonlari
             SET uretilen_miktar = uretilen_miktar + $1, durum='Tamamlandi' WHERE id=$2`,
            [miktar, op.id]
        );

        if (op.sonraki_sira_no) {
            await client.query(
                `
                UPDATE uretim_emri_operasyonlari
                SET durum='Hazir'
                WHERE emir_id=$1 AND sira_no=$2 AND durum='Bekliyor'
                `,
                [emirId, op.sonraki_sira_no]
            );
        }

        if (op.cikti_stok_id === emir.stok_id) {
            await client.query(
                `UPDATE uretim_emirleri
                 SET uretilen_miktar = uretilen_miktar + $1, durum='Uretimde' WHERE id=$2`,
                [miktar, emirId]
            );
        }

        const kalanOps = await client.query(
            `SELECT COUNT(*)::int AS c FROM uretim_emri_operasyonlari
             WHERE emir_id=$1 AND durum <> 'Tamamlandi'`,
            [emirId]
        );
        if (kalanOps.rows[0].c === 0) {
            await client.query(`UPDATE uretim_emirleri SET durum='Kapali' WHERE id=$1`, [emirId]);
        }

        const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
        await client.query(
            `
            INSERT INTO uretim_girisleri
                (giris_no, emir_id, miktar, tuketim_hareket_id, mamul_hareket_id)
            VALUES ($1,$2,$3,$4,$5)
            `,
            [girisNo, emirId, miktar, tuketimHareketId, mamulHareketId]
        );

        return { operasyon_kodu: op.operasyon_kodu, miktar };
    });

    return { tamamlanan: sonuc, emir: await emirGetir(emirId) };
}

router.put('/:id', async (req, res) => {
    try {
        const { planlanan_miktar, durum } = req.body;
        const upd = await pool.query(
            `
            UPDATE uretim_emirleri SET
                planlanan_miktar = COALESCE($2, planlanan_miktar),
                durum = COALESCE($3, durum)
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, planlanan_miktar ?? null, durum || null]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json(await emirGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM uretim_emirleri WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
