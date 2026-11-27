/**
 * MRP hareket raporu — zorunlu çalışma no/id; opsiyonel stok, tarih, işlem tipi/türü.
 * Tahmin / MPS / bağımsız ihtiyaç / MRP önerisi / stok hareket / açık SA-IE birleşik satırlar.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { defaultMrpParametre } = require('../src/services/mrpService');

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateStr(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function inDateRange(dateStr, baslangic, bitis) {
  if (!dateStr) return !(baslangic || bitis);
  if (baslangic && dateStr < baslangic) return false;
  if (bitis && dateStr > bitis) return false;
  return true;
}

function pushRow(rows, row) {
  rows.push({
    hareket_tarihi: row.hareket_tarihi || null,
    islem_tipi: row.islem_tipi || '',
    islem_turu: row.islem_turu || '',
    run_no: row.run_no || '',
    run_id: row.run_id || null,
    item_id: row.item_id || null,
    item_code: row.item_code || '',
    item_name: row.item_name || '',
    uom_code: row.uom_code || '',
    quantity: Number(row.quantity) || 0,
    quantity_in: Number(row.quantity_in) || 0,
    quantity_out: Number(row.quantity_out) || 0,
    belge_no: row.belge_no || '',
    belge_tipi: row.belge_tipi || '',
    warehouse_code: row.warehouse_code || '',
    aciklama: row.aciklama || '',
    suggestion: row.suggestion || '',
    kaynak: row.kaynak || '',
  });
}

router.get('/', async (req, res, next) => {
  try {
    const runIdQ = num(req.query.run_id);
    const runNoQ = req.query.run_no ? String(req.query.run_no).trim() : '';
    // Ekran açılışında boş liste; filtre uygulanınca çalışma no zorunlu
    if (!runIdQ && !runNoQ) {
      return res.json([]);
    }

    const runRes = runIdQ
      ? await pool.query('SELECT * FROM mrp_runs WHERE id=$1', [runIdQ])
      : await pool.query('SELECT * FROM mrp_runs WHERE run_no=$1', [runNoQ]);
    const run = runRes.rows[0];
    if (!run) return res.status(404).json({ hata: 'MRP çalışması bulunamadı.' });

    const parametre = defaultMrpParametre(run.parameters_json || {});
    const ufukBas = toDateStr(run.start_date) || parametre.start_date;
    const ufukBit = toDateStr(run.end_date) || parametre.end_date;
    const baslangic = toDateStr(req.query.baslangic) || null;
    const bitis = toDateStr(req.query.bitis) || null;
    const itemId = num(req.query.item_id);
    const tipFiltre = req.query.islem_tipi ? String(req.query.islem_tipi).trim() : '';
    const turFiltre = req.query.islem_turu ? String(req.query.islem_turu).trim() : '';

    const sonuclar = await pool.query(
      `SELECT ms.*, st.item_code, st.item_name, st.uom_code AS stok_uom,
              ks.item_code AS kaynak_stok_kodu
       FROM mrp_results ms
       JOIN items st ON st.id = ms.item_id
       LEFT JOIN items ks ON ks.id = ms.source_item_id
       WHERE ms.run_id = $1
         AND ($2::int IS NULL OR ms.item_id = $2)
       ORDER BY st.item_code`,
      [run.id, itemId]
    );

    const itemIds = [...new Set(sonuclar.rows.map((r) => Number(r.item_id)).filter(Boolean))];
    const itemMap = new Map(sonuclar.rows.map((r) => [String(r.item_id), r]));

    const rows = [];

    // 1) Satış tahminleri (parametre iskeleti)
    for (const [idx, fr] of (parametre.forecast_rows || []).entries()) {
      const code = String(fr.forecast_code || fr.item_code || '').trim();
      const qty = Number(fr.quantity || fr.miktar || 0) || 0;
      const tarih = toDateStr(fr.requirement_date || fr.date || ufukBas);
      if (itemId && code) {
        const match = [...itemMap.values()].find((it) => String(it.item_code) === code);
        if (!match) continue;
      }
      if (!inDateRange(tarih, baslangic, bitis)) continue;
      let resolvedItem = null;
      if (code) {
        resolvedItem = [...itemMap.values()].find((it) => String(it.item_code) === code) || null;
        if (!resolvedItem) {
          const ir = await pool.query(
            'SELECT id, item_code, item_name, uom_code FROM items WHERE item_code=$1 LIMIT 1',
            [code]
          ).catch(() => ({ rows: [] }));
          resolvedItem = ir.rows[0] || null;
        }
      }
      if (itemId && resolvedItem && Number(resolvedItem.id || resolvedItem.item_id) !== itemId) continue;
      pushRow(rows, {
        hareket_tarihi: tarih,
        islem_tipi: 'Tahmin',
        islem_turu: 'Talep',
        run_no: run.run_no,
        run_id: run.id,
        item_id: resolvedItem?.id || resolvedItem?.item_id || null,
        item_code: resolvedItem?.item_code || code,
        item_name: resolvedItem?.item_name || String(fr.description || ''),
        uom_code: resolvedItem?.uom_code || resolvedItem?.stok_uom || '',
        quantity: qty,
        quantity_out: qty,
        belge_no: code || `FC-${idx + 1}`,
        belge_tipi: 'SatisTahmini',
        aciklama: fr.description || 'MRP satış tahmini',
        kaynak: 'parametre.forecast_rows',
      });
    }

    // 2) MPS satırları
    for (const [idx, mr] of (parametre.mps_rows || []).entries()) {
      const code = String(mr.mps_code || mr.item_code || '').trim();
      const qty = Number(mr.quantity || mr.miktar || 0) || 0;
      const tarih = toDateStr(mr.requirement_date || mr.date || ufukBas);
      if (!inDateRange(tarih, baslangic, bitis)) continue;
      let resolvedItem = null;
      if (code) {
        resolvedItem = [...itemMap.values()].find((it) => String(it.item_code) === code) || null;
        if (!resolvedItem) {
          const ir = await pool.query(
            'SELECT id, item_code, item_name, uom_code FROM items WHERE item_code=$1 LIMIT 1',
            [code]
          ).catch(() => ({ rows: [] }));
          resolvedItem = ir.rows[0] || null;
        }
      }
      if (itemId && resolvedItem && Number(resolvedItem.id || resolvedItem.item_id) !== itemId) continue;
      if (itemId && !resolvedItem) continue;
      pushRow(rows, {
        hareket_tarihi: tarih,
        islem_tipi: 'MPS',
        islem_turu: 'Talep',
        run_no: run.run_no,
        run_id: run.id,
        item_id: resolvedItem?.id || resolvedItem?.item_id || null,
        item_code: resolvedItem?.item_code || code,
        item_name: resolvedItem?.item_name || String(mr.description || ''),
        uom_code: resolvedItem?.uom_code || '',
        quantity: qty,
        quantity_out: qty,
        belge_no: code || `MPS-${idx + 1}`,
        belge_tipi: 'MPS',
        aciklama: mr.description || 'MRP MPS satırı',
        kaynak: 'parametre.mps_rows',
      });
    }

    // 3) Bağımsız ihtiyaçlar (ufuk / filtre)
    {
      const params = [];
      const where = ['b.is_active IS DISTINCT FROM FALSE'];
      if (itemId) {
        params.push(itemId);
        where.push(`b.item_id = $${params.length}`);
      } else if (itemIds.length) {
        params.push(itemIds);
        where.push(`b.item_id = ANY($${params.length}::int[])`);
      }
      const d0 = baslangic || ufukBas;
      const d1 = bitis || ufukBit;
      if (d0) {
        params.push(d0);
        where.push(`b.requirement_date >= $${params.length}::date`);
      }
      if (d1) {
        params.push(d1);
        where.push(`b.requirement_date <= $${params.length}::date`);
      }
      const bi = await pool.query(
        `SELECT b.*, st.item_code, st.item_name, st.uom_code AS stok_uom
         FROM mrp_independent_requirements b
         JOIN items st ON st.id = b.item_id
         WHERE ${where.join(' AND ')}
         ORDER BY b.requirement_date, b.id`,
        params
      );
      for (const r of bi.rows) {
        const qty = Number(r.quantity) || 0;
        pushRow(rows, {
          hareket_tarihi: toDateStr(r.requirement_date),
          islem_tipi: 'BagimsizIhtiyac',
          islem_turu: 'Talep',
          run_no: run.run_no,
          run_id: run.id,
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          uom_code: r.uom_code || r.stok_uom || '',
          quantity: qty,
          quantity_out: qty,
          belge_no: r.requirement_no || '',
          belge_tipi: 'BagimsizIhtiyac',
          aciklama: r.description || r.source || 'Bağımsız ihtiyaç',
          kaynak: 'mrp_independent_requirements',
        });
      }
    }

    // 4) MRP öneri satırları
    for (const r of sonuclar.rows) {
      const tarih = toDateStr(r.requirement_date || r.planned_start || ufukBas);
      if (!inDateRange(tarih, baslangic, bitis)) continue;
      const sug = String(r.suggestion || 'Yeterli');
      const qty = Number(r.suggested_quantity) || Number(r.net_requirement) || 0;
      let tur = 'Oneri';
      if (sug === 'Satınalma') tur = 'Oneri-SA';
      else if (sug === 'Üretim emri') tur = 'Oneri-UE';
      else tur = 'Yeterli';
      pushRow(rows, {
        hareket_tarihi: tarih,
        islem_tipi: 'MrpOneri',
        islem_turu: tur,
        run_no: run.run_no,
        run_id: run.id,
        item_id: r.item_id,
        item_code: r.item_code,
        item_name: r.item_name,
        uom_code: r.uom_code || r.stok_uom || '',
        quantity: qty,
        quantity_in: sug === 'Satınalma' || sug === 'Üretim emri' ? qty : 0,
        quantity_out: 0,
        belge_no: r.donusum_document_no || '',
        belge_tipi: sug,
        aciklama: `Net ${Number(r.net_requirement) || 0} · öneri ${sug}`,
        suggestion: sug,
        kaynak: 'mrp_results',
      });

      // Bağımsız / bağımlı ihtiyaç özeti (talep tarafı)
      const biQty = Number(r.independent_demand) || 0;
      if (biQty > 0 && inDateRange(tarih, baslangic, bitis)) {
        pushRow(rows, {
          hareket_tarihi: tarih,
          islem_tipi: 'MrpIhtiyac',
          islem_turu: 'Talep',
          run_no: run.run_no,
          run_id: run.id,
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          uom_code: r.uom_code || r.stok_uom || '',
          quantity: biQty,
          quantity_out: biQty,
          belge_no: run.run_no,
          belge_tipi: 'BagimsizTalep',
          aciklama: 'MRP bağımsız talep bileşeni',
          kaynak: 'mrp_results.independent_demand',
        });
      }
      const bdQty = Number(r.dependent_demand) || 0;
      if (bdQty > 0 && inDateRange(tarih, baslangic, bitis)) {
        pushRow(rows, {
          hareket_tarihi: tarih,
          islem_tipi: 'MrpIhtiyac',
          islem_turu: 'Talep',
          run_no: run.run_no,
          run_id: run.id,
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          uom_code: r.uom_code || r.stok_uom || '',
          quantity: bdQty,
          quantity_out: bdQty,
          belge_no: r.kaynak_stok_kodu || run.run_no,
          belge_tipi: 'BagimliTalep',
          aciklama: r.kaynak_stok_kodu
            ? `Bağımlı talep (kaynak: ${r.kaynak_stok_kodu})`
            : 'MRP bağımlı talep bileşeni',
          kaynak: 'mrp_results.dependent_demand',
        });
      }
    }

    // 5) Stok hareketleri (çalışma stokları + tarih)
    if (itemIds.length || itemId) {
      const ids = itemId ? [itemId] : itemIds;
      const params = [ids];
      const where = ['s.item_id = ANY($1::int[])'];
      const d0 = baslangic || ufukBas;
      const d1 = bitis || ufukBit;
      if (d0) {
        params.push(d0);
        where.push(`COALESCE(h.movement_date, h.physical_date, h.created_at::date) >= $${params.length}::date`);
      }
      if (d1) {
        params.push(d1);
        where.push(`COALESCE(h.movement_date, h.physical_date, h.created_at::date) <= $${params.length}::date`);
      }
      if (parametre.warehouse_ids?.length) {
        params.push(parametre.warehouse_ids.map(Number));
        where.push(`h.warehouse_id = ANY($${params.length}::int[])`);
      }
      const hv = await pool.query(
        `SELECT
           s.id, s.item_id, s.quantity, s.direction, s.uom_code,
           st.item_code, st.item_name,
           h.movement_no, h.movement_type, h.document_type, h.ref_no, h.description,
           COALESCE(h.movement_date, h.physical_date, h.created_at::date) AS movement_date,
           d.warehouse_code, hk.movement_code, hk.movement_name
         FROM stock_movement_lines s
         JOIN stock_movements h ON h.id = s.movement_id
         JOIN items st ON st.id = s.item_id
         LEFT JOIN warehouses d ON d.id = h.warehouse_id
         LEFT JOIN movement_codes hk ON hk.id = h.movement_code_id
         WHERE ${where.join(' AND ')}
         ORDER BY COALESCE(h.movement_date, h.physical_date, h.created_at::date), h.id, s.id
         LIMIT 8000`,
        params
      );
      for (const r of hv.rows) {
        const dir = Number(r.direction) || 1;
        const qty = Math.abs(Number(r.quantity) || 0);
        const isIn = dir > 0;
        pushRow(rows, {
          hareket_tarihi: toDateStr(r.movement_date),
          islem_tipi: 'StokHareket',
          islem_turu: isIn ? 'Giris' : 'Cikis',
          run_no: run.run_no,
          run_id: run.id,
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          uom_code: r.uom_code || '',
          quantity: qty,
          quantity_in: isIn ? qty : 0,
          quantity_out: isIn ? 0 : qty,
          belge_no: r.movement_no || r.ref_no || '',
          belge_tipi: r.document_type || r.movement_type || 'StokHareket',
          warehouse_code: r.warehouse_code || '',
          aciklama: r.movement_name || r.description || r.movement_code || '',
          kaynak: 'stock_movement_lines',
        });
      }
    }

    // 6) Açık SA (arz bağlamı)
    if (itemIds.length || itemId) {
      const ids = itemId ? [itemId] : itemIds;
      const sa = await pool.query(
        `SELECT ss.item_id, st.item_code, st.item_name, st.uom_code,
                s.order_no, s.order_date, s.delivery_date, ss.delivery_date AS line_delivery_date,
                GREATEST(ss.quantity - COALESCE(ss.received_quantity,0), 0)::numeric AS open_qty
         FROM purchase_order_lines ss
         JOIN purchase_orders s ON s.id = ss.purchase_order_id
         JOIN items st ON st.id = ss.item_id
         WHERE s.status NOT IN ('Iptal', 'Kapali')
           AND ss.item_id = ANY($1::int[])
           AND GREATEST(ss.quantity - COALESCE(ss.received_quantity,0), 0) > 0
         ORDER BY COALESCE(ss.delivery_date, s.delivery_date, s.order_date), s.id`,
        [ids]
      );
      for (const r of sa.rows) {
        const tarih = toDateStr(r.line_delivery_date || r.delivery_date || r.order_date || ufukBas);
        if (!inDateRange(tarih, baslangic, bitis)) continue;
        const qty = Number(r.open_qty) || 0;
        pushRow(rows, {
          hareket_tarihi: tarih,
          islem_tipi: 'AcikSA',
          islem_turu: 'Arz',
          run_no: run.run_no,
          run_id: run.id,
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          uom_code: r.uom_code || '',
          quantity: qty,
          quantity_in: qty,
          belge_no: r.order_no || '',
          belge_tipi: 'SatinAlmaSiparis',
          aciklama: 'Açık satınalma siparişi',
          kaynak: 'purchase_orders',
        });
      }
    }

    // 7) Açık iş emirleri
    if (itemIds.length || itemId) {
      const ids = itemId ? [itemId] : itemIds;
      const ue = await pool.query(
        `SELECT u.item_id, st.item_code, st.item_name, st.uom_code,
                u.order_no, u.plan_start, u.plan_end, u.start_date, u.end_date,
                GREATEST(u.planned_quantity - COALESCE(u.produced_quantity,0), 0)::numeric AS open_qty
         FROM production_orders u
         JOIN items st ON st.id = u.item_id
         WHERE u.status NOT IN ('Kapali', 'Iptal', 'Tamamlandi')
           AND u.item_id = ANY($1::int[])
           AND GREATEST(u.planned_quantity - COALESCE(u.produced_quantity,0), 0) > 0
         ORDER BY COALESCE(u.plan_end, u.end_date, u.plan_start, u.start_date), u.id`,
        [ids]
      );
      for (const r of ue.rows) {
        const tarih = toDateStr(r.plan_end || r.end_date || r.plan_start || r.start_date || ufukBas);
        if (!inDateRange(tarih, baslangic, bitis)) continue;
        const qty = Number(r.open_qty) || 0;
        pushRow(rows, {
          hareket_tarihi: tarih,
          islem_tipi: 'AcikIE',
          islem_turu: 'Arz',
          run_no: run.run_no,
          run_id: run.id,
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          uom_code: r.uom_code || '',
          quantity: qty,
          quantity_in: qty,
          belge_no: r.order_no || '',
          belge_tipi: 'IsEmri',
          aciklama: 'Açık iş emri',
          kaynak: 'production_orders',
        });
      }
    }

    let out = rows;
    if (tipFiltre) out = out.filter((r) => String(r.islem_tipi) === tipFiltre);
    if (turFiltre) out = out.filter((r) => String(r.islem_turu) === turFiltre);

    out.sort((a, b) => {
      const da = a.hareket_tarihi || '';
      const db = b.hareket_tarihi || '';
      if (da !== db) return da < db ? -1 : 1;
      const ca = `${a.item_code}|${a.islem_tipi}|${a.belge_no}`;
      const cb = `${b.item_code}|${b.islem_tipi}|${b.belge_no}`;
      return ca.localeCompare(cb, 'tr');
    });

    out = out.map((r, i) => ({ id: i + 1, sira: i + 1, ...r }));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
