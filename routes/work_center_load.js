/**
 * İş merkezi yük / kaba kapasite görünümü.
 * Açık iş emri operasyonlarından planlanan kalan işi toplar.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [`COALESCE(m.is_active, TRUE) = TRUE`];
    const firmaId = companyIdFromReq(req) || (req.query.company_id ? Number(req.query.company_id) : null);
    if (firmaId) {
      params.push(Number(firmaId));
      where.push(`i.company_id = $${params.length}`);
    }
    if (req.query.plant_id) {
      params.push(Number(req.query.plant_id));
      where.push(`m.plant_id = $${params.length}`);
    }

    const horizonDays = Math.min(Math.max(Number(req.query.horizon_days) || 7, 1), 90);
    const horizonHours = horizonDays * 8; // varsayılan vardiya günü

    const sql = `
      SELECT
        m.id AS work_center_id,
        m.center_code,
        m.center_name,
        m.plant_id,
        i.plant_code,
        i.plant_name,
        i.company_id,
        c.company_code,
        COALESCE(m.daily_capacity_hours, 8) AS daily_capacity_hours,
        COALESCE(m.efficiency_pct, 100) AS efficiency_pct,
        COUNT(op.id) FILTER (
          WHERE ue.id IS NOT NULL
            AND COALESCE(ue.is_deleted, FALSE) = FALSE
            AND COALESCE(ue.status, '') NOT IN ('Kapali', 'Iptal', 'İptal')
            AND COALESCE(op.status, '') NOT IN ('Tamam', 'Kapali', 'Iptal')
        ) AS open_op_count,
        COALESCE(SUM(
          CASE
            WHEN ue.id IS NOT NULL
              AND COALESCE(ue.is_deleted, FALSE) = FALSE
              AND COALESCE(ue.status, '') NOT IN ('Kapali', 'Iptal', 'İptal')
              AND COALESCE(op.status, '') NOT IN ('Tamam', 'Kapali', 'Iptal')
            THEN GREATEST(0, COALESCE(op.planned_quantity,0) - COALESCE(op.produced_quantity,0))
            ELSE 0
          END
        ), 0) AS remaining_qty,
        COALESCE(SUM(
          CASE
            WHEN ue.id IS NOT NULL
              AND COALESCE(ue.is_deleted, FALSE) = FALSE
              AND COALESCE(ue.status, '') NOT IN ('Kapali', 'Iptal', 'İptal')
              AND COALESCE(op.status, '') NOT IN ('Tamam', 'Kapali', 'Iptal')
            THEN COALESCE(op.planned_quantity, 0)
            ELSE 0
          END
        ), 0) AS planned_qty,
        COALESCE(SUM(
          CASE
            WHEN ue.id IS NOT NULL
              AND COALESCE(ue.is_deleted, FALSE) = FALSE
              AND COALESCE(ue.status, '') NOT IN ('Kapali', 'Iptal', 'İptal')
              AND COALESCE(op.status, '') NOT IN ('Tamam', 'Kapali', 'Iptal')
            THEN COALESCE(op.produced_quantity, 0)
            ELSE 0
          END
        ), 0) AS produced_qty
      FROM work_centers m
      JOIN plants i ON i.id = m.plant_id
      JOIN companies c ON c.id = i.company_id
      LEFT JOIN production_order_operations op ON op.work_center_id = m.id
      LEFT JOIN production_orders ue ON ue.id = op.order_id
      WHERE ${where.join(' AND ')}
      GROUP BY m.id, m.center_code, m.center_name, m.plant_id,
               i.plant_code, i.plant_name, i.company_id, c.company_code,
               m.daily_capacity_hours, m.efficiency_pct
      ORDER BY c.company_code, i.plant_code, m.center_code
    `;

    const rows = await pool.query(sql, params);

    const result = rows.rows.map((r) => {
      const daily = Number(r.daily_capacity_hours) || 8;
      const eff = Math.max(1, Number(r.efficiency_pct) || 100) / 100;
      const availableHours = daily * horizonDays * eff;
      // Kaba yük: kalan miktarı saat olarak modellemek için 1 birim ≈ 0.1 saat varsayımı
      // (rota süreleri yoksa gösterge amaçlı). Gerçek süre bağlanınca değiştirilir.
      const roughLoadHours = Number(r.remaining_qty) * 0.1;
      const loadPct = availableHours > 0 ? (roughLoadHours / availableHours) * 100 : 0;
      let load_band = 'Bos';
      if (loadPct >= 100) load_band = 'Asiri';
      else if (loadPct >= 80) load_band = 'Yuksek';
      else if (loadPct >= 40) load_band = 'Orta';
      else if (loadPct > 0) load_band = 'Dusuk';

      return {
        ...r,
        horizon_days: horizonDays,
        available_hours: Number(availableHours.toFixed(2)),
        rough_load_hours: Number(roughLoadHours.toFixed(2)),
        load_pct: Number(loadPct.toFixed(1)),
        load_band,
        capacity_note: 'Kaba yük: rota süreleri yoksa 1 birim ≈ 0.1 saat varsayımı.',
        horizon_hours_nominal: horizonHours,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
