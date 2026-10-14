const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const {
    sonrakiKod,
    cariSeriKodundanTur,
    cariTedarikciMi,
    cariMusteriMi,
} = require('../src/utils/kodUretici');

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

async function assertLookup(client, table, id, label) {
    if (id === undefined || id === null || id === '') return null;
    const n = Number(id);
    if (!Number.isFinite(n)) {
        const err = new Error(`${label}: geçersiz kimlik.`);
        err.status = 400;
        err.alan = label;
        throw err;
    }
    const r = await client.query(`SELECT id FROM ${table} WHERE id = $1`, [n]);
    if (!r.rows[0]) {
        const err = new Error(`${label}: kayıt bulunamadı (${n}).`);
        err.status = 400;
        err.alan = label;
        throw err;
    }
    return n;
}

function rowHasContent(row, keys) {
    return keys.some((k) => {
        const v = row[k];
        if (typeof v === 'boolean') return v;
        return nonempty(v);
    });
}

async function replaceChildRows(client, cariId, table, rows, insertSql, mapRow) {
    await client.query(`DELETE FROM ${table} WHERE cari_id = $1`, [cariId]);
    if (!Array.isArray(rows)) return;
    let sira = 0;
    for (const raw of rows) {
        const mapped = mapRow(raw, ++sira);
        if (!mapped) continue;
        await client.query(insertSql, mapped);
    }
}

async function cariGetir(id) {
    const c = await pool.query(
        `
        SELECT c.*,
               i.is_yeri_kodu, i.is_yeri_adi,
               f.firma_kodu, f.firma_adi
        FROM cariler c
        LEFT JOIN is_yerleri i ON i.id = c.is_yeri_id
        LEFT JOIN firmalar f ON f.id = c.firma_id
        WHERE c.id = $1
        `,
        [id]
    );
    if (!c.rows[0]) return null;
    const [detaylar, bankalar, sevkler, diller] = await Promise.all([
        pool.query('SELECT * FROM cari_detaylari WHERE cari_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM cari_banka_bilgileri WHERE cari_id = $1 ORDER BY sira_no, id', [id]),
        pool.query('SELECT * FROM cari_sevk_adresleri WHERE cari_id = $1 ORDER BY sira_no, id', [id]),
        pool.query('SELECT * FROM cari_dil_tanimlari WHERE cari_id = $1 ORDER BY id', [id]),
    ]);
    return {
        ...c.rows[0],
        tedarikci_mi: cariTedarikciMi(c.rows[0].cari_turu),
        musteri_mi: cariMusteriMi(c.rows[0].cari_turu),
        cari_detaylari: detaylar.rows,
        banka_bilgileri: bankalar.rows,
        sevk_adresleri: sevkler.rows,
        dil_tanimlari: diller.rows,
    };
}

function validateCreate(body) {
    const hatalar = [];
    const cari_adi = trimOrNull(body.cari_adi);
    const cari_turu = trimOrNull(body.cari_turu);
    if (!cari_adi) hatalar.push({ alan: 'cari_adi', hata: 'Cari adı zorunludur.' });
    if (!cari_turu) hatalar.push({ alan: 'cari_turu', hata: 'Cari tipi zorunludur.' });
    else if (!['Musteri', 'Tedarikci', 'HerIkisi'].includes(cari_turu)) {
        hatalar.push({ alan: 'cari_turu', hata: "cari_turu 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı." });
    }
    return { hatalar, cari_adi, cari_turu, cari_kodu: trimOrNull(body.cari_kodu) };
}

async function saveChildren(client, cariId, body) {
    if (Array.isArray(body.cari_detaylari)) {
        await replaceChildRows(
            client,
            cariId,
            'cari_detaylari',
            body.cari_detaylari,
            `INSERT INTO cari_detaylari (cari_id, adres, fatura_adresi, yetkili_adi, yetkili_telefon)
             VALUES ($1,$2,$3,$4,$5)`,
            (d) => {
                if (!rowHasContent(d, ['adres', 'fatura_adresi', 'yetkili_adi', 'yetkili_telefon'])) return null;
                return [
                    cariId,
                    trimOrNull(d.adres),
                    trimOrNull(d.fatura_adresi),
                    trimOrNull(d.yetkili_adi),
                    trimOrNull(d.yetkili_telefon),
                ];
            }
        );
    }

    if (Array.isArray(body.banka_bilgileri)) {
        await replaceChildRows(
            client,
            cariId,
            'cari_banka_bilgileri',
            body.banka_bilgileri,
            `INSERT INTO cari_banka_bilgileri (
                cari_id, sira_no, iban, banka_kodu, banka_adi, swift_no, para_birimi, pasif,
                sube_kodu, sube_adi, hesap_no, muhabir_hesap_no, aciklama
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,FALSE),$9,$10,$11,$12,$13)`,
            (d, sira) => {
                if (!rowHasContent(d, ['iban', 'banka_kodu', 'banka_adi', 'hesap_no', 'swift_no'])) return null;
                return [
                    cariId, sira,
                    trimOrNull(d.iban), trimOrNull(d.banka_kodu), trimOrNull(d.banka_adi),
                    trimOrNull(d.swift_no), trimOrNull(d.para_birimi) || 'TRY',
                    Boolean(d.pasif),
                    trimOrNull(d.sube_kodu), trimOrNull(d.sube_adi),
                    trimOrNull(d.hesap_no), trimOrNull(d.muhabir_hesap_no),
                    trimOrNull(d.aciklama),
                ];
            }
        );
    }

    if (Array.isArray(body.sevk_adresleri)) {
        await replaceChildRows(
            client,
            cariId,
            'cari_sevk_adresleri',
            body.sevk_adresleri,
            `INSERT INTO cari_sevk_adresleri (
                cari_id, sira_no, adres_adi, adres1, adres2, adres3,
                ulke, il, ilce, posta_kodu, telefon, yetkili_adi, varsayilan, pasif
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,FALSE),COALESCE($14,FALSE))`,
            (d, sira) => {
                if (!rowHasContent(d, ['adres_adi', 'adres1', 'adres2', 'il', 'ilce', 'yetkili_adi'])) return null;
                return [
                    cariId, sira,
                    trimOrNull(d.adres_adi), trimOrNull(d.adres1), trimOrNull(d.adres2), trimOrNull(d.adres3),
                    trimOrNull(d.ulke), trimOrNull(d.il), trimOrNull(d.ilce), trimOrNull(d.posta_kodu),
                    trimOrNull(d.telefon), trimOrNull(d.yetkili_adi),
                    Boolean(d.varsayilan), Boolean(d.pasif),
                ];
            }
        );
    }

    if (Array.isArray(body.dil_tanimlari)) {
        await replaceChildRows(
            client,
            cariId,
            'cari_dil_tanimlari',
            body.dil_tanimlari,
            `INSERT INTO cari_dil_tanimlari (
                cari_id, dil_kodu, dil_adi, cari_adi, aciklama, varsayilan
             ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,FALSE))`,
            (d) => {
                if (!nonempty(d.dil_kodu)) return null;
                return [
                    cariId,
                    trimOrNull(d.dil_kodu),
                    trimOrNull(d.dil_adi),
                    trimOrNull(d.cari_adi),
                    trimOrNull(d.aciklama),
                    Boolean(d.varsayilan),
                ];
            }
        );
    }
}

function syncFatura(m) {
    if (!nonempty(m.fatura_adres1) && nonempty(m.fatura_adresi)) m.fatura_adres1 = m.fatura_adresi;
    if (!nonempty(m.fatura_adresi) && nonempty(m.fatura_adres1)) m.fatura_adresi = m.fatura_adres1;
    return m;
}

router.get('/', async (req, res) => {
    try {
        const { tur, aktif } = req.query;
        const where = [];

        if (tur === 'Musteri') where.push(`cari_turu IN ('Musteri', 'HerIkisi')`);
        else if (tur === 'Tedarikci') where.push(`cari_turu IN ('Tedarikci', 'HerIkisi')`);
        else if (tur === 'MusteriOnly') where.push(`cari_turu = 'Musteri'`);
        else if (tur === 'TedarikciOnly') where.push(`cari_turu = 'Tedarikci'`);
        else if (tur === 'HerIkisi') where.push(`cari_turu = 'HerIkisi'`);

        if (aktif === 'true') where.push('aktif = TRUE');
        if (aktif === 'false') where.push('aktif = FALSE');

        const liste = await pool.query(`
            SELECT id FROM cariler
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC
        `);
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await cariGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const cari = await cariGetir(req.params.id);
        if (!cari) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        res.json(cari);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { hatalar, cari_adi, cari_turu, cari_kodu } = validateCreate(req.body);
        if (hatalar.length) {
            return res.status(400).json({ hata: hatalar[0].hata, hatalar });
        }

        const m = syncFatura({ ...req.body, cari_adi, cari_turu });

        const id = await withTransaction(pool, async (client) => {
            const isYeriId = await assertLookup(client, 'is_yerleri', m.is_yeri_id, 'İş yeri');
            const firmaId = await assertLookup(client, 'firmalar', m.firma_id, 'Firma');
            const kod = cari_kodu || (await sonrakiKod(client, cariSeriKodundanTur(cari_turu)));

            const cariSonuc = await client.query(
                `
                INSERT INTO cariler (
                    cari_kodu, cari_adi, cari_adi_2, aciklama, cari_turu,
                    telefon, telefon2, cep_tel, email, website, fax,
                    vergi_no, vergi_dairesi, pasaport_no, ad, soyad,
                    yetkili_adi, yetkili_telefon,
                    adres, fatura_adresi, fatura_adres1, fatura_adres2, fatura_adres3,
                    il, ilce, ulke, posta_kodu, enlem, boylam,
                    para_birimi, odeme_vadesi_gun, aktif, notlar,
                    is_yeri_id, firma_id,
                    sektor_kodu, bolge_kodu, nace_kodu, kurulus_tarihi, sermaye
                ) VALUES (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10,$11,
                    $12,$13,$14,$15,$16,
                    $17,$18,
                    $19,$20,$21,$22,$23,
                    $24,$25,$26,$27,$28,$29,
                    $30,$31,COALESCE($32,TRUE),$33,
                    $34,$35,
                    $36,$37,$38,$39,$40
                )
                RETURNING id
                `,
                [
                    kod, cari_adi, trimOrNull(m.cari_adi_2), trimOrNull(m.aciklama), cari_turu,
                    trimOrNull(m.telefon), trimOrNull(m.telefon2), trimOrNull(m.cep_tel),
                    trimOrNull(m.email), trimOrNull(m.website), trimOrNull(m.fax),
                    trimOrNull(m.vergi_no), trimOrNull(m.vergi_dairesi), trimOrNull(m.pasaport_no),
                    trimOrNull(m.ad), trimOrNull(m.soyad),
                    trimOrNull(m.yetkili_adi), trimOrNull(m.yetkili_telefon),
                    trimOrNull(m.adres), trimOrNull(m.fatura_adresi),
                    trimOrNull(m.fatura_adres1), trimOrNull(m.fatura_adres2), trimOrNull(m.fatura_adres3),
                    trimOrNull(m.il), trimOrNull(m.ilce), trimOrNull(m.ulke) || 'Türkiye',
                    trimOrNull(m.posta_kodu), m.enlem ?? null, m.boylam ?? null,
                    trimOrNull(m.para_birimi) || 'TRY', m.odeme_vadesi_gun ?? 0,
                    typeof m.aktif === 'boolean' ? m.aktif : true,
                    trimOrNull(m.notlar),
                    isYeriId, firmaId,
                    trimOrNull(m.sektor_kodu), trimOrNull(m.bolge_kodu), trimOrNull(m.nace_kodu),
                    trimOrNull(m.kurulus_tarihi), m.sermaye ?? null,
                ]
            );
            const cariId = cariSonuc.rows[0].id;
            await saveChildren(client, cariId, req.body);
            return cariId;
        });

        res.status(201).json(await cariGetir(id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu cari kodu zaten kullanılıyor.', alan: 'cari_kodu' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan, hatalar: err.hatalar });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const cari_adi = trimOrNull(req.body.cari_adi);
        if (!cari_adi) {
            return res.status(400).json({
                hata: 'Cari adı zorunludur.',
                hatalar: [{ alan: 'cari_adi', hata: 'Cari adı zorunludur.' }],
            });
        }
        const cari_turu = trimOrNull(req.body.cari_turu);
        if (cari_turu && !['Musteri', 'Tedarikci', 'HerIkisi'].includes(cari_turu)) {
            return res.status(400).json({
                hata: "cari_turu 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı.",
                hatalar: [{ alan: 'cari_turu', hata: "cari_turu 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı." }],
            });
        }

        const m = syncFatura({ ...req.body, cari_adi });

        await withTransaction(pool, async (client) => {
            const isYeriId = Object.prototype.hasOwnProperty.call(req.body, 'is_yeri_id')
                ? await assertLookup(client, 'is_yerleri', m.is_yeri_id, 'İş yeri')
                : undefined;
            const firmaId = Object.prototype.hasOwnProperty.call(req.body, 'firma_id')
                ? await assertLookup(client, 'firmalar', m.firma_id, 'Firma')
                : undefined;

            const upd = await client.query(
                `
                UPDATE cariler SET
                    cari_adi = $2,
                    cari_adi_2 = $3,
                    aciklama = $4,
                    cari_turu = COALESCE($5, cari_turu),
                    telefon = $6,
                    telefon2 = $7,
                    cep_tel = $8,
                    email = $9,
                    website = $10,
                    fax = $11,
                    vergi_no = $12,
                    vergi_dairesi = $13,
                    pasaport_no = $14,
                    ad = $15,
                    soyad = $16,
                    yetkili_adi = $17,
                    yetkili_telefon = $18,
                    adres = $19,
                    fatura_adresi = $20,
                    fatura_adres1 = $21,
                    fatura_adres2 = $22,
                    fatura_adres3 = $23,
                    il = $24,
                    ilce = $25,
                    ulke = COALESCE($26, ulke),
                    posta_kodu = $27,
                    enlem = $28,
                    boylam = $29,
                    para_birimi = COALESCE($30, para_birimi),
                    odeme_vadesi_gun = COALESCE($31, odeme_vadesi_gun),
                    aktif = COALESCE($32, aktif),
                    notlar = $33,
                    is_yeri_id = COALESCE($34, is_yeri_id),
                    firma_id = COALESCE($35, firma_id),
                    sektor_kodu = $36,
                    bolge_kodu = $37,
                    nace_kodu = $38,
                    kurulus_tarihi = $39,
                    sermaye = $40
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    cari_adi,
                    trimOrNull(m.cari_adi_2),
                    trimOrNull(m.aciklama),
                    cari_turu,
                    trimOrNull(m.telefon),
                    trimOrNull(m.telefon2),
                    trimOrNull(m.cep_tel),
                    trimOrNull(m.email),
                    trimOrNull(m.website),
                    trimOrNull(m.fax),
                    trimOrNull(m.vergi_no),
                    trimOrNull(m.vergi_dairesi),
                    trimOrNull(m.pasaport_no),
                    trimOrNull(m.ad),
                    trimOrNull(m.soyad),
                    trimOrNull(m.yetkili_adi),
                    trimOrNull(m.yetkili_telefon),
                    trimOrNull(m.adres),
                    trimOrNull(m.fatura_adresi),
                    trimOrNull(m.fatura_adres1),
                    trimOrNull(m.fatura_adres2),
                    trimOrNull(m.fatura_adres3),
                    trimOrNull(m.il),
                    trimOrNull(m.ilce),
                    trimOrNull(m.ulke),
                    trimOrNull(m.posta_kodu),
                    m.enlem ?? null,
                    m.boylam ?? null,
                    trimOrNull(m.para_birimi),
                    m.odeme_vadesi_gun ?? null,
                    typeof m.aktif === 'boolean' ? m.aktif : null,
                    trimOrNull(m.notlar),
                    isYeriId === undefined ? null : isYeriId,
                    firmaId === undefined ? null : firmaId,
                    trimOrNull(m.sektor_kodu),
                    trimOrNull(m.bolge_kodu),
                    trimOrNull(m.nace_kodu),
                    trimOrNull(m.kurulus_tarihi),
                    m.sermaye ?? null,
                ]
            );

            // COALESCE($34, is_yeri_id) cannot clear to null when user clears lookup.
            // If body explicitly sent null/empty, force null.
            if (Object.prototype.hasOwnProperty.call(req.body, 'is_yeri_id') && isYeriId === null) {
                await client.query('UPDATE cariler SET is_yeri_id = NULL WHERE id = $1', [req.params.id]);
            }
            if (Object.prototype.hasOwnProperty.call(req.body, 'firma_id') && firmaId === null) {
                await client.query('UPDATE cariler SET firma_id = NULL WHERE id = $1', [req.params.id]);
            }

            if (!upd.rows[0]) throw Object.assign(new Error('Cari bulunamadı.'), { status: 404 });
            await saveChildren(client, Number(req.params.id), req.body);
        });

        res.json(await cariGetir(req.params.id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu cari kodu zaten kullanılıyor.', alan: 'cari_kodu' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM cariler WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
