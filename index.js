require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = require('./db');
const { authOptional, authRequired } = require('./src/middleware/authJwt');
const { auditMiddleware } = require('./src/services/auditService');
const { firmaContext } = require('./src/middleware/firmaContext');

// Profil resmi (base64) + yetki JSON için varsayılan 100kb yetmez
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use((req, res, next) => {
    // Önizleme / farklı origin (Cursor Ports) için CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Kullanici-Kodu, X-Firma-Id');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
}));

// JWT / header kimlik + firma bağlamı + audit (health ve static hariç API)
app.use(authOptional);
app.use(authRequired);
app.use(firmaContext);
app.use(auditMiddleware(pool));

app.get('/health', async (req, res) => {
    const pool = require('./db');
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'ok',
            zaman: new Date().toISOString(),
            veritabani: 'bagli',
        });
    } catch (err) {
        res.status(500).json({
            status: 'hata',
            veritabani: 'baglantisiz',
            detay: err.message,
        });
    }
});

app.use('/companies', require('./routes/companies'));
app.use('/is-yerleri', require('./routes/plants'));
app.use('/warehouses', require('./routes/warehouses'));
app.use('/olcu-birimleri', require('./routes/units_of_measure'));
app.use('/items', require('./routes/items'));
app.use('/stok-hareketleri', require('./routes/stock_movements'));
app.use('/stok-bakiyeleri', require('./routes/stok_bakiyeleri'));
app.use('/partners', require('./routes/partners'));
app.use('/invoices', require('./routes/invoices'));
app.use('/users', require('./routes/users'));
app.use('/kullanicilar', require('./routes/users'));
app.use('/kullanici-gruplari', require('./routes/user_groups'));
app.use('/sistem-parametreleri', require('./routes/system_parameters'));
app.use('/sales_orders', require('./routes/sales_orders'));
app.use('/satis-teklifleri', require('./routes/sales_quotations'));
app.use('/sevk-emirleri', require('./routes/shipment_orders'));
app.use('/delivery_notes', require('./routes/delivery_notes'));
app.use('/hareket-kodlari', require('./routes/movement_codes'));
app.use('/belge-tipleri', require('./routes/document_types'));
app.use('/urun-agaclari', require('./routes/boms'));
app.use('/bom', require('./routes/bom_araclari'));
app.use('/stok-siniflari', require('./routes/item_classes'));
app.use('/is-merkezleri', require('./routes/work_centers'));
app.use('/is-istasyonlari', require('./routes/work_stations'));
app.use('/routings', require('./routes/routings'));
app.use('/satin-alma-talepleri', require('./routes/purchase_requisitions'));
app.use('/satin-alma-teklif-istekleri', require('./routes/rfqs'));
app.use('/satin-alma-teklifleri', require('./routes/purchase_quotations'));
app.use('/satin-alma-anlasmalari', require('./routes/purchase_agreements'));
app.use('/satin-alma-siparisleri', require('./routes/purchase_orders'));
app.use('/mal-kabuller', require('./routes/goods_receipts'));
app.use('/tedarikci-irsaliyeleri', require('./routes/vendor_delivery_notes'));
app.use('/belge-yonetimi', require('./routes/belge_yonetimi'));
app.use('/uretim-emirleri', require('./routes/production_orders'));
app.use('/uretim-planlari', require('./routes/production_plans'));
app.use('/uretim-emri-tipleri', require('./routes/production_order_types'));
app.use('/stok-depo', require('./routes/item_warehouses'));
app.use('/stok-partileri', require('./routes/item_lots'));
app.use('/kk-kontrol-planlari', require('./routes/qc_control_plans'));
app.use('/kk-stok-planlari', require('./routes/qc_item_plans'));
app.use('/kk-emirleri', require('./routes/qc_orders'));
app.use('/kk-ret-nedenleri', require('./routes/qc_rejection_reasons'));
app.use('/mrp', require('./routes/mrp'));
app.use('/eposta-gonderimleri', require('./routes/email_dispatches'));
app.use('/crm-firsat-asamalari', require('./routes/crm_opportunity_stages'));
app.use('/crm-faaliyet-tipleri', require('./routes/crm_activity_types'));
app.use('/crm-adaylar', require('./routes/crm_leads'));
app.use('/crm-kontaklar', require('./routes/crm_contacts'));
app.use('/crm-firsatlar', require('./routes/crm_opportunities'));
app.use('/crm-faaliyetler', require('./routes/crm_activities'));
app.use('/crm-faaliyet-planlari', require('./routes/crm_activity_plans'));
app.use('/crm-gorevler', require('./routes/crm_tasks'));
app.use('/kod-serileri', require('./routes/number_series'));
app.use('/kategoriler', require('./routes/kategoriler'));
app.use('/countries', require('./routes/countries'));
app.use('/para-birimleri', require('./routes/currencies'));
app.use('/cities', require('./routes/cities'));
app.use('/districts', require('./routes/districts'));
app.use('/odeme-kosullari', require('./routes/payment_terms'));
app.use('/teslimat-kosullari', require('./routes/delivery_terms'));
app.use('/languages', require('./routes/languages'));
app.use('/banks', require('./routes/banks'));
app.use('/doviz-kurlari', require('./routes/exchange_rates'));
app.use('/transfer-emirleri', require('./routes/transfer_orders'));
app.use('/sayim-belgeleri', require('./routes/inventory_counts'));
app.use('/uretim-girisleri', require('./routes/production_receipts'));
app.use('/muhasebe-hesaplari', require('./routes/gl_accounts'));
app.use('/muhasebe-belgeleri', require('./routes/journal_entries'));
app.use('/mizan', require('./routes/mizan'));
app.use('/finans-country', require('./routes/finans_ulke'));
app.use('/muhasebe-donemleri', require('./routes/accounting_periods'));
app.use('/finans-raporlar', require('./routes/finans_raporlar'));
app.use('/finans-nakit', require('./routes/finans_nakit'));
app.use('/finans-vergi-kodlari', require('./routes/fin_tax_codes'));
app.use('/auth', require('./routes/auth'));
app.use('/kk-uygunsuzluklar', require('./routes/qc_nonconformances'));
app.use('/tahsilat-odemeler', require('./routes/receipts_payments'));
app.use('/cari-hareketleri', require('./routes/partner_ledger_entries'));
app.use('/fiyat-listeleri', require('./routes/price_lists'));
app.use('/kokpit', require('./routes/kokpit'));
app.use('/audit-log', require('./routes/audit_logs'));
app.use('/meta', require('./routes/meta_ekran'));
app.use('/sql-console', require('./routes/sql_console'));
app.use('/stok-rezervasyonlari', require('./routes/item_reservations'));
app.use('/stok-serileri', require('./routes/item_serials'));
app.use('/kk-capa', require('./routes/qc_capa'));
app.use('/stok-ikame', require('./routes/item_substitutes'));
app.use('/crm-ajanda', require('./routes/crm_calendar_entries'));
app.use('/hesap-belirleme-kurallari', require('./routes/account_determination_rules'));
app.use('/fatura-kontrolleri', require('./routes/fatura_kontrolleri'));
app.use('/tedarikci-degerlendirme', require('./routes/supplier_evaluations'));
app.use('/onay-durumlari', require('./routes/approval_statuses'));
app.use('/onay-rolleri', require('./routes/approval_roles'));
app.use('/onay-rotalari', require('./routes/approval_routes'));
app.use('/onay-message-sablonlari', require('./routes/approval_message_templates'));
app.use('/onay-module-kullanimlari', require('./routes/approval_module_usages'));
app.use('/onay-kurallari', require('./routes/approval_rules'));
app.use('/onay-ekranlari', require('./routes/onay_ekranlari'));
app.use('/onay-yetki-devirleri', require('./routes/approval_delegations'));
app.use('/onay-kayitlari', require('./routes/approval_records'));

const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

// Yerelde IPv6+IPv4 (::); PaaS’ta çoğunlukla 0.0.0.0 / HOST
const server = require('http').createServer(app);
const host = process.env.HOST || (process.env.DATABASE_URL ? '0.0.0.0' : '::');
const listenOpts = host === '::'
  ? { port, host: '::', ipv6Only: false }
  : { port, host };
server.listen(listenOpts, () => {
    console.log(`Sistem http://${host === '::' ? 'localhost' : host}:${port} adresinde çalışıyor.`);
    console.log(`Konsol UI: http://localhost:${port}/`);
});
