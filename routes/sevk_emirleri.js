const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function sevkGetir(id) {
    const s = await pool.query(
        `
        SELECT se.*, c.cari_kodu, c.cari_adi, sp.siparis_no,
               d.depo_kodu, d.depo_adi, hk.hareket_kodu, hk.hareket_adi
        FROM sevk_emirleri se
        JOIN cariler c ON c.id = se.cari_id
        JOIN siparisler sp ON sp.id = se.siparis_id
        JOIN depolar d ON d.id = se.depo_id
        LEFT JOIN hareket_kodlari hk ON hk.id = se.hareket_kodu_id
        WHERE se.id = $1
        `,
        [id]
    );
    if (!s.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT ss.*, st.stok_kodu, st.stok_adi
        FROM sevk_emri_satirlari ss
        JOIN stoklar st ON st.id = ss.stok_id
        WHERE ss.sevk_id = $1
        ORDER BY ss.sira_no, ss.id
        `,
        [id]
    );
    return { ...s.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await (() => { const firmaId = firmaIdFromReq(req); const params = []; let sql = 'SELECT id FROM sevk_emirleri'; if (firmaId) { params.push(firmaId); sql += ' WHERE firma_id = $' + params.length; } sql += ' ORDER BY id DESC'; return pool.query(sql, params); })();
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await sevkGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await sevkGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            siparis_id, depo_id, sevk_tarihi, sevk_adresi, sevk_il, sevk_ilce,
            sevk_ulke, sevk_posta_kodu, aciklama, hareket_kodu_id, durum,
        } = req.body;
        let satirlar = req.body.satirlar || req.body.kalemler;

        if (!siparis_id || !depo_id) {
            return res.status(400).json({ hata: 'siparis_id ve depo_id zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const sip = await client.query(
                `SELECT s.*, c.cari_kodu, c.cari_adi,
                        c.fatura_adres1, c.adres, c.il, c.ilce, c.ulke, c.posta_kodu
                 FROM siparisler s JOIN cariler c ON c.id = s.cari_id WHERE s.id=$1`,
                [siparis_id]
            );
            if (!sip.rows[0]) throw new Error('Satış siparişi bulunamadı.');
            const siparis = sip.rows[0];

            if (!Array.isArray(satirlar) || !satirlar.length) {
                const kalemler = await client.query(
                    `SELECT * FROM siparis_detaylari WHERE siparis_id=$1 ORDER BY id`,
                    [siparis_id]
                );
                satirlar = kalemler.rows.map((k, i) => ({
                    sira_no: i + 1,
                    stok_id: k.stok_id,
                    siparis_detay_id: k.id,
                    miktar: k.miktar,
                    birim: k.stok_birimi || k.birim,
                })).filter((x) => x.stok_id);
                if (!satirlar.length) throw new Error('Siparişte stok_id’li kalem yok.');
            }

            const no = await sonrakiBelgeNo(client, 'SEVK_EMRI');
            let hk = hareket_kodu_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM hareket_kodlari WHERE belge_tipi='SevkEmri' AND aktif ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }

            const baslik = await client.query(
                `
                INSERT INTO sevk_emirleri
                    (sevk_no, siparis_id, cari_id, depo_id, sevk_tarihi, sevk_adresi,
                     sevk_il, sevk_ilce, sevk_ulke, sevk_posta_kodu, durum, hareket_kodu_id, aciklama)
                VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6,$7,$8,$9,$10,
                        COALESCE($11,'Taslak'),$12,$13)
                RETURNING id
                `,
                [
                    no, siparis_id, siparis.cari_id, depo_id, sevk_tarihi || null,
                    sevk_adresi || siparis.sevk_adresi || siparis.fatura_adres1 || siparis.adres,
                    sevk_il || siparis.il, sevk_ilce || siparis.ilce,
                    sevk_ulke || siparis.ulke || 'Türkiye', sevk_posta_kodu || siparis.posta_kodu,
                    durum || 'Taslak', hk, aciklama || `Sipariş ${siparis.siparis_no}`,
                ]
            );
            const sid = baslik.rows[0].id;
            for (const s of satirlar) {
                if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
                await client.query(
                    `
                    INSERT INTO sevk_emri_satirlari
                        (sevk_id, sira_no, stok_id, siparis_detay_id, miktar, birim)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [sid, s.sira_no || 1, s.stok_id, s.siparis_detay_id || null, s.miktar, s.birim || null]
                );
            }
            return sid;
        });
        res.status(201).json(await sevkGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            depo_id, sevk_tarihi, sevk_adresi, sevk_il, sevk_ilce, sevk_ulke,
            sevk_posta_kodu, aciklama, hareket_kodu_id, durum,
        } = req.body;
        const raw = req.body.satirlar || req.body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'IrsaliyeDonustu', 'Iptal', 'Kapali'];
        if (durum && !allowed.includes(durum)) return res.status(400).json({ hata: 'Geçersiz durum.' });

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM sevk_emirleri WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('Sevk emri bulunamadı.');
                e.status = 404;
                throw e;
            }
            await client.query(
                `
                UPDATE sevk_emirleri SET
                    depo_id = COALESCE($2, depo_id),
                    sevk_tarihi = COALESCE($3::date, sevk_tarihi),
                    sevk_adresi = COALESCE($4, sevk_adresi),
                    sevk_il = COALESCE($5, sevk_il),
                    sevk_ilce = COALESCE($6, sevk_ilce),
                    sevk_ulke = COALESCE($7, sevk_ulke),
                    sevk_posta_kodu = COALESCE($8, sevk_posta_kodu),
                    durum = COALESCE($9, durum),
                    hareket_kodu_id = COALESCE($10, hareket_kodu_id),
                    aciklama = COALESCE($11, aciklama)
                WHERE id=$1
                `,
                [
                    req.params.id, depo_id || null, sevk_tarihi || null, sevk_adresi ?? null,
                    sevk_il ?? null, sevk_ilce ?? null, sevk_ulke ?? null, sevk_posta_kodu ?? null,
                    durum || null, hareket_kodu_id || null, aciklama ?? null,
                ]
            );
            if (Array.isArray(raw)) {
                await client.query('DELETE FROM sevk_emri_satirlari WHERE sevk_id=$1', [req.params.id]);
                for (const s of raw) {
                    if (!s.stok_id || !s.miktar) continue;
                    await client.query(
                        `
                        INSERT INTO sevk_emri_satirlari
                            (sevk_id, sira_no, stok_id, siparis_detay_id, miktar, birim)
                        VALUES ($1,$2,$3,$4,$5,$6)
                        `,
                        [req.params.id, s.sira_no || 1, s.stok_id, s.siparis_detay_id || null, s.miktar, s.birim || null]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await sevkGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM sevk_emirleri WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.sevkGetir = sevkGetir;
