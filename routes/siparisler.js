const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function siparisGetir(id) {
    const s = await pool.query(
        `
        SELECT sp.*, c.cari_kodu AS cari_kodu_ref, c.cari_adi AS cari_adi_ref
        FROM siparisler sp
        LEFT JOIN cariler c ON c.id = sp.cari_id
        WHERE sp.id = $1
        `,
        [id]
    );
    if (!s.rows[0]) return null;
    const kalemler = await pool.query(
        `
        SELECT sd.*, st.stok_kodu AS stok_kodu_ref, st.stok_adi AS stok_adi_ref
        FROM siparis_detaylari sd
        LEFT JOIN stoklar st ON st.id = sd.stok_id
        WHERE sd.siparis_id = $1
        ORDER BY sd.id
        `,
        [id]
    );
    return { ...s.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows };
}

router.get('/', async (req, res) => {
    try {
        const { siparis_turu, durum } = req.query;
        const where = [];
        const params = [];
        if (siparis_turu) {
            params.push(siparis_turu);
            where.push(`siparis_turu = $${params.length}`);
        }
        if (durum) {
            params.push(durum);
            where.push(`durum = $${params.length}`);
        }
        // Varsayılan: satış siparişleri (satınalma ayrı ekranda)
        if (!siparis_turu && req.query.kapsam !== 'hepsi') {
            where.push(`(siparis_turu ILIKE '%satis%' OR siparis_turu ILIKE '%satış%' OR siparis_turu = 'SatisSiparis' OR siparis_turu = 'AlinanSiparis')`);
        }
        const sql = `
            SELECT id FROM siparisler
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC
        `;
        const liste = await pool.query(sql, params);
        const siparisler = [];
        for (const r of liste.rows) siparisler.push(await siparisGetir(r.id));
        res.json(siparisler);
    } catch (err) {
        console.error('Sipariş listeleme hatası:', err);
        res.status(500).json({ hata: 'Siparişler çekilirken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const siparis = await siparisGetir(req.params.id);
        if (!siparis) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        res.json(siparis);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

async function resolveCari(client, body) {
    if (body.cari_id) {
        const r = await client.query(
            'SELECT id, cari_kodu, cari_adi FROM cariler WHERE id = $1',
            [body.cari_id]
        );
        if (!r.rows[0]) throw new Error(`Cari bulunamadı (id=${body.cari_id}).`);
        return r.rows[0];
    }
    if (body.cari_kodu) {
        const r = await client.query(
            'SELECT id, cari_kodu, cari_adi FROM cariler WHERE cari_kodu = $1',
            [body.cari_kodu]
        );
        if (!r.rows[0]) throw new Error(`Belirtilen cari kodu (${body.cari_kodu}) sistemde bulunamadı!`);
        return r.rows[0];
    }
    throw new Error('cari_id veya cari_kodu zorunludur.');
}

async function resolveKalemler(client, kalemler) {
    const islenmis = [];
    let toplam = 0;
    for (const k of kalemler) {
        let stok;
        if (k.stok_id) {
            const r = await client.query(
                'SELECT id, stok_kodu, stok_adi, birim, satis_fiyati FROM stoklar WHERE id = $1',
                [k.stok_id]
            );
            stok = r.rows[0];
        } else if (k.stok_kodu) {
            const r = await client.query(
                'SELECT id, stok_kodu, stok_adi, birim, satis_fiyati FROM stoklar WHERE stok_kodu = $1',
                [k.stok_kodu]
            );
            stok = r.rows[0];
        }
        if (!stok) throw new Error(`Stok bulunamadı (${k.stok_id || k.stok_kodu}).`);
        if (k.miktar == null) throw new Error('Her kalemde miktar zorunludur.');
        const birim_fiyat =
            k.birim_fiyat !== undefined && k.birim_fiyat !== null
                ? Number(k.birim_fiyat)
                : Number(stok.satis_fiyati);
        const satirToplam = Number(k.miktar) * birim_fiyat;
        toplam += satirToplam;
        islenmis.push({
            stok_id: stok.id,
            stok_kodu: stok.stok_kodu,
            stok_adi: stok.stok_adi,
            stok_birimi: stok.birim,
            miktar: k.miktar,
            birim_fiyat,
            toplam_tutar: satirToplam,
        });
    }
    return { islenmis, toplam };
}

router.post('/', async (req, res) => {
    try {
        const { siparis_no, siparis_tarihi, siparis_turu, durum } = req.body;
        const kalemler = req.body.kalemler || req.body.satirlar;
        if (!siparis_turu) {
            return res.status(400).json({ hata: 'siparis_turu zorunludur.' });
        }
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'En az bir sipariş kalemi gerekli.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const cari = await resolveCari(client, req.body);
            const { islenmis, toplam } = await resolveKalemler(client, kalemler);

            const belgeTipi =
                String(siparis_turu).toLowerCase().includes('verilen') ||
                String(siparis_turu).toLowerCase().includes('satinal') ||
                String(siparis_turu).toLowerCase().includes('satın')
                    ? 'SATINALMA_SIPARIS'
                    : 'SATIS_SIPARIS';

            const no = siparis_no || (await sonrakiBelgeNo(client, belgeTipi));

            const siparisSonuc = await client.query(
                `
                INSERT INTO siparisler
                    (siparis_no, cari_id, cari_kodu, cari_adi, siparis_tarihi, siparis_turu, toplam_tutar, durum)
                VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Taslak'))
                RETURNING id;
                `,
                [
                    no,
                    cari.id,
                    cari.cari_kodu,
                    cari.cari_adi,
                    siparis_tarihi || new Date(),
                    siparis_turu,
                    toplam,
                    durum || null,
                ]
            );
            const siparisId = siparisSonuc.rows[0].id;

            for (const ik of islenmis) {
                await client.query(
                    `
                    INSERT INTO siparis_detaylari
                        (siparis_id, stok_id, stok_kodu, stok_adi, stok_birimi, miktar, birim_fiyat, toplam_tutar)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `,
                    [
                        siparisId,
                        ik.stok_id,
                        ik.stok_kodu,
                        ik.stok_adi,
                        ik.stok_birimi,
                        ik.miktar,
                        ik.birim_fiyat,
                        ik.toplam_tutar,
                    ]
                );
            }
            return siparisId;
        });

        res.status(201).json(await siparisGetir(id));
    } catch (err) {
        console.error('Sipariş kayıt hatası:', err);
        const status = String(err.message || '').includes('bulunamadı') ? 400 : 500;
        res.status(status).json({
            hata: err.message || 'Sipariş kaydedilirken bir pürüz çıktı.',
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { siparis_tarihi, siparis_turu, durum } = req.body;
        const kalemler = req.body.kalemler || req.body.satirlar;

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                'SELECT * FROM siparisler WHERE id=$1 FOR UPDATE',
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                const err = new Error('Sipariş bulunamadı.');
                err.status = 404;
                throw err;
            }

            let cari = {
                id: mevcut.rows[0].cari_id,
                cari_kodu: mevcut.rows[0].cari_kodu,
                cari_adi: mevcut.rows[0].cari_adi,
            };
            if (req.body.cari_id || req.body.cari_kodu) {
                cari = await resolveCari(client, req.body);
            }

            let toplam = mevcut.rows[0].toplam_tutar;
            if (Array.isArray(kalemler)) {
                const resolved = await resolveKalemler(client, kalemler);
                toplam = resolved.toplam;
                await client.query('DELETE FROM siparis_detaylari WHERE siparis_id=$1', [req.params.id]);
                for (const ik of resolved.islenmis) {
                    await client.query(
                        `
                        INSERT INTO siparis_detaylari
                            (siparis_id, stok_id, stok_kodu, stok_adi, stok_birimi, miktar, birim_fiyat, toplam_tutar)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                        `,
                        [
                            req.params.id, ik.stok_id, ik.stok_kodu, ik.stok_adi,
                            ik.stok_birimi, ik.miktar, ik.birim_fiyat, ik.toplam_tutar,
                        ]
                    );
                }
            }

            await client.query(
                `
                UPDATE siparisler SET
                    cari_id = $2,
                    cari_kodu = $3,
                    cari_adi = $4,
                    siparis_tarihi = COALESCE($5, siparis_tarihi),
                    siparis_turu = COALESCE($6, siparis_turu),
                    durum = COALESCE($7, durum),
                    toplam_tutar = $8
                WHERE id = $1
                `,
                [
                    req.params.id,
                    cari.id,
                    cari.cari_kodu,
                    cari.cari_adi,
                    siparis_tarihi || null,
                    siparis_turu || null,
                    durum || null,
                    toplam,
                ]
            );
            return Number(req.params.id);
        });

        res.json(await siparisGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Satış siparişi → Sevk emri */
router.post('/:id/sevk-emri-olustur', async (req, res) => {
    try {
        const siparis = await siparisGetir(req.params.id);
        if (!siparis) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        if (!['Onayli', 'Taslak', 'Kismi'].includes(siparis.durum)) {
            return res.status(400).json({ hata: `Sipariş durumu uygun değil: ${siparis.durum}` });
        }
        const { depo_id } = req.body;
        if (!depo_id) return res.status(400).json({ hata: 'depo_id zorunlu.' });

        const { sevkGetir } = require('./sevk_emirleri');
        const id = await withTransaction(pool, async (client) => {
            const sn = sonrakiBelgeNo;
            const no = await sn(client, 'SEVK_EMRI');
            let hk = null;
            const d = await client.query(
                `SELECT id FROM hareket_kodlari WHERE belge_tipi='SevkEmri' AND aktif ORDER BY id LIMIT 1`
            );
            hk = d.rows[0]?.id || null;
            const cari = await client.query(
                `SELECT * FROM cariler WHERE id=$1`,
                [siparis.cari_id]
            );
            const c = cari.rows[0] || {};
            const baslik = await client.query(
                `
                INSERT INTO sevk_emirleri
                    (sevk_no, siparis_id, cari_id, depo_id, sevk_tarihi, sevk_adresi,
                     sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu, durum, hareket_kodu_id, aciklama)
                VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,COALESCE($8,'Türkiye'),$9,
                        COALESCE($10,'Onayli'),$11,$12)
                RETURNING id
                `,
                [
                    no, siparis.id, siparis.cari_id, depo_id,
                    req.body.sevk_adresi || siparis.sevk_adresi || c.fatura_adres1 || c.adres,
                    req.body.sevk_il || c.il, req.body.sevk_ilce || c.ilce,
                    req.body.sevk_ulke || c.ulke, req.body.sevk_posta_kodu || c.posta_kodu,
                    req.body.durum || 'Onayli', hk, req.body.aciklama || `Sipariş ${siparis.siparis_no}`,
                ]
            );
            const sid = baslik.rows[0].id;
            let sira = 1;
            for (const k of siparis.kalemler || []) {
                if (!k.stok_id) continue;
                await client.query(
                    `
                    INSERT INTO sevk_emri_satirlari
                        (sevk_id, sira_no, stok_id, siparis_detay_id, miktar, birim)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [sid, sira++, k.stok_id, k.id, k.miktar, k.stok_birimi || k.birim || null]
                );
            }
            return sid;
        });
        res.status(201).json(await sevkGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM siparisler WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Sipariş bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
