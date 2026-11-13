#!/usr/bin/env python3
"""Build Üretim Modülü Yeni Hali PDF with screenshots."""
from __future__ import annotations

import html
from pathlib import Path

SHOTS = Path(__file__).resolve().parent / "shots"
OUT_HTML = Path(__file__).resolve().parent / "uretim-modulu-yeni-hali.html"
OUT_PDF = Path("/workspace/docs/production/pdf/KTB_ERP_Uretim_Modulu_Yeni_Hali.pdf")
ARTIFACT = Path("/opt/cursor/artifacts/KTB_ERP_Uretim_Modulu_Yeni_Hali.pdf")


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def fig(src: str, caption: str, note: str = "") -> str:
    p = SHOTS / src
    if not p.exists():
        return f'<p class="missing">[Görsel yok: {esc(src)}]</p>'
    note_html = f'<p class="note">{esc(note)}</p>' if note else ""
    return f"""
<figure class="shot">
  <img src="{esc(str(p))}" alt="{esc(caption)}" />
  <figcaption><strong>{esc(caption)}</strong>{note_html}</figcaption>
</figure>
"""


CSS = """
@page { size: A4; margin: 16mm 14mm 18mm 14mm; }
* { box-sizing: border-box; }
body {
  font-family: "Segoe UI", "DejaVu Sans", Arial, sans-serif;
  color: #1a1f2e;
  font-size: 10.5pt;
  line-height: 1.45;
  margin: 0;
}
h1 { font-size: 22pt; margin: 0 0 6pt; color: #0b3d5c; }
h2 {
  font-size: 14pt; color: #0b3d5c;
  border-bottom: 2px solid #2f6f9f;
  padding-bottom: 4pt; margin: 22pt 0 10pt;
  page-break-after: avoid;
}
h3 { font-size: 12pt; color: #1e4d6b; margin: 14pt 0 6pt; page-break-after: avoid; }
h4 { font-size: 11pt; margin: 10pt 0 4pt; color: #334; }
.cover {
  min-height: 240mm; display: flex; flex-direction: column; justify-content: center;
  padding: 20mm 8mm; text-align: left;
  background: linear-gradient(165deg, #f3f7fb 0%, #e8eef5 45%, #dfe8f2 100%);
  border: 1px solid #c5d4e3; border-radius: 6px;
}
.cover .brand { font-size: 13pt; letter-spacing: .08em; color: #2f6f9f; font-weight: 700; }
.cover .meta { margin-top: 18pt; color: #445; font-size: 10pt; }
.cover ul { margin: 8pt 0 0 16pt; padding: 0; }
.toc a { color: #0b3d5c; text-decoration: none; }
.toc li { margin: 3pt 0; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 10pt 18pt; }
li { margin: 2pt 0; }
table {
  width: 100%; border-collapse: collapse; margin: 8pt 0 12pt;
  font-size: 9pt;
}
th, td { border: 1px solid #c9d4e0; padding: 4pt 6pt; vertical-align: top; }
th { background: #e8eef5; color: #0b3d5c; text-align: left; }
tr:nth-child(even) td { background: #f7fafc; }
code, .mono { font-family: "DejaVu Sans Mono", Consolas, monospace; font-size: 8.5pt; }
.banner {
  background: #fff8e8; border-left: 4px solid #c9892e; padding: 8pt 10pt; margin: 10pt 0;
}
.banner-blue {
  background: #eef5fb; border-left: 4px solid #2f6f9f; padding: 8pt 10pt; margin: 10pt 0;
}
pre.flow {
  background: #f4f7fa; border: 1px solid #d0dae6; padding: 10pt;
  font-size: 8pt; overflow: hidden; white-space: pre-wrap;
  font-family: "DejaVu Sans Mono", monospace;
}
figure.shot {
  margin: 10pt 0 16pt; page-break-inside: avoid;
  border: 1px solid #d0dae6; background: #fff; padding: 6pt;
}
figure.shot img {
  width: 100%; max-height: 145mm; object-fit: contain; display: block;
  background: #f0f3f7;
}
figcaption { font-size: 9pt; color: #334; margin-top: 6pt; }
figcaption .note { margin: 2pt 0 0; color: #667; font-size: 8.5pt; }
.missing { color: #a33; font-style: italic; }
.footer-note { font-size: 8.5pt; color: #667; margin-top: 16pt; }
.section { page-break-before: always; }
.keep { page-break-inside: avoid; }
"""


def main() -> None:
    parts: list[str] = []
    parts.append(f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP — Üretim Modülü Yeni Hali</title>
<style>{CSS}</style>
</head>
<body>
""")

    # Cover
    parts.append("""
<section class="cover">
  <div class="brand">KTB ERP</div>
  <h1>Üretim Modülü<br/>Yeni Hali</h1>
  <p style="font-size:12pt;max-width:42em">Canias PRD davranışı ile KTB form kabuğunun harmanlandığı hedef tasarım dokümanı — ekran görüntüleri ile.</p>
  <div class="meta">
    <div><strong>Tarih:</strong> 13 Kasım 2026 (Europe/Istanbul)</div>
    <div><strong>Belge:</strong> docs/production/33_URETIM_MODULU_YENI_HAL.md</div>
    <div><strong>İlgili analiz:</strong> 32_PRD_MODUL_YENIDEN_ANALIZ.md</div>
    <div style="margin-top:10pt"><strong>Kapsam:</strong></div>
    <ul>
      <li>Süreç haritası ve menü</li>
      <li>Ekran / sekme / aksiyon tanımları</li>
      <li>Durum makinesi, stok–kalite kuralları</li>
      <li>P0–P3 uygulama dalgaları</li>
      <li>Canlı sistem ekran görüntüleri</li>
    </ul>
  </div>
</section>
""")

    # TOC
    parts.append("""
<section class="section">
<h2>İçindekiler</h2>
<ol class="toc">
  <li>Amaç ve tasarım ilkeleri</li>
  <li>Süreç haritası</li>
  <li>Menü yapısı</li>
  <li>Ortak UI kuralları</li>
  <li>Ekranlar (hedef + görseller)</li>
  <li>Durum makinesi</li>
  <li>Stok ve kalite entegrasyonu</li>
  <li>Ekranlar arası bağlantılar</li>
  <li>Uygulama dalgaları ve kabul</li>
</ol>
</section>
""")

    # 1
    parts.append("""
<section class="section">
<h2>1. Amaç ve tasarım ilkeleri</h2>
<p>Üretim Yönetimi; tek veya çok seviyeli üretimde plan ve satış siparişlerini iş emrine çevirir, BOM + rota + depo + termin ile yönetir, malzeme tüketimi ve mamul girişini kontrollü üretir, operasyon onaylarını alır ve kalite / stok / MRP ile entegre çalışır.</p>
<div class="banner-blue">
<strong>Dört ilke</strong>
<ol>
  <li><strong>Zincir kırılmaz:</strong> Plan / sipariş → IE → malzeme/op → onay → stok/KK → rapor</li>
  <li><strong>Onay ≠ üretim ≠ stok:</strong> Yönetim onayı emri açar; operasyon onayı miktar üretir; stok hareketi emiş/giriş tipine göre doğar</li>
  <li><strong>Tek kabuk dili:</strong> Yeni / İncele / Düzelt / Kopyala / Sil; sekmeli kart; lookup’ta kod+ad</li>
  <li><strong>Önce derinleştir:</strong> Mevcut ekranları Canias derinliğine getir; yeni TX’i P2+ ekle</li>
</ol>
</div>
</section>
""")

    # 2 process
    parts.append("""
<section class="section">
<h2>2. Süreç haritası</h2>
<p>Canias PRD omurgası (PRJ/SRV/MNT/PRD/MRP/SAL → planlama ↔ CAP → INV+QLT → onay → rapor):</p>
""")
    parts.append(fig(
        "00-surec.png",
        "Canias / KTB üretim süreç şeması",
        "Kaynak: kullanıcı diyagramı — PRD planlama merkezli entegrasyon.",
    ))
    parts.append("""
<pre class="flow">SAL ──► Siparişten IE ──┐
MRP ──► Üretim Planı ───┼─► Üretim Emri
Manuel Yeni ────────────┘         │
                                  ├─ Malzemeleri Getir / Rota otodoldur
                                  ▼
                       İş Emri Onayı (yönetim) → Başlat
                                  ▼
              Operasyonel / Hızlı Giriş → INV + QLT → Analiz</pre>
</section>
""")

    # 3 menu
    parts.append("""
<section class="section">
<h2>3. Menü yapısı (yeni)</h2>
<table>
<tr><th>Bölüm</th><th>Ekranlar</th><th>Dalga</th></tr>
<tr><td>Ürün Ağacı</td><td>Ürün Ağacı, Patlatma, Seviye Listesi, Malzeme Değişikliği</td><td>P0</td></tr>
<tr><td>Planlama</td><td>Üretim Planları (+ MRP çapraz link)</td><td>P0</td></tr>
<tr><td>İş Emirleri</td><td>Üretim Emirleri, Siparişten IE, Toplu IE, İş Emri Ağı</td><td>P0 / P2</td></tr>
<tr><td>Atölye</td><td>İş Emri Onayı, Operasyonel Giriş, Hızlı Giriş, Birleşik Op</td><td>P0–P2</td></tr>
<tr><td>Fason</td><td>Fason Operasyon, Tedarikçi transfer</td><td>P2</td></tr>
<tr><td>Analiz</td><td>Planlanan–Gerçekleşen, WIP/Fire, IE Maliyet</td><td>P3</td></tr>
<tr><td>Tanımlar</td><td>Emir tipleri, İş merkezleri, İstasyonlar, Rotalar</td><td>P0</td></tr>
</table>
<div class="banner"><strong>İsim kararı:</strong> Eski “Kolay İş Emri Onayı” başlığı → <em>İş Emri Onayı</em> (yönetimsel; stok üretmez). Canias PRDT03 saha davranışı Operasyonel Üretim Girişi’nde yaşar.</div>
</section>
""")

    # 4 UI rules
    parts.append("""
<section>
<h2>4. Ortak UI kuralları</h2>
<table>
<tr><th>Kural</th><th>Yeni hali</th></tr>
<tr><td>Liste / form scroll</td><td>Bağımsız dikey kaydırma</td></tr>
<tr><td>Satır Kaydet/Düzelt/Kopyala/Sil</td><td>Uyarı toast yok</td></tr>
<tr><td>Lookup (○)</td><td>Kod + ad; gerekirse miktar / belge no</td></tr>
<tr><td>Plan başlangıç/bitiş</td><td>datetime (tarih + saat)</td></tr>
<tr><td>Belge zinciri</td><td>Belge Takip sekmesi + üst şerit</td></tr>
</table>
</section>
""")

    # 5 screens with shots
    parts.append("""
<section class="section">
<h2>5. Ekranlar — hedef tanım ve görseller</h2>
""")

    # BOM
    parts.append("""
<h3>5.1 Ürün Ağacı &amp; Rota (master)</h3>
<p>BOM ve rota, iş emrinin kopya kaynağıdır. Alternatif/varyant P2; patlatma / seviye / malzeme değişikliği korunur.</p>
""")
    parts.append(fig("045-urun-agaci-liste.jpg", "Ürün Ağacı — liste"))
    parts.append(fig("045-urun-agaci-kayit.jpg", "Ürün Ağacı — kayıt formu"))
    parts.append(fig("052-routings-liste.jpg", "Rotalar — liste"))
    parts.append(fig("052-routings-kayit.jpg", "Rotalar — operasyon satırları"))
    parts.append(fig("050-is-merkezleri-liste.jpg", "İş Merkezleri — liste"))

    # Plans
    parts.append("""
<h3>5.2 Üretim Planları (PRDT06 kaynağı)</h3>
<p>MRP veya manuel plan → Başlatıldı → <strong>Çevir</strong> → iş emri. Önerilen miktar/tarih yönlendirir, zorlamaz.</p>
""")
    parts.append(fig("054-uretim-planlari-liste.jpg", "Üretim Planları — liste"))
    parts.append(fig("054-uretim-planlari-kayit.jpg", "Üretim Planları — kayıt / çevir"))

    # WO
    parts.append("""
<h3>5.3 Üretim Emirleri (PRDT01 — ana kabuk)</h3>
<p>Sekmeler: İş Emri Bilgileri · Malzemeler · Rota · Belge Takip (P0). Aksiyonlar: Onayla, Başlat, Malzemeleri Getir, BOM/Rota Uygula.</p>
<table>
<tr><th>Grup</th><th>Alanlar</th></tr>
<tr><td>Organizasyon</td><td>İş yeri, emir tipi</td></tr>
<tr><td>Kimlik</td><td>Emir no, tarih, stok → BOM → rota, miktar, sipariş, proje</td></tr>
<tr><td>Depo</td><td>Hammadde / YM / mamul</td></tr>
<tr><td>Planlama</td><td>Plan başlangıç–bitiş (datetime), çıkış/giriş tipi</td></tr>
<tr><td>Durum</td><td>Açık/kapalı, onaylı, başlatıldı, …</td></tr>
</table>
""")
    parts.append(fig("055-uretim-emirleri-liste.jpg", "Üretim Emirleri — liste"))
    parts.append(fig("055-uretim-emirleri-kayit.jpg", "Üretim Emirleri — form (bilgiler)"))
    parts.append(fig(
        "04-uretim-emirleri-form.png",
        "Üretim Emirleri — form (modül tanıtım çekimi)",
        "Ek referans görsel.",
    ))

    # Order to WO
    parts.append("""
<h3>5.4 Siparişten İş Emri (PRDT13)</h3>
<ol>
  <li>Satış siparişi seç</li>
  <li>Stok yalnız o sipariş satırlarından</li>
  <li>Varsayılan BOM / rota / tip / miktar</li>
  <li>İş emri no + plan datetime</li>
  <li>Kaydet → Üretim Emirleri kaydı</li>
</ol>
""")
    parts.append(fig("056-siparis-is-emri-liste.jpg", "Siparişten İş Emri — aday listesi"))
    parts.append(fig("056-siparis-is-emri-kayit.jpg", "Siparişten İş Emri — oluşturma formu"))

    # Bulk
    parts.append("""
<h3>5.5 Toplu İş Emri</h3>
<p>Birden fazla sipariş satırından / plandan toplu IE oluşturma.</p>
""")
    parts.append(fig("057-toplu-is-emri-liste.jpg", "Toplu İş Emri — liste"))
    parts.append(fig("057-toplu-is-emri-kayit.jpg", "Toplu İş Emri — kayıt"))

    # Types
    parts.append("""
<h3>5.6 Üretim Emri Tipleri</h3>
<p>NORMAL / SIP (P0); KOL / BIL / DEM (P2). Varsayılan çıkış/giriş tipi ve numaratör bağları.</p>
""")
    parts.append(fig("053-uretim-emri-tipleri-liste.jpg", "Üretim Emri Tipleri"))

    # Receipts
    parts.append("""
<h3>5.7 Operasyonel Üretim Girişi (PRDT02/03)</h3>
<p>Operasyon onayı; oto emiş onay anında; operasyonel çıkış başlatırken (P1). Yönetim onayından ayrıdır.</p>
<table>
<tr><th>Çıkış tipi</th><th>Davranış</th></tr>
<tr><td>OtoEmis</td><td>Onay miktarına orantılı otomatik stok çıkış</td></tr>
<tr><td>Operasyonel</td><td>Başlatırken çıkış (P1)</td></tr>
<tr><td>Manuel</td><td>Ayrı stok hareketi</td></tr>
</table>
""")
    parts.append(fig("059-uretim-girisleri-liste.jpg", "Operasyonel Üretim Girişi — liste"))
    parts.append(fig("059-uretim-girisleri-kayit.jpg", "Operasyonel Üretim Girişi — kayıt"))

    # Extra overview shots
    parts.append("""
<h3>5.8 Menü / genel görünüm</h3>
""")
    parts.append(fig("17-o1-uretim.png", "Üretim menüsü — genel görünüm (1)"))
    parts.append(fig("36-o2-uretim.png", "Üretim menüsü — genel görünüm (2)"))
    parts.append(fig("04-rotalar.png", "Rotalar — tanıtım çekimi"))

    parts.append("</section>")

    # 6 state machine
    parts.append("""
<section class="section">
<h2>6. Durum makinesi</h2>
<pre class="flow">Taslak ──► OnayBekliyor ──► Acik ──► Uretimde ──► Kapali
                              │
                              └──► Iptal (üretilen=0 ve başlatılmamışsa)</pre>
<table>
<tr><th>Geçiş</th><th>Koşul</th><th>Etki</th></tr>
<tr><td>Onayla</td><td>Kurallar OK</td><td>is_approved, status=Acik</td></tr>
<tr><td>Başlat</td><td>Onaylı + Acik</td><td>is_started, status=Uretimde</td></tr>
<tr><td>Op onay</td><td>Başlatılmış (veya kural)</td><td>produced_quantity; emiş/giriş</td></tr>
<tr><td>Kapat</td><td>Üretilen ≥ plan veya manuel</td><td>Kapali</td></tr>
</table>
</section>
""")

    # 7 integration
    parts.append("""
<section>
<h2>7. Stok ve kalite entegrasyonu</h2>
<ul>
  <li>Bakiye yalnız hareketten doğar.</li>
  <li>Oto emiş onay anında; operasyonel çıkış başlat anında; manuel ayrı belge.</li>
  <li>KK: üretim öncesi / onay sırasında / mamul girişte (GKK–CKK).</li>
  <li>IE oluştururken eksik malzeme uyarısı (P0); rezervasyon P1.</li>
</ul>
</section>
""")

    # 8 links
    parts.append("""
<section>
<h2>8. Ekranlar arası bağlantılar</h2>
<table>
<tr><th>Kaynak</th><th>Hedef</th><th>Tetik</th></tr>
<tr><td>Satış siparişi</td><td>Siparişten IE</td><td>Toolbar / bağlı ekran</td></tr>
<tr><td>Siparişten IE</td><td>Üretim Emirleri</td><td>Kayıt sonrası</td></tr>
<tr><td>Üretim planı</td><td>Üretim Emirleri</td><td>Çevir</td></tr>
<tr><td>Üretim Emirleri</td><td>Operasyonel Giriş</td><td>Bağlı ekran</td></tr>
<tr><td>Rota değişimi</td><td>Rota sekmesi</td><td>Otomatik</td></tr>
<tr><td>Malzemeleri Getir</td><td>Malzeme sekmesi</td><td>Buton</td></tr>
<tr><td>Op onay</td><td>Stok / KK</td><td>Sistem kuralı</td></tr>
</table>
</section>
""")

    # 9 waves
    parts.append("""
<section class="section">
<h2>9. Uygulama dalgaları ve kabul</h2>
<table>
<tr><th>Dalga</th><th>Odak</th><th>Çıktı</th></tr>
<tr><td>P0</td><td>Omurga</td><td>Belge takip, satır çıkış tipi + onay anı oto emiş, isim netliği, bağlantı testleri</td></tr>
<tr><td>P1</td><td>Onay derinliği</td><td>Düzeltme listesi, onay no, başlat/bitir, parti/seri, KK kancası</td></tr>
<tr><td>P2</td><td>Tip / fason / ağ</td><td>Kolektif–bileşik–demontaj, PRDT10, PRDT40, PRDT42</td></tr>
<tr><td>P3</td><td>CAP / analitik</td><td>Çizelgeleme, planlanan–gerçekleşen, WIP, maliyet</td></tr>
</table>
<h3>P0 kabul kriterleri</h3>
<ul>
  <li>Siparişten IE: stok filtresi + BOM/rota/tip + emir no + datetime</li>
  <li>Malzemeleri Getir + rota otodoldur</li>
  <li>Belge takip sekmesinde sipariş / plan / hareket linkleri</li>
  <li>Malzeme satırında çıkış tipi; OtoEmis onayda stok çıkışı</li>
  <li>İş Emri Onayı stok üretmez; Operasyonel giriş üretir</li>
  <li>Lookup kod+ad; bağımsız scroll; sessiz satır aksiyonları</li>
</ul>
<p class="footer-note">Görseller mevcut KTB ERP canlı çekimlerinden alınmıştır (süt tam döngü / modül tanıtım / teks sunum). Hedef P0–P3 alanları dokümanda “hedef” olarak işaretlenmiştir; ekranlar mevcut omurgayı gösterir.</p>
</section>
""")

    parts.append("</body></html>")
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text("".join(parts), encoding="utf-8")
    print("HTML", OUT_HTML, "bytes", OUT_HTML.stat().st_size)


if __name__ == "__main__":
    main()
