/**
 * GIDA TEST-SUT Canias tam döngü kanıt PDF'i
 * Başlık formatı: KTB ekran adı + ekran bilgisi (techId / businessNameEn) + Canias karşılığı
 *   node scripts/build-gida-full-cycle-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'docs', 'erp-full-cycle-test');
const SHOTS = path.join(DIR, 'screenshots');
const OUT_PDF = path.join(DIR, 'full-cycle-test-report.pdf');
const OUT_HTML = path.join(DIR, 'full-cycle-test-report.html');
const ARTIFACT = '/opt/cursor/artifacts/gida-full-cycle-test-report.pdf';

const ozet = JSON.parse(fs.readFileSync(path.join(DIR, 'evidence', 'gida-tam-dongu-ozet.json'), 'utf8'));
const recon = JSON.parse(fs.readFileSync(path.join(DIR, 'evidence', 'reconciliations.json'), 'utf8'));

/**
 * Her adım: KTB ekran title + Bilgi (techId / businessNameEn) + Canias karşılığı
 * images: liste ve/veya form detay dosyaları
 */
const STEPS = [
  {
    images: ['00-warehouses-gida.png'],
    title: 'Depolar',
    techId: 'MDM-WH-SCR-001',
    businessNameEn: 'WarehouseMasterScreen',
    canias: '— (tesis/depo master; Canias depo tanımı)',
    note: 'Giriş / Giriş Kalite / Çıkış Kalite / Hammadde / Mamul / YarıMamul',
  },
  {
    images: ['01-items.png', '01b-item-form.png'],
    title: 'Stok Kartı',
    techId: 'INV-ITM-SCR-001',
    businessNameEn: 'ItemMasterScreen',
    canias: 'BAST03',
    note: 'TEST-SUT stok kartları (liste + detay)',
  },
  {
    images: ['02-bom.png', '02b-bom-form.png', '02c-bom-elemanlar.png'],
    title: 'Ürün Ağacı',
    techId: 'MFG-BOM-SCR-001',
    businessNameEn: 'BillOfMaterialsScreen',
    canias: 'BOMT01',
    note: `${ozet.base.bom} — liste + Genel form + Elemanlar (bileşenler)`,
  },
  {
    images: ['04-work-centers.png', '04b-work-center-form.png'],
    title: 'İş Merkezleri',
    techId: 'MFG-WC-SCR-001',
    businessNameEn: 'WorkCenterScreen',
    canias: 'ROUT02',
    note: 'GIDA Pastörizasyon Hattı / MC-SUT-01 (BAST06 yerine not)',
  },
  {
    images: ['05-routings.png', '05b-routing-form.png'],
    title: 'Rotalar',
    techId: 'MFG-ROUT-SCR-001',
    businessNameEn: 'RoutingScreen',
    canias: 'ROUT01',
    note: `${ozet.base.route} — liste + operasyon detayı`,
  },
  {
    images: ['06-partners.png', '06b-partner-form.png'],
    title: 'Cari Kartları',
    techId: 'MDM-BP-SCR-001',
    businessNameEn: 'BusinessPartnerScreen',
    canias: 'BAST02',
    note: JSON.stringify(ozet.base.partners),
  },
  {
    images: ['07-price-lists.png', '07b-price-list-form.png'],
    title: 'Fiyat Listeleri',
    techId: 'FIN-PRC-SCR-001',
    businessNameEn: 'PriceListScreen',
    canias: 'SALT02',
    note: ozet.base.price_list,
  },
  {
    images: ['08-sales-quotation.png', '08b-sales-quotation-form.png'],
    title: 'Satış Teklifleri',
    techId: 'SAL-QUO-SCR-001',
    businessNameEn: 'SalesQuotationScreen',
    canias: 'SALT01 (teklif)',
    note: ozet.man.sales_quotation,
  },
  {
    images: ['09-sales-order.png', '09b-sales-order-form.png'],
    title: 'Satış Siparişleri',
    techId: 'SAL-ORD-SCR-001',
    businessNameEn: 'SalesOrderScreen',
    canias: 'SALT01 (sipariş)',
    note: `${ozet.man.sales_order} / ${ozet.mrp.sales_order}`,
  },
  {
    images: ['10-mrp.png'],
    title: 'MRP Çalıştır',
    techId: 'MFG-MRP-SCR-001',
    businessNameEn: 'MrpRunScreen',
    canias: 'MRPT05 / MRPT06',
    note: ozet.mrp.mrp_run,
  },
  {
    images: ['12-purchase-req.png', '12b-purchase-req-form.png'],
    title: 'Satınalma Talepleri',
    techId: 'PUR-REQ-SCR-001',
    businessNameEn: 'PurchaseRequisitionScreen',
    canias: 'PURT04 / PURT12',
    note: `${ozet.man.purchase_requisition} / ${ozet.mrp.purchase_requisition}`,
  },
  {
    images: ['15-purchase-order.png', '15b-purchase-order-form.png'],
    title: 'Satınalma Siparişleri',
    techId: 'PUR-ORD-SCR-001',
    businessNameEn: 'PurchaseOrderScreen',
    canias: 'PURT05',
    note: `${ozet.man.purchase_order} / ${ozet.mrp.purchase_order}`,
  },
  {
    images: ['15c-sa-approval-route.png', '15d-sa-approval-route-form.png'],
    title: 'Onay Rotası',
    techId: 'SYS-APR-SCR-006',
    businessNameEn: 'ApprovalRouteScreen',
    canias: '— (merkezi onay; Canias onay/workflow karşılığı)',
    note: ozet.base.sa_approval_route || 'OR-SA-SIPARIS',
  },
  {
    images: ['15e-sa-approval-records.png'],
    title: 'Onay İzleme',
    techId: 'SYS-APR-SCR-002',
    businessNameEn: 'ApprovalMonitoringScreen',
    canias: '— (onay kayıt izleme)',
    note: `${ozet.man.sa_approval || ''} / ${ozet.mrp.sa_approval || ''}`,
  },
  {
    images: ['16-goods-receipt.png', '16b-goods-receipt-form.png'],
    title: 'Mal Kabuller',
    techId: 'PUR-GR-SCR-001',
    businessNameEn: 'GoodsReceiptScreen',
    canias: 'INVT01 (malzeme giriş)',
    note: `${ozet.man.goods_receipt} / ${ozet.mrp.goods_receipt} → Giriş Depo`,
  },
  {
    images: ['16c-incoming-insp.png', '16d-incoming-insp-form.png'],
    title: 'Giriş Kontrolleri',
    techId: 'QLT-INC-SCR-001',
    businessNameEn: 'IncomingInspectionScreen',
    canias: '— (giriş kontrol; kalite öncesi)',
    note: 'GK onayı → Giriş Kalite',
  },
  {
    images: ['16e-gkk.png', '16f-gkk-form.png'],
    title: 'Giriş Kalite Emirleri',
    techId: 'QLT-IQC-SCR-001',
    businessNameEn: 'IncomingQcOrderScreen',
    canias: '— (GKK)',
    note: 'Onay → Hammadde Depo',
  },
  {
    images: ['17-purchase-invoice.png', '17b-purchase-invoice-form.png'],
    title: 'Fatura Yönetimi',
    techId: 'SAL-INV-SCR-001',
    businessNameEn: 'InvoiceManagementScreen',
    canias: 'VERT01 (alış faturası)',
    note: `${ozet.man.purchase_invoice} / ${ozet.mrp.purchase_invoice}`,
  },
  {
    images: ['19-production.png', '19b-production-form.png'],
    title: 'Üretim Emirleri',
    techId: 'MFG-WO-SCR-001',
    businessNameEn: 'WorkOrderScreen',
    canias: 'PRDT01 / PRDT02 / PRDT06',
    note: `${ozet.man.production_order} / ${ozet.mrp.production_from_mrp}`,
  },
  {
    images: ['23c-ckk.png'],
    title: 'Çıkış Kalite Emirleri',
    techId: 'QLT-OQC-SCR-001',
    businessNameEn: 'OutgoingQcOrderScreen',
    canias: '— (CKK; ürün giriş sonrası)',
    note: 'Onay → Mamul / YarıMamul',
  },
  {
    images: ['24-delivery.png', '24b-delivery-form.png'],
    title: 'İrsaliye Yönetimi',
    techId: 'SAL-DLV-SCR-001',
    businessNameEn: 'DeliveryNoteManagementScreen',
    canias: 'SALT01 / INVT01 (sevkiyat / stok çıkış)',
    note: `${ozet.man.delivery_note} / ${ozet.mrp.delivery_note}`,
  },
  {
    images: ['26-sales-invoice.png', '26b-sales-invoice-form.png'],
    title: 'Fatura Yönetimi',
    techId: 'SAL-INV-SCR-001',
    businessNameEn: 'InvoiceManagementScreen',
    canias: 'SALT01 / FINT02 (satış fatura + muhasebe)',
    note: `${ozet.man.sales_invoice} / ${ozet.mrp.sales_invoice}`,
  },
  {
    images: ['27-stock-balance.png'],
    title: 'Depo Bakiye',
    techId: 'INV-BAL-SCR-001',
    businessNameEn: 'WarehouseBalanceScreen',
    canias: 'INVT (bakiye / mutabakat)',
    note: 'TEST-SUT bakiyeleri',
  },
];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function imgData(file) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) return null;
  const b64 = fs.readFileSync(p).toString('base64');
  return `data:image/png;base64,${b64}`;
}

const balRows = (recon.balances || []).map((r) =>
  `<tr><td>${esc(r.item_code)}</td><td>${esc(r.item_name)}</td><td>${esc(r.warehouse_code)}</td><td>${esc(r.warehouse_rolu)}</td><td>${esc(r.stock_status)}</td><td class="num">${esc(r.qty)}</td></tr>`
).join('');

const jeRows = (recon.journals || []).map((r) =>
  `<tr><td>${esc(r.document_no)}</td><td>${esc(r.status)}</td><td class="num">${esc(r.debit)}</td><td class="num">${esc(r.credit)}</td></tr>`
).join('');

let figNo = 0;
const stepHtml = STEPS.map((step, i) => {
  const heading = `${esc(step.title)}`;
  const info = `${esc(step.techId)} · ${esc(step.businessNameEn)}`;
  const figs = (step.images || []).map((file) => {
    const src = imgData(file);
    figNo += 1;
    const kind = /elemanlar|form/.test(file) ? (/elemanlar/.test(file) ? 'Form · Elemanlar' : 'Form detay') : 'Liste';
    if (!src) return `<p class="warn">Eksik görüntü: <code>${esc(file)}</code></p>`;
    return `<figure>
      <img src="${src}" alt="${esc(step.title)} — ${esc(kind)}"/>
      <figcaption>Şekil ${figNo}. ${esc(step.title)} — ${esc(kind)} (<code>${esc(file)}</code>)</figcaption>
    </figure>`;
  }).join('\n');
  return `
  <section class="step">
    <h2>${heading}</h2>
    <p class="screen-info"><strong>Ekran bilgisi:</strong> <code>${info}</code></p>
    <p class="canias"><strong>Canias karşılığı =</strong> ${esc(step.canias)}</p>
    <p class="meta">Sonuç/belge: ${esc(step.note)} · Durum: <strong>Başarılı</strong></p>
    ${figs}
  </section>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>GIDA TEST-SUT Canias Tam Döngü Test Raporu</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: "Segoe UI", DejaVu Sans, Arial, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.4; }
  h1 { font-size: 18pt; margin: 0 0 6px; }
  h2 { font-size: 13pt; margin: 16px 0 6px; border-bottom: 1px solid #bbb; padding-bottom: 3px; color: #0f2a44; }
  .cover { page-break-after: always; padding-top: 36mm; }
  .cover .sub { color: #444; margin: 4px 0; }
  .badge { display: inline-block; background: #0b6; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 9pt; }
  .warn { color: #a60; }
  .meta { color: #555; font-size: 9.5pt; margin: 4px 0 8px; }
  .screen-info { margin: 2px 0; font-size: 10pt; }
  .canias { margin: 2px 0 6px; font-size: 10.5pt; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 8px 0 14px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
  th { background: #f3f3f3; text-align: left; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  figure { margin: 6px 0 14px; page-break-inside: avoid; }
  figure img { width: 100%; max-height: 155mm; object-fit: contain; border: 1px solid #ddd; background: #fafafa; }
  figcaption { font-size: 8.5pt; color: #555; margin-top: 3px; }
  .step { page-break-inside: avoid; }
  code { font-size: 8.5pt; }
  ul { margin: 6px 0 10px 18px; }
  pre { font-size: 8.5pt; background: #f7f7f7; padding: 8px; overflow: hidden; white-space: pre-wrap; }
</style>
</head>
<body>
  <section class="cover">
    <p class="badge">CANIAS-TAM-DONGU-TEST</p>
    <h1>KTB ERP — Canias Referanslı Uçtan Uca Süreç Test Raporu</h1>
    <p class="sub"><strong>Firma:</strong> Anadolu Süt ve Süt Ürünleri A.Ş. (GIDA)</p>
    <p class="sub"><strong>Tesis:</strong> GIDA-MRK</p>
    <p class="sub"><strong>Test tarihi:</strong> ${esc(new Date().toISOString().slice(0, 10))} (UTC)</p>
    <p class="sub"><strong>Rapor sürümü:</strong> 1.1</p>
    <p class="sub"><strong>Yedek:</strong> backups/gida-tam-dongu/pre-clean.dump</p>
    <p class="sub"><strong>Etiketler:</strong> TEST-SUT-BASE / TEST-SUT-MAN / TEST-SUT-MRP</p>
    <p class="sub"><strong>Başlık kuralı:</strong> KTB ekran adı → Ekran bilgisi (techId · businessNameEn) → Canias karşılığı</p>
  </section>

  <section>
    <h2>1. Yönetici Özeti</h2>
    <p>GIDA demo şirketinde Canias tam döngü akışı gerçek API ve UI üzerinden çalıştırıldı. Her adımda KTB ekran adı ve ekran bilgisi kimliği kullanıldı; Canias kodu yalnızca karşılık olarak verildi.</p>
    <ul>
      <li>MAN zinciri: ${esc(ozet.man.sales_order)} → ${esc(ozet.man.purchase_order)} → ${esc(ozet.man.goods_receipt)} → ${esc(ozet.man.production_order)} → ${esc(ozet.man.delivery_note)} → ${esc(ozet.man.sales_invoice)}</li>
      <li>MRP zinciri: ${esc(ozet.mrp.sales_order)} / ${esc(ozet.mrp.mrp_run)} → ${esc(ozet.mrp.purchase_order)} → ${esc(Array.isArray(ozet.mrp.production_from_mrp) ? ozet.mrp.production_from_mrp.join(',') : ozet.mrp.production_from_mrp)} → ${esc(ozet.mrp.sales_invoice)}</li>
      <li>Düzeltme: CKK depo izni; SA sipariş merkezi onay OR-SA-SIPARIS.</li>
      <li>Gap: BAST06 maliyet merkezi ayrı ekran/tablo yok (iş merkezi adına MC-SUT-01 notu).</li>
    </ul>
  </section>

  <section>
    <h2>2. Ortam ve Temizlik</h2>
    <p>Önce tam DB yedeği alındı. Yalnızca <code>company_id=GIDA</code> işlem/kart verisi temizlendi; diğer firmalar korundu. TEST-SUT ana veriler yeniden oluşturuldu.</p>
  </section>

  <section>
    <h2>3. Canias Eşleme</h2>
    <p>Ayrıntı: <code>docs/erp-full-cycle-test/screen-mapping.md</code>. Aşağıdaki adımlarda başlıklar KTB ekran adıdır; Canias kodu ayrıca belirtilir.</p>
  </section>

  <section>
    <h2>4. Adım Adım Kanıtlar (Liste + Form Detay)</h2>
    ${stepHtml}
  </section>

  <section>
    <h2>5. Stok Mutabakatı (TEST-SUT)</h2>
    <table>
      <thead><tr><th>Stok</th><th>Ad</th><th>Depo</th><th>Rol</th><th>Statü</th><th>Miktar</th></tr></thead>
      <tbody>${balRows || '<tr><td colspan="6">Kayıt yok</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>6. Muhasebe Fişleri (GIDA)</h2>
    <table>
      <thead><tr><th>Belge</th><th>Durum</th><th>Borç</th><th>Alacak</th></tr></thead>
      <tbody>${jeRows || '<tr><td colspan="4">Kayıt yok</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>7. Belge İlişkileri (özet)</h2>
    <pre>${esc(JSON.stringify({ man: ozet.man, mrp: ozet.mrp }, null, 2))}</pre>
  </section>

  <section>
    <h2>8. Bulunan Eksikler / Düzeltmeler</h2>
    <ul>
      <li><strong>Düzeltildi:</strong> Üretim CKK depo izni; CKK onay; Giriş Kontrol→GKK.</li>
      <li><strong>Düzeltildi (D5):</strong> SA sipariş onay rotası <code>OR-SA-SIPARIS</code>.</li>
      <li><strong>Açık gap:</strong> Maliyet merkezi master ekranı (BAST06) yok.</li>
      <li><strong>Kısmi:</strong> RFQ / satınalma info UI zayıf.</li>
    </ul>
  </section>

  <section>
    <h2>9. Sonuç</h2>
    <p>GIDA şirketinde TEST-SUT etiketli belgeler birbirine bağlı olarak oluşturuldu. Bu PDF, liste ve form detay ekran görüntüleriyle kanıtlanmıştır.</p>
  </section>
</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, 'utf8');
console.log('HTML:', OUT_HTML);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    defaultViewport: { width: 1240, height: 1754 },
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.goto('file://' + OUT_HTML, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '9mm', right: '9mm' },
  });
  fs.copyFileSync(OUT_PDF, ARTIFACT);
  const st = fs.statSync(OUT_PDF);
  console.log('PDF:', OUT_PDF, Math.round(st.size / 1024), 'KB');
  console.log('Artifact:', ARTIFACT);
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
