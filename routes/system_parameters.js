const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin, requireScreenPermission } = require('../src/middleware/authorize');
const {
    SECRET_MASK,
    isSecretParameterCode,
    maskSecretParameterRow,
} = require('../src/utils/securityConfig');
const { secretsFromEnvOnly } = require('../src/utils/secretSettings');

/** Maskeli değer geri gönderilirse mevcut sır korunur. */
function incomingValue(code, value) {
    if (isSecretParameterCode(code) && value === SECRET_MASK) return undefined;
    return value;
}

function rejectDbSecret(res, code, value) {
    if (!isSecretParameterCode(code) || value == null || value === '' || value === SECRET_MASK) return false;
    if (!secretsFromEnvOnly()) return false;
    res.status(400).json({
        hata: `${code} sırrı veritabanında saklanamaz (SECRETS_FROM_ENV_ONLY=1). Ortam değişkeni olarak tanımlayın.`,
        kod: 'ERR-SECRET-ENV-ONLY',
    });
    return true;
}

function fkHata(res) {
  return res.status(409).json({
    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
    kod: 'ERR-FK-23503',
  });
}

/** Audit gövdesine gizli değer düşmesin. */
function redactBody(req, code) {
  if (isSecretParameterCode(code) && req.body && Object.prototype.hasOwnProperty.call(req.body, 'value')) {
    req.body = { ...req.body, value: '[redacted]' };
  }
}

const okuma = requireScreenPermission(['sistem-parametreleri']);

router.get('/', okuma, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_parameters ORDER BY parameter_code');
        res.json(result.rows.map(maskSecretParameterRow));
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', okuma, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_parameters WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json(maskSecretParameterRow(result.rows[0]));
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
        if (rejectDbSecret(res, parameter_code, value)) return;
        const v = incomingValue(parameter_code, value);
        const result = await pool.query(
            `
            INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description, is_active)
            VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
            RETURNING *
            `,
            [parameter_code, parameter_name, v || null, module || null, description || null, is_active]
        );
        redactBody(req, parameter_code);
        res.status(201).json(maskSecretParameterRow(result.rows[0]));
    } catch (err) {
        if (err.code === '23503') return fkHata(res);
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { parameter_name, value, module, description, is_active } = req.body;
        const cur = await pool.query('SELECT parameter_code FROM system_parameters WHERE id=$1', [req.params.id]);
        if (!cur.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        const code = cur.rows[0].parameter_code;
        if (rejectDbSecret(res, code, value)) return;
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
            [req.params.id, parameter_name, incomingValue(code, value), module, description, is_active]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        redactBody(req, result.rows[0].parameter_code);
        res.json(maskSecretParameterRow(result.rows[0]));
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
module.exports.isSecretParam = isSecretParameterCode;
module.exports.maskRow = maskSecretParameterRow;
module.exports.MASK = SECRET_MASK;
