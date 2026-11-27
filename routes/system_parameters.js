const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin, requireScreenPermission } = require('../src/middleware/authorize');

/** Değeri API’de asla düz dönmeyen parametreler (SMTP_PASS, LDAP_BIND_PASSWORD, *_TOKEN, *_API_KEY …). */
const SECRET_CODE = /(PASS|PAROLA|SIFRE|SECRET|TOKEN|API_?KEY|PRIVATE|CREDENTIAL)/i;
const MASK = '********';

function isSecretParam(code) {
  return SECRET_CODE.test(String(code || ''));
}

function maskRow(row) {
  if (!row || !isSecretParam(row.parameter_code)) return row;
  const dolu = row.value != null && String(row.value) !== '';
  return { ...row, value: dolu ? MASK : row.value, is_secret: true, value_set: dolu };
}

function fkHata(res) {
  return res.status(409).json({
    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
    kod: 'ERR-FK-23503',
  });
}

/** Audit gövdesine gizli değer düşmesin. */
function redactBody(req, code) {
  if (isSecretParam(code) && req.body && Object.prototype.hasOwnProperty.call(req.body, 'value')) {
    req.body = { ...req.body, value: '[redacted]' };
  }
}

const okuma = requireScreenPermission(['sistem-parametreleri']);

router.get('/', okuma, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_parameters ORDER BY parameter_code');
        res.json(result.rows.map(maskRow));
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', okuma, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_parameters WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json(maskRow(result.rows[0]));
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', requireAdmin, async (req, res) => {
    try {
        const { parameter_code, parameter_name, value, module, description, is_active } = req.body;
        if (!parameter_code || !parameter_name) {
            return res.status(400).json({ hata: 'parameter_code ve parameter_name zorunlu.' });
        }
        const result = await pool.query(
            `
            INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description, is_active)
            VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
            RETURNING *
            `,
            [parameter_code, parameter_name, value || null, module || null, description || null, is_active]
        );
        redactBody(req, parameter_code);
        res.status(201).json(maskRow(result.rows[0]));
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { parameter_name, module, description, is_active } = req.body;
        // Maskeli değer geri gönderilirse (form “değiştirmeden kaydet”) mevcut gizli değer korunur
        const value = req.body.value === MASK ? undefined : req.body.value;
        const result = await pool.query(
            `
            UPDATE system_parameters SET
                parameter_name = COALESCE($2, parameter_name),
                value = COALESCE($3, value),
                module = COALESCE($4, module),
                description = COALESCE($5, description),
                is_active = COALESCE($6, is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, parameter_name, value, module, description, is_active]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        redactBody(req, result.rows[0].parameter_code);
        res.json(maskRow(result.rows[0]));
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM system_parameters WHERE id=$1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.isSecretParam = isSecretParam;
module.exports.maskRow = maskRow;
module.exports.MASK = MASK;
