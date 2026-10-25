const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const country = req.query.country_code || null;
        const type = req.query.account_type || null;
        const params = [];
        const where = ['TRUE'];
        if (country) {
            params.push(country);
            where.push(`(country_code = $${params.length} OR country_code IS NULL)`);
        }
        if (type) {
            params.push(type);
            where.push(`account_type = $${params.length}`);
        }
        if (String(req.query.is_active || '') === '1' || String(req.query.is_active || '').toLowerCase() === 'true') {
            where.push('is_active = TRUE');
        }
        const result = await pool.query(
            `SELECT * FROM gl_accounts WHERE ${where.join(' AND ')} ORDER BY account_code`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM gl_accounts WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            account_code, account_name, account_type, parent_account_code, currency_code, is_active,
            country_code, chart_of_accounts_code, account_class, normal_balance, is_control_account, reconciliation_type,
        } = req.body;
        if (!account_code || !account_name) {
            return res.status(400).json({ hata: 'account_code ve account_name zorunlu.' });
        }
        const type = account_type || 'Dogrudan';
        if (!['Ana', 'Ust', 'Dogrudan'].includes(type)) {
            return res.status(400).json({ hata: 'Geçersiz account_type.' });
        }
        const result = await pool.query(
            `
            INSERT INTO gl_accounts
                (account_code, account_name, account_type, parent_account_code, currency_code, is_active,
                 country_code, chart_of_accounts_code, account_class, normal_balance, is_control_account, reconciliation_type)
            VALUES ($1,$2,$3,$4,COALESCE($5,'TRY'),COALESCE($6,TRUE),
                    COALESCE($7,'TR'),COALESCE($8,'TDHP'),$9,COALESCE($10,'Borc'),COALESCE($11,FALSE),$12)
            RETURNING *
            `,
            [
                account_code, account_name, type, parent_account_code || null, currency_code, is_active,
                country_code, chart_of_accounts_code, account_class || null, normal_balance, is_control_account,
                reconciliation_type || null,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { account_name, account_type, parent_account_code, currency_code, is_active, marked_for_deletion } = req.body;
        if (account_type && !['Ana', 'Ust', 'Dogrudan'].includes(account_type)) {
            return res.status(400).json({ hata: 'Geçersiz account_type.' });
        }
        const result = await pool.query(
            `
            UPDATE gl_accounts SET
                account_name = COALESCE($2, account_name),
                account_type = COALESCE($3, account_type),
                parent_account_code = COALESCE($4, parent_account_code),
                currency_code = COALESCE($5, currency_code),
                is_active = COALESCE($6, is_active),
                marked_for_deletion = COALESCE($7, marked_for_deletion)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, account_name, account_type, parent_account_code, currency_code, is_active, marked_for_deletion]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const check = await pool.query('SELECT marked_for_deletion FROM gl_accounts WHERE id=$1', [req.params.id]);
        if (!check.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
        if (!check.rows[0].marked_for_deletion) {
            return res.status(400).json({
                hata: 'Kalıcı silme için önce marked_for_deletion=true işaretleyin (FINT01 akışı).',
            });
        }
        const result = await pool.query('DELETE FROM gl_accounts WHERE id=$1 RETURNING id', [req.params.id]);
        res.json({ silindi: true, id: Number(result.rows[0].id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
