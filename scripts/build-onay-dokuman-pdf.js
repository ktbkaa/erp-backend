/**
 * Onay Yönetimi — müşteri / kullanıcı dokümanı PDF.
 *   node scripts/capture-onay-dokuman-ekranlari.js
 *   node scripts/build-onay-dokuman-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const shotDir = path.join(__dirname, '..', 'docs', 'onay-dokuman-shots');
const outPdf = path.join(__dirname, '..', 'docs', 'ONAY_MODULU_Kullanim_Dokumani.pdf');
const outArtifact = '/opt/cursor/artifacts/ONAY_MODULU_Kullanim_Dokumani.pdf';

function img(file) {
  const p = path.join(shotDir, file);
  if (!fs.existsSync(p)) return '';
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
}

function slide({ eyebrow, title, lead, shot, bullets, fields, tip, pageBreak = true }) {
  const src = shot ? img(shot) : '';
  return `
  <section class="slide${pageBreak ? ' page-break' : ''}">
    <div class="eyebrow">${eyebrow || ''}</div>
    <h2>${title}</h2>
    ${lead ? `<p class="lead">${lead}</p>` : ''}
    ${src ? `<figure class="shot"><img src="${src}" alt="${title}"/></figure>` : ''}
    ${bullets?.length ? `<ul class="talk">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    ${fields?.length ? `
      <table class="fields">
        <thead><tr><th>Alan</th><th>Ne seçilir / girilir?</th><th>Ne işe yarar?</th></tr></thead>
        <tbody>
          ${fields.map(([a, b, c]) => `<tr><td class="f">${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}
        </tbody>
      </table>` : ''}
    ${tip ? `<div class="tip">${tip}</div>` : ''}
  </section>`;
}

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP — Onay Yönetimi Kullanım Dokümanı</title>
<style>
  @page { size: A4; margin: 12mm 11mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", "Segoe UI", sans-serif;
    color: #15202b; font-size: 9.5pt; line-height: 1.4; margin: 0;
  }
  h1 { font-size: 22pt; margin: 0 0 8pt; color: #0a3d34; line-height: 1.15; }
  h2 { font-size: 13.5pt; margin: 0 0 4pt; color: #0a3d34; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 10pt 0 4pt; color: #1a4a40; }
  p { margin: 0 0 7pt; }
  .cover {
    min-height: 255mm; padding: 28pt 26pt;
    background: linear-gradient(160deg, #dceee8 0%, #f4f8f7 42%, #ffffff 100%);
    border: 1px solid #b9d0c8; border-radius: 10pt;
    display: flex; flex-direction: column; justify-content: center;
  }
  .eyebrow {
    text-transform: uppercase; letter-spacing: .14em; font-size: 8.5pt;
    color: #5a6a78; margin-bottom: 6pt; font-weight: 650;
  }
  .sub { font-size: 11.5pt; color: #334155; margin: 0 0 16pt; max-width: 92%; }
  .pill {
    display: inline-block; background: #0c7c69; color: #fff;
    padding: 3pt 11pt; border-radius: 999pt; font-size: 9pt; margin: 0 6pt 6pt 0;
  }
  .pill.b { background: #1a5f8a; }
  .meta { font-size: 9pt; color: #5a6a78; margin-top: 22pt; }
  .page-break { page-break-before: always; }
  .lead { color: #3a4654; margin: 0 0 8pt; }
  .shot {
    margin: 6pt 0 8pt; border: 1px solid #c9d4de; border-radius: 6pt;
    overflow: hidden; background: #eef2f5;
  }
  .shot img { width: 100%; display: block; }
  .talk { margin: 4pt 0 8pt 16pt; padding: 0; }
  .talk li { margin-bottom: 3pt; }
  table.fields { width: 100%; border-collapse: collapse; margin: 6pt 0 8pt; font-size: 8.5pt; }
  table.fields th, table.fields td {
    border: 1px solid #d5dde6; padding: 4pt 6pt; vertical-align: top; text-align: left;
  }
  table.fields th { background: #e8f3ef; color: #0a3d34; }
  table.fields td.f { font-family: ui-monospace, monospace; background: #f7faf9; font-weight: 650; white-space: nowrap; }
  .tip {
    background: #fff8e8; border-left: 3px solid #c9a227;
    padding: 7pt 9pt; margin: 6pt 0 0; font-size: 8.8pt;
  }
  .flow {
    background: #fff; border: 1px solid #c9d4de; border-radius: 8pt;
    padding: 12pt 14pt; margin: 10pt 0; font-size: 10pt;
  }
  .flow strong { color: #0c7c69; }
  .two { display: flex; gap: 12pt; margin-top: 10pt; }
  .two > div { flex: 1; background: #f3f8f6; border-radius: 8pt; padding: 11pt; }
  .footer-note { font-size: 8pt; color: #6b7785; margin-top: 10pt; }
</style>
</head>
<body>

<section class="cover">
  <div class="eyebrow">KTB ERP · Modül kullanım dokümanı</div>
  <h1>Onay Yönetimi<br/>Tanımlar ve süreç turu</h1>
  <p class="sub">
    Belge onaylarının kim tarafından, hangi koşullarda ve hangi sırayla verileceğini
    sisteme tanıtan ekranların anlatımı. Odak: <strong>rol</strong>, <strong>kural</strong> ve <strong>rota</strong>.
  </p>
  <div>
    <span class="pill">Tanımlar</span>
    <span class="pill b">İşlem (Onaylarım / İzleme)</span>
  </div>
  <div class="flow">
    <strong>Akış:</strong>
    Rol (kim?) → Kural (hangi ekranda, hangi koşulda?) → Rota (hangi sırayla?) →
    Belge onaya düşünce Onaylarım’da işlem
  </div>
  <div class="meta">
    Hazırlayan: KTB ERP uygulama ekibi · Canlı ekran görüntüleri · ${new Date().toLocaleDateString('tr-TR')}
  </div>
</section>

<section class="slide page-break">
  <div class="eyebrow">Genel bakış</div>
  <h2>Modül ne işe yarar?</h2>
  <p class="lead">
    Satınalma talebi, satış siparişi, fatura gibi belgelerde «kim onaylar?» sorusunu
    tek yerden yönetir. Belge ekranındaki tek tuş onaylar yerine (veya onlara ek olarak)
    merkezi rota ile çok adımlı onay kurulabilir.
  </p>
  <div class="two">
    <div>
      <h3>Tanım tarafı</h3>
      <ul class="talk">
        <li><strong>Onay Rolü</strong> — kişi + rol adı + firma/iş yeri</li>
        <li><strong>Onay Kuralı</strong> — hangi ekran, hangi koşul, hangi mesaj</li>
        <li><strong>Onay Rotası</strong> — adım sırası ve bildirimler</li>
        <li><strong>Mesaj Şablonu</strong> — mail/bildirim metni</li>
        <li><strong>Durum</strong> — BEKLIYOR, ONAYLANDI…</li>
      </ul>
    </div>
    <div>
      <h3>İşlem tarafı</h3>
      <ul class="talk">
        <li><strong>Onaylarım</strong> — bana düşen bekleyenler</li>
        <li><strong>Onay İzleme</strong> — tüm kayıt ve adım geçmişi</li>
        <li><strong>Yetki Devri</strong> — tatil / vekâlet</li>
      </ul>
    </div>
  </div>
  <div class="tip">Alan ve ekran adları Canias’taki gibi birebir kopyalanmadı; KTB diline uyarlandı.</div>
</section>

${slide({
  eyebrow: 'Menü',
  title: 'Sol menüde Onay Yönetimi',
  lead: 'İşlem ve Sabit Tanımlar altında toplanır. Önce tanımları doldurun; sonra süreç çalışır.',
  shot: '01-menu-onay.png',
  bullets: [
    'Tanımlar: Rol → Kural → Rota → (isteğe bağlı) Mesaj / Durum',
    'Günlük kullanım: Onaylarım ve Onay İzleme',
  ],
})}

${slide({
  eyebrow: 'Tanım · 1 — Onay Rolü',
  title: 'Kim hangi rolü taşır?',
  lead: 'Her satır bir kişiye, belirli firma ve iş yerinde bir onay rol adı verir. Rotadaki adımlar bu rol adına bakar.',
  shot: '11-rol-form.png',
  fields: [
    ['Kişi', 'Kullanıcı kartından seçilir', 'Onayı verecek kişi'],
    ['Onay rol adı', 'Örn. Satınalma Müdürü, Finans Onayı', 'Rotada yazılan adla eşleşir'],
    ['Firma', 'Lookup', 'Rolün geçerli olduğu şirket'],
    ['İş yeri', 'Lookup', 'Rolün geçerli olduğu tesis / şube'],
  ],
  tip: 'Aynı rol adını birden fazla kişiye (farklı satırlarla) verebilirsiniz — o adımı onaylayabilecek havuz oluşur.',
})}

${slide({
  eyebrow: 'Tanım · 1 — liste',
  title: 'Onay Rolü listesi',
  shot: '10-rol-liste.png',
  bullets: [
    'Liste: rol adı, kişi, firma, iş yeri.',
    'Üye grid’i yok; kayıt zaten kişi + rol atamasıdır.',
  ],
})}

${slide({
  eyebrow: 'Tanım · 2 — Onay Kuralı',
  title: 'Hangi ekranda, hangi koşulda onay açılsın?',
  lead: 'Ekran ve mesaj şablonu seçilir. Koşullar VE mantığıyla çalışır — yazılan / işaretlenenlerin tümü sağlanmalı. Ham SQL veya serbest alan adı yazılmaz.',
  shot: '21-kural-form.png',
  fields: [
    ['Öncelik sırası', 'Sayı (küçük önce)', 'Aynı ekranda birden fazla kural varsa sıra'],
    ['Kural adı', 'Serbest metin', 'İzleme ve rota bağlantısı için'],
    ['Firma / İş yeri', 'Lookup (boş = tümü)', 'Kuralın kapsamı'],
    ['Ekran', 'Onaylanacak belge ekranı', 'Örn. Satınalma Talepleri, Satış Siparişleri'],
    ['Mesaj şablonu', 'Onay Mesaj Şablonu’ndan', 'Bildirim metni'],
    ['Belge yönü', 'Hepsi / Alış / Satış', 'Alış-satış ayrımı'],
    ['Min / Max tutar', 'Sayı (boş = sınır yok)', 'Tutar bandı'],
    ['Belge durumları', 'Virgüllü liste veya boş', 'Sadece belirli durumlarda'],
    ['Otomatik onay', 'İşaret kutusu', 'Koşul sağlanınca rota atlanır'],
    ['Onaylanınca aktif et', 'İşaret kutusu', 'Belge durumunu ilerletme niyeti'],
    ['Hareket kodları (alt grid)', 'Satır satır seçim', 'Boş = tüm hareketler; doluysa VE ile kısıt'],
  ],
  tip: 'Eski «alan adı + işlem + içerik yaz» grid’i bilerek kaldırıldı; seçim ve işaret kutuları kullanılıyor.',
})}

${slide({
  eyebrow: 'Tanım · 2 — liste',
  title: 'Onay Kuralı listesi',
  shot: '20-kural-liste.png',
})}

${slide({
  eyebrow: 'Tanım · 3 — Onay Rotası',
  title: 'Onayın kimden kime gideceği',
  lead: 'Kural ve ekran bağlandıktan sonra adımlar kurulur. Bu ekran tanımların «nasıl çalışacağını» gösterir.',
  shot: '31-rota-form.png',
  fields: [
    ['Rota adı / sürüm', 'Metin + sayı', 'Aynı sürecin farklı versiyonları'],
    ['Ekran', 'Katalogdan seçim', 'Hangi belge tipi'],
    ['Bağlı kural', 'Onay Kuralı lookup', 'Koşulların hangi kuraldan geldiği'],
    ['Firma / İş yeri', 'Lookup', 'Organizasyon kapsamı'],
    ['İlk / Red / Ek mesaj', 'Mesaj şablonu', 'Adım ve sonuç bildirimleri'],
    ['İptali onaylayacak rol adı', 'Metin', 'İptal akışında aranan rol'],
    ['Ekleri mail ile gönder', 'İşaret', 'Bildirime dosya ekleme niyeti'],
  ],
})}

${slide({
  eyebrow: 'Tanım · 3 — rota adımları',
  title: 'Adım satırları',
  lead: 'Her satır bir onay mertebesidir. Rol adı, Onay Rolü ekranındaki adla aynı yazılmalıdır.',
  shot: '31-rota-form.png',
  fields: [
    ['Adım no', '10, 20, 30…', 'Sıra'],
    ['Adım açıklaması', 'Serbest', 'Ekranda görünen ad'],
    ['Onay rol adı', 'Örn. Satınalma Müdürü', 'Kim onaylar (rol eşleşmesi)'],
    ['Mail / SMS gönder', 'İşaret', 'Bildirim kanalları'],
    ['Değer değiştirebilir', 'İşaret', 'Onaycının belgeyi düzeltebilmesi'],
    ['Min. tutar', 'Sayı (opsiyonel)', 'Bu adım yalnızca eşik üstünde'],
    ['Düzeltmede dönülecek adım', 'Adım no', 'Geri gönder hedefi'],
    ['Zorunlu', 'İşaret', 'Atlanamaz adım'],
  ],
  tip: 'Örnek: 10 Satınalma Müdürü → 20 Finans Onayı (min tutar 50.000).',
})}

${slide({
  eyebrow: 'Tanım · 4',
  title: 'Mesaj şablonu',
  lead: 'Kural ve rotada seçilen bildirim metinleri. Konu ve gövdede {{belge_no}}, {{modul}}, {{tutar}}, {{onayci}}, {{gerekce}} yer tutucuları kullanılabilir.',
  shot: '40-mesaj-liste.png',
})}

${slide({
  eyebrow: 'İşlem',
  title: 'Onaylarım',
  lead: 'Rolünüze (veya size devredilen yetkiye) düşen bekleyen kayıtlar. İncele → Onayla veya Reddet.',
  shot: '50-onaylarim.png',
  bullets: [
    'Yönetici tüm bekleyenleri görebilir.',
    'Red’de gerekçe notu istenebilir.',
  ],
})}

${slide({
  eyebrow: 'İşlem',
  title: 'Onay İzleme',
  lead: 'Tüm onay kayıtları: durum, belge, rota, başlatan, adım geçmişi. Denetim ve «nerede kaldı?» sorusu için.',
  shot: '51-izleme.png',
})}

${slide({
  eyebrow: 'İşlem',
  title: 'Yetki Devri',
  lead: 'Tatil veya vekâlette onay yetkisini başka kullanıcıya süreyle devredin. İsteğe bağlı tek role kısıtlanabilir.',
  shot: '60-yetki-devri.png',
})}

<section class="slide page-break">
  <div class="eyebrow">Kurulum sırası</div>
  <h2>Önerilen kurulum sırası</h2>
  <ol class="talk">
    <li><strong>Mesaj şablonları</strong> — bekleyen / onay / red metinleri</li>
    <li><strong>Onay rolleri</strong> — kişilere rol adı + firma/iş yeri</li>
    <li><strong>Onay kuralı</strong> — ekran seç, koşulları işaretle, mesajı bağla</li>
    <li><strong>Onay rotası</strong> — kuralı/ekranı bağla, adımları yaz (rol adları birebir)</li>
    <li>Test belgesi ile süreci başlat → <strong>Onaylarım</strong>’da doğrula</li>
  </ol>
  <div class="flow">
    <strong>Yeniden üretmek:</strong><br/>
    <code>npm run migrate</code><br/>
    <code>node scripts/capture-onay-dokuman-ekranlari.js</code><br/>
    <code>node scripts/build-onay-dokuman-pdf.js</code>
  </div>
  <p class="footer-note">
    Teknik özet: <code>docs/30_ONAY_MODULU.md</code> · Bu PDF sunum / eğitim içindir.
  </p>
</section>

</body>
</html>`;

async function main() {
  const need = ['11-rol-form.png', '21-kural-form.png', '31-rota-form.png'];
  const missing = need.filter((f) => !fs.existsSync(path.join(shotDir, f)));
  if (missing.length) {
    console.error('Eksik görüntü. Önce: node scripts/capture-onay-dokuman-ekranlari.js');
    console.error(missing);
    process.exit(1);
  }
  const tmp = '/tmp/onay-dokuman.html';
  fs.writeFileSync(tmp, html);
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.goto(`file://${tmp}`, { waitUntil: 'networkidle0', timeout: 120000 });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '12mm', left: '9mm', right: '9mm' },
  });
  await browser.close();
  fs.writeFileSync(outPdf, pdf);
  fs.mkdirSync(path.dirname(outArtifact), { recursive: true });
  fs.writeFileSync(outArtifact, pdf);
  console.log(JSON.stringify({ ok: true, pdf: outPdf, artifact: outArtifact, bytes: pdf.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
