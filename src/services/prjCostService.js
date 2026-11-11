/**
 * Proje maliyet kayıtları — çift sayım engelli (source unique).
 * Stok çıkış / üretim / KK kaynaklarından çağrılır.
 */
async function resolveProjectId(client, { projectId, projectCode, companyId }) {
  if (projectId) return Number(projectId);
  if (!projectCode) return null;
  const params = [projectCode];
  // Kapanmış projelerde de kaynak maliyet bağlanabilsin
  let sql = `SELECT id, company_id FROM projects WHERE project_code=$1`;
  if (companyId) {
    params.push(companyId);
    sql += ` AND company_id=$${params.length}`;
  }
  sql += ` ORDER BY id DESC LIMIT 1`;
  const r = await client.query(sql, params);
  return r.rows[0]?.id || null;
}

async function upsertProjectCost(client, {
  projectId = null,
  projectCode = null,
  companyId = null,
  workItemId = null,
  categoryCode = 'DIGER',
  amount,
  currencyCode = 'TRY',
  exchangeRate = 1,
  sourceModule,
  sourceTable,
  sourceId,
  isCommitment = false,
  description = null,
  entryDate = null,
}) {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  if (!sourceModule || !sourceTable || sourceId == null) {
    throw new Error('source_module/table/id zorunlu');
  }
  const pid = await resolveProjectId(client, { projectId, projectCode, companyId });
  if (!pid) return null;

  const proj = await client.query(`SELECT company_id, currency_code FROM projects WHERE id=$1`, [pid]);
  const cid = companyId || proj.rows[0]?.company_id;
  const rate = Number(exchangeRate || 1) || 1;
  const amt = Number(amount);
  const amountCompany = amt * rate;

  const r = await client.query(
    `
    INSERT INTO project_cost_entries (
      project_id, company_id, work_item_id, entry_date, category_code,
      amount, currency_code, exchange_rate, amount_company,
      source_module, source_table, source_id, is_commitment, description
    ) VALUES (
      $1,$2,$3,COALESCE($4::date, CURRENT_DATE),$5,
      $6,COALESCE($7,'TRY'),$8,$9,
      $10,$11,$12,COALESCE($13,FALSE),$14
    )
    ON CONFLICT (source_module, source_table, source_id, category_code) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      company_id = COALESCE(EXCLUDED.company_id, project_cost_entries.company_id),
      amount = EXCLUDED.amount,
      amount_company = EXCLUDED.amount_company,
      exchange_rate = EXCLUDED.exchange_rate,
      description = COALESCE(EXCLUDED.description, project_cost_entries.description),
      is_commitment = EXCLUDED.is_commitment
    RETURNING *
    `,
    [
      pid, cid, workItemId || null, entryDate,
      categoryCode, amt, currencyCode, rate, amountCompany,
      sourceModule, sourceTable, sourceId, isCommitment, description,
    ]
  );

  // Taahhüt olmayanları projeye yaz
  const sum = await client.query(
    `
    SELECT COALESCE(SUM(COALESCE(amount_company, amount)),0) AS t
    FROM project_cost_entries WHERE project_id=$1 AND is_commitment=FALSE
    `,
    [pid]
  );
  await client.query(`UPDATE projects SET actual_cost=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [
    pid,
    sum.rows[0].t,
  ]);
  return r.rows[0];
}

/** Stok çıkış satırlarından proje maliyeti */
async function fromStockMovement(client, { hareket, satirlar = [], projectCode = null }) {
  const code = projectCode || hareket?.project_code;
  if (!code) return [];
  const out = [];
  for (const s of satirlar) {
    if (Number(s.direction) !== -1) continue; // yalnızca çıkış
    let unit = Number(s.uom_cost || s.unit_price || 0);
    if (!unit && s.item_id) {
      const m = await client.query(
        `SELECT avg_cost FROM item_costs WHERE item_id=$1 ORDER BY id DESC LIMIT 1`,
        [s.item_id]
      ).catch(() => ({ rows: [] }));
      unit = Number(m.rows[0]?.avg_cost || 0);
    }
    const amount = unit * Number(s.quantity || 0);
    if (!(amount > 0)) continue;
    const row = await upsertProjectCost(client, {
      projectCode: code,
      companyId: hareket.company_id,
      categoryCode: 'MALZEME',
      amount,
      currencyCode: hareket.currency_code || 'TRY',
      sourceModule: 'INV',
      sourceTable: 'stock_movement_lines',
      sourceId: s.id,
      isCommitment: false,
      description: `Stok çıkış ${hareket.movement_no || hareket.id} / item ${s.item_id}`,
    });
    if (row) out.push(row);
  }
  return out;
}

/** Üretim emri tamamlanınca işçilik/üretim maliyeti (basit: planlanan qty × std) */
async function fromProductionOrder(client, { order, amount = null, unitCost = null }) {
  const code = order?.project_code;
  if (!code) return null;
  let amt = amount;
  if (amt == null) {
    const qty = Number(order.produced_quantity || order.planned_quantity || 0);
    let uc = Number(unitCost || 0);
    if (!uc && order.item_id) {
      const m = await client.query(
        `SELECT avg_cost FROM item_costs WHERE item_id=$1 ORDER BY id DESC LIMIT 1`,
        [order.item_id]
      ).catch(() => ({ rows: [] }));
      uc = Number(m.rows[0]?.avg_cost || 0);
    }
    amt = qty * uc;
  }
  if (!(Number(amt) > 0)) {
    // Sıfır maliyetli iz kaydı (bağın oluşması için min tutar 0 atlanır) — testte amount verilir
    return null;
  }
  return upsertProjectCost(client, {
    projectCode: code,
    companyId: order.company_id,
    categoryCode: 'URETIM',
    amount: amt,
    sourceModule: 'MFG',
    sourceTable: 'production_orders',
    sourceId: order.id,
    isCommitment: false,
    description: `Üretim emri ${order.order_no || order.id}`,
  });
}

/** KK reddi / fire maliyeti */
async function fromQcOrder(client, { order, amount = null, unitCost = null }) {
  const code = order?.project_code;
  if (!code) return null;
  const rejected = Number(order.rejected_quantity || 0);
  if (!(rejected > 0) && amount == null) return null;
  let amt = amount;
  if (amt == null) {
    let uc = Number(unitCost || 0);
    if (!uc && order.item_id) {
      const m = await client.query(
        `SELECT avg_cost FROM item_costs WHERE item_id=$1 ORDER BY id DESC LIMIT 1`,
        [order.item_id]
      ).catch(() => ({ rows: [] }));
      uc = Number(m.rows[0]?.avg_cost || 0);
    }
    amt = rejected * uc;
  }
  if (!(Number(amt) > 0)) return null;
  return upsertProjectCost(client, {
    projectCode: code,
    companyId: order.company_id,
    categoryCode: 'KALITE',
    amount: amt,
    sourceModule: 'QLT',
    sourceTable: 'qc_orders',
    sourceId: order.id,
    isCommitment: false,
    description: `KK fire ${order.order_no || order.id}`,
  });
}

module.exports = {
  resolveProjectId,
  upsertProjectCost,
  fromStockMovement,
  fromProductionOrder,
  fromQcOrder,
};
