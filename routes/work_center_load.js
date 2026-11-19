/**
 * İş merkezi yük / kaba kapasite görünümü.
 * Açık iş emri operasyonlarından planlanan kalan işi toplar.
 * CRP_OP_TIME=Evet ise routing_operations.op_time+setup_time kullanır.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { parametreAl } = require('../src/utils/yetki');

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
    const horizonHours = horizonDays * 8;
    const useOpTime = String(await parametreAl(pool, 'CRP_OP_TIME', 'Evet')).toLowerCase() === 'evet';

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
        ), 0) AS produced_qty,
        COALESCE(AVG(rt.op_time_hours) FILTER (
          WHERE ue.id IS NOT NULL
            AND COALESCE(ue.is_deleted, FALSE) = FALSE
            AND COALESCE(op.status, '') NOT IN ('Tamam', 'Kapali', 'Iptal')
            AND rt.op_time_hours IS NOT NULL
        ), 0) AS avg_op_hours_per_unit
      FROM work_centers m
      JOIN plants i ON i.id = m.plant_id
      JOIN companies c ON c.id = i.company_id
      LEFT JOIN production_order_operations op ON op.work_center_id = m.id
      LEFT JOIN production_orders ue ON ue.id = op.order_id
      LEFT JOIN LATERAL (
        SELECT
          (
            COALESCE(ro.op_time, 0) /
              CASE
                WHEN LOWER(COALESCE(ro.op_time_uom,'Saat')) LIKE '%dk%'
                  OR LOWER(COALESCE(ro.op_time_uom,'Saat')) LIKE '%min%' THEN 60.0
                WHEN LOWER(COALESCE(ro.op_time_uom,'Saat')) LIKE '%gun%'
                  OR LOWER(COALESCE(ro.op_time_uom,'Saat')) LIKE '%day%' THEN 0.125
                ELSE 1.0
              END
            + COALESCE(ro.setup_time, 0) / NULLIF(GREATEST(COALESCE(op.planned_quantity,1),1),0) /
              CASE
                WHEN LOWER(COALESCE(ro.setup_time_uom,'Saat')) LIKE '%dk%'
                  OR LOWER(COALESCE(ro.setup_time_uom,'Saat')) LIKE '%min%' THEN 60.0
                ELSE 1.0
              END
          )::numeric AS op_time_hours
        FROM routing_operations ro
        WHERE ro.work_center_id = m.id
          AND (
            (op.operation_code IS NOT NULL AND ro.operation_code = op.operation_code)
            OR (op.operation_name IS NOT NULL AND ro.operation_name = op.operation_name)
          )
        ORDER BY ro.id
        LIMIT 1
      ) rt ON TRUE
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
      const rem = Number(r.remaining_qty) || 0;
      const avgH = Number(r.avg_op_hours_per_unit) || 0;
      let roughLoadHours;
      let capacity_note;
      if (useOpTime && avgH > 0) {
        roughLoadHours = rem * avgH;
        capacity_note = 'Yük: kalan miktar × rota op_time/setup (saat). Finite çizelge değil.';
      } else {
        roughLoadHours = rem * 0.1;
        capacity_note = 'Kaba yük: rota süresi yok — 1 birim ≈ 0.1 saat varsayımı.';
      }
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
        capacity_note,
        uses_route_time: Boolean(useOpTime && avgH > 0),
        horizon_hours_nominal: horizonHours,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
