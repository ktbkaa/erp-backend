const express = require('express');
const router = express.Router();
const pool = require('../db');
const {
    calculateMrp,
    mrpCalistir,
    defaultMrpParametre,
    buildMrpRapor,
} = require('../src/services/mrpService');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextDocumentNo } = require('../src/utils/belgeNo');
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

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** Anlık MRP listesi (çalışma kaydetmeden) */
router.get('/', async (req, res, next) => {
    try {
        const liste = await calculateMrp(pool, {
            isYeriId: req.query.plant_id ? Number(req.query.plant_id) : null,
            firmaId: req.query.company_id ? Number(req.query.company_id) : null,
            stokId: req.query.item_id ? Number(req.query.item_id) : null,
        });
        res.json(liste);
    } catch (err) {
        next(err);
    }
});

/** Bağımsız ihtiyaç listesi */
router.get('/bagimsiz-ihtiyaclar', async (req, res, next) => {
    try {
        const where = ['1=1'];
        const params = [];
        if (req.query.is_active === 'true') where.push('b.is_active = TRUE');
        if (req.query.is_active === 'false') where.push('b.is_active = FALSE');
        if (req.query.item_id) {
            params.push(Number(req.query.item_id));
            where.push(`b.item_id = $${params.length}`);
        }
        if (req.query.plant_id) {
            params.push(Number(req.query.plant_id));
            where.push(`b.plant_id = $${params.length}`);
        }
        const r = await pool.query(
            `SELECT b.*, s.item_code, s.item_name, s.uom_code AS stok_birim
             FROM mrp_independent_requirements b
             JOIN items s ON s.id = b.item_id
             WHERE ${where.join(' AND ')}
             ORDER BY b.ihtiyac_date, b.id DESC`,
            params
        );
        res.json(r.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/bagimsiz-ihtiyaclar/:id', async (req, res, next) => {
    try {
        const r = await pool.query(
            `SELECT b.*, s.item_code, s.item_name
             FROM mrp_independent_requirements b
             JOIN items s ON s.id = b.item_id
             WHERE b.id = $1`,
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Bağımsız ihtiyaç bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/bagimsiz-ihtiyaclar', async (req, res, next) => {
    try {
        const item_id = num(req.body.item_id);
        const quantity = num(req.body.quantity);
        if (!item_id || !quantity || quantity <= 0) {
            return res.status(400).json({ hata: 'item_id ve quantity zorunlu.' });
        }
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.ihtiyac_no) || (await nextSequenceCode(client, 'MRP_BI'));
            const ins = await client.query(
                `INSERT INTO mrp_independent_requirements
                    (ihtiyac_no, item_id, quantity, uom_code, ihtiyac_date, source,
                     sales_order_id, company_id, plant_id, description, is_active)
                 VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),COALESCE($6,'Manuel'),
                         $7,$8,$9,$10,COALESCE($11,TRUE))
                 RETURNING *`,
                [
                    kod, item_id, quantity,
                    trimOrNull(req.body.uom_code),
                    req.body.ihtiyac_date || null,
                    trimOrNull(req.body.source) || 'Manuel',
                    num(req.body.sales_order_id),
                    num(req.body.company_id),
                    num(req.body.plant_id),
                    trimOrNull(req.body.description),
                    typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İhtiyaç no zaten var.' });
        next(err);
    }
});

router.put('/bagimsiz-ihtiyaclar/:id', async (req, res, next) => {
    try {
        const quantity = num(req.body.quantity);
        if (!quantity || quantity <= 0) return res.status(400).json({ hata: 'quantity zorunlu.' });
        const upd = await pool.query(
            `UPDATE mrp_independent_requirements SET
                item_id = COALESCE($2, item_id),
                quantity = $3,
                uom_code = COALESCE($4, uom_code),
                ihtiyac_date = COALESCE($5::date, ihtiyac_date),
                source = COALESCE($6, source),
                company_id = COALESCE($7, company_id),
                plant_id = COALESCE($8, plant_id),
                description = COALESCE($9, description),
                is_active = COALESCE($10, is_active)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                num(req.body.item_id),
                quantity,
                trimOrNull(req.body.uom_code),
                req.body.ihtiyac_date || null,
                trimOrNull(req.body.source),
                num(req.body.company_id),
                num(req.body.plant_id),
                trimOrNull(req.body.description),
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Bağımsız ihtiyaç bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete('/bagimsiz-ihtiyaclar/:id', async (req, res, next) => {
    try {
        const r = await pool.query(
            'DELETE FROM mrp_independent_requirements WHERE id=$1 RETURNING id',
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Bağımsız ihtiyaç bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        next(err);
    }
});

/** Çalışma listesi */
router.get('/calismalar', async (req, res, next) => {
    try {
        const r = await pool.query(
            `SELECT * FROM mrp_runs ORDER BY id DESC LIMIT 100`
        );
        res.json(r.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/calismalar/:id', async (req, res, next) => {
    try {
        const c = await pool.query('SELECT * FROM mrp_runs WHERE id=$1', [req.params.id]);
        if (!c.rows[0]) return res.status(404).json({ hata: 'MRP çalışması bulunamadı.' });
        const s = await pool.query(
            `SELECT ms.*, st.item_code, st.item_name, st.tedarik_type,
                    ks.item_code AS kaynak_stok_kodu
             FROM mrp_results ms
             JOIN items st ON st.id = ms.item_id
             LEFT JOIN items ks ON ks.id = ms.source_item_id
             WHERE ms.run_id = $1
             ORDER BY ms.net_ihtiyac DESC, st.item_code`,
            [req.params.id]
        );
        const msgs = await pool.query(
            `SELECT * FROM mrp_run_messages WHERE run_id=$1 ORDER BY id`,
            [req.params.id]
        ).catch(() => ({ rows: [] }));
        const row = c.rows[0];
        const parametre = defaultMrpParametre(row.parametre_json || {});
        res.json({
            ...row,
            parametre,
            messages: msgs.rows,
            sonuclar: s.rows,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/calismalar/:id/sonuclar', async (req, res, next) => {
    try {
        const s = await pool.query(
            `SELECT ms.*, st.item_code, st.item_name, st.tedarik_type,
                    ks.item_code AS kaynak_stok_kodu
             FROM mrp_results ms
             JOIN items st ON st.id = ms.item_id
             LEFT JOIN items ks ON ks.id = ms.source_item_id
             WHERE ms.run_id = $1
             ORDER BY ms.net_ihtiyac DESC, st.item_code`,
            [req.params.id]
        );
        res.json(s.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/calismalar/:id/mesajlar', async (req, res, next) => {
    try {
        const msgs = await pool.query(
            `SELECT * FROM mrp_run_messages WHERE run_id=$1 ORDER BY id`,
            [req.params.id]
        );
        res.json(msgs.rows);
    } catch (err) {
        next(err);
    }
});

/**
 * İzlenebilir MRP raporu (tüm stoklar: ihtiyaç, SA, iş emri, giriş/çıkış).
 * ?format=json | html (yazdır/PDF)
 */
router.get('/calismalar/:id/rapor', async (req, res, next) => {
    try {
        const rapor = await buildMrpRapor(pool, Number(req.params.id));
        const format = String(req.query.format || 'json').toLowerCase();
        if (format === 'html' || format === 'pdf') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(renderMrpRaporHtml(rapor));
        }
        res.json(rapor);
    } catch (err) {
        next(err);
    }
});

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function n4(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}

function renderMrpRaporHtml(rapor) {
    const c = rapor.calisma || {};
    const o = rapor.ozet || {};
    const ufuk = rapor.ufuk || {};
    const rows = (rapor.satirlar || []).map((r) => `<tr>
      <td class="mono">${esc(r.item_code)}</td>
      <td>${esc(r.item_name)}</td>
      <td>${esc(r.tedarik_type || r.item_type || '')}</td>
      <td class="num">${n4(r.bagimsiz_ihtiyac)}</td>
      <td class="num">${n4(r.bagimli_ihtiyac)}</td>
      <td class="num">${n4(r.available_stock)}</td>
      <td class="num">${n4(r.min_stock)}</td>
      <td class="num">${n4(r.max_stock)}</td>
      <td class="num">${n4(r.hedef_ortalama)}</td>
      <td class="num">${n4(r.acik_satinalma)}</td>
      <td class="num">${n4(r.acik_isemri || r.planlanan_production)}</td>
      <td class="num">${n4(r.giris_toplam)}</td>
      <td class="num">${n4(r.cikis_toplam)}</td>
      <td class="num">${n4(r.net_ihtiyac)}</td>
      <td class="num">${n4(r.onerilen_quantity)}</td>
      <td>${esc(r.oneri)}</td>
    </tr>`).join('');
    return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8" />
<title>MRP Raporu ${esc(c.run_no || '')}</title>
<style>
  body{font-family:Segoe UI,system-ui,sans-serif;margin:24px;color:#1a1a1a}
  h1{font-size:1.25rem;margin:0 0 .25rem}
  .meta{color:#555;margin-bottom:1rem;font-size:.9rem}
  .ozet{display:flex;flex-wrap:wrap;gap:.75rem;margin:0 0 1rem}
  .ozet span{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:.35rem .65rem;font-size:.85rem}
  table{width:100%;border-collapse:collapse;font-size:.78rem}
  th,td{border:1px solid #d1d5db;padding:.35rem .4rem;vertical-align:top}
  th{background:#f9fafb;text-align:left;position:sticky;top:0}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .mono{font-family:ui-monospace,Consolas,monospace}
  .actions{margin:0 0 1rem}
  @media print{.actions{display:none} body{margin:8px} th{position:static}}
</style></head><body>
  <div class="actions">
    <button onclick="window.print()">Yazdır / PDF</button>
  </div>
  <h1>MRP İhtiyaç Raporu — ${esc(c.run_no || '')}</h1>
  <div class="meta">
    Ufuk: ${esc(ufuk.start_date || '—')} → ${esc(ufuk.end_date || '—')}
    · Durum: ${esc(c.status || '')}
    · ${esc(c.description || '')}
  </div>
  <div class="ozet">
    <span>Satır: <b>${o.satir_sayisi || 0}</b></span>
    <span>Net&gt;0: <b>${o.net_pozitif || 0}</b></span>
    <span>SA öneri: <b>${o.satinalma_oneri || 0}</b></span>
    <span>Üretim öneri: <b>${o.uretim_oneri || 0}</b></span>
    <span>Toplam giriş: <b>${n4(o.toplam_giris)}</b></span>
    <span>Toplam çıkış: <b>${n4(o.toplam_cikis)}</b></span>
    <span>Toplam önerilen: <b>${n4(o.toplam_onerilen)}</b></span>
  </div>
  <table>
    <thead><tr>
      <th>Stok</th><th>Ad</th><th>Tedarik</th>
      <th>Bağımsız</th><th>Bağımlı</th><th>Eldeki</th>
      <th>Min</th><th>Max</th><th>Hedef ort.</th>
      <th>Açık SA</th><th>Açık IE</th>
      <th>Girişler</th><th>Çıkışlar</th>
      <th>Net</th><th>Öneri qty</th><th>Öneri</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="16">Satır yok</td></tr>'}</tbody>
  </table>
</body></html>`;
}

/** Varsayılan parametre şablonu (UI bootstrap) */
router.get('/parametre-varsayilan', async (_req, res) => {
    res.json(defaultMrpParametre({}));
});

/** MRP çalıştır ve kaydet */
router.post('/calistir', async (req, res, next) => {
    try {
        const bodyParam = req.body.parametre && typeof req.body.parametre === 'object'
            ? req.body.parametre
            : {};
        // Üst seviye ufuk alanlarını parametreye taşı
        if (req.body.start_date) bodyParam.start_date = req.body.start_date;
        if (req.body.end_date) bodyParam.end_date = req.body.end_date;
        if (req.body.notes != null) bodyParam.notes = req.body.notes;
        const result = await withTransaction(pool, async (client) => mrpCalistir(client, {
            firmaId: num(req.body.company_id) || (req.headers['x-firma-id'] ? Number(req.headers['x-firma-id']) : null),
            isYeriId: num(req.body.plant_id),
            description: trimOrNull(req.body.description),
            created_by: trimOrNull(req.headers['x-kullanici-kodu']) || trimOrNull(req.body.created_by),
            parametre: bodyParam,
            notes: trimOrNull(req.body.notes),
        }));
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * Net ihtiyaçtan satınalma talebi
 * body: { stok_idler?, run_id?, plant_id? }
 */
router.post('/talep-olustur', async (req, res, next) => {
    try {
        const filtreIds = Array.isArray(req.body.stok_idler)
            ? req.body.stok_idler.map(Number)
            : (req.body.item_id ? [Number(req.body.item_id)] : null);
        const calismaId = num(req.body.run_id);

        let adaylar;
        if (calismaId) {
            const r = await pool.query(
                `SELECT ms.*, st.uom_code, st.item_code, st.item_name
                 FROM mrp_results ms
                 JOIN items st ON st.id = ms.item_id
                 WHERE ms.run_id = $1
                   AND ms.oneri = 'Satınalma'
                   AND ms.net_ihtiyac > 0
                   AND ms.donusturuldu IS DISTINCT FROM TRUE`,
                [calismaId]
            );
            adaylar = r.rows.filter((row) => !filtreIds || filtreIds.includes(Number(row.item_id)));
        } else {
            const liste = await calculateMrp(pool, {
                isYeriId: num(req.body.plant_id),
                firmaId: num(req.body.company_id),
            });
            adaylar = liste.filter((row) => {
                if (row.net_ihtiyac <= 0 || row.oneri !== 'Satınalma') return false;
                if (filtreIds && !filtreIds.includes(Number(row.item_id))) return false;
                return true;
            }).map((row) => ({
                ...row,
                onerilen_quantity: row.onerilen_quantity || row.net_ihtiyac,
            }));
        }

        if (!adaylar.length) {
            return res.status(400).json({ hata: 'Satınalma önerisi olan net ihtiyaç satırı yok.' });
        }

        const talepId = await withTransaction(pool, async (client) => {
            const no = await nextDocumentNo(client, 'SATINALMA_TALEP');
            let isYeriId = num(req.body.plant_id);
            if (!isYeriId) {
                const iy = await client.query('SELECT id FROM plants ORDER BY id LIMIT 1');
                isYeriId = iy.rows[0]?.id || null;
            }
            const firmaId = num(req.body.company_id) || companyIdFromReq(req) || null;
            const t = await client.query(
                `INSERT INTO purchase_requisitions (requisition_no, plant_id, status, description, company_id)
                 VALUES ($1,$2,'Acik',$3,$4) RETURNING id`,
                [no, isYeriId, `MRP — ${adaylar.length} kalem`, firmaId]
            );
            const id = t.rows[0].id;
            for (const a of adaylar) {
                await client.query(
                    `INSERT INTO purchase_requisition_lines (requisition_id, item_id, quantity, uom_code)
                     VALUES ($1,$2,$3,$4)`,
                    [id, a.item_id, a.onerilen_quantity || a.net_ihtiyac, a.uom_code || null]
                );
                if (a.id && calismaId) {
                    await client.query(
                        `UPDATE mrp_results SET
                            donusturuldu = TRUE,
                            donusum_type = 'SatinAlmaTalep',
                            donusum_document_id = $2,
                            donusum_document_no = $3
                         WHERE id = $1`,
                        [a.id, id, no]
                    );
                }
            }
            return id;
        });

        const talep = await pool.query('SELECT * FROM purchase_requisitions WHERE id=$1', [talepId]);
        const satirlar = await pool.query(
            `SELECT ts.*, s.item_code, s.item_name FROM purchase_requisition_lines ts
             JOIN items s ON s.id = ts.item_id WHERE ts.requisition_id=$1 ORDER BY ts.id`,
            [talepId]
        );
        res.status(201).json({ ...talep.rows[0], satirlar: satirlar.rows, source: 'MRP' });
    } catch (err) {
        next(err);
    }
});

/**
 * Üretim önerisinden üretim emri oluştur
 * body: { stok_idler?, run_id?, plant_id?, component_warehouse_id?, fg_warehouse_id? }
 */
router.post('/uretim-emri-olustur', async (req, res, next) => {
    try {
        const filtreIds = Array.isArray(req.body.stok_idler)
            ? req.body.stok_idler.map(Number)
            : (req.body.item_id ? [Number(req.body.item_id)] : null);
        const calismaId = num(req.body.run_id);

        let adaylar;
        if (calismaId) {
            const r = await pool.query(
                `SELECT ms.*, st.uom_code, st.item_code
                 FROM mrp_results ms
                 JOIN items st ON st.id = ms.item_id
                 WHERE ms.run_id = $1
                   AND ms.oneri = 'Üretim emri'
                   AND ms.net_ihtiyac > 0
                   AND ms.donusturuldu IS DISTINCT FROM TRUE`,
                [calismaId]
            );
            adaylar = r.rows.filter((row) => !filtreIds || filtreIds.includes(Number(row.item_id)));
        } else {
            const liste = await calculateMrp(pool, {
                isYeriId: num(req.body.plant_id),
                firmaId: num(req.body.company_id),
            });
            adaylar = liste.filter((row) => {
                if (row.net_ihtiyac <= 0 || row.oneri !== 'Üretim emri') return false;
                if (filtreIds && !filtreIds.includes(Number(row.item_id))) return false;
                return true;
            }).map((row) => ({
                ...row,
                onerilen_quantity: row.onerilen_quantity || row.net_ihtiyac,
            }));
        }

        if (!adaylar.length) {
            return res.status(400).json({ hata: 'Üretim önerisi olan satır yok.' });
        }

        // production_orders.emirOlustur'u kullanmak için route içi tekrar yerine doğrudan SQL + bom
        const { withTransaction: wt } = require('../src/utils/withTransaction');
        const created = await wt(pool, async (client) => {
            const out = [];
            let isYeriId = num(req.body.plant_id);
            if (!isYeriId) {
                const iy = await client.query('SELECT id FROM plants ORDER BY id LIMIT 1');
                isYeriId = iy.rows[0]?.id || null;
            }
            let hmDepo = num(req.body.component_warehouse_id);
            let mamDepo = num(req.body.fg_warehouse_id);
            if (!hmDepo || !mamDepo) {
                const d = await client.query(
                    `SELECT id, warehouse_code FROM warehouses
                     WHERE ($1::int IS NULL OR plant_id = $1)
                     ORDER BY id LIMIT 10`,
                    [isYeriId]
                );
                const rows = d.rows;
                if (!hmDepo) {
                    hmDepo = rows.find((x) => /HMD|HAM/i.test(x.warehouse_code))?.id || rows[0]?.id;
                }
                if (!mamDepo) {
                    mamDepo = rows.find((x) => /MAM/i.test(x.warehouse_code))?.id || rows[rows.length - 1]?.id || rows[0]?.id;
                }
            }

            for (const a of adaylar) {
                const bom = await client.query(
                    `SELECT id FROM boms WHERE finished_good_item_id=$1 AND is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
                    [a.item_id]
                );
                const rota = await client.query(
                    `SELECT id FROM routings WHERE item_id=$1 AND is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
                    [a.item_id]
                );
                if (!bom.rows[0] || !rota.rows[0]) {
                    throw new Error(`${a.item_code || a.item_id}: ürün ağacı veya rota yok.`);
                }
                const no = await nextDocumentNo(client, 'URETIM_EMRI');
                const quantity = a.onerilen_quantity || a.net_ihtiyac;
                const firmaId = num(req.body.company_id) || companyIdFromReq(req) || null;
                const wipDepo = num(req.body.wip_warehouse_id) || null;
                const emir = await client.query(
                    `INSERT INTO production_orders
                        (order_no, item_id, product_bom_id, route_id, plant_id, company_id,
                         component_warehouse_id, wip_warehouse_id, fg_warehouse_id, planlanan_quantity, status, planli_kesin,
                         description)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Acik','Planli',$11)
                     RETURNING id, order_no`,
                    [
                      no, a.item_id, bom.rows[0].id, rota.rows[0].id, isYeriId, firmaId,
                      hmDepo, wipDepo, mamDepo, quantity,
                      `MRP üretim emri ${a.item_code || a.item_id}`,
                    ]
                );
                // bileşenler BOM'dan
                const agac = await client.query('SELECT quantity FROM boms WHERE id=$1', [bom.rows[0].id]);
                const carpan = Number(quantity) / Number(agac.rows[0]?.quantity || 1);
                const sat = await client.query(
                    `SELECT component_item_id, quantity, uom_code FROM bom_lines
                     WHERE product_bom_id=$1 AND parent_line_id IS NULL`,
                    [bom.rows[0].id]
                );
                for (const s of sat.rows) {
                    await client.query(
                        `INSERT INTO production_order_components (order_id, item_id, planlanan_quantity, uom_code)
                         VALUES ($1,$2,$3,$4)`,
                        [emir.rows[0].id, s.component_item_id, Number(s.quantity) * carpan, s.uom_code]
                    );
                }
                if (a.id && calismaId) {
                    await client.query(
                        `UPDATE mrp_results SET
                            donusturuldu = TRUE,
                            donusum_type = 'UretimEmri',
                            donusum_document_id = $2,
                            donusum_document_no = $3
                         WHERE id = $1`,
                        [a.id, emir.rows[0].id, emir.rows[0].order_no]
                    );
                }
                out.push(emir.rows[0]);
            }
            return out;
        });

        res.status(201).json({ olusan: created.length, emirler: created, source: 'MRP' });
    } catch (err) {
        next(err);
    }
});

router.get('/:stokId', async (req, res, next) => {
    try {
        // sayısal id değilse diğer route'lara düşmesin diye kontrol
        if (!/^\d+$/.test(String(req.params.stokId))) {
            return res.status(404).json({ hata: 'Endpoint bulunamadı.' });
        }
        const liste = await calculateMrp(pool, { stokId: Number(req.params.stokId) });
        res.json(liste[0] || null);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
