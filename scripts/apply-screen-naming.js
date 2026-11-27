#!/usr/bin/env node
/**
 * Builds docs/screen-registry.json + docs/screen-naming-standard.md
 * and injects techId / businessNameEn into public/app.js MODULES screens.
 * Does NOT change route ids (kebab `id`), DB schema, or document numbers.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const inventoryPath = fs.existsSync(path.join(ROOT, 'docs/screen-inventory-source.json'))
  ? path.join(ROOT, 'docs/screen-inventory-source.json')
  : '/tmp/screens-raw.json';
const screensRaw = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

/** @type {Record<string, {techId:string, businessNameEn:string, module:string, subarea:string, objectType:string, notes?:string, status?:string}>} */
const MAP = {
  // --- Sabit Tanımlar ---
  'numarator-tanimi': { techId: 'SYS-NUM-SCR-001', businessNameEn: 'NumberSeriesScreen', module: 'SYS', subarea: 'NUM', objectType: 'SCR' },
  'olcu-birimleri': { techId: 'MDM-UOM-SCR-001', businessNameEn: 'UnitOfMeasureScreen', module: 'MDM', subarea: 'UOM', objectType: 'SCR' },
  'kategori-tanimi': { techId: 'MDM-CAT-SCR-001', businessNameEn: 'CategoryDefinitionScreen', module: 'MDM', subarea: 'CAT', objectType: 'SCR' },
  'ulke-tanimi': { techId: 'MDM-CTRY-SCR-001', businessNameEn: 'CountryDefinitionScreen', module: 'MDM', subarea: 'CTRY', objectType: 'SCR' },
  'para-birimi-tanimi': { techId: 'MDM-CUR-SCR-001', businessNameEn: 'CurrencyDefinitionScreen', module: 'MDM', subarea: 'CUR', objectType: 'SCR' },
  'sehir-tanimi': { techId: 'MDM-CITY-SCR-001', businessNameEn: 'CityProvinceScreen', module: 'MDM', subarea: 'CITY', objectType: 'SCR' },
  'ilce-tanimi': { techId: 'MDM-DIST-SCR-001', businessNameEn: 'DistrictDefinitionScreen', module: 'MDM', subarea: 'DIST', objectType: 'SCR' },
  'odeme-kosulu-tanimi': { techId: 'MDM-PAYT-SCR-001', businessNameEn: 'PaymentTermsScreen', module: 'MDM', subarea: 'PAYT', objectType: 'SCR' },
  'teslimat-kosulu-tanimi': { techId: 'MDM-DLVT-SCR-001', businessNameEn: 'DeliveryTermsScreen', module: 'MDM', subarea: 'DLVT', objectType: 'SCR' },
  'dil-tanimi': { techId: 'MDM-LANG-SCR-001', businessNameEn: 'LanguageDefinitionScreen', module: 'MDM', subarea: 'LANG', objectType: 'SCR' },
  'banka-tanimi': { techId: 'MDM-BANK-SCR-001', businessNameEn: 'BankDefinitionScreen', module: 'MDM', subarea: 'BANK', objectType: 'SCR' },
  'doviz-kur-tanimi': { techId: 'FIN-FX-SCR-001', businessNameEn: 'ExchangeRateScreen', module: 'FIN', subarea: 'FX', objectType: 'SCR' },
  'hareket-kodlari': { techId: 'INV-MVTC-SCR-001', businessNameEn: 'MovementCodeScreen', module: 'INV', subarea: 'MVTC', objectType: 'SCR' },

  // --- Sistem ---
  'kullanicilar': { techId: 'SYS-USR-SCR-001', businessNameEn: 'UsersScreen', module: 'SYS', subarea: 'USR', objectType: 'SCR' },
  'kullanici-gruplari': { techId: 'SYS-GRP-SCR-001', businessNameEn: 'UserGroupsScreen', module: 'SYS', subarea: 'GRP', objectType: 'SCR' },
  'sistem-parametreleri': { techId: 'SYS-PRM-SCR-001', businessNameEn: 'SystemParametersScreen', module: 'SYS', subarea: 'PRM', objectType: 'SCR' },
  'audit-log': { techId: 'SYS-AUD-SCR-001', businessNameEn: 'AuditLogScreen', module: 'SYS', subarea: 'AUD', objectType: 'SCR' },
  'eposta-gonderimleri': { techId: 'SYS-MAIL-SCR-001', businessNameEn: 'EmailDispatchScreen', module: 'SYS', subarea: 'MAIL', objectType: 'SCR' },

  // --- Ana veri ---
  'firmalar': { techId: 'MDM-CO-SCR-001', businessNameEn: 'CompanyScreen', module: 'MDM', subarea: 'CO', objectType: 'SCR' },
  'is-yerleri': { techId: 'MDM-PLANT-SCR-001', businessNameEn: 'PlantSiteScreen', module: 'MDM', subarea: 'PLANT', objectType: 'SCR' },
  'depolar': { techId: 'MDM-WH-SCR-001', businessNameEn: 'WarehouseMasterScreen', module: 'MDM', subarea: 'WH', objectType: 'SCR' },

  // --- Stok / WMS / MRP ---
  'stok-karti': { techId: 'INV-ITM-SCR-001', businessNameEn: 'ItemMasterScreen', module: 'INV', subarea: 'ITM', objectType: 'SCR' },
  'depo-bakiye': { techId: 'INV-BAL-SCR-001', businessNameEn: 'WarehouseBalanceScreen', module: 'INV', subarea: 'BAL', objectType: 'SCR' },
  'stok-hareketleri': { techId: 'INV-MVT-SCR-001', businessNameEn: 'StockMovementScreen', module: 'INV', subarea: 'MVT', objectType: 'SCR' },
  'transfer-emirleri': { techId: 'WMS-XFER-SCR-001', businessNameEn: 'TransferOrderScreen', module: 'WMS', subarea: 'XFER', objectType: 'SCR' },
  'sayim-belgeleri': { techId: 'WMS-CNT-SCR-001', businessNameEn: 'PhysicalCountScreen', module: 'WMS', subarea: 'CNT', objectType: 'SCR' },
  'stok-partileri': { techId: 'INV-LOT-SCR-001', businessNameEn: 'LotBatchScreen', module: 'INV', subarea: 'LOT', objectType: 'SCR' },
  'mrp-bagimsiz-ihtiyac': { techId: 'MFG-IR-SCR-001', businessNameEn: 'IndependentRequirementsScreen', module: 'MFG', subarea: 'IR', objectType: 'SCR' },
  'mrp-calisma': { techId: 'MFG-MRP-SCR-001', businessNameEn: 'MrpRunScreen', module: 'MFG', subarea: 'MRP', objectType: 'SCR' },
  'mrp-hesap': { techId: 'MFG-MRP-SCR-002', businessNameEn: 'MrpInstantCalcScreen', module: 'MFG', subarea: 'MRP', objectType: 'SCR' },
  'mrp-sonuclar': { techId: 'MFG-MRP-RES-001', businessNameEn: 'MrpResultsScreen', module: 'MFG', subarea: 'MRP', objectType: 'RES' },
  'stok-rezervasyonlari': { techId: 'INV-RSV-SCR-001', businessNameEn: 'StockReservationScreen', module: 'INV', subarea: 'RSV', objectType: 'SCR' },
  'stok-serileri': { techId: 'INV-SER-SCR-001', businessNameEn: 'SerialNumberScreen', module: 'INV', subarea: 'SER', objectType: 'SCR' },
  'stok-ikame': { techId: 'INV-SUB-SCR-001', businessNameEn: 'ItemSubstitutionScreen', module: 'INV', subarea: 'SUB', objectType: 'SCR' },

  // --- Cari ---
  'cari-kartlari': { techId: 'MDM-BP-SCR-001', businessNameEn: 'BusinessPartnerScreen', module: 'MDM', subarea: 'BP', objectType: 'SCR' },
  'cari-ekstre': { techId: 'FIN-BPST-SCR-001', businessNameEn: 'BusinessPartnerStatementScreen', module: 'FIN', subarea: 'BPST', objectType: 'SCR' },
  'tahsilat-odemeler': { techId: 'FIN-APAR-SCR-001', businessNameEn: 'CollectionPaymentScreen', module: 'FIN', subarea: 'APAR', objectType: 'SCR' },

  // --- Üretim ---
  'urun-agaci': { techId: 'MFG-BOM-SCR-001', businessNameEn: 'BillOfMaterialsScreen', module: 'MFG', subarea: 'BOM', objectType: 'SCR' },
  'bom-patlatma': { techId: 'MFG-BOM-SCR-002', businessNameEn: 'BomExplosionScreen', module: 'MFG', subarea: 'BOM', objectType: 'SCR' },
  'bom-seviye-listesi': { techId: 'MFG-BOM-SCR-003', businessNameEn: 'BomLevelListScreen', module: 'MFG', subarea: 'BOM', objectType: 'SCR' },
  'bom-malzeme-degisikligi': { techId: 'MFG-BOM-SCR-004', businessNameEn: 'BomMaterialChangeScreen', module: 'MFG', subarea: 'BOM', objectType: 'SCR' },
  'sinif-tanimi': { techId: 'MFG-CLS-SCR-001', businessNameEn: 'ClassDefinitionScreen', module: 'MFG', subarea: 'CLS', objectType: 'SCR' },
  'is-merkezleri': { techId: 'MFG-WC-SCR-001', businessNameEn: 'WorkCenterScreen', module: 'MFG', subarea: 'WC', objectType: 'SCR' },
  'rotalar': { techId: 'MFG-ROUT-SCR-001', businessNameEn: 'RoutingScreen', module: 'MFG', subarea: 'ROUT', objectType: 'SCR' },
  'uretim-emri-tipleri': { techId: 'MFG-WOT-SCR-001', businessNameEn: 'WorkOrderTypeScreen', module: 'MFG', subarea: 'WOT', objectType: 'SCR' },
  'uretim-planlari': { techId: 'MFG-PLN-SCR-001', businessNameEn: 'ProductionPlanScreen', module: 'MFG', subarea: 'PLN', objectType: 'SCR' },
  'uretim-emirleri': { techId: 'MFG-WO-SCR-001', businessNameEn: 'WorkOrderScreen', module: 'MFG', subarea: 'WO', objectType: 'SCR' },
  'siparis-is-emri': { techId: 'MFG-WO-SCR-002', businessNameEn: 'OrderToWorkOrderScreen', module: 'MFG', subarea: 'WO', objectType: 'SCR' },
  'toplu-is-emri': { techId: 'MFG-WO-SCR-003', businessNameEn: 'BulkWorkOrderScreen', module: 'MFG', subarea: 'WO', objectType: 'SCR' },
  'stok-depo': { techId: 'INV-WHL-SCR-001', businessNameEn: 'ItemWarehouseLinkScreen', module: 'INV', subarea: 'WHL', objectType: 'SCR' },
  'uretim-girisleri': { techId: 'MFG-RCPT-SCR-001', businessNameEn: 'ProductionReceiptScreen', module: 'MFG', subarea: 'RCPT', objectType: 'SCR' },

  // --- Satınalma ---
  'satin-alma-teklif-istekleri': { techId: 'PUR-RFQ-SCR-001', businessNameEn: 'RequestForQuotationScreen', module: 'PUR', subarea: 'RFQ', objectType: 'SCR' },
  'satin-alma-teklifleri': { techId: 'PUR-QUO-SCR-001', businessNameEn: 'PurchaseQuotationScreen', module: 'PUR', subarea: 'QUO', objectType: 'SCR' },
  'satin-alma-anlasmalari': { techId: 'PUR-AGR-SCR-001', businessNameEn: 'PurchaseAgreementScreen', module: 'PUR', subarea: 'AGR', objectType: 'SCR' },
  'alis-faturalari': { techId: 'FIN-PINV-SCR-001', businessNameEn: 'PurchaseInvoiceScreen', module: 'FIN', subarea: 'PINV', objectType: 'SCR' },
  'satin-alma-talepleri': { techId: 'PUR-REQ-SCR-001', businessNameEn: 'PurchaseRequisitionScreen', module: 'PUR', subarea: 'REQ', objectType: 'SCR' },
  'satin-alma-siparisleri': { techId: 'PUR-ORD-SCR-001', businessNameEn: 'PurchaseOrderScreen', module: 'PUR', subarea: 'ORD', objectType: 'SCR' },
  'mal-kabuller': { techId: 'PUR-GR-SCR-001', businessNameEn: 'GoodsReceiptScreen', module: 'PUR', subarea: 'GR', objectType: 'SCR' },
  'tedarikci-irsaliyeleri': { techId: 'PUR-DLV-SCR-001', businessNameEn: 'SupplierDeliveryNoteScreen', module: 'PUR', subarea: 'DLV', objectType: 'SCR' },
  'belge-yonetimi': { techId: 'PUR-DOC-SCR-001', businessNameEn: 'DeliveryInvoiceManagementScreen', module: 'PUR', subarea: 'DOC', objectType: 'SCR' },

  // --- CRM ---
  'crm-firsat-asamalari': { techId: 'CRM-STG-SCR-001', businessNameEn: 'OpportunityStageScreen', module: 'CRM', subarea: 'STG', objectType: 'SCR' },
  'crm-faaliyet-tipleri': { techId: 'CRM-ACTT-SCR-001', businessNameEn: 'ActivityTypeScreen', module: 'CRM', subarea: 'ACTT', objectType: 'SCR' },
  'crm-adaylar': { techId: 'CRM-LEAD-SCR-001', businessNameEn: 'LeadScreen', module: 'CRM', subarea: 'LEAD', objectType: 'SCR' },
  'crm-kontaklar': { techId: 'CRM-CNT-SCR-001', businessNameEn: 'ContactScreen', module: 'CRM', subarea: 'CNT', objectType: 'SCR' },
  'crm-firsatlar': { techId: 'CRM-OPP-SCR-001', businessNameEn: 'OpportunityScreen', module: 'CRM', subarea: 'OPP', objectType: 'SCR' },
  'crm-faaliyet-planlari': { techId: 'CRM-APLN-SCR-001', businessNameEn: 'ActivityPlanScreen', module: 'CRM', subarea: 'APLN', objectType: 'SCR' },
  'crm-faaliyetler': { techId: 'CRM-ACT-SCR-001', businessNameEn: 'ActivityScreen', module: 'CRM', subarea: 'ACT', objectType: 'SCR' },
  'crm-gorevler': { techId: 'CRM-TASK-SCR-001', businessNameEn: 'TaskScreen', module: 'CRM', subarea: 'TASK', objectType: 'SCR' },
  'crm-ajanda': { techId: 'CRM-CAL-SCR-001', businessNameEn: 'AgendaCalendarScreen', module: 'CRM', subarea: 'CAL', objectType: 'SCR' },

  // --- Satış ---
  'satis-teklifleri': { techId: 'SAL-QUO-SCR-001', businessNameEn: 'SalesQuotationScreen', module: 'SAL', subarea: 'QUO', objectType: 'SCR' },
  'satis-siparisleri': { techId: 'SAL-ORD-SCR-001', businessNameEn: 'SalesOrderScreen', module: 'SAL', subarea: 'ORD', objectType: 'SCR' },
  'sevk-emirleri': { techId: 'SAL-SHP-SCR-001', businessNameEn: 'ShipmentScreen', module: 'SAL', subarea: 'SHP', objectType: 'SCR' },
  'irsaliyeler': { techId: 'SAL-DLV-SCR-001', businessNameEn: 'DeliveryNoteScreen', module: 'SAL', subarea: 'DLV', objectType: 'SCR' },
  'satis-faturalari': { techId: 'FIN-SINV-SCR-001', businessNameEn: 'SalesInvoiceScreen', module: 'FIN', subarea: 'SINV', objectType: 'SCR' },

  // --- Kalite ---
  'kk-emirleri-gkk': { techId: 'QLT-IQC-SCR-001', businessNameEn: 'IncomingQcOrderScreen', module: 'QLT', subarea: 'IQC', objectType: 'SCR' },
  'kk-emirleri-ckk': { techId: 'QLT-OQC-SCR-001', businessNameEn: 'OutgoingQcOrderScreen', module: 'QLT', subarea: 'OQC', objectType: 'SCR' },
  'kk-uygunsuzluklar': { techId: 'QLT-NCR-SCR-001', businessNameEn: 'NonconformanceScreen', module: 'QLT', subarea: 'NCR', objectType: 'SCR' },
  'kk-capa': { techId: 'QLT-CAPA-SCR-001', businessNameEn: 'CapaScreen', module: 'QLT', subarea: 'CAPA', objectType: 'SCR' },
  'kk-kontrol-planlari': { techId: 'QLT-PLAN-SCR-001', businessNameEn: 'ControlPlanScreen', module: 'QLT', subarea: 'PLAN', objectType: 'SCR' },
  'kk-stok-planlari': { techId: 'QLT-ITMP-SCR-001', businessNameEn: 'ItemControlPlanLinkScreen', module: 'QLT', subarea: 'ITMP', objectType: 'SCR' },
  'kk-ret-nedenleri': { techId: 'QLT-REJ-SCR-001', businessNameEn: 'RejectionReasonScreen', module: 'QLT', subarea: 'REJ', objectType: 'SCR' },

  // --- Onay (SYS workflow admin; route id preserved for yetki/hash) ---
  'onaylarim': { techId: 'SYS-APR-SCR-001', businessNameEn: 'MyApprovalsScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-izleme': { techId: 'SYS-APR-SCR-002', businessNameEn: 'ApprovalMonitoringScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-yetki-devri': { techId: 'SYS-APR-SCR-003', businessNameEn: 'ApprovalDelegationScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-rol-tanim': { techId: 'SYS-APR-SCR-004', businessNameEn: 'ApprovalRoleScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-kural-tanim': { techId: 'SYS-APR-SCR-005', businessNameEn: 'ApprovalRuleScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-rota-tanim': { techId: 'SYS-APR-SCR-006', businessNameEn: 'ApprovalRouteScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-mesaj-sablon': { techId: 'SYS-APR-SCR-007', businessNameEn: 'ApprovalMessageTemplateScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },
  'onay-durum-tanim': { techId: 'SYS-APR-SCR-008', businessNameEn: 'ApprovalStatusScreen', module: 'SYS', subarea: 'APR', objectType: 'SCR' },

  // --- Finans ---
  'hesap-plani': { techId: 'FIN-COA-SCR-001', businessNameEn: 'ChartOfAccountsScreen', module: 'FIN', subarea: 'COA', objectType: 'SCR' },
  'muhasebe-belgeleri': { techId: 'FIN-JE-SCR-001', businessNameEn: 'AccountingDocumentScreen', module: 'FIN', subarea: 'JE', objectType: 'SCR' },
  'mizan': { techId: 'FIN-TB-RPT-001', businessNameEn: 'TrialBalanceReport', module: 'FIN', subarea: 'TB', objectType: 'RPT' },
  'hesap-belirleme-kurallari': { techId: 'FIN-ACR-SCR-001', businessNameEn: 'AccountDeterminationRuleScreen', module: 'FIN', subarea: 'ACR', objectType: 'SCR' },
  'fiyat-listeleri': { techId: 'FIN-PRC-SCR-001', businessNameEn: 'PriceListScreen', module: 'FIN', subarea: 'PRC', objectType: 'SCR' },
  'fatura-kontrolleri': { techId: 'FIN-3WAY-SCR-001', businessNameEn: 'ThreeWayMatchScreen', module: 'FIN', subarea: '3WAY', objectType: 'SCR' },
  'kokpit': { techId: 'RPT-CPIT-SCR-001', businessNameEn: 'CockpitDashboardScreen', module: 'RPT', subarea: 'CPIT', objectType: 'SCR' },
};

const MODULE_DICT = [
  ['MDM', 'Master Data Management', 'Cari ve diğer ana veriler'],
  ['FIN', 'Finance', 'Finans, muhasebe ve finansal belgeler'],
  ['INV', 'Inventory', 'Stok ve stok hareketleri'],
  ['WMS', 'Warehouse Management', 'Depo operasyonları'],
  ['PUR', 'Purchasing', 'Satın alma'],
  ['SAL', 'Sales', 'Satış süreçleri'],
  ['CRM', 'Customer Relationship Management', 'Müşteri ilişkileri'],
  ['MFG', 'Manufacturing', 'Üretim ve MRP'],
  ['QLT', 'Quality Management', 'Kalite yönetimi'],
  ['MNT', 'Maintenance', 'Bakım yönetimi'],
  ['HR', 'Human Resources', 'İnsan kaynakları'],
  ['SYS', 'System Administration', 'Sistem ve kullanıcı yönetimi'],
  ['INT', 'Integration', 'Entegrasyonlar'],
  ['RPT', 'Reporting', 'Raporlama'],
  ['PRJ', 'Project Management', 'Proje yönetimi'],
  ['DMS', 'Document Management', 'Doküman yönetimi'],
];

const OBJECT_DICT = [
  ['SCR', 'Ekran / sayfa'],
  ['RPT', 'Rapor'],
  ['API', 'API tanımı'],
  ['WF', 'İş akışı'],
  ['JOB', 'Arka plan görevi'],
  ['SRV', 'Servis'],
  ['CMP', 'Yeniden kullanılabilir arayüz bileşeni'],
  ['ACT', 'İşlem / aksiyon'],
  ['RES', 'Sonuç veya sonuç ekranı'],
  ['PRT', 'Yazdırma / çıktı bileşeni'],
];

const missing = screensRaw.filter((s) => !MAP[s.id]);
if (missing.length) {
  console.error('Missing mappings:', missing.map((s) => s.id));
  process.exit(1);
}

const techIds = Object.values(MAP).map((m) => m.techId);
const dup = techIds.filter((id, i) => techIds.indexOf(id) !== i);
if (dup.length) {
  console.error('Duplicate techIds:', [...new Set(dup)]);
  process.exit(1);
}

const idRe = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-\d{3}$/;
for (const m of Object.values(MAP)) {
  if (!idRe.test(m.techId)) {
    console.error('Invalid techId format:', m.techId);
    process.exit(1);
  }
  const [mod, sub, ot] = m.techId.split('-');
  if (mod !== m.module || sub !== m.subarea || ot !== m.objectType) {
    console.error('techId parts mismatch:', m.techId, m);
    process.exit(1);
  }
}

const navModuleMap = {
  'sabit-tanimlar': 'Sabit Tanımlar',
  sistem: 'Sistem',
  'ana-veri': 'Ana Veri',
  stok: 'Stok',
  cari: 'Cari',
  uretim: 'Üretim',
  satinalma: 'Satınalma',
  crm: 'CRM',
  satis: 'Satış',
  kalite: 'Kalite',
  onay: 'Onay',
  finans: 'Finans',
};

const registry = {
  version: 1,
  standard: 'MODULE-SUBAREA-OBJECTTYPE-NNN',
  generatedAt: new Date().toISOString(),
  notes: [
    'Route/hash id (legacyId) korunur; yetki (ekran_id) ve URL uyumluluğu bozulmaz.',
    'Teknik kimlik (id/techId) belge numaralarından ve DB tablo adlarından ayrıdır.',
    'Kullanıcıya görünen Türkçe title alanları değiştirilmez.',
  ],
  dictionaries: {
    modules: MODULE_DICT.map(([code, en, scope]) => ({ code, en, scope })),
    objectTypes: OBJECT_DICT.map(([code, meaning]) => ({ code, meaning })),
  },
  screens: screensRaw.map((s) => {
    const m = MAP[s.id];
    return {
      id: m.techId,
      legacyId: s.id,
      module: m.module,
      subarea: m.subarea,
      objectType: m.objectType,
      displayNameTr: s.title,
      businessNameEn: m.businessNameEn.replace(/Screen$|Report$/, '').replace(/([a-z])([A-Z])/g, '$1 $2'),
      technicalNameEn: m.businessNameEn,
      navModuleId: s.moduleId,
      navModuleTitle: navModuleMap[s.moduleId] || s.moduleTitle,
      route: `#${s.id}`,
      endpoint: s.endpoint || null,
      filePath: 'public/app.js',
      previousTechnicalId: s.id,
      change: 'Added techId and businessNameEn; route id unchanged',
      status: 'Changed',
      crud: !!s.crud,
      readOnly: !!s.readOnly,
    };
  }),
};

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'docs/screen-registry.json'),
  JSON.stringify(registry, null, 2) + '\n',
);

function mdEscape(s) {
  return String(s || '').replace(/\|/g, '\\|');
}

let md = `# KTB ERP — Ekran İsimlendirme Standardı

## Amaç

Bu belge, KTB ERP içindeki ekranlar ve ilgili UI nesneleri için proje içi teknik adlandırma standardını tanımlar.
Biçim: \`MODULE-SUBAREA-OBJECTTYPE-NNN\` (ör. \`SAL-ORD-SCR-001\`).

Bu bir proje standardıdır; evrensel bir ERP standardı değildir.

## Kavram ayrımı

| Kavram | Örnek | Açıklama |
|---|---|---|
| Teknik kimlik | \`SAL-ORD-SCR-001\` | Stabil, büyük harfli kimlik |
| İngilizce teknik ad | \`SalesOrderScreen\` | Kod/dokümantasyon adı |
| Görünen ad (TR) | Satış Siparişleri | Kullanıcı arayüzü metni — korunur |
| Route / legacy id | \`satis-siparisleri\` | Hash, yetki \`ekran_id\`, menü — **değiştirilmedi** |
| Belge numarası | \`ST00003\` | İş belgesi numarası — bu standardın dışında |

## Modül sözlüğü

| Kod | İngilizce | Kapsam |
|---|---|---|
${MODULE_DICT.map(([c, e, s]) => `| \`${c}\` | ${e} | ${s} |`).join('\n')}

## Nesne türü sözlüğü

| Kod | Anlam |
|---|---|
${OBJECT_DICT.map(([c, m]) => `| \`${c}\` | ${m} |`).join('\n')}

## Uygulama notları (bu tur)

1. \`public/app.js\` içindeki her MODULES ekranına \`techId\` ve \`businessNameEn\` eklendi.
2. Route hash (\`#legacyId\`), yetki \`ekran_id\` değerleri ve API endpoint yolları **korundu**.
3. Veritabanı tablo/kolon adları ve belge numaratörleri **değiştirilmedi**.
4. Makine okunur envanter: [\`screen-registry.json\`](./screen-registry.json).
5. Onay ekran kataloğuna (\`routes/onay_ekranlari.js\`) \`tech_id\` alanı eklendi; \`ekran_id\` legacy kaldı.

## Ekran envanteri

Toplam ekran: **${registry.screens.length}**

| Teknik kimlik | TR görünen ad | EN iş adı | Legacy id | Nav modül | Route | Endpoint | Durum |
|---|---|---|---|---|---|---|---|
`;

for (const s of registry.screens) {
  md += `| \`${s.id}\` | ${mdEscape(s.displayNameTr)} | ${mdEscape(s.businessNameEn)} | \`${s.legacyId}\` | ${mdEscape(s.navModuleTitle)} | \`${s.route}\` | ${s.endpoint ? `\`${s.endpoint}\`` : '—'} | ${s.status} |\n`;
}

md += `
## Needs Review

| Konu | Açıklama |
|---|---|
| Onay modülü kodu | Onay ekranları \`SYS-APR-*\` altına alındı (ayrı APR/WF modülü yok). İleride ayrı modül istenirse kimlikler planlı taşınabilir. |
| Faturalar | Alış/satış faturaları menüde Satınalma/Satış altında; teknik modül \`FIN\` (\`FIN-PINV\` / \`FIN-SINV\`). |
| MRP menü konumu | MRP ekranları Stok menüsünde; teknik modül \`MFG\`. |
| Mizan | Rapor niteliği nedeniyle \`FIN-TB-RPT-001\` (\`objectType=RPT\`). |
| Kokpit | Raporlama yüzeyi olarak \`RPT-CPIT-SCR-001\`. |
| Depo master | Ana veri menüsünde; \`MDM-WH-SCR-001\` (operasyonel transfer/sayım \`WMS\`). |

## Numaralandırma kuralı

Aynı \`MODULE-SUBAREA-OBJECTTYPE\` grubunda sonraki nesne bir sonraki üç haneli numarayı alır (\`001\`, \`002\`…).
Yeni ekran eklerken mevcut kimlikleri yeniden numaralandırmayın; \`docs/screen-registry.json\` üzerinden boş numarayı seçin.
`;

fs.writeFileSync(path.join(ROOT, 'docs/screen-naming-standard.md'), md);

// --- Inject into app.js ---
let app = fs.readFileSync(path.join(ROOT, 'public/app.js'), 'utf8');
let injected = 0;
for (const s of screensRaw) {
  const m = MAP[s.id];
  const titleEsc = s.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(id: '${s.id}',\\n)(\\s*)(title: '${titleEsc}')`,
  );
  if (app.includes(`id: '${s.id}',\n`) && app.includes(`techId: '${m.techId}'`)) {
    continue;
  }
  const next = app.replace(re, `$1$2techId: '${m.techId}',\n$2businessNameEn: '${m.businessNameEn}',\n$2$3`);
  if (next === app) {
    console.error('Failed to inject', s.id);
    process.exit(1);
  }
  app = next;
  injected += 1;
}
fs.writeFileSync(path.join(ROOT, 'public/app.js'), app);

// --- Banner: show techId subtly without changing TR title ---
app = fs.readFileSync(path.join(ROOT, 'public/app.js'), 'utf8');
const oldBanner = `      banner.textContent = screen.banner
        ? \`\${screen.title} — \${screen.banner}\`
        : \`\${screen.title} açık · UI build 20261017v\`;`;
const newBanner = `      banner.textContent = screen.banner
        ? \`\${screen.title} — \${screen.banner}\${screen.techId ? ' · ' + screen.techId : ''}\`
        : \`\${screen.title} açık\${screen.techId ? ' · ' + screen.techId : ''} · UI build 20261017v\`;`;
if (app.includes(oldBanner)) {
  app = app.replace(oldBanner, newBanner);
  fs.writeFileSync(path.join(ROOT, 'public/app.js'), app);
} else if (!app.includes('screen.techId ?')) {
  console.warn('Banner pattern not found; techId banner skipped');
}

// --- Onay ekran kataloğu ---
const onayPath = path.join(ROOT, 'routes/onay_ekranlari.js');
let onay = fs.readFileSync(onayPath, 'utf8');
const onayIds = [
  'satin-alma-talepleri', 'satin-alma-teklifleri', 'satin-alma-siparisleri', 'mal-kabuller',
  'alis-faturalari', 'satis-teklifleri', 'satis-siparisleri', 'sevk-emirleri', 'irsaliyeler',
  'satis-faturalari', 'uretim-emirleri', 'uretim-planlari', 'transfer-emirleri', 'sayim-belgeleri',
  'kk-emirleri-gkk', 'kk-emirleri-ckk', 'fatura-kontrolleri', 'muhasebe-belgeleri',
];
for (const id of onayIds) {
  const m = MAP[id];
  if (!m) continue;
  const re = new RegExp(`(\\{ ekran_id: '${id}', ekran_adi: '[^']+', modul: '[^']+')(\\s*\\})`);
  if (onay.includes(`ekran_id: '${id}'`) && onay.includes(`tech_id: '${m.techId}'`)) continue;
  const next = onay.replace(re, `$1, tech_id: '${m.techId}'$2`);
  if (next === onay) {
    console.warn('onay inject miss', id);
  } else {
    onay = next;
  }
}
// extend filter to tech_id
if (!onay.includes('e.tech_id')) {
  onay = onay.replace(
    'e.ekran_id.includes(q) || e.ekran_adi.toLowerCase().includes(q)',
    "e.ekran_id.includes(q) || e.ekran_adi.toLowerCase().includes(q) || (e.tech_id && e.tech_id.toLowerCase().includes(q))",
  );
}
fs.writeFileSync(onayPath, onay);

console.log(JSON.stringify({
  screens: registry.screens.length,
  injected,
  uniqueTechIds: new Set(techIds).size,
  registry: 'docs/screen-registry.json',
  doc: 'docs/screen-naming-standard.md',
}, null, 2));
