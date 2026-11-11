const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { companyIdFromReq } = require('../src/utils/firmaScope');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

function parseIsProfile(v) {
    if (v === true || v === 1 || v === '1' || v === 'true' || v === 'evet' || v === 'Evet') return true;
    if (v === false || v === 0 || v === '0' || v === 'false' || v === 'hayir' || v === 'Hayır') return false;
    return null;
}

router.get('/', async (req, res) => {
    try {
        // X-Firma-Id varsa yalnız o firma; boş/yoksa tüm liste (profil seçici / org ekranı)
        const firmaId = companyIdFromReq(req);
        const result = firmaId
            ? await pool.query('SELECT * FROM companies WHERE id = $1 ORDER BY id DESC', [firmaId])
            : await pool.query('SELECT * FROM companies ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: 'Firmaları çekerken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const company_name = trimOrNull(req.body.company_name);
        const company_code_in = trimOrNull(req.body.company_code);
        if (!company_name) {
            return res.status(400).json({ hata: 'company_name zorunludur. company_code boşsa numaratörden üretilir.' });
        }
        const is_profile = parseIsProfile(req.body.is_profile) === true;

        const row = await withTransaction(pool, async (client) => {
            const kod = company_code_in || (await nextSequenceCode(client, 'FIRMA'));
            const result = await client.query(
                `INSERT INTO companies (company_code, company_name, is_profile) VALUES ($1, $2, $3) RETURNING *`,
                [kod, company_name, is_profile]
            );
            return result.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'Firma kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const company_name = trimOrNull(req.body.company_name);
        if (!company_name) return res.status(400).json({ hata: 'company_name zorunludur.' });
        const isProfileParsed = Object.prototype.hasOwnProperty.call(req.body, 'is_profile')
            ? (parseIsProfile(req.body.is_profile) === true)
            : null;
        const result = isProfileParsed === null
            ? await pool.query(
                `UPDATE companies SET company_name = $2 WHERE id = $1 RETURNING *`,
                [req.params.id, company_name]
            )
            : await pool.query(
                `UPDATE companies SET company_name = $2, is_profile = $3 WHERE id = $1 RETURNING *`,
                [req.params.id, company_name, isProfileParsed]
            );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM companies WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
