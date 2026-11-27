#!/usr/bin/env node
/**
 * Süt firması (GIDA) tam sistem kurulum / yürütme dokümanını UTF-8 HTML + PDF olarak üretir.
 *
 * Girdi:
 *   docs/sut-tam-dongu/shots.json              (capture-sut-screens.mjs)
 *   docs/sut-tam-dongu/senaryo-ozet.json        (demo-sut-tum-ekranlar.js)
 *   docs/sut-tam-dongu/ekran-aciklamalari.json
 *   docs/erp-full-cycle-test/evidence/gida-tam-dongu-ozet.json (demo-gida-tam-dongu.js)
 *   Veritabanı (kurulum tabloları için)
 *
 * Çıktı: docs/sut-tam-dongu/KTB_ERP_Sut_Tam_Dongu_Dokumani.{html,pdf}
 *
 *   PUPPETEER_CORE=/path/to/puppeteer-core node scripts/doc/build-sut-pdf.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'sut-tam-dongu');
const SHOT_DIR = path.join(OUT_DIR, 'shots');
const BASENAME = 'KTB_ERP_Sut_Tam_Dongu_Dokumani';
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const db = require(path.join(ROOT, 'db'));

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const shots = readJson('docs/sut-tam-dongu/shots.json');
const senaryo = readJson('docs/sut-tam-dongu/senaryo-ozet.json');
const aciklama = readJson('docs/sut-tam-dongu/ekran-aciklamalari.json');
const gida = readJson('docs/erp-full-cycle-test/evidence/gida-tam-dongu-ozet.json');

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (file) => (file ? pathToFileURL(path.join(SHOT_DIR, file)).href : '');
const trDate = (d) => new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
const num = (v) => (v == null ? '' : Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 3 }));
const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
  rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

async function q(sql, params = []) {
  return (await db.query(sql, params)).rows;
}

async function loadSetup(F) {
  const [company] = await q('SELECT * FROM companies WHERE id=$1', [F]);
  const plants = await q('SELECT plant_code, plant_name, address FROM plants WHERE company_id=$1 ORDER BY id', [F]);
  const warehouses = await q(
    `SELECT w.warehouse_code, w.warehouse_name, w.warehouse_role, p.plant_code
       FROM warehouses w JOIN plants p ON p.id=w.plant_id WHERE p.company_id=$1 ORDER BY w.id`, [F]);
  const items = await q(
    `SELECT item_code, item_name, uom_code, item_type, procurement_type, quality_control_required, lot_policy
       FROM items WHERE company_id=$1 AND item_code LIKE 'TEST-SUT-%' ORDER BY item_code`, [F]);
  const partners = await q(
    `SELECT partner_code, partner_name, partner_type, province FROM partners
      WHERE company_id=$1 AND COALESCE(is_deleted,false)=false ORDER BY partner_code LIMIT 20`, [F]);
  const bom = await q(
    `SELECT b.bom_code, b.bom_name, fg.item_code fg, i.item_code, i.item_name, l.quantity, l.uom_code
       FROM boms b JOIN items fg ON fg.id=b.finished_good_item_id
       JOIN bom_lines l ON l.product_bom_id=b.id JOIN items i ON i.id=l.component_item_id
      WHERE b.bom_code=$1 ORDER BY l.line_no`, [gida.base.bom]);
  const route = await q(
    `SELECT r.route_code, r.route_name, o.line_no, o.operation_code, o.operation_name, wc.center_code, o.duration_minutes
       FROM routings r JOIN routing_operations o ON o.route_id=r.id
       LEFT JOIN work_centers wc ON wc.id=o.work_center_id
      WHERE r.route_code=$1 ORDER BY o.line_no`, [gida.base.route]);
  return { company, plants, warehouses, items, partners, bom, route };
}

function gitInfo() {
  try {
    return execSync('git log -1 --format="%h %s"', { cwd: ROOT }).toString().trim();
  } catch {
    return '';
  }
}

const CSS = `
@page { size: A4; margin: 12mm 11mm 14mm 11mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans', 'DejaVu Sans', sans-serif; font-size: 9.5pt; color: #1f2937; margin: 0; }
h1 { font-size: 22pt; margin: 0 0 6mm; color: #0f3d68; }
h2 { font-size: 15pt; color: #0f3d68; border-bottom: 2px solid #0f3d68; padding-bottom: 1.5mm; margin: 0 0 4mm; }
h3 { font-size: 11.5pt; color: #0f3d68; margin: 5mm 0 2mm; }
p { margin: 0 0 2.5mm; line-height: 1.45; }
.page { page-break-after: always; }
.cover { height: 265mm; display: flex; flex-direction: column; justify-content: center; text-align: center; }
.cover .sub { font-size: 13pt; color: #374151; margin-bottom: 10mm; }
.cover .meta { font-size: 10pt; color: #4b5563; line-height: 1.8; }
.badge { display: inline-block; background: #e0ecf8; color: #0f3d68; border-radius: 3px; padding: 0.3mm 1.8mm; font-size: 8.5pt; margin-right: 1.5mm; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0 3mm; font-size: 8.5pt; }
th, td { border: 1px solid #cbd5e1; padding: 1mm 1.6mm; text-align: left; vertical-align: top; }
th { background: #eef3f8; }
ol.flow { margin: 0 0 3mm 4mm; padding-left: 4mm; line-height: 1.5; }
.toc td { border: none; border-bottom: 1px dotted #cbd5e1; }
.screen { page-break-after: always; }
.screen .hdr { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5mm; }
.screen .hdr .t { font-size: 13pt; font-weight: 700; color: #0f3d68; }
.screen .path { color: #6b7280; font-size: 8.5pt; }
.screen .desc { margin: 1mm 0 2mm; }
.shot { margin: 0 0 2mm; text-align: center; }
.shot img { width: 100%; max-height: 112mm; object-fit: contain; border: 1px solid #cbd5e1; }
.shot .cap { font-size: 8pt; color: #6b7280; margin-top: 0.6mm; }
.note { background: #fff7e6; border-left: 3px solid #f59e0b; padding: 1.5mm 2.5mm; font-size: 8.5pt; margin: 1mm 0 2mm; }
.mod-intro { page-break-after: always; }
.small { font-size: 8pt; color: #6b7280; }
`;

function screenRecordText(s) {
  if (!s.record) return '';
  return Object.values(s.record).filter(Boolean).join(' — ');
}

function flows() {
  const m = gida.man;
  const r = gida.mrp;
  const st = senaryo.steps;
  const gm = st.genisletilmis_moduller || {};
  const sa = st.satinalma_zinciri || {};
  const k = st.kalite || {};
  const up = st.uretim_planlari || {};
  const mrp = st.mrp || {};
  const ik = st.ik_tamamlayici || {};
  return `
<section class="page">
<h2>3. Uçtan Uca İş Akışları</h2>
<p>Senaryo iki veri etiketiyle yürütüldü: <b>${esc(gida.tags.BASE)}/${esc(gida.tags.MAN)}/${esc(gida.tags.MRP)}</b>
(temel satış–üretim–satınalma döngüleri) ve <b>${esc(senaryo.tag)}</b> (kalan tüm ekranları kapsayan tamamlayıcı akışlar).
Tüm belgeler aşağıdaki numaralarla sistemde kayıtlıdır ve ilgili ekranlarda bulunabilir.</p>

<h3>3.1 Siparişe göre üretim döngüsü (${esc(gida.tags.MAN)})</h3>
<ol class="flow">
<li>Satış teklifi <b>${esc(m.sales_quotation)}</b> market zinciri müşterisine Tam Yağlı Süt 1 L için hazırlandı ve siparişe çevrildi → satış siparişi <b>${esc(m.sales_order)}</b>.</li>
<li>Ambalaj eksikliği için satınalma talebi <b>${esc(m.purchase_requisition)}</b> → satınalma siparişi <b>${esc(m.purchase_order)}</b>; sipariş onay rotasından (<b>${esc(m.sa_approval)}</b>, ${esc(gida.base.sa_approval_route)}) geçti.</li>
<li>Mal kabul <b>${esc(m.goods_receipt)}</b>: GKK emri açan hareket koduyla stok Kalite/Karantina deposuna alındı, GKK onayıyla Hammadde deposuna aktarıldı.</li>
<li>İş emri <b>${esc(m.production_order)}</b> (ürün ağacı ${esc(gida.base.bom)}, rota ${esc(gida.base.route)}): operasyonlar onaylandı, malzeme tüketildi, CKK onayı sonrası mamul Mamul deposuna girdi.</li>
<li>Sevk emri <b>${esc(m.shipment)}</b> → satış irsaliyesi <b>${esc(m.delivery_note)}</b> → satış faturası <b>${esc(m.sales_invoice)}</b>; tedarikçi faturası <b>${esc(m.purchase_invoice)}</b> 3-way kontrolle eşlendi.</li>
</ol>

<h3>3.2 MRP döngüleri</h3>
<ol class="flow">
<li>${esc(gida.tags.MRP)}: satış siparişi <b>${esc(r.sales_order)}</b> + bağımsız ihtiyaç <b>${esc(r.independent_requirement)}</b> → MRP çalışması <b>${esc(r.mrp_run)}</b> → iş emri <b>${esc((r.production_from_mrp || []).join(', '))}</b> → sevk <b>${esc(r.shipment)}</b> / irsaliye <b>${esc(r.delivery_note)}</b>.</li>
<li>Kampanya: 6.000 adet bağımsız ihtiyaç <b>${esc(mrp.bagimsiz_ihtiyac)}</b> → MRP konsolunda çalışma <b>${esc(mrp.mrp_run)}</b> → satınalma talebi <b>${esc(mrp.talep)}</b> ve iş emri <b>${esc(mrp.is_emri)}</b>.</li>
</ol>
${mrp.oneriler?.length ? table(['Stok', 'Ad', 'Öneri', 'Net ihtiyaç'], mrp.oneriler.map((o) => [o.item_code, o.item_name, o.suggestion, num(o.net_requirement)])) : ''}

<h3>3.3 Üretim planlama ve ürün ağacı değişikliği</h3>
<ol class="flow">
<li>Üretim planı <b>${esc(up.plan_cevrilen)}</b> iş emri <b>${esc(up.is_emri)}</b>'ya çevrildi; <b>${esc(up.plan_acik)}</b> açık plan olarak bekliyor.</li>
<li>Malzeme değişikliği: ${esc(st.bom_malzeme_degisikligi?.bom)} ağacında kapak bileşeni <b>${esc(st.bom_malzeme_degisikligi?.ileri)}</b> ile alternatife alındı, <b>${esc(st.bom_malzeme_degisikligi?.geri)}</b> ile geri döndürüldü.</li>
<li>Stok ikame: ${esc(st.stok_ikame?.item)} → ${esc(st.stok_ikame?.ikame)}; mamul palet serileri: ${esc((st.stok_serileri || []).join(', '))}.</li>
</ol>

<h3>3.4 Satınalma kaynak bulma zinciri</h3>
<ol class="flow">
<li>Teklif isteği <b>${esc(sa.teklif_istegi)}</b> → tedarikçi teklifleri <b>${esc((sa.teklifler || []).join(', '))}</b> → onaylı teklif.</li>
<li>Çerçeve anlaşma <b>${esc(sa.anlasma)}</b> → satınalma siparişi <b>${esc(sa.siparis)}</b> → tedarikçi irsaliyesi <b>${esc(sa.tedarikci_irsaliyesi)}</b>.</li>
<li>Onay: bekleyen onay <b>${esc(st.onay?.bekleyen_onay)}</b>; yetki devri <b>${esc(st.onay?.devir)}</b>.</li>
</ol>

<h3>3.5 Kalite</h3>
<p>GKK emri <b>${esc(k.kk_emri)}</b> üzerinde tanker sıcaklığı uygunsuzluğu açıldı → CAPA <b>${esc(k.capa)}</b>.
Kontrol plan bağları: ${esc((k.plan_baglari || []).join(', '))}.</p>

<h3>3.6 CRM, Proje, Finans</h3>
<ol class="flow">
<li>CRM: aday <b>${esc(gm.crm?.lead?.code)}</b> → fırsatlar <b>${esc(gm.crm?.firsat_aday?.code)}</b>, <b>${esc(gm.crm?.firsat_musteri?.code)}</b> → faaliyet planı <b>${esc(gm.crm?.plan)}</b>, faaliyet <b>${esc(gm.crm?.faaliyet)}</b>, görev <b>${esc(gm.crm?.gorev)}</b>; fırsat satış teklifine bağlandı.</li>
<li>Proje: <b>${esc(gm.prj?.project_code)}</b> — ${esc(gm.prj?.work_items)} iş, sprint <b>${esc(gm.prj?.sprint)}</b>, risk “${esc(gm.prj?.risk)}”; işlere plan tarihleri, ilerleme ve sorumlu atandı (Gantt / Kanban / iş yükü).</li>
<li>Finans: kasa <b>${esc(gm.finans?.kasa)}</b>, banka hareketi <b>${esc(gm.finans?.banka)}</b>, tahsilat <b>${esc(gm.finans?.tahsilat)}</b>; faturalar muhasebeleştirildi → mizan, yevmiye, bilanço, gelir tablosu.</li>
</ol>

<h3>3.7 İnsan Kaynakları</h3>
<p>Personel <b>${esc((gm.hr?.employees || []).join(', '))}</b>, departmanlar ${esc((gm.hr?.departments || []).join(', '))};
izin <b>${esc(gm.hr?.izin)}</b>, bordro <b>${esc(gm.hr?.bordro)}</b>, iş ilanı <b>${esc(gm.hr?.ilan)}</b>.
Vardiyalar ${esc((ik.vardiyalar || []).join(', '))} (${esc(ik.atama)} atama), ${esc(ik.tatil)} resmî tatil,
avanslar ${esc((ik.avanslar || []).join(', '))}, zimmetler ${esc((ik.zimmetler || []).join(', '))}, işten çıkış <b>${esc(ik.isten_cikis)}</b>.</p>
</section>`;
}

function setupSection(s) {
  const c = s.company || {};
  return `
<section class="page">
<h2>2. Firma Kurulumu ve Ana Veriler</h2>
${table(['Alan', 'Değer'], [
    ['Firma', `${c.company_code} — ${c.company_name}`],
    ['Vergi dairesi / No', `${c.tax_office || ''} / ${c.tax_id || ''}`],
    ['Fonksiyonel para birimi', c.functional_currency || 'TRY'],
    ['Hesap planı', c.chart_of_accounts_code || ''],
    ['İş yeri', s.plants.map((p) => `${p.plant_code} — ${p.plant_name}`).join('; ')],
  ])}
<h3>2.1 Depolar</h3>
${table(['Kod', 'Ad', 'Rol', 'İş yeri'], s.warehouses.map((w) => [w.warehouse_code, w.warehouse_name, w.warehouse_role, w.plant_code]))}
<h3>2.2 Senaryo stok kartları</h3>
${table(['Kod', 'Ad', 'Birim', 'Tip', 'Tedarik', 'KK', 'Lot'], s.items.map((i) => [i.item_code, i.item_name, i.uom_code, i.item_type, i.procurement_type, i.quality_control_required ? 'Evet' : '', i.lot_policy]))}
<h3>2.3 Ürün ağacı ${esc(gida.base.bom)} ve rota ${esc(gida.base.route)}</h3>
${table(['Mamul', 'Bileşen', 'Ad', 'Miktar', 'Birim'], s.bom.map((b) => [b.fg, b.item_code, b.item_name, num(b.quantity), b.uom_code]))}
${table(['Sıra', 'Operasyon', 'Ad', 'İş merkezi', 'Süre (dk)'], s.route.map((o) => [o.line_no, o.operation_code, o.operation_name, o.center_code, num(o.duration_minutes)]))}
<h3>2.4 Cari kartlar</h3>
${table(['Kod', 'Ad', 'Tip', 'İl'], s.partners.map((p) => [p.partner_code, p.partner_name, p.partner_type, p.province]))}
<p class="small">Fiyat listesi: ${esc(gida.base.price_list)} · Satınalma onay rotası: ${esc(gida.base.sa_approval_route)}</p>
</section>`;
}

function introSection() {
  const i = shots.intro || {};
  return `
<section class="page">
<h2>1. Kapsam, Yöntem ve Oturum Açma</h2>
<p>Bu doküman, KTB ERP üzerinde <b>Anadolu Süt ve Süt Ürünleri A.Ş.</b> (firma kodu GIDA) için yapılan uçtan uca
sistem kurulumunu ve yürütmesini anlatır. Menüdeki <b>${shots.screens.length}</b> ekranın tamamı bu firma verisiyle kullanıldı:
her ekran için liste görünümü ve örnek bir kaydın inceleme formu gerçek arayüzden çekildi.</p>
<p>Yöntem: (1) ana veriler ve temel döngüler <code>scripts/demo-gida-tam-dongu.js</code> ile,
(2) kalan ekranların akışları <code>scripts/demo-sut-tum-ekranlar.js</code> ile REST API üzerinden yürütüldü;
(3) ekran görüntüleri <code>scripts/doc/capture-sut-screens.mjs</code> ile tarayıcıda ADMIN kullanıcısıyla oturum açılıp
firma seçici ile GIDA seçilerek alındı; (4) bu PDF <code>scripts/doc/build-sut-pdf.mjs</code> ile üretildi.</p>
<div class="shot"><img src="${img(i.userMenu)}"><div class="cap">1) Giriş öncesi kullanıcı menüsü — “Giriş yap”</div></div>
</section>
<section class="page">
<div class="shot"><img src="${img(i.login)}"><div class="cap">2) Sisteme giriş: ADMIN kullanıcısı</div></div>
<div class="shot"><img src="${img(i.companyPicker)}"><div class="cap">3) Firma seçici — Anadolu Süt ve Süt Ürünleri A.Ş. (GIDA)</div></div>
</section>
<section class="page">
<div class="shot"><img src="${img(i.home)}"><div class="cap">4) GIDA firmasıyla ana sayfa ve modül menüsü</div></div>
</section>`;
}

function screensSection() {
  const out = [];
  let mod = null;
  let modNo = 3;
  for (const s of shots.screens) {
    if (s.module !== mod) {
      mod = s.module;
      modNo += 1;
      const list = shots.screens.filter((x) => x.module === mod);
      out.push(`<section class="mod-intro"><h2>${modNo}. ${esc(s.moduleTitle)}</h2>
<p>${esc(aciklama.moduller[mod] || '')}</p>
${table(['Ekran', 'Teknik kod', 'Kayıt', 'Örnek kayıt'], list.map((x) => [x.title, x.techId, x.rowCount ?? '', screenRecordText(x)]))}
</section>`);
    }
    const desc = aciklama.ekranlar[s.id] || '';
    const msg = [s.listMessage, s.formMessage].filter(Boolean).join(' / ');
    out.push(`<section class="screen">
<div class="hdr"><span class="t">${esc(s.title)}</span><span class="path">${esc(s.moduleTitle)}${s.section ? ' › ' + esc(s.section) : ''}</span></div>
<div><span class="badge">${esc(s.techId || s.id)}</span><span class="badge">Kayıt: ${esc(s.rowCount ?? '—')}</span>${s.readOnly ? '<span class="badge">Rapor / salt okunur</span>' : ''}${s.record ? `<span class="badge">İncelenen: ${esc(screenRecordText(s))}</span>` : ''}</div>
<p class="desc">${esc(desc)}</p>
${msg ? `<div class="note">Sistem mesajı: ${esc(msg)}</div>` : ''}
${s.listShot ? `<div class="shot"><img src="${img(s.listShot)}"><div class="cap">Liste — ${esc(s.title)}</div></div>` : ''}
${s.formShot ? `<div class="shot"><img src="${img(s.formShot)}"><div class="cap">Kayıt — ${esc(screenRecordText(s) || s.title)}</div></div>` : ''}
</section>`);
  }
  return { html: out.join('\n'), lastNo: modNo };
}

function fixesSection(no) {
  const rows = [
    ['Üretim Planları', 'Kayıt/güncellemede eski "fixed" kolon adı kullanılıyordu (500). Kolon is_fixed olarak düzeltildi (API + form).'],
    ['İşten Çıkış', 'Çıkış kaydında tarih parametreleri tip hatası veriyordu; ::date dönüşümleri eklendi.'],
    ['Proje ekranları (Özet, Kanban, Backlog, Gantt, İş yükü, Bütçe)', 'Zorunlu proje filtresi sunucuya gönderilmiyordu ve nesne dönen yanıtlar listeye çevrilmiyordu; filtre queryParam yapıldı, yanıt eşleme ve Uygula butonu düzeltildi.'],
    ['Tüm listeler', 'ISO tarih/zaman değerleri ham gösteriliyordu; GG.AA.YYYY (saatli değerlerde tr-TR tarih-saat) biçimine çevrildi.'],
    ['Proje tanımları', 'Proje tür/kategori sabit kayıtları eksikti; 078 numaralı migration ile idempotent olarak geri yüklendi.'],
    ['Demo senaryosu', 'Satış siparişi API çağrısı açık transaction içindeki teklifi göremiyordu (FK 500); çağrı öncesi commit eklendi.'],
  ];
  return `<section class="page"><h2>${no}. Yürütme Sırasında Bulunan ve Düzeltilen Hatalar</h2>
${table(['Ekran / alan', 'Bulgu ve düzeltme'], rows)}
<h3>Tekrar üretme</h3>
<p><code>npm run migrate</code> → <code>node scripts/demo-gida-tam-dongu.js</code> → <code>node scripts/demo-sut-tum-ekranlar.js</code> →
<code>node scripts/doc/capture-sut-screens.mjs</code> → <code>node scripts/doc/build-sut-pdf.mjs</code></p>
${shots.jsErrors?.length ? `<div class="note">Tarayıcı JS hataları: ${esc(shots.jsErrors.join(' | '))}</div>` : '<p>Ekran çekimi boyunca tarayıcıda JavaScript hatası oluşmadı.</p>'}
</section>`;
}

function indexSection(no) {
  return `<section><h2>${no}. Ek — Ekran Dizini</h2>
${table(['#', 'Modül', 'Ekran', 'Teknik kod', 'Kayıt', 'Liste', 'Form'], shots.screens.map((s, i) => [
    i + 1, s.moduleTitle, s.title, s.techId, s.rowCount ?? '', s.listShot ? '✓' : '—', s.formShot ? '✓' : (s.readOnly ? 'rapor' : '—')]))}
</section>`;
}

function toc(lastNo) {
  const mods = [];
  let mod = null;
  let n = 3;
  for (const s of shots.screens) {
    if (s.module !== mod) {
      mod = s.module;
      n += 1;
      mods.push([`${n}.`, s.moduleTitle, shots.screens.filter((x) => x.module === mod).length + ' ekran']);
    }
  }
  return `<section class="page"><h2>İçindekiler</h2><table class="toc"><tbody>${[
    ['1.', 'Kapsam, yöntem ve oturum açma', ''],
    ['2.', 'Firma kurulumu ve ana veriler', ''],
    ['3.', 'Uçtan uca iş akışları', ''],
    ...mods,
    [`${lastNo + 1}.`, 'Bulunan ve düzeltilen hatalar', ''],
    [`${lastNo + 2}.`, 'Ek — Ekran dizini', ''],
  ].map((r) => `<tr><td style="width:12mm">${esc(r[0])}</td><td>${esc(r[1])}</td><td style="width:30mm;text-align:right">${esc(r[2])}</td></tr>`).join('')}</tbody></table></section>`;
}

async function main() {
  const F = gida.firma.id;
  const setup = await loadSetup(F);
  const withForm = shots.screens.filter((s) => s.formShot).length;
  const { html: screensHtml, lastNo } = screensSection();
  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>KTB ERP — Süt Ürünleri Tam Sistem Kurulum ve Yürütme Dokümanı</title>
<style>${CSS}</style></head><body>
<section class="page cover">
<h1>KTB ERP<br>Süt Ürünleri Firması<br>Tam Sistem Kurulumu ve Yürütmesi</h1>
<div class="sub">${esc(setup.company?.company_name)} (${esc(setup.company?.company_code)})</div>
<div class="meta">
Kapsam: ${shots.screens.length} ekran · ${shots.screens.length + withForm} ekran görüntüsü<br>
Ekran çekimi: ${esc(trDate(shots.generatedAt))} (UTC+3)<br>
Doküman: ${esc(trDate(new Date()))} (UTC+3)<br>
Sürüm: ${esc(gitInfo())}
</div>
</section>
${toc(lastNo)}
${introSection()}
${setupSection(setup)}
${flows()}
${screensHtml}
${fixesSection(lastNo + 1)}
${indexSection(lastNo + 2)}
</body></html>`;

  const htmlPath = path.join(OUT_DIR, `${BASENAME}.html`);
  const pdfPath = path.join(OUT_DIR, `${BASENAME}.pdf`);
  fs.writeFileSync(htmlPath, html, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load', timeout: 0 });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-family:'Noto Sans',sans-serif;font-size:7pt;color:#6b7280;width:100%;padding:0 11mm;display:flex;justify-content:space-between"><span>KTB ERP — Anadolu Süt ve Süt Ürünleri A.Ş. tam döngü dokümanı</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: '12mm', bottom: '14mm', left: '11mm', right: '11mm' },
    timeout: 0,
  });
  await browser.close();
  console.log(`HTML: ${path.relative(ROOT, htmlPath)}\nPDF:  ${path.relative(ROOT, pdfPath)} (${(fs.statSync(pdfPath).size / 1048576).toFixed(1)} MB)`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
