#!/usr/bin/env node
/** Inject Fason screens into MODULES and extend cari/routing/WO fields. */
import fs from 'fs';

const appPath = new URL('../public/app.js', import.meta.url);
let src = fs.readFileSync(appPath, 'utf8');

function once(label, find, insert, after = true) {
  if (src.includes(label)) {
    console.log('skip', label);
    return;
  }
  const i = src.indexOf(find);
  if (i < 0) throw new Error(`anchor not found: ${find.slice(0, 80)}`);
  const at = after ? i + find.length : i;
  src = src.slice(0, at) + insert + src.slice(at);
  console.log('ok', label);
}

// Cari fason fields
once(
  'is_subcontractor',
  "{ key: 'payment_due_days', label: 'Vade (gün)', type: 'number', group: 'finans', groupLabel: 'Genel bilgiler' },",
  `
              { key: 'is_subcontractor', label: 'Fasoncu', type: 'checkbox', group: 'finans', groupLabel: 'Genel bilgiler' },
              { key: 'subcontract_capacity_daily', label: 'Fason günlük kapasite', type: 'number', group: 'finans', groupLabel: 'Genel bilgiler' },
              { key: 'subcontract_lead_days', label: 'Fason teslim süresi (gün)', type: 'number', group: 'finans', groupLabel: 'Genel bilgiler' },
              { key: 'subcontract_min_qty', label: 'Fason min. sipariş', type: 'number', group: 'finans', groupLabel: 'Genel bilgiler' },
              { key: 'subcontract_pricing_method', label: 'Fason fiyat yöntemi', type: 'select', options: ['Adet','Kg','Metre','Saat','Operasyon','Parti','Sabit','Ozel'], group: 'finans', groupLabel: 'Genel bilgiler' },
              { key: 'subcontract_quality_score', label: 'Fason kalite skoru', type: 'number', group: 'finans', groupLabel: 'Genel bilgiler' },`,
);

// Routing fason extras after is_subcontract checkbox
once(
  'default_subcontractor_partner_id',
  "{ key: 'is_subcontract', label: 'Fason operasyon', type: 'checkbox', group: 'status', section: 'gelismis' },",
  `
              { key: 'default_subcontractor_partner_id', label: 'Varsayılan fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', group: 'status', section: 'gelismis' },
              { key: 'subcontract_unit_price', label: 'Fason birim fiyat', type: 'number', group: 'status', section: 'gelismis' },
              { key: 'subcontract_currency_code', label: 'Fason PB', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name', group: 'status', section: 'gelismis' },
              { key: 'subcontract_lead_days', label: 'Fason lead (gün)', type: 'number', group: 'status', section: 'gelismis' },`,
);

// WO master fason fields — after planned_quantity
once(
  "key: 'is_subcontract', label: 'Fason emri'",
  "{ key: 'planned_quantity', label: 'Planlanan miktar', type: 'number', required: true, group: 'kimlik' },",
  `
          { key: 'is_subcontract', label: 'Fason emri', type: 'checkbox', group: 'kimlik' },
          { key: 'subcontractor_partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', group: 'kimlik' },`,
);

// Menu sections + screens injection helpers
const FASON_URETIM_SECTION = `
      {
        id: 'fason',
        title: 'Fason Operasyon',
        screenIds: ['fason-operasyon-takip', 'fason-siparisleri', 'fason-operasyonlari', 'fason-parametreleri'],
      },`;

const FASON_SATINALMA_SECTION = `
      {
        id: 'fason',
        title: 'Fason Sipariş',
        screenIds: ['fason-siparisleri', 'fason-fiyatlari'],
      },`;

const FASON_STOK_SECTION = `
      {
        id: 'fason',
        title: 'Fason Stok',
        screenIds: ['fason-sevkiyatlar', 'fason-tuketimler', 'fason-teslimatlar', 'fason-emanet-stok'],
      },`;

once('uretim fason section', "{\n        id: 'gerceklesme',\n        title: 'Üretim Gerçekleşme',", FASON_URETIM_SECTION, false);

// Insert satinalma section before closing sections of satinalma — find mal-kabul section end
once(
  'satinalma fason section',
  "screenIds: ['mal-kabuller', 'tedarikci-irsaliyeleri', 'giris-kontrolleri'],\n      },",
  `\n${FASON_SATINALMA_SECTION}`,
);

once(
  'stok fason section',
  "{\n        id: 'mrp',\n        title: 'MRP Planlama',",
  FASON_STOK_SECTION,
  false,
);

const SCREENS = `
      {
        id: 'fason-parametreleri',
        techId: 'SUB-PAR-SCR-001',
        businessNameEn: 'SubcontractParametersScreen',
        title: 'Fason Parametreleri',
        endpoint: '/fason-parametreleri',
        crud: true,
        codeField: 'id',
        nameField: 'notes',
        filters: [],
        columns: [
          { key: 'company_id', label: 'Firma' },
          { key: 'max_scrap_pct', label: 'Max fire %' },
          { key: 'qc_required', label: 'KK zorunlu' },
          { key: 'allow_partial_delivery', label: 'Kısmi teslim' },
        ],
        masterFields: [
          { key: 'company_id', label: 'Firma', type: 'lookup', lookup: 'companies', valueKey: 'id', labelKey: 'company_name', codeKey: 'company_code', required: true },
          { key: 'ship_warehouse_id', label: 'Varsayılan sevk depo', type: 'lookup', lookup: 'warehouses', valueKey: 'id', labelKey: 'warehouse_name', codeKey: 'warehouse_code' },
          { key: 'default_scrap_tolerance_pct', label: 'Fire toleransı %', type: 'number' },
          { key: 'max_scrap_pct', label: 'Max fire %', type: 'number' },
          { key: 'allow_partial_delivery', label: 'Kısmi teslimat', type: 'checkbox' },
          { key: 'allow_over_receipt', label: 'Fazla teslimat', type: 'checkbox' },
          { key: 'over_receipt_tolerance_pct', label: 'Fazla teslim %', type: 'number' },
          { key: 'qc_required', label: 'KK zorunlu', type: 'checkbox' },
          { key: 'order_approval_required', label: 'Sipariş onayı', type: 'checkbox' },
          { key: 'auto_create_po', label: 'Otomatik SA sipariş', type: 'checkbox' },
          { key: 'auto_create_op_demand', label: 'Otomatik fason ihtiyacı', type: 'checkbox' },
          { key: 'notes', label: 'Notlar' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { qc_required: true, allow_partial_delivery: true, max_scrap_pct: 5 },
      },
      {
        id: 'fason-operasyonlari',
        techId: 'SUB-OPD-SCR-001',
        businessNameEn: 'SubcontractOperationDefScreen',
        title: 'Fason Operasyon Tanımları',
        endpoint: '/fason-operasyonlari',
        crud: true,
        codeField: 'operation_code',
        nameField: 'operation_name',
        filters: [
          { key: 'operation_code', label: 'Kod' },
          { key: 'operation_name', label: 'Ad' },
        ],
        columns: [
          { key: 'operation_code', label: 'Kod', mono: true },
          { key: 'operation_name', label: 'Ad' },
          { key: 'pricing_method', label: 'Fiyat yöntemi' },
          { key: 'qc_required', label: 'KK' },
          { key: 'is_active', label: 'Aktif' },
        ],
        masterFields: [
          { key: 'operation_code', label: 'Operasyon kodu', code: true, required: true },
          { key: 'operation_name', label: 'Operasyon adı', name: true, required: true },
          { key: 'description', label: 'Açıklama' },
          { key: 'uom_code', label: 'Birim', type: 'lookup', lookup: 'olcu-birimleri', valueKey: 'uom_code', labelKey: 'uom_name' },
          { key: 'std_time_hours', label: 'Std süre (saat)', type: 'number' },
          { key: 'pricing_method', label: 'Fiyat yöntemi', type: 'select', options: ['Adet','Kg','Metre','Saat','Operasyon','Parti','Sabit','Ozel'] },
          { key: 'qc_required', label: 'KK gerekli', type: 'checkbox' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { pricing_method: 'Adet', qc_required: true, is_active: true },
      },
      {
        id: 'fason-fiyatlari',
        techId: 'SUB-PRC-SCR-001',
        businessNameEn: 'SubcontractPriceScreen',
        title: 'Fason Fiyat Tarifeleri',
        endpoint: '/fason-fiyatlari',
        crud: true,
        codeField: 'id',
        nameField: 'partner_name',
        filters: [
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', queryParam: true },
        ],
        columns: [
          { key: 'partner_code', label: 'Fasoncu', mono: true },
          { key: 'operation_code', label: 'Operasyon' },
          { key: 'item_code', label: 'Stok' },
          { key: 'unit_price', label: 'Fiyat' },
          { key: 'currency_code', label: 'PB' },
          { key: 'valid_from', label: 'Başlangıç' },
          { key: 'valid_to', label: 'Bitiş' },
        ],
        masterFields: [
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true },
          { key: 'operation_def_id', label: 'Operasyon', type: 'lookup', lookup: 'fason-operasyonlari', valueKey: 'id', labelKey: 'operation_name', codeKey: 'operation_code' },
          { key: 'item_id', label: 'Stok', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'pricing_method', label: 'Yöntem', type: 'select', options: ['Adet','Kg','Metre','Saat','Operasyon','Parti','Sabit','Ozel'] },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number', required: true },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'valid_from', label: 'Geçerlilik başı', type: 'date' },
          { key: 'valid_to', label: 'Geçerlilik sonu', type: 'date' },
          { key: 'min_qty', label: 'Min miktar', type: 'number' },
          { key: 'notes', label: 'Not' },
          { key: 'is_active', label: 'Aktif', type: 'checkbox' },
        ],
        detailFields: [],
        detailKey: null,
        defaults: { pricing_method: 'Adet', currency_code: 'TRY', is_active: true },
      },
      {
        id: 'fason-siparisleri',
        techId: 'SUB-ORD-SCR-001',
        businessNameEn: 'SubcontractOrderScreen',
        title: 'Fason Siparişleri',
        endpoint: '/fason-siparisleri',
        crud: true,
        numeratorSeri: 'FASON_SIPARIS',
        codeField: 'order_no',
        nameField: 'partner_name',
        filters: [
          { key: 'order_no', label: 'Sipariş no' },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', queryParam: true },
          { key: 'status', label: 'Durum' },
        ],
        columns: [
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'order_date', label: 'Tarih' },
          { key: 'partner_code', label: 'Fasoncu', mono: true },
          { key: 'production_order_no', label: 'İş emri', mono: true },
          { key: 'order_mode', label: 'Mod' },
          { key: 'status', label: 'Durum' },
          { key: 'estimated_amount', label: 'Tahmini' },
          { key: 'actual_amount', label: 'Gerçekleşen' },
          { key: 'invoiced_amount', label: 'Faturalanan' },
        ],
        masterFields: [
          { key: 'order_no', label: 'Sipariş no', code: true },
          { key: 'order_date', label: 'Tarih', type: 'date', required: true },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', required: true, lead: true },
          { key: 'production_order_id', label: 'İş emri', type: 'lookup', lookup: 'uretim-emirleri', valueKey: 'id', labelKey: 'order_no', codeKey: 'order_no' },
          { key: 'order_mode', label: 'Mod', type: 'select', options: ['Operasyon', 'Komple'], required: true },
          { key: 'planned_delivery_date', label: 'Planlanan teslim', type: 'date' },
          { key: 'currency_code', label: 'Para birimi', type: 'lookup', lookup: 'para-birimleri', valueKey: 'currency_code', labelKey: 'currency_name' },
          { key: 'exchange_rate', label: 'Kur', type: 'number' },
          { key: 'status', label: 'Durum', type: 'select', options: ['Taslak','Acik','SevkEdildi','KismiSevk','KismiTeslim','TeslimAlindi','Tamamlandi','Iptal'] },
          { key: 'estimated_amount', label: 'Tahmini tutar', type: 'number', readOnly: true },
          { key: 'actual_amount', label: 'Gerçekleşen tutar', type: 'number', readOnly: true },
          { key: 'invoiced_amount', label: 'Faturalanan', type: 'number', readOnly: true },
          { key: 'description', label: 'Açıklama' },
        ],
        detailFields: [
          { key: 'operation_code', label: 'Op. kod' },
          { key: 'operation_name', label: 'Op. adı' },
          { key: 'item_id', label: 'Ürün', type: 'lookup', lookup: 'items', valueKey: 'id', labelKey: 'item_name', codeKey: 'item_code' },
          { key: 'ordered_qty', label: 'Sipariş miktar', type: 'number' },
          { key: 'sent_qty', label: 'Gönderilen', type: 'number', readOnly: true },
          { key: 'consumed_qty', label: 'Tüketilen', type: 'number', readOnly: true },
          { key: 'scrap_qty', label: 'Fire', type: 'number', readOnly: true },
          { key: 'received_qty', label: 'Teslim alınan', type: 'number', readOnly: true },
          { key: 'accepted_qty', label: 'Kabul', type: 'number', readOnly: true },
          { key: 'rejected_qty', label: 'Ret', type: 'number', readOnly: true },
          { key: 'remaining_qty', label: 'Kalan', type: 'number', readOnly: true },
          { key: 'emanet_qty', label: 'Emanette', type: 'number', readOnly: true },
          { key: 'unit_price', label: 'Birim fiyat', type: 'number' },
          { key: 'line_amount', label: 'Tutar', type: 'number', readOnly: true },
          { key: 'due_date', label: 'Termin', type: 'date' },
          { key: 'notes', label: 'Not' },
        ],
        detailKey: 'satirlar',
        defaults: { order_mode: 'Operasyon', status: 'Acik', currency_code: 'TRY', exchange_rate: 1 },
        secondaryAction: { label: 'Sevk', path: '/fason-siparisleri/{id}/sevk', method: 'POST' },
        approveAction: { label: 'Teslimat', path: '/fason-siparisleri/{id}/teslimat', method: 'POST' },
      },
      {
        id: 'fason-operasyon-takip',
        techId: 'SUB-TRK-SCR-001',
        businessNameEn: 'SubcontractOperationTrackScreen',
        title: 'Fason Operasyon Takibi',
        endpoint: '/fason-siparisleri',
        crud: true,
        codeField: 'order_no',
        nameField: 'partner_name',
        filters: [
          { key: 'status', label: 'Durum' },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', queryParam: true },
        ],
        columns: [
          { key: 'order_no', label: 'Sipariş', mono: true },
          { key: 'partner_name', label: 'Fasoncu' },
          { key: 'production_order_no', label: 'İş emri' },
          { key: 'status', label: 'Durum' },
          { key: 'planned_delivery_date', label: 'Termin' },
          { key: 'estimated_amount', label: 'Tahmini' },
          { key: 'actual_amount', label: 'Gerçekleşen' },
        ],
        masterFields: [
          { key: 'order_no', label: 'Sipariş', code: true, readOnly: true },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', readOnly: true },
          { key: 'status', label: 'Durum', readOnly: true },
          { key: 'description', label: 'Açıklama', readOnly: true },
        ],
        detailFields: [
          { key: 'operation_name', label: 'Operasyon' },
          { key: 'ordered_qty', label: 'Sipariş' },
          { key: 'sent_qty', label: 'Sevk' },
          { key: 'consumed_qty', label: 'Tüketim' },
          { key: 'received_qty', label: 'Teslim' },
          { key: 'accepted_qty', label: 'Kabul' },
          { key: 'rejected_qty', label: 'Ret' },
          { key: 'emanet_qty', label: 'Emanet' },
        ],
        detailKey: 'satirlar',
      },
      {
        id: 'fason-sevkiyatlar',
        techId: 'SUB-SHP-SCR-001',
        businessNameEn: 'SubcontractShipmentScreen',
        title: 'Fasona Malzeme Sevki',
        endpoint: '/fason-sevkiyatlar',
        crud: true,
        codeField: 'shipment_no',
        nameField: 'partner_name',
        filters: [{ key: 'shipment_no', label: 'Sevk no' }],
        columns: [
          { key: 'shipment_no', label: 'Sevk', mono: true },
          { key: 'shipment_date', label: 'Tarih' },
          { key: 'partner_code', label: 'Fasoncu' },
          { key: 'order_no', label: 'Sipariş' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'shipment_no', label: 'Sevk no', code: true, readOnly: true },
          { key: 'shipment_date', label: 'Tarih', type: 'date', readOnly: true },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', readOnly: true },
          { key: 'order_id', label: 'Fason sipariş', type: 'lookup', lookup: 'fason-siparisleri', valueKey: 'id', labelKey: 'order_no', codeKey: 'order_no', readOnly: true },
          { key: 'description', label: 'Açıklama', readOnly: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'fason-tuketimler',
        techId: 'SUB-CNS-SCR-001',
        businessNameEn: 'SubcontractConsumptionScreen',
        title: 'Fason Malzeme Tüketimi',
        endpoint: '/fason-tuketimler',
        crud: true,
        codeField: 'consumption_no',
        nameField: 'partner_name',
        filters: [{ key: 'consumption_no', label: 'Belge no' }],
        columns: [
          { key: 'consumption_no', label: 'Belge', mono: true },
          { key: 'consumption_date', label: 'Tarih' },
          { key: 'partner_code', label: 'Fasoncu' },
          { key: 'order_no', label: 'Sipariş' },
        ],
        masterFields: [
          { key: 'consumption_no', label: 'Belge no', code: true, readOnly: true },
          { key: 'consumption_date', label: 'Tarih', type: 'date', readOnly: true },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', readOnly: true },
          { key: 'description', label: 'Açıklama', readOnly: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'fason-teslimatlar',
        techId: 'SUB-RCV-SCR-001',
        businessNameEn: 'SubcontractReceiptScreen',
        title: 'Fason Ürün Teslim Alma',
        endpoint: '/fason-teslimatlar',
        crud: true,
        codeField: 'receipt_no',
        nameField: 'partner_name',
        filters: [{ key: 'receipt_no', label: 'Teslim no' }],
        columns: [
          { key: 'receipt_no', label: 'Teslim', mono: true },
          { key: 'receipt_date', label: 'Tarih' },
          { key: 'partner_code', label: 'Fasoncu' },
          { key: 'order_no', label: 'Sipariş' },
          { key: 'status', label: 'Durum' },
        ],
        masterFields: [
          { key: 'receipt_no', label: 'Teslim no', code: true, readOnly: true },
          { key: 'receipt_date', label: 'Tarih', type: 'date', readOnly: true },
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', readOnly: true },
          { key: 'status', label: 'Durum', readOnly: true },
          { key: 'description', label: 'Açıklama', readOnly: true },
        ],
        detailFields: [],
        detailKey: null,
      },
      {
        id: 'fason-emanet-stok',
        techId: 'SUB-STK-SCR-001',
        businessNameEn: 'SubcontractConsignmentStockScreen',
        title: 'Fasoncu Emanet Stokları',
        endpoint: '/fason-emanet-stok',
        crud: false,
        codeField: 'item_code',
        nameField: 'item_name',
        filters: [
          { key: 'partner_id', label: 'Fasoncu', type: 'lookup', lookup: 'partners-fasoncu', valueKey: 'id', labelKey: 'partner_name', codeKey: 'partner_code', queryParam: true },
        ],
        columns: [
          { key: 'partner_code', label: 'Fasoncu', mono: true },
          { key: 'partner_name', label: 'Unvan' },
          { key: 'warehouse_code', label: 'Depo', mono: true },
          { key: 'item_code', label: 'Stok', mono: true },
          { key: 'item_name', label: 'Ad' },
          { key: 'bakiye', label: 'Emanet bakiye' },
        ],
        masterFields: [],
        detailFields: [],
        detailKey: null,
      },
`;

// Append screens into uretim.screens before closing of last screen or after uretim-parametre-dogrulama screen object
const marker = "id: 'uretim-parametre-dogrulama'";
const idx = src.indexOf(marker);
if (idx < 0) throw new Error('uretim-parametre-dogrulama not found');
// find end of that screen object — next `},\n      {` or `},\n    ],` after screens
let depth = 0;
let startObj = src.lastIndexOf('{', idx);
let p = startObj;
for (; p < src.length; p++) {
  const c = src[p];
  if (c === '{') depth++;
  else if (c === '}') {
    depth--;
    if (depth === 0) break;
  }
}
const insertAt = p + 1; // after closing brace of screen
if (!src.includes("id: 'fason-siparisleri'")) {
  src = `${src.slice(0, insertAt)},${SCREENS}${src.slice(insertAt)}`;
  console.log('ok fason screens in uretim');
} else {
  console.log('skip fason screens');
}

// Also add screenIds to kalite? optional fason KK uses existing GKK — skip new screens

// Lookup partners-fasoncu
once(
  "LOOKUP partners-fasoncu map",
  "'partners-tedarikci': '/partners?tur=Tedarikci&is_active=true',",
  `
  'partners-fasoncu': '/partners?is_subcontractor=true&is_active=true',`,
);

// SECTION_TITLE_EN
once(
  "Fason Operasyon: 'Subcontract Ops'",
  "Güncelleme: 'Updates',",
  `
  'Fason Operasyon': 'Subcontract Operations',
  'Fason Sipariş': 'Subcontract Orders',
  'Fason Stok': 'Subcontract Stock',`,
);

fs.writeFileSync(appPath, src);
console.log('inject done');
