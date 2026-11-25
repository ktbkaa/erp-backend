/**
 * KTB ERP — Sistem Tanıtım + Ekran Kullanım Kılavuzu + Sınama Raporu PDF
 * Önkoşul: sinama-full-audit + capture-kilavuz-shots
 *   node scripts/build-sistem-kilavuz-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'kilavuz', 'shots');
const EV = path.join(ROOT, 'docs', 'kilavuz', 'evidence');
const OUT_DIR = path.join(ROOT, 'docs', 'kilavuz');
const ART = '/opt/cursor/artifacts/kilavuz';

function readJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function img(file) {
  const p = path.join(SHOT, file);
  if (!fs.existsSync(p)) return '';
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const audit = readJson(path.join(EV, 'sinama-audit.json'), { firms: [], summary: {} });
const inv = readJson(path.join(EV, 'screens-inventory.json'), { modules: [], screens: [] });
const capture = readJson(path.join(SHOT, 'capture-manifest.json'), readJson(path.join(EV, 'capture-manifest.json'), { manifest: [] }));
const qaSmoke = (() => {
  const p = path.join(ROOT, 'docs', 'qa', 'api-smoke-results.json');
  return readJson(p, null);
})();

const firmaLabel = capture?.firma
  ? `${capture.firma.company_code} — ${capture.firma.company_name}`
  : 'MARVEL / DEMO';

const nowTr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

function moduleBlocks() {
  const byMod = {};
  for (const s of inv.screens || []) {
    const m = s.module || '?';
    byMod[m] = byMod[m] || [];
    byMod[m].push(s);
  }
  return Object.entries(byMod).map(([mod, screens]) => `
    <section class="page-break">
      <div class="eyebrow">Modül</div>
      <h2>${esc(mod)}</h2>
      <p class="lead">${screens.length} ekran. Liste → Yeni / İncele / Düzelt / Kopyala / Sil; formda master + detay sekmeleri.</p>
      <table class="grid">
        <thead><tr><th>Ekran</th><th>Teknik ID</th><th>Endpoint</th><th>Ne işe yarar?</th></tr></thead>
        <tbody>
          ${screens.map((s) => `<tr>
            <td><b>${esc(s.title)}</b><div class="mono">${esc(s.id)}</div></td>
            <td class="mono">${esc(s.techId)}</td>
            <td class="mono">${esc(s.endpoint || '—')}</td>
            <td>${esc(s.en || '')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </section>`).join('');
}

function shotSection(file, title, lead, bullets) {
  const src = img(file);
  return `
  <section class="page-break">
    <div class="eyebrow">Ekran tanıtımı</div>
    <h2>${esc(title)}</h2>
    <p class="lead">${esc(lead)}</p>
    ${src ? `<figure class="shot"><img src="${src}" alt="${esc(title)}"/></figure>` : '<p class="muted">Görüntü alınamadı.</p>'}
    ${bullets?.length ? `<ul class="talk">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
  </section>`;
}

function auditTables() {
  return (audit.firms || []).map((f) => {
    const errs = f.endpoints.filter((e) => !e.ok);
    const empty = f.endpoints.filter((e) => e.empty);
    const ok = f.endpoints.filter((e) => e.ok && !e.empty);
    const flows = f.flows || [];
    return `
    <section class="page-break">
      <div class="eyebrow">Sınama — firma</div>
      <h2>${esc(f.code)} — ${esc(f.name)}</h2>
      <div class="stats">
        <div class="stat ok"><b>${ok.length}</b><span>verili OK</span></div>
        <div class="stat empty"><b>${empty.length}</b><span>boş</span></div>
        <div class="stat err"><b>${errs.length}</b><span>hata</span></div>
        <div class="stat"><b>${flows.filter((x) => x.ok).length}/${flows.length}</b><span>akış</span></div>
      </div>
      <h3>Süreç kontrolleri</h3>
      <table class="grid">
        <thead><tr><th>Akış</th><th>Sonuç</th><th>Detay</th></tr></thead>
        <tbody>
          ${flows.map((fl) => `<tr>
            <td>${esc(fl.name)}</td>
            <td class="${fl.ok ? 'ok' : 'bad'}">${fl.ok ? 'OK' : 'FAIL'}</td>
            <td class="mono small">${esc(JSON.stringify(fl.detail || {}).slice(0, 140))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${errs.length ? `
      <h3>Hatalı endpoint’ler</h3>
      <table class="grid">
        <thead><tr><th>Path</th><th>HTTP</th><th>Hata</th></tr></thead>
        <tbody>
          ${errs.map((e) => `<tr><td class="mono">${esc(e.path)}</td><td>${e.status}</td><td class="small">${esc(JSON.stringify(e.hata).slice(0, 120))}</td></tr>`).join('')}
        </tbody>
      </table>` : '<p class="ok">Endpoint hatası yok.</p>'}
      <h3>Modül doluluk (verili / boş)</h3>
      <table class="grid">
        <thead><tr><th>Modül</th><th>OK</th><th>Boş</th><th>Hata</th></tr></thead>
        <tbody>
          ${Object.entries(f.endpoints.reduce((acc, e) => {
            acc[e.mod] = acc[e.mod] || { ok: 0, empty: 0, err: 0 };
            if (!e.ok) acc[e.mod].err += 1;
            else if (e.empty) acc[e.mod].empty += 1;
            else acc[e.mod].ok += 1;
            return acc;
          }, {})).map(([m, v]) => `<tr><td>${esc(m)}</td><td>${v.ok}</td><td>${v.empty}</td><td>${v.err}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>`;
  }).join('');
}

function gapMatrix() {
  const rows = [
    ['Para birimi API', 'Düzeltildi (audit v2: /para-birimleri)', 'OK'],
    ['Depo bakiye API', 'Düzeltildi (/stok-bakiyeleri)', 'OK'],
    ['KK cihaz/kalibrasyon', '/kk-kalite/cihazlar|kalibrasyonlar', 'OK'],
    ['İK ilan / bordro', '/hr-ise-alim/ilanlar, /hr-bordro/calismalar', 'OK'],
    ['Onay rota / lisans', '/onay-rotalari, /lisanslar', 'OK'],
    ['TEKS / ELEK demo seed', 'demo-teks / demo-elek TypeError (seedBase)', 'GAP'],
    ['MARVEL GKK lot engeli', 'Lotlu bakiyede lotsuz çıkış (BUG-008 notu)', 'BİLİNEN'],
    ['MARVEL onay akışı', 'screen_id/rule_id/route_id gerekli uyarısı', 'BİLİNEN'],
    ['Fason / finans boş firmalar', 'MARVEL’de fason+nakit boş; DEMO’da fason boş', 'VERİ'],
    ['Üretim önizleme + aktarılan', 'DEMO/GIDA/MARVEL flow OK (consumed/remaining/transfer)', 'OK'],
    ['BOM patlatma', 'Verili firmalarda OK', 'OK'],
    ['HR personel (MARVEL)', '521 kayıt (sim)', 'OK'],
  ];
  return `
  <section class="page-break">
    <div class="eyebrow">Bulgular</div>
    <h2>Gap / durum matrisi</h2>
    <table class="grid">
      <thead><tr><th>Konu</th><th>Gözlem</th><th>Durum</th></tr></thead>
      <tbody>
        ${rows.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td class="${c === 'OK' ? 'ok' : c === 'GAP' ? 'bad' : ''}">${esc(c)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP — Sistem Tanıtım, Kullanım Kılavuzu ve Sınama Raporu</title>
<style>
  @page { size: A4; margin: 12mm 11mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "DejaVu Sans", "Segoe UI", sans-serif; color: #15202b; font-size: 9.5pt; line-height: 1.4; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 8pt; color: #0a3d34; }
  h2 { font-size: 14pt; margin: 0 0 6pt; color: #0a3d34; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 10pt 0 4pt; color: #1a4a40; }
  p { margin: 0 0 7pt; }
  .cover { min-height: 250mm; padding: 28pt; background: linear-gradient(160deg,#dceee8 0%,#f4f8f7 45%,#fff 100%); border: 1px solid #b9d0c8; border-radius: 10pt; display:flex; flex-direction:column; justify-content:center; }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 8pt; color: #5a6a78; margin-bottom: 5pt; font-weight: 650; }
  .sub { font-size: 11.5pt; color: #334155; margin: 0 0 14pt; max-width: 92%; }
  .pill { display:inline-block; background:#0c7c69; color:#fff; padding:3pt 10pt; border-radius:999pt; font-size:8.5pt; margin:0 5pt 5pt 0; }
  .pill.b { background:#1a5f8a; }
  .pill.c { background:#6b5b2e; }
  .meta { font-size: 9pt; color: #5a6a78; margin-top: 18pt; }
  .page-break { page-break-before: always; }
  .lead { color: #3a4654; }
  .shot { margin: 6pt 0 8pt; border: 1px solid #c9d4de; border-radius: 6pt; overflow: hidden; background: #eef2f5; }
  .shot img { width: 100%; display: block; }
  .talk { margin: 4pt 0 8pt 16pt; padding: 0; }
  .talk li { margin-bottom: 3pt; }
  table.grid { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 8.2pt; }
  table.grid th, table.grid td { border: 1px solid #d5dde6; padding: 3.5pt 5pt; vertical-align: top; text-align: left; }
  table.grid th { background: #e8f3ef; color: #0a3d34; }
  .mono { font-family: ui-monospace, DejaVu Sans Mono, monospace; font-size: 7.8pt; }
  .small { font-size: 7.6pt; color: #445; }
  .muted { color: #778; }
  .ok { color: #0a6b4a; font-weight: 650; }
  .bad { color: #a11; font-weight: 650; }
  .stats { display: flex; gap: 8pt; margin: 8pt 0 12pt; }
  .stat { flex: 1; border: 1px solid #c9d4de; border-radius: 6pt; padding: 8pt; text-align: center; background: #f7faf9; }
  .stat b { display: block; font-size: 16pt; color: #0a3d34; }
  .stat span { font-size: 8pt; color: #5a6a78; }
  .stat.ok b { color: #0a6b4a; }
  .stat.empty b { color: #8a6a20; }
  .stat.err b { color: #a11; }
  .toc li { margin: 3pt 0; }
  .box { border: 1px solid #c9d4de; border-radius: 6pt; padding: 10pt 12pt; background: #f8fbfa; margin: 8pt 0; }
</style>
</head>
<body>

<section class="cover">
  <div class="eyebrow">KTB ERP</div>
  <h1>Sistem Tanıtım<br/>Ekran Kullanım Kılavuzu<br/>ve Sınama Raporu</h1>
  <p class="sub">Baştan sona API + UI sınaması sonrası üretilen resmi kılavuz. Kabuk, ortak liste/form davranışları, 13 modül / ${inv.screens?.length || '—'} ekran envanteri, örnek ekran görüntüleri ve firma bazlı sınama bulguları.</p>
  <div>
    <span class="pill">Tanıtım</span>
    <span class="pill b">Kullanım kılavuzu</span>
    <span class="pill c">Sınama raporu</span>
  </div>
  <div class="meta">
    Tarih: ${esc(nowTr)} (Europe/Istanbul)<br/>
    Görüntü firması: ${esc(firmaLabel)}<br/>
    Audit: ok=${audit.summary?.ok ?? '—'} · empty=${audit.summary?.empty ?? '—'} · error=${audit.summary?.error ?? '—'} · flowOk=${audit.summary?.flowOk ?? '—'} / fail=${audit.summary?.flowFail ?? '—'}<br/>
    Capture: ${(capture.manifest || []).filter((m) => m.ok).length}/${(capture.manifest || []).length || capture.ok + '/' + capture.total || '—'} ekran
  </div>
</section>

<section class="page-break">
  <div class="eyebrow">İçindekiler</div>
  <h2>Bu dokümanda neler var?</h2>
  <ol class="toc">
    <li>Sistemin kendisi — ne işe yarar, nasıl düşünülür</li>
    <li>Kabuk ve ortak kullanım (menü, sekmeler, liste, form)</li>
    <li>Modül ve ekran envanteri (${inv.modules?.length || 13} modül)</li>
    <li>Örnek ekran tanıtımları (görüntülü)</li>
    <li>Sınama raporu (firma bazlı)</li>
    <li>Gap / durum matrisi</li>
  </ol>
  <div class="box">
    <b>Demo giriş:</b> kullanıcı <span class="mono">kagantalha.b</span> · uygulama <span class="mono">http://localhost:3000</span><br/>
    Üst bardan <b>firma seçici</b> ile şirket değiştirilir; tüm işlemler <span class="mono">X-Firma-Id</span> ile izole edilir.
  </div>
</section>

<section class="page-break">
  <div class="eyebrow">1 · Sistem</div>
  <h2>KTB ERP ne yapar?</h2>
  <p class="lead">Tek bir web kabuğunda ana veri, stok, satınalma, satış, üretim, kalite, MRP, finans, CRM, proje, İK ve onay süreçlerini yöneten çok firmalı ERP.</p>
  <ul class="talk">
    <li><b>Ana veri:</b> firma, iş yeri, depo, ölçü, para, numaratör, kategori.</li>
    <li><b>Ticari:</b> cari, stok kartı, SA talep→teklif→sipariş→mal kabul, satış teklif→sipariş→sevk→irsaliye→fatura.</li>
    <li><b>Üretim:</b> BOM, rota, iş merkezi, üretim emri, operasyonel üretim girişi, fason, yan ürün.</li>
    <li><b>Kalite:</b> GKK/ÇKK emirleri, uygunsuzluk, CAPA, cihaz/kalibrasyon.</li>
    <li><b>Planlama:</b> MRP konsol, bağımsız ihtiyaç, sonuçlar, hareket raporu.</li>
    <li><b>Destek:</b> CRM, proje/iş, İK (personel–bordro–işe alım), onay rotaları, lisans, audit.</li>
  </ul>
  <h3>Tipik uçtan uca akış</h3>
  <p>Satış siparişi → (MRP) satınalma / üretim emri → mal kabul / üretim girişi → GKK/ÇKK → sevk → irsaliye → fatura → tahsilat.</p>
</section>

<section class="page-break">
  <div class="eyebrow">2 · Kabuk</div>
  <h2>Ortak kullanım kuralları</h2>
  <h3>Sol menü ve arama</h3>
  <ul class="talk">
    <li>Modül grupları altında ekranlar; ☰ ile menü daraltılır.</li>
    <li>Üst arama kutusu ≥3 karakterde ekran bulur.</li>
  </ul>
  <h3>Liste</h3>
  <ul class="talk">
    <li>Yeşil şerit + aksiyon çubuğu: Yeni / İncele / Düzelt / Kopyala / Sil.</li>
    <li>Filtre: Eşit / Eşit değil / Arasında / İçerir · Uygula / Temizle.</li>
    <li>Üst belge sekmeleri: her form ayrı sekme; × ile kapanır.</li>
  </ul>
  <h3>Form</h3>
  <ul class="talk">
    <li>Master (üst) sabit; detay sekmeleri (kalem, adres, rota…).</li>
    <li>Kod alanları numaratörden gelir; İncele’de tüm alanlar kilitli.</li>
    <li>Kaydet sonrası ilgili liste yenilenir; bağlam toolbar ile bağlı belgelere geçilir.</li>
  </ul>
</section>

${shotSection('00-ana-sayfa.png', 'Ana sayfa / kabuk', 'Sol menü, firma seçici, kullanıcı çipi ve belge sekmeleri.', [
  'Firma seçici ile MARVEL / DEMO / GIDA vb. arasında geçiş.',
  'Ekranlar menüden veya aramadan açılır.',
])}

${shotSection('02-cari-liste.png', 'Cari kartları (liste)', 'Müşteri / tedarikçi ana verisi.', [
  'Filtre + satır seçimi sonrası İncele / Düzelt.',
])}

${shotSection('03-cari-form.png', 'Cari kart formu', 'Master bilgiler, adres ve kategori sekmeleri.', [
  'Firma kapsamlı; kategori 1–20 alanları desteklenir.',
])}

${shotSection('05-stok-form.png', 'Stok kartı', 'Mamul / yarı mamul / hammadde tanımı.', [
  'Ölçü birimi, vergi, depo varsayılanları, planlama parametreleri.',
])}

${shotSection('06-depo-bakiye.png', 'Depo bakiyeleri', 'Stok × depo görünümü (salt okunur özet).', [
  'Yalnızca İncele mantıklıdır; hareket için Stok Hareketleri kullanılır.',
])}

${shotSection('09-sa-siparis-form.png', 'Satınalma siparişi', 'Tedarikçiye verilen sipariş; mal kabulün kaynağı.', [
  'Kalemler, teslim tarihi, tolerans; mal kabule bağlanır.',
])}

${shotSection('12-satis-siparis-form.png', 'Satış siparişi', 'Müşteri siparişi; sevk / üretim / MRP tetikleyicisi.', [
  'Kalemler, adres, notlar; iş emri ve sevk emrine bağlanabilir.',
])}

${shotSection('14-bom-form.png', 'Ürün ağacı (BOM)', 'Mamul reçetesi; patlatma ile çok seviyeli ihtiyaç.', [
  'Yan ürün satırları üretim girişinde önerilir.',
])}

${shotSection('15-bom-patlatma.png', 'BOM patlatma', 'Ağacı miktara göre patlatır; MRP / planlama girdisi.', [
  'Liste ekranı; agac_id + quantity ile sonuç üretir.',
])}

${shotSection('18-isemri-form.png', 'Üretim / iş emri', 'Planlanan miktar, malzemeler (tüketilen/kalan), rota (aktarılan).', [
  'Malzeme: planned / consumed / remaining.',
  'Rota: transferred_quantity ile operasyon aktarımı.',
  'Üretim girişi önizlemesi malzemeleri ve yan ürünleri hazırlar.',
])}

${shotSection('19-uretim-giris.png', 'Operasyonel üretim girişi', 'Operasyona miktar bildirimi; stok tüketimi / üretilen.', [
  'Önizleme endpoint’i ile kalan op miktarı ve malzeme listesi.',
])}

${shotSection('20-fason.png', 'Fason siparişleri', 'Dış operasyon sipariş / sevkiyat / teslim.', [
  'Parametre ve fiyat tarifeleri ile yönetilir; enableWhen ile koşullu alanlar.',
])}

${shotSection('21-gkk.png', 'Giriş kalite emirleri (GKK)', 'Mal kabul sonrası giriş kalite.', [
  'Onay / red; uygunsuzluk ve CAPA’ya bağlanabilir.',
])}

${shotSection('22-ckk.png', 'Çıkış kalite emirleri (ÇKK)', 'Sevk öncesi çıkış kalite.', [
  'Lot zorunluluğu olan stoklarda lot seçimi gerekir.',
])}

${shotSection('23-mrp.png', 'MRP konsol', 'İhtiyaç netleştirme çalıştırmaları.', [
  'Bağımsız ihtiyaç + satış siparişlerinden SA talep / iş emri önerisi.',
])}

${shotSection('24-irsaliye.png', 'Satış irsaliyeleri', 'Sevk edilen malın lojistik belgesi.', [
  'e-İrsaliye alanları; faturaya dönüştürülür.',
])}

${shotSection('25-fatura.png', 'Satış faturaları', 'Ticari faturalama; KDV / e-belge.', [
  'Tahsilat ekranına bağlanır.',
])}

${shotSection('26-crm.png', 'CRM fırsatlar', 'Aday → fırsat → faaliyet → satış siparişi.', [])}

${shotSection('27-prj.png', 'Projeler', 'Proje / iş / ekip atama.', [])}

${shotSection('28-hr.png', 'İK personel', 'Personel kartları, org, bordro, işe alım.', [])}

${shotSection('29-finans.png', 'Tahsilat ve ödemeler', 'Cari nakit hareketleri.', [])}

${shotSection('30-onay.png', 'Onaylarım', 'Bekleyen onaylar; rota / kural tanımlı belgeler.', [])}

${moduleBlocks()}

<section class="page-break">
  <div class="eyebrow">5 · Sınama</div>
  <h2>Sınama özeti</h2>
  <p class="lead">Başlangıç: ${esc(audit.started || '')} · Bitiş: ${esc(audit.finished || '')}</p>
  <div class="stats">
    <div class="stat ok"><b>${audit.summary?.ok ?? 0}</b><span>verili OK</span></div>
    <div class="stat empty"><b>${audit.summary?.empty ?? 0}</b><span>boş (veri yok)</span></div>
    <div class="stat err"><b>${audit.summary?.error ?? 0}</b><span>HTTP hata</span></div>
    <div class="stat"><b>${audit.summary?.flowOk ?? 0}/${(audit.summary?.flowOk || 0) + (audit.summary?.flowFail || 0)}</b><span>akış OK</span></div>
  </div>
  <p>Not: İlk audit turunda 8 endpoint yolu yanlış yazılmıştı (404). Script düzeltildi; gap matrisinde doğru yollar işaretlendi. TEKS/ELEK demo seed bu ortamda TypeError verdiği için bu firmalar boş kaldı — MARVEL / DEMO / GIDA / XELEK üzerinden doğrulandı.</p>
  ${qaSmoke ? `<p>QA smoke: status dosyası mevcut (<span class="mono">docs/qa/api-smoke-results.json</span>).</p>` : '<p>QA smoke sonuç dosyası henüz yok / bu derlemede yok.</p>'}
</section>

${auditTables()}
${gapMatrix()}

<section class="page-break">
  <div class="eyebrow">Kapanış</div>
  <h2>Nasıl yeniden üretilir?</h2>
  <div class="box mono">
    node scripts/sinama-full-audit.js<br/>
    node scripts/capture-kilavuz-shots.js<br/>
    node scripts/build-sistem-kilavuz-pdf.js<br/>
    npm run qa:smoke
  </div>
  <p>Çıktılar: <span class="mono">docs/kilavuz/</span> altında PDF, MD, evidence JSON ve shots.</p>
  <p class="meta">KTB ERP · Sistem kılavuzu · ${esc(nowTr)}</p>
</section>

</body>
</html>`;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ART, { recursive: true });
  const htmlPath = path.join(OUT_DIR, 'KTB_ERP_Sistem_Kilavuz_Sinama.html');
  fs.writeFileSync(htmlPath, html);
  console.log('HTML', htmlPath);

  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfPath = path.join(OUT_DIR, 'KTB_ERP_Sistem_Kilavuz_Sinama.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '12mm', left: '9mm', right: '9mm' },
  });
  await browser.close();
  fs.copyFileSync(pdfPath, path.join(ART, 'KTB_ERP_Sistem_Kilavuz_Sinama.pdf'));
  fs.copyFileSync(htmlPath, path.join(ART, 'KTB_ERP_Sistem_Kilavuz_Sinama.html'));
  console.log('PDF', pdfPath);
  console.log('ART', path.join(ART, 'KTB_ERP_Sistem_Kilavuz_Sinama.pdf'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
