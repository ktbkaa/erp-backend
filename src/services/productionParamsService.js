/**
 * Firma / iş yeri üretim parametreleri.
 * plant_id varsa önce ona bakılır; yoksa firma geneli; yoksa güvenli varsayılan.
 */

const DEFAULTS = Object.freeze({
  allow_over_production: false,
  over_production_pct: 0,
  allow_under_production: true,
  under_production_pct: 0,
  enforce_op_sequence: true,
  require_material_consume: true,
  auto_close_on_complete: true,
});

function asNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeParams(row) {
  if (!row) return { ...DEFAULTS };
  return {
    id: row.id || null,
    company_id: row.company_id != null ? Number(row.company_id) : null,
    plant_id: row.plant_id != null ? Number(row.plant_id) : null,
    allow_over_production: row.allow_over_production === true,
    over_production_pct: asNum(row.over_production_pct, 0),
    allow_under_production: row.allow_under_production !== false,
    under_production_pct: asNum(row.under_production_pct, 0),
    enforce_op_sequence: row.enforce_op_sequence !== false,
    require_material_consume: row.require_material_consume !== false,
    auto_close_on_complete: row.auto_close_on_complete !== false,
    description: row.description || null,
    is_active: row.is_active !== false,
  };
}

async function getProductionParams(client, companyId, plantId = null) {
  const cid = companyId != null ? Number(companyId) : null;
  if (!cid) return normalizeParams(null);

  if (plantId != null && Number(plantId)) {
    const plantRow = await client.query(
      `SELECT * FROM production_parameters
       WHERE company_id=$1 AND plant_id=$2 AND is_active=TRUE
       LIMIT 1`,
      [cid, Number(plantId)]
    );
    if (plantRow.rows[0]) return normalizeParams(plantRow.rows[0]);
  }

  const firmRow = await client.query(
    `SELECT * FROM production_parameters
     WHERE company_id=$1 AND plant_id IS NULL AND is_active=TRUE
     LIMIT 1`,
    [cid]
  );
  if (firmRow.rows[0]) return normalizeParams(firmRow.rows[0]);
  return normalizeParams({ company_id: cid });
}

/**
 * Operasyon üretim miktarı kontrolü.
 * allow_over_production=false → kalanı aşamaz.
 * true + over_production_pct → planlanan × (1 + pct/100) üst sınır.
 */
function assertOperationQtyAllowed(params, op, quantity) {
  const qty = Number(quantity);
  if (!(qty > 0)) {
    const err = new Error('Miktar > 0 olmalı.');
    err.status = 400;
    throw err;
  }
  const planned = Number(op?.planned_quantity) || 0;
  const produced = Number(op?.produced_quantity) || 0;
  const remaining = planned - produced;
  const p = params || DEFAULTS;

  let maxExtra = 0;
  if (p.allow_over_production) {
    maxExtra = planned * (asNum(p.over_production_pct, 0) / 100);
  }
  // Kalan negatifse (önceden fazla üretilmiş) yalnızca tolerans payı kadar daha izin ver
  const maxAllowed = Math.max(0, remaining) + maxExtra;
  if (qty - maxAllowed > 1e-9) {
    const err = new Error(
      `Fazla üretim engellendi. Plan=${planned}, üretilen=${produced}, kalan=${Math.max(0, remaining)}`
      + (maxExtra > 0 ? `, tolerans=+${Number(maxExtra.toFixed(4))}` : ', tolerans=yok')
      + `, giriş=${qty}. Üretim parametrelerinden fazla üretime izin / tolerans % ayarlanabilir.`
    );
    err.status = 400;
    err.code = 'ERR-MFG-OVERPROD';
    throw err;
  }
  return {
    planned,
    produced,
    remaining: Math.max(0, remaining),
    maxAllowed,
    maxExtra,
  };
}

/**
 * Emir kapatırken eksik üretim kontrolü (üretilen < plan − tolerans).
 */
function assertOrderCloseQtyAllowed(params, emir) {
  const p = params || DEFAULTS;
  if (p.allow_under_production) return;
  const planned = Number(emir?.planned_quantity) || 0;
  const produced = Number(emir?.produced_quantity) || 0;
  const minRequired = planned * (1 - asNum(p.under_production_pct, 0) / 100);
  if (produced + 1e-9 < minRequired) {
    const err = new Error(
      `Eksik üretim engellendi. Plan=${planned}, üretilen=${produced}, minimum=${Number(minRequired.toFixed(4))}.`
      + ' Üretim parametrelerinden eksik üretime izin / tolerans % ayarlanabilir.'
    );
    err.status = 400;
    err.code = 'ERR-MFG-UNDERPROD';
    throw err;
  }
}

module.exports = {
  DEFAULTS,
  normalizeParams,
  getProductionParams,
  assertOperationQtyAllowed,
  assertOrderCloseQtyAllowed,
};
