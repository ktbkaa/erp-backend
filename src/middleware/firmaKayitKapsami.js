/**
 * /<mount>/:id ve /<mount>/:id/<alt-aksiyon> uçlarında firma kapsamı (IDOR engeli).
 *
 * Kaydın firma kümesi SPEC’ten SQL ile bulunur; erişim kümesi:
 * - narrow (varsayılan): seçili firma (X-Firma-Id / tek yetkili firma) varsa yalnız o;
 *   yoksa kullanıcının yetkili firmaları
 * - narrow:false (org tanımları — SPA bunları tüm firmalar listesinden açar):
 *   kullanıcının yetkili firmaları
 * Firma kümesi boş kayıt (company_id NULL, ortak tanım) serbesttir.
 * Kayıt yoksa dokunulmaz — route kendi 404’ünü döner.
 */
const { companyIdFromReq } = require('../utils/firmaScope');
const { allowedCompanyIdsForReq } = require('../utils/firmaYetki');

function itemCompaniesExpr(alias) {
  return `ARRAY[${alias}.company_id]
    || ARRAY(SELECT ipl.company_id FROM item_plants ip JOIN plants ipl ON ipl.id = ip.plant_id
             WHERE ip.item_id = ${alias}.id)
    || ARRAY(SELECT icp.company_id FROM item_company_params icp
             WHERE icp.item_id = ${alias}.id AND icp.is_active IS DISTINCT FROM FALSE)`;
}

/** company_id → plant → warehouse → üst kayıt sırasıyla ilk dolu firma. */
function directSql({ table, company, plant, warehouse, parent }) {
  const parts = [];
  const joins = [];
  if (company) parts.push(`t.${company}`);
  if (plant) {
    joins.push(`LEFT JOIN plants kp ON kp.id = t.${plant}`);
    parts.push('kp.company_id');
  }
  if (warehouse) {
    joins.push(`LEFT JOIN warehouses kw ON kw.id = t.${warehouse}`);
    joins.push('LEFT JOIN plants kwp ON kwp.id = kw.plant_id');
    parts.push('kwp.company_id');
  }
  if (parent) {
    joins.push(`LEFT JOIN ${parent.table} ku ON ku.id = t.${parent.col}`);
    parts.push('ku.company_id');
  }
  return `SELECT ARRAY_REMOVE(ARRAY[COALESCE(${parts.join(', ')})], NULL) AS cids
          FROM ${table} t ${joins.join(' ')} WHERE t.id = $1`;
}

function viaItemSql(table, itemCol = 'item_id') {
  return `SELECT ARRAY_REMOVE(${itemCompaniesExpr('s')}, NULL) AS cids
          FROM ${table} t LEFT JOIN items s ON s.id = t.${itemCol} WHERE t.id = $1`;
}

/** Ürün ağacı / rota: belge firması VEYA mamul stok firması (assertDocOrItemCompany ile aynı). */
function docOrItemSql(table, itemCol) {
  return `SELECT ARRAY_REMOVE(ARRAY[t.company_id, dp.company_id] || ${itemCompaniesExpr('s')}, NULL) AS cids
          FROM ${table} t
          LEFT JOIN plants dp ON dp.id = t.plant_id
          LEFT JOIN items s ON s.id = t.${itemCol}
          WHERE t.id = $1`;
}

const SQL = {
  companySelf: `SELECT ARRAY[id] AS cids FROM companies WHERE id = $1`,
  items: `SELECT ARRAY_REMOVE(${itemCompaniesExpr('s')}, NULL) AS cids FROM items s WHERE s.id = $1`,
  partners: `SELECT ARRAY_REMOVE(
                ARRAY[c.company_id, cp.company_id]
                || ARRAY(SELECT pcp.company_id FROM partner_company_params pcp
                         WHERE pcp.partner_id = c.id AND pcp.is_active IS DISTINCT FROM FALSE),
                NULL) AS cids
             FROM partners c LEFT JOIN plants cp ON cp.id = c.plant_id WHERE c.id = $1`,
  workStations: `SELECT ARRAY_REMOVE(ARRAY[p.company_id], NULL) AS cids
                 FROM work_stations t
                 LEFT JOIN work_centers wc ON wc.id = t.work_center_id
                 LEFT JOIN plants p ON p.id = wc.plant_id
                 WHERE t.id = $1`,
};

const C = 'company_id';
const P = 'plant_id';
const W = 'warehouse_id';
const doc = (table, extra = {}) => ({ sql: directSql({ table, company: C, ...extra }) });
const projects = { sql: directSql({ table: 'projects', company: C, plant: P, warehouse: W }) };
const workItems = { sql: directSql({ table: 'work_items', company: C, parent: { table: 'projects', col: 'project_id' } }) };

/** mount → kapsam. Yalnız ilk parametresi gerçekten tablonun id’si olan router’lar. */
const SPECS = {
  '/companies': { sql: SQL.companySelf, narrow: false },
  '/is-yerleri': { sql: directSql({ table: 'plants', company: C }), narrow: false },
  '/warehouses': { sql: directSql({ table: 'warehouses', plant: P }), narrow: false },
  '/items': { sql: SQL.items },
  '/partners': { sql: SQL.partners },
  '/stok-hareketleri': doc('stock_movements', { plant: P, warehouse: W }),
  '/invoices': doc('invoices', { plant: P, warehouse: W }),
  '/sales_orders': doc('sales_orders', { plant: P, warehouse: W }),
  '/satis-teklifleri': doc('sales_quotations', { plant: P }),
  '/sevk-emirleri': doc('shipment_orders', { warehouse: W }),
  '/delivery_notes': doc('delivery_notes', { plant: P, warehouse: W }),
  '/urun-agaclari': { sql: docOrItemSql('boms', 'finished_good_item_id') },
  '/routings': { sql: docOrItemSql('routings', 'item_id') },
  '/is-merkezleri': { sql: directSql({ table: 'work_centers', plant: P }) },
  '/is-istasyonlari': { sql: SQL.workStations },
  '/satin-alma-talepleri': doc('purchase_requisitions', { plant: P, warehouse: W }),
  '/satin-alma-teklif-istekleri': doc('rfqs', { plant: P }),
  '/satin-alma-teklifleri': doc('purchase_quotations', { plant: P }),
  '/satin-alma-anlasmalari': doc('purchase_agreements', { plant: P }),
  '/satin-alma-siparisleri': doc('purchase_orders', { plant: P, warehouse: W }),
  '/mal-kabuller': doc('goods_receipts', { plant: P, warehouse: W }),
  '/giris-kontrolleri': doc('incoming_inspections', { plant: P, warehouse: 'source_warehouse_id' }),
  '/tedarikci-irsaliyeleri': doc('vendor_delivery_notes', { plant: P }),
  '/uretim-emirleri': doc('production_orders', { plant: P }),
  '/uretim-planlari': doc('production_plans'),
  '/uretim-girisleri': doc('production_receipts', { plant: P }),
  '/uretim-parametreleri': doc('production_parameters', { plant: P }),
  '/stok-depo': { sql: directSql({ table: 'item_warehouses', plant: P, warehouse: W }) },
  '/stok-partileri': doc('item_lots'),
  '/stok-rezervasyonlari': { sql: directSql({ table: 'item_reservations', warehouse: W }) },
  '/stok-serileri': { sql: directSql({ table: 'item_serials', warehouse: W }) },
  '/stok-ikame': { sql: viaItemSql('item_substitutes') },
  '/kk-stok-planlari': { sql: viaItemSql('qc_item_plans') },
  '/kk-emirleri': doc('qc_orders', { warehouse: W }),
  '/kk-uygunsuzluklar': doc('qc_nonconformances'),
  '/kk-capa': doc('qc_capa'),
  '/transfer-emirleri': doc('transfer_orders', { plant: P, warehouse: 'source_warehouse_id' }),
  '/sayim-belgeleri': doc('inventory_counts', { plant: P, warehouse: W }),
  '/crm-adaylar': doc('crm_leads'),
  '/crm-kontaklar': doc('crm_contacts'),
  '/crm-firsatlar': doc('crm_opportunities', { plant: P }),
  '/crm-faaliyetler': doc('crm_activities', { plant: P }),
  '/crm-faaliyet-planlari': doc('crm_activity_plans', { plant: P }),
  '/crm-gorevler': doc('crm_tasks'),
  '/crm-ajanda': { sql: directSql({ table: 'crm_calendar_entries', parent: { table: 'crm_opportunities', col: 'opportunity_id' } }) },
  '/muhasebe-hesaplari': doc('gl_accounts'),
  '/muhasebe-belgeleri': doc('journal_entries'),
  '/muhasebe-donemleri': doc('accounting_periods'),
  '/banka-mutabakat': doc('bank_statements'),
  '/sabit-kiymetler': doc('fixed_assets'),
  '/gl-butceler': doc('gl_budgets'),
  '/bakim-emirleri': doc('maintenance_orders', { plant: P }),
  '/tahsilat-odemeler': { sql: directSql({ table: 'receipts_payments', plant: P }) },
  '/e-belge': doc('e_document_queue'),
  '/fiyat-listeleri': doc('price_lists'),
  '/onay-rolleri': doc('approval_roles', { plant: P }),
  '/onay-rotalari': doc('approval_routes', { plant: P }),
  '/onay-kurallari': doc('approval_rules', { plant: P }),
  '/onay-kayitlari': doc('approval_records'),
  '/hr-personel': doc('hr_employees', { plant: P }),
  '/projects': projects,
  '/prj-projeler': projects,
  '/prj-budget': projects,
  '/work-items': workItems,
  '/prj-isler': workItems,
  '/prj-sprintler': { sql: directSql({ table: 'prj_sprints', company: C, parent: { table: 'projects', col: 'project_id' } }) },
  '/prj-riskler': { sql: directSql({ table: 'project_risks', company: C, parent: { table: 'projects', col: 'project_id' } }) },
  '/prj-automations': doc('prj_automations'),
};

const PATH_RE = /^(\/[^/]+)\/(\d+)(?:\/|$)/;

function notInScope(res) {
  return res.status(404).json({ hata: 'Kayıt bulunamadı (firma kapsamı).', kod: 'FIRMA_KAPSAM' });
}

/**
 * @returns {Promise<boolean>} kayıt erişilebilir mi (kayıt yoksa true — route 404 verir)
 */
async function recordInScope(req, spec, id, clientOrPool) {
  const pool = clientOrPool || require('../../db');
  const allowed = await allowedCompanyIdsForReq(req, pool);
  const selected = spec.narrow === false ? null : companyIdFromReq(req);
  const scope = selected ? [selected] : allowed;
  if (scope == null) return true;
  const r = await pool.query(spec.sql, [id]);
  if (!r.rows[0]) return true;
  const cids = (r.rows[0].cids || []).map(Number);
  if (!cids.length) return true;
  return cids.some((c) => scope.includes(c));
}

/** index.js: tüm API için tek middleware (mount’u yoldan çözer). */
function firmaKayitKapsami(specs = SPECS) {
  return async function firmaKayitKapsamiMw(req, res, next) {
    try {
      const m = PATH_RE.exec(req.path || '');
      if (!m) return next();
      const spec = specs[m[1]];
      if (!spec) return next();
      if (!(await recordInScope(req, spec, Number(m[2])))) return notInScope(res);
      req._firmaKayitKontrol = true;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Router içi: router.param('id', kayitKapsamParam(spec)) — router başka yere mount edilse de korur. */
function kayitKapsamParam(spec) {
  return async function kayitKapsamParamMw(req, res, next, rawId) {
    try {
      if (req._firmaKayitKontrol) return next();
      const id = Number(rawId);
      if (!/^\d+$/.test(String(rawId)) || !(id > 0)) return next();
      if (!(await recordInScope(req, spec, id))) return notInScope(res);
      req._firmaKayitKontrol = true;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  SPECS,
  directSql,
  firmaKayitKapsami,
  kayitKapsamParam,
  recordInScope,
};
