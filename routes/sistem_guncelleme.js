'use strict';

const express = require('express');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

const router = express.Router();

function userCode(req) {
  return req.userCode || req.headers['x-kullanici-kodu'] || 'owner';
}

function mapRow(r) {
  return {
    id: r.id,
    package_code: r.package_code,
    title: r.title,
    summary: r.summary,
    reason: r.reason,
    impacts: Array.isArray(r.impacts) ? r.impacts : (r.impacts ? JSON.parse(r.impacts) : []),
    module_code: r.module_code,
    severity: r.severity,
    recommended: Boolean(r.recommended),
    preview_before: r.preview_before || '',
    preview_after: r.preview_after || '',
    code_snippets: Array.isArray(r.code_snippets)
      ? r.code_snippets
      : (r.code_snippets ? JSON.parse(r.code_snippets) : []),
    sql_script: r.sql_script || '',
    status: r.status,
    sort_order: r.sort_order,
    created_at: r.created_at,
    applied_at: r.applied_at,
    applied_by: r.applied_by,
  };
}

router.get('/', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }
    const r = await pool.query(
      `SELECT * FROM system_update_packages ${where}
       ORDER BY sort_order ASC, id ASC`,
      params,
    );
    res.json(r.rows.map(mapRow));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM system_update_packages WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Güncelleme paketi bulunamadı.' });
    const logs = await pool.query(
      `SELECT id, action, user_code, note, created_at
       FROM system_update_apply_log WHERE package_id = $1
       ORDER BY id DESC LIMIT 20`,
      [req.params.id],
    );
    res.json({ ...mapRow(r.rows[0]), logs: logs.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/**
 * Seçili paketleri uygula:
 * - SQL script varsa transaction içinde çalıştırır
 * - status = applied yazar
 * - uygulama günlüğü tutar
 * Not: UI/JS dosya dağıtımı deploy sürecidir; bu ekran seçim + SQL yedirme + kayıt içindir.
 */
router.post('/uygula', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [];
    if (!ids.length) {
      return res.status(400).json({ hata: 'En az bir güncelleme seçin.', kod: 'ERR-SUP-EMPTY' });
    }
    const who = userCode(req);
    const result = await withTransaction(pool, async (client) => {
      const applied = [];
      const skipped = [];
      for (const id of ids) {
        const pack = await client.query(
          'SELECT * FROM system_update_packages WHERE id = $1 FOR UPDATE',
          [id],
        );
        const row = pack.rows[0];
        if (!row) {
          skipped.push({ id, neden: 'bulunamadı' });
          continue;
        }
        if (row.status === 'applied') {
          skipped.push({ id, package_code: row.package_code, neden: 'zaten uygulanmış' });
          continue;
        }
        const sql = String(row.sql_script || '').trim();
        if (sql) {
          await client.query(sql);
        }
        await client.query(
          `UPDATE system_update_packages
           SET status = 'applied', applied_at = NOW(), applied_by = $2
           WHERE id = $1`,
          [id, who],
        );
        await client.query(
          `INSERT INTO system_update_apply_log (package_id, action, user_code, note)
           VALUES ($1, 'apply', $2, $3)`,
          [id, who, sql ? 'SQL çalıştırıldı' : 'Kayıt uygulandı (dosya dağıtımı deploy ile)'],
        );
        applied.push({ id, package_code: row.package_code, title: row.title });
      }
      return { applied, skipped };
    });
    res.json({
      ok: true,
      ...result,
      mesaj: `${result.applied.length} paket uygulandı`
        + (result.skipped.length ? `, ${result.skipped.length} atlandı` : ''),
    });
  } catch (err) {
    res.status(500).json({ hata: err.message, kod: 'ERR-SUP-APPLY' });
  }
});

module.exports = router;
