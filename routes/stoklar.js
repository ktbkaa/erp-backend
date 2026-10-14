const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod, stokSeriKodundanTip } = require('../src/utils/kodUretici');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

function nonempty(v) {
    return trimOrNull(v) !== null;
}

function rowHasContent(row, keys) {
    return keys.some((k) => {
        const v = row[k];
        if (typeof v === 'boolean') return v;
        return nonempty(v);
    });
}

async function assertBirim(client, kod, label) {
    const k = trimOrNull(kod);
    if (!k) return null;
    const r = await client.query(
        'SELECT birim_kodu FROM olcu_birimleri WHERE birim_kodu = $1',
        [k]
    );
    if (!r.rows[0]) {
        // ölçü birimi tablosu boş/eksik olabilir — uyarı yerine mevcut serbest birime izin ver (geri uyum)
        // ama bilinen kodlar için doğrula: tablo doluysa reddet
        const cnt = await client.query('SELECT COUNT(*)::int AS n FROM olcu_birimleri');
        if (cnt.rows[0].n > 0) {
            const err = new Error(`${label}: ölçü birimi bulunamadı (${k}).`);
            err.status = 400;
            err.alan = label;
            throw err;
        }
    }
    return k;
}

async function stokGetir(id) {
    const stokRes = await pool.query(
        `
        SELECT
            s.*,
            (
                SELECT f.firma_kodu
                FROM stok_is_yeri siy
                JOIN is_yerleri i ON i.id = siy.is_yeri_id
                JOIN firmalar f ON f.id = i.firma_id
                WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS firma_kodu,
            (
                SELECT f.firma_adi
                FROM stok_is_yeri siy
                JOIN is_yerleri i ON i.id = siy.is_yeri_id
                JOIN firmalar f ON f.id = i.firma_id
                WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS firma_adi,
            (
                SELECT i.is_yeri_kodu
                FROM stok_is_yeri siy
                JOIN is_yerleri i ON i.id = siy.is_yeri_id
                WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS is_yeri_kodu,
            (
                SELECT i.is_yeri_adi
                FROM stok_is_yeri siy
                JOIN is_yerleri i ON i.id = siy.is_yeri_id
                WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                ORDER BY siy.id LIMIT 1
            ) AS is_yeri_adi
        FROM stoklar s
        WHERE s.id = $1
        `,
        [id]
    );
    if (!stokRes.rows[0]) return null;
    const [detaylar, birimler] = await Promise.all([
        pool.query('SELECT * FROM stok_detaylari WHERE stok_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM stok_birim_tanimlari WHERE stok_id = $1 ORDER BY sira_no, id', [id]),
    ]);
    return {
        ...stokRes.rows[0],
        stok_detaylari: detaylar.rows,
        birim_tanimlari: birimler.rows,
    };
}

async function saveChildren(client, stokId, body) {
    if (Array.isArray(body.stok_detaylari)) {
        await client.query('DELETE FROM stok_detaylari WHERE stok_id = $1', [stokId]);
        for (const d of body.stok_detaylari) {
            if (!rowHasContent(d, ['boyut', 'agirlik'])) continue;
            await client.query(
                `INSERT INTO stok_detaylari (stok_id, boyut, agirlik) VALUES ($1, $2, $3)`,
                [stokId, trimOrNull(d.boyut), d.agirlik ?? null]
            );
        }
    }

    if (Array.isArray(body.birim_tanimlari)) {
        await client.query('DELETE FROM stok_birim_tanimlari WHERE stok_id = $1', [stokId]);
        let sira = 0;
        for (const d of body.birim_tanimlari) {
            if (!nonempty(d.birim_kodu)) continue;
            sira += 1;
            const birim = await assertBirim(client, d.birim_kodu, 'Birim kodu');
            const cevr = nonempty(d.cevrilecek_birim)
                ? await assertBirim(client, d.cevrilecek_birim, 'Çevrilecek birim')
                : null;
            const katsayi = Number(d.katsayi);
            if (!Number.isFinite(katsayi) || katsayi <= 0) {
                const err = new Error('Birim katsayisi 0 dan buyuk olmalidir.');
                err.status = 400;
                err.alan = 'katsayi';
                throw err;
            }
            await client.query(
                `
                INSERT INTO stok_birim_tanimlari (
                    stok_id, sira_no, birim_kodu, katsayi, cevrilecek_birim, barkod,
                    kutu_en_mm, kutu_boy_mm, kutu_yukseklik_mm, hacim, agirlik, takip_birimi_mi
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,FALSE))
                `,
                [
                    stokId, sira, birim, katsayi, cevr, trimOrNull(d.barkod),
                    d.kutu_en_mm ?? null, d.kutu_boy_mm ?? null, d.kutu_yukseklik_mm ?? null,
                    d.hacim ?? null, d.agirlik ?? null, Boolean(d.takip_birimi_mi),
                ]
            );
        }
    }
}

router.get('/', async (req, res) => {
    try {
        const { tip } = req.query;
        const params = [];
        let where = '';
        if (tip) {
            params.push(tip);
            where = 'WHERE stok_tipi = $1';
        }
        const ids = await pool.query(
            `SELECT id FROM stoklar ${where} ORDER BY id DESC`,
            params
        );
        const stoklar = [];
        for (const r of ids.rows) stoklar.push(await stokGetir(r.id));
        res.json(stoklar);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const stok = await stokGetir(req.params.id);
        if (!stok) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        res.json(stok);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const stok_adi = trimOrNull(req.body.stok_adi);
        if (!stok_adi) {
            return res.status(400).json({
                hata: 'Stok adı zorunludur.',
                hatalar: [{ alan: 'stok_adi', hata: 'Stok adı zorunludur.' }],
            });
        }
        const tip = trimOrNull(req.body.stok_tipi) || 'Ticari';
        const m = req.body;

        const sonucId = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(m.stok_kodu) || (await sonrakiKod(client, stokSeriKodundanTip(tip)));
            const birim = await assertBirim(client, m.birim || m.stok_takip_birimi || 'AD', 'Birim') || 'AD';
            const takip = await assertBirim(client, m.stok_takip_birimi || birim, 'Stok takip birimi') || birim;
            const abc = trimOrNull(m.abc_kodu);
            if (abc && !['A', 'B', 'C'].includes(abc)) {
                const err = new Error("ABC kodu 'A', 'B' veya 'C' olmalı.");
                err.status = 400;
                err.alan = 'abc_kodu';
                throw err;
            }

            const stokSonuc = await client.query(
                `
                INSERT INTO stoklar (
                    stok_kodu, stok_adi, stok_adi_2, aciklama, uzun_stok_kodu,
                    birim, stok_takip_birimi, satis_fiyati, stok_tipi, tedarik_tipi, aktif,
                    abc_kodu, hacim, yogunluk, hacim_birimi, yogunluk_birimi, agirlik_birimi,
                    koli_brut_agirlik, kutu_brut_agirlik, kutu_en_mm, kutu_boy_mm, kutu_yukseklik_mm,
                    barkod, emniyet_stok, maksimum_stok, ulke_mensei, raf_omru_gun,
                    marka, temin_sekli, miktar_hassasiyeti
                ) VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,COALESCE($10,'Satinalma'),COALESCE($11,TRUE),
                    $12,$13,$14,$15,$16,$17,
                    $18,$19,$20,$21,$22,
                    $23,$24,$25,$26,$27,
                    $28,$29,COALESCE($30,3)
                )
                RETURNING id
                `,
                [
                    kod, stok_adi, trimOrNull(m.stok_adi_2), trimOrNull(m.aciklama), trimOrNull(m.uzun_stok_kodu),
                    birim, takip, m.satis_fiyati || 0, tip, trimOrNull(m.tedarik_tipi),
                    typeof m.aktif === 'boolean' ? m.aktif : true,
                    abc, m.hacim ?? null, m.yogunluk ?? null,
                    trimOrNull(m.hacim_birimi), trimOrNull(m.yogunluk_birimi), trimOrNull(m.agirlik_birimi),
                    m.koli_brut_agirlik ?? null, m.kutu_brut_agirlik ?? null,
                    m.kutu_en_mm ?? null, m.kutu_boy_mm ?? null, m.kutu_yukseklik_mm ?? null,
                    trimOrNull(m.barkod), m.emniyet_stok ?? null, m.maksimum_stok ?? null,
                    trimOrNull(m.ulke_mensei), m.raf_omru_gun ?? null,
                    trimOrNull(m.marka), trimOrNull(m.temin_sekli), m.miktar_hassasiyeti ?? 3,
                ]
            );
            const stokId = stokSonuc.rows[0].id;

            // birim_tanimlari yoksa takip biriminden tek satır
            if (!Array.isArray(m.birim_tanimlari) || !m.birim_tanimlari.some((b) => nonempty(b.birim_kodu))) {
                m.birim_tanimlari = [{ birim_kodu: takip, katsayi: 1, takip_birimi_mi: true }];
            }
            await saveChildren(client, stokId, m);
            return stokId;
        });

        res.status(201).json(await stokGetir(sonucId));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu stok kodu zaten kullanılıyor.', alan: 'stok_kodu' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const stok_adi = trimOrNull(req.body.stok_adi);
        if (!stok_adi) {
            return res.status(400).json({
                hata: 'Stok adı zorunludur.',
                hatalar: [{ alan: 'stok_adi', hata: 'Stok adı zorunludur.' }],
            });
        }
        const m = req.body;
        const abc = trimOrNull(m.abc_kodu);
        if (abc && !['A', 'B', 'C'].includes(abc)) {
            return res.status(400).json({
                hata: "ABC kodu 'A', 'B' veya 'C' olmalı.",
                hatalar: [{ alan: 'abc_kodu', hata: "ABC kodu 'A', 'B' veya 'C' olmalı." }],
            });
        }

        await withTransaction(pool, async (client) => {
            const birim = Object.prototype.hasOwnProperty.call(m, 'birim')
                ? (await assertBirim(client, m.birim, 'Birim'))
                : undefined;
            const takip = Object.prototype.hasOwnProperty.call(m, 'stok_takip_birimi')
                ? (await assertBirim(client, m.stok_takip_birimi, 'Stok takip birimi'))
                : undefined;

            const upd = await client.query(
                `
                UPDATE stoklar SET
                    stok_adi = $2,
                    stok_adi_2 = $3,
                    aciklama = $4,
                    uzun_stok_kodu = $5,
                    birim = COALESCE($6, birim),
                    stok_takip_birimi = COALESCE($7, stok_takip_birimi),
                    satis_fiyati = COALESCE($8, satis_fiyati),
                    stok_tipi = COALESCE($9, stok_tipi),
                    tedarik_tipi = COALESCE($10, tedarik_tipi),
                    aktif = COALESCE($11, aktif),
                    abc_kodu = $12,
                    hacim = $13,
                    yogunluk = $14,
                    hacim_birimi = $15,
                    yogunluk_birimi = $16,
                    agirlik_birimi = $17,
                    koli_brut_agirlik = $18,
                    kutu_brut_agirlik = $19,
                    kutu_en_mm = $20,
                    kutu_boy_mm = $21,
                    kutu_yukseklik_mm = $22,
                    barkod = $23,
                    emniyet_stok = $24,
                    maksimum_stok = $25,
                    ulke_mensei = $26,
                    raf_omru_gun = $27,
                    marka = $28,
                    temin_sekli = $29,
                    miktar_hassasiyeti = COALESCE($30, miktar_hassasiyeti)
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    stok_adi,
                    trimOrNull(m.stok_adi_2),
                    trimOrNull(m.aciklama),
                    trimOrNull(m.uzun_stok_kodu),
                    birim === undefined ? null : birim,
                    takip === undefined ? null : takip,
                    m.satis_fiyati ?? null,
                    trimOrNull(m.stok_tipi),
                    trimOrNull(m.tedarik_tipi),
                    typeof m.aktif === 'boolean' ? m.aktif : null,
                    abc,
                    m.hacim ?? null,
                    m.yogunluk ?? null,
                    trimOrNull(m.hacim_birimi),
                    trimOrNull(m.yogunluk_birimi),
                    trimOrNull(m.agirlik_birimi),
                    m.koli_brut_agirlik ?? null,
                    m.kutu_brut_agirlik ?? null,
                    m.kutu_en_mm ?? null,
                    m.kutu_boy_mm ?? null,
                    m.kutu_yukseklik_mm ?? null,
                    trimOrNull(m.barkod),
                    m.emniyet_stok ?? null,
                    m.maksimum_stok ?? null,
                    trimOrNull(m.ulke_mensei),
                    m.raf_omru_gun ?? null,
                    trimOrNull(m.marka),
                    trimOrNull(m.temin_sekli),
                    m.miktar_hassasiyeti ?? null,
                ]
            );
            if (!upd.rows[0]) throw Object.assign(new Error('Stok bulunamadı.'), { status: 404 });
            await saveChildren(client, Number(req.params.id), m);
        });

        res.json(await stokGetir(req.params.id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu stok kodu zaten kullanılıyor.', alan: 'stok_kodu' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM stoklar WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
