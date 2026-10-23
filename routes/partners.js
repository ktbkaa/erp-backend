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
    await client.query(`DELETE FROM ${table} WHERE partner_id = $1`, [cariId]);
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
               i.plant_code, i.plant_name,
               f.company_code, f.company_name
        FROM partners c
        LEFT JOIN plants i ON i.id = c.plant_id
        LEFT JOIN companies f ON f.id = c.company_id
        WHERE c.id = $1
        `,
        [id]
    );
    if (!c.rows[0]) return null;
    const [detaylar, banks, sevkler, languages, firmaParams] = await Promise.all([
        pool.query('SELECT * FROM partner_details WHERE partner_id = $1 ORDER BY id', [id]),
        pool.query('SELECT * FROM partner_bank_accounts WHERE partner_id = $1 ORDER BY line_no, id', [id]),
        pool.query('SELECT * FROM partner_ship_to_addresses WHERE partner_id = $1 ORDER BY line_no, id', [id]),
        pool.query('SELECT * FROM partner_languages WHERE partner_id = $1 ORDER BY id', [id]),
        pool.query(
            `SELECT p.*, f.company_code, f.company_name
             FROM partner_company_params p
             JOIN companies f ON f.id = p.company_id
             WHERE p.partner_id = $1 ORDER BY p.id`,
            [id]
        ),
    ]);
    return {
        ...c.rows[0],
        tedarikci_mi: cariTedarikciMi(c.rows[0].partner_type),
        musteri_mi: cariMusteriMi(c.rows[0].partner_type),
        partner_details: detaylar.rows,
        banka_bilgileri: banks.rows,
        sevk_adresleri: sevkler.rows,
        dil_tanimlari: languages.rows,
        firma_parametreleri: firmaParams.rows,
    };
}

function validateCreate(body) {
    const hatalar = [];
    const partner_name = trimOrNull(body.partner_name);
    const partner_type = trimOrNull(body.partner_type);
    if (!partner_name) hatalar.push({ alan: 'partner_name', hata: 'Cari adı zorunludur.' });
    if (!partner_type) hatalar.push({ alan: 'partner_type', hata: 'Cari tipi zorunludur.' });
    else if (!['Musteri', 'Tedarikci', 'HerIkisi'].includes(partner_type)) {
        hatalar.push({ alan: 'partner_type', hata: "partner_type 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı." });
    }
    return { hatalar, partner_name, partner_type, partner_code: trimOrNull(body.partner_code) };
}

async function saveChildren(client, cariId, body) {
    if (Array.isArray(body.partner_details)) {
        await replaceChildRows(
            client,
            cariId,
            'partner_details',
            body.partner_details,
            `INSERT INTO partner_details (partner_id, address, billing_address, yetkili_name, yetkili_telefon)
             VALUES ($1,$2,$3,$4,$5)`,
            (d) => {
                if (!rowHasContent(d, ['address', 'billing_address', 'yetkili_name', 'yetkili_telefon'])) return null;
                return [
                    cariId,
                    trimOrNull(d.address),
                    trimOrNull(d.billing_address),
                    trimOrNull(d.yetkili_name),
                    trimOrNull(d.yetkili_telefon),
                ];
            }
        );
    }

    if (Array.isArray(body.banka_bilgileri)) {
        await replaceChildRows(
            client,
            cariId,
            'partner_bank_accounts',
            body.banka_bilgileri,
            `INSERT INTO partner_bank_accounts (
                partner_id, line_no, iban, bank_code, bank_name, swift_no, currency_code, is_inactive,
                branch_code, branch_name, account_no, muhabir_account_no, description
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,FALSE),$9,$10,$11,$12,$13)`,
            (d, sira) => {
                if (!rowHasContent(d, ['iban', 'bank_code', 'bank_name', 'account_no', 'swift_no'])) return null;
                return [
                    cariId, sira,
                    trimOrNull(d.iban), trimOrNull(d.bank_code), trimOrNull(d.bank_name),
                    trimOrNull(d.swift_no), trimOrNull(d.currency_code) || 'TRY',
                    Boolean(d.is_inactive),
                    trimOrNull(d.branch_code), trimOrNull(d.branch_name),
                    trimOrNull(d.account_no), trimOrNull(d.muhabir_account_no),
                    trimOrNull(d.description),
                ];
            }
        );
    }

    if (Array.isArray(body.sevk_adresleri)) {
        await replaceChildRows(
            client,
            cariId,
            'partner_ship_to_addresses',
            body.sevk_adresleri,
            `INSERT INTO partner_ship_to_addresses (
                partner_id, line_no, address_name, adres1, adres2, adres3,
                country, il, district, postal_code, telefon, yetkili_name, varsayilan, is_inactive
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,FALSE),COALESCE($14,FALSE))`,
            (d, sira) => {
                if (!rowHasContent(d, ['address_name', 'adres1', 'adres2', 'il', 'district', 'yetkili_name'])) return null;
                return [
                    cariId, sira,
                    trimOrNull(d.address_name), trimOrNull(d.adres1), trimOrNull(d.adres2), trimOrNull(d.adres3),
                    trimOrNull(d.country), trimOrNull(d.il), trimOrNull(d.district), trimOrNull(d.postal_code),
                    trimOrNull(d.telefon), trimOrNull(d.yetkili_name),
                    Boolean(d.varsayilan), Boolean(d.is_inactive),
                ];
            }
        );
    }

    if (Array.isArray(body.dil_tanimlari)) {
        await replaceChildRows(
            client,
            cariId,
            'partner_languages',
            body.dil_tanimlari,
            `INSERT INTO partner_languages (
                partner_id, dil_code, dil_name, partner_name, description, varsayilan
             ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,FALSE))`,
            (d) => {
                if (!nonempty(d.dil_code)) return null;
                return [
                    cariId,
                    trimOrNull(d.dil_code),
                    trimOrNull(d.dil_name),
                    trimOrNull(d.partner_name),
                    trimOrNull(d.description),
                    Boolean(d.varsayilan),
                ];
            }
        );
    }

    if (Array.isArray(body.firma_parametreleri)) {
        await client.query('DELETE FROM partner_company_params WHERE partner_id = $1', [cariId]);
        for (const d of body.firma_parametreleri) {
            const firmaId = await assertLookup(client, 'companies', d.company_id, 'company_id');
            if (!firmaId) continue;
            await client.query(
                `INSERT INTO partner_company_params (
                    partner_id, company_id, gl_account_code, currency_code, partner_type,
                    risk_group_code, nakit_akisa_dahil, rate_degerlemeye_dahil
                 ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE),COALESCE($8,FALSE))
                 ON CONFLICT (partner_id, company_id) DO UPDATE SET
                    gl_account_code = EXCLUDED.gl_account_code,
                    currency_code = EXCLUDED.currency_code,
                    partner_type = EXCLUDED.partner_type,
                    risk_group_code = EXCLUDED.risk_group_code,
                    nakit_akisa_dahil = EXCLUDED.nakit_akisa_dahil,
                    rate_degerlemeye_dahil = EXCLUDED.rate_degerlemeye_dahil`,
                [
                    cariId,
                    firmaId,
                    trimOrNull(d.gl_account_code),
                    trimOrNull(d.currency_code) || 'TRY',
                    trimOrNull(d.partner_type),
                    trimOrNull(d.risk_group_code),
                    typeof d.nakit_akisa_dahil === 'boolean' ? d.nakit_akisa_dahil : true,
                    Boolean(d.rate_degerlemeye_dahil),
                ]
            );
        }
    }
}

function syncFatura(m) {
    if (!nonempty(m.bill_address_1) && nonempty(m.billing_address)) m.bill_address_1 = m.billing_address;
    if (!nonempty(m.billing_address) && nonempty(m.bill_address_1)) m.billing_address = m.bill_address_1;
    return m;
}

router.get('/', async (req, res) => {
    try {
        const { tur, is_active } = req.query;
        const { firmaIdFromReq, andCariFirma } = require('../src/utils/firmaScope');
        const where = [];
        const params = [];

        if (tur === 'Musteri') where.push(`partner_type IN ('Musteri', 'HerIkisi')`);
        else if (tur === 'Tedarikci') where.push(`partner_type IN ('Tedarikci', 'HerIkisi')`);
        else if (tur === 'MusteriOnly') where.push(`partner_type = 'Musteri'`);
        else if (tur === 'TedarikciOnly') where.push(`partner_type = 'Tedarikci'`);
        else if (tur === 'HerIkisi') where.push(`partner_type = 'HerIkisi'`);

        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');

        const firmaClause = andCariFirma('partners', firmaIdFromReq(req), params);
        if (firmaClause) where.push(firmaClause.replace(/^\s*AND\s+/i, ''));

        const liste = await pool.query(
            `
            SELECT id FROM partners
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC
            `,
            params
        );
        const result = [];
        for (const r of liste.rows) result.push(await cariGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { firmaIdFromReq, assertFirmaKayit } = require('../src/utils/firmaScope');
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            const ok = await assertFirmaKayit(pool, 'partners', req.params.id, firmaId);
            if (!ok) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        }
        const cari = await cariGetir(req.params.id);
        if (!cari) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        res.json(cari);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** GET /partners/:id/ekstre — cari borç/credit ekstresi (FIN-005) */
router.get('/:id/ekstre', async (req, res) => {
    try {
        const { cariEkstre } = require('../src/services/cariHareketService');
        const cari = await cariGetir(req.params.id);
        if (!cari) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        const ekstre = await cariEkstre(pool, Number(req.params.id), {
            baslangic: req.query.baslangic || null,
            bitis: req.query.bitis || null,
        });
        res.json({ cari: { id: cari.id, partner_code: cari.partner_code, partner_name: cari.partner_name }, ...ekstre });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** GET /partners/:id/skor — tedarikçi değerlendirme (PUR-008) */
router.get('/:id/skor', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT * FROM supplier_evaluations WHERE partner_id=$1 ORDER BY id DESC`,
            [req.params.id]
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { hatalar, partner_name, partner_type, partner_code } = validateCreate(req.body);
        if (hatalar.length) {
            return res.status(400).json({ hata: hatalar[0].hata, hatalar });
        }

        const m = syncFatura({ ...req.body, partner_name, partner_type });

        const id = await withTransaction(pool, async (client) => {
            const isYeriId = await assertLookup(client, 'plants', m.plant_id, 'İş yeri');
            const firmaId = await assertLookup(client, 'companies', m.company_id, 'Firma');
            const kod = partner_code || (await sonrakiKod(client, cariSeriKodundanTur(partner_type)));

            const cariSonuc = await client.query(
                `
                INSERT INTO partners (
                    partner_code, partner_name, partner_name_2, description, partner_type,
                    telefon, telefon2, mobile_phone, email, website, fax,
                    tax_id, tax_office, pasaport_no, first_name, last_name,
                    yetkili_name, yetkili_telefon,
                    address, billing_address, bill_address_1, bill_address_2, bill_address_3,
                    il, district, country, postal_code, enlem, boylam,
                    currency_code, payment_due_days, is_active, notlar,
                    plant_id, company_id,
                    sektor_code, region_code, nace_code, kurulus_date, sermaye
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
                    kod, partner_name, trimOrNull(m.partner_name_2), trimOrNull(m.description), partner_type,
                    trimOrNull(m.telefon), trimOrNull(m.telefon2), trimOrNull(m.mobile_phone),
                    trimOrNull(m.email), trimOrNull(m.website), trimOrNull(m.fax),
                    trimOrNull(m.tax_id), trimOrNull(m.tax_office), trimOrNull(m.pasaport_no),
                    trimOrNull(m.first_name), trimOrNull(m.last_name),
                    trimOrNull(m.yetkili_name), trimOrNull(m.yetkili_telefon),
                    trimOrNull(m.address), trimOrNull(m.billing_address),
                    trimOrNull(m.bill_address_1), trimOrNull(m.bill_address_2), trimOrNull(m.bill_address_3),
                    trimOrNull(m.il), trimOrNull(m.district), trimOrNull(m.country) || 'TR',
                    trimOrNull(m.postal_code), m.enlem ?? null, m.boylam ?? null,
                    trimOrNull(m.currency_code) || 'TRY', m.payment_due_days ?? 0,
                    typeof m.is_active === 'boolean' ? m.is_active : true,
                    trimOrNull(m.notlar),
                    isYeriId, firmaId,
                    trimOrNull(m.sektor_code), trimOrNull(m.region_code), trimOrNull(m.nace_code),
                    trimOrNull(m.kurulus_date), m.sermaye ?? null,
                ]
            );
            const cariId = cariSonuc.rows[0].id;
            await saveChildren(client, cariId, req.body);
            return cariId;
        });

        res.status(201).json(await cariGetir(id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu cari kodu zaten kullanılıyor.', alan: 'partner_code' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan, hatalar: err.hatalar });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const partner_name = trimOrNull(req.body.partner_name);
        if (!partner_name) {
            return res.status(400).json({
                hata: 'Cari adı zorunludur.',
                hatalar: [{ alan: 'partner_name', hata: 'Cari adı zorunludur.' }],
            });
        }
        const partner_type = trimOrNull(req.body.partner_type);
        if (partner_type && !['Musteri', 'Tedarikci', 'HerIkisi'].includes(partner_type)) {
            return res.status(400).json({
                hata: "partner_type 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı.",
                hatalar: [{ alan: 'partner_type', hata: "partner_type 'Musteri', 'Tedarikci' veya 'HerIkisi' olmalı." }],
            });
        }

        const m = syncFatura({ ...req.body, partner_name });

        await withTransaction(pool, async (client) => {
            const isYeriId = Object.prototype.hasOwnProperty.call(req.body, 'plant_id')
                ? await assertLookup(client, 'plants', m.plant_id, 'İş yeri')
                : undefined;
            const firmaId = Object.prototype.hasOwnProperty.call(req.body, 'company_id')
                ? await assertLookup(client, 'companies', m.company_id, 'Firma')
                : undefined;

            const upd = await client.query(
                `
                UPDATE partners SET
                    partner_name = $2,
                    partner_name_2 = $3,
                    description = $4,
                    partner_type = COALESCE($5, partner_type),
                    telefon = $6,
                    telefon2 = $7,
                    mobile_phone = $8,
                    email = $9,
                    website = $10,
                    fax = $11,
                    tax_id = $12,
                    tax_office = $13,
                    pasaport_no = $14,
                    first_name = $15,
                    last_name = $16,
                    yetkili_name = $17,
                    yetkili_telefon = $18,
                    address = $19,
                    billing_address = $20,
                    bill_address_1 = $21,
                    bill_address_2 = $22,
                    bill_address_3 = $23,
                    il = $24,
                    district = $25,
                    country = COALESCE($26, country),
                    postal_code = $27,
                    enlem = $28,
                    boylam = $29,
                    currency_code = COALESCE($30, currency_code),
                    payment_due_days = COALESCE($31, payment_due_days),
                    is_active = COALESCE($32, is_active),
                    notlar = $33,
                    plant_id = COALESCE($34, plant_id),
                    company_id = COALESCE($35, company_id),
                    sektor_code = $36,
                    region_code = $37,
                    nace_code = $38,
                    kurulus_date = $39,
                    sermaye = $40
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    partner_name,
                    trimOrNull(m.partner_name_2),
                    trimOrNull(m.description),
                    partner_type,
                    trimOrNull(m.telefon),
                    trimOrNull(m.telefon2),
                    trimOrNull(m.mobile_phone),
                    trimOrNull(m.email),
                    trimOrNull(m.website),
                    trimOrNull(m.fax),
                    trimOrNull(m.tax_id),
                    trimOrNull(m.tax_office),
                    trimOrNull(m.pasaport_no),
                    trimOrNull(m.first_name),
                    trimOrNull(m.last_name),
                    trimOrNull(m.yetkili_name),
                    trimOrNull(m.yetkili_telefon),
                    trimOrNull(m.address),
                    trimOrNull(m.billing_address),
                    trimOrNull(m.bill_address_1),
                    trimOrNull(m.bill_address_2),
                    trimOrNull(m.bill_address_3),
                    trimOrNull(m.il),
                    trimOrNull(m.district),
                    trimOrNull(m.country),
                    trimOrNull(m.postal_code),
                    m.enlem ?? null,
                    m.boylam ?? null,
                    trimOrNull(m.currency_code),
                    m.payment_due_days ?? null,
                    typeof m.is_active === 'boolean' ? m.is_active : null,
                    trimOrNull(m.notlar),
                    isYeriId === undefined ? null : isYeriId,
                    firmaId === undefined ? null : firmaId,
                    trimOrNull(m.sektor_code),
                    trimOrNull(m.region_code),
                    trimOrNull(m.nace_code),
                    trimOrNull(m.kurulus_date),
                    m.sermaye ?? null,
                ]
            );

            // COALESCE($34, plant_id) cannot clear to null when user clears lookup.
            // If body explicitly sent null/empty, force null.
            if (Object.prototype.hasOwnProperty.call(req.body, 'plant_id') && isYeriId === null) {
                await client.query('UPDATE partners SET plant_id = NULL WHERE id = $1', [req.params.id]);
            }
            if (Object.prototype.hasOwnProperty.call(req.body, 'company_id') && firmaId === null) {
                await client.query('UPDATE partners SET company_id = NULL WHERE id = $1', [req.params.id]);
            }

            if (!upd.rows[0]) throw Object.assign(new Error('Cari bulunamadı.'), { status: 404 });
            await saveChildren(client, Number(req.params.id), req.body);
        });

        res.json(await cariGetir(req.params.id));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu cari kodu zaten kullanılıyor.', alan: 'partner_code' });
        }
        res.status(err.status || 500).json({ hata: err.message, alan: err.alan });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM partners WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Cari bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
