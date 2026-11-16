#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KTB ERP → C# taşıma değerlendirme PDF (UTF-8)."""

from pathlib import Path
from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT_DOCS = ROOT / "docs" / "architecture" / "KTB_ERP_CSharp_Tasimasi.pdf"
OUT_ART = Path("/opt/cursor/artifacts/KTB_ERP_CSharp_Tasimasi.pdf")

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_M = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


class Pdf(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("DejaVu", "", 8)
        self.set_text_color(90, 100, 110)
        self.cell(0, 6, "KTB ERP — C# Altyapı Taşıma Değerlendirmesi", align="L")
        self.ln(8)
        self.set_draw_color(200, 210, 220)
        self.line(14, self.get_y(), self.w - 14, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Sayfa {self.page_no()}/{{nb}}  ·  UTF-8  ·  16 Kasım 2026", align="C")


def h1(pdf, text):
    pdf.set_font("DejaVu", "B", 16)
    pdf.set_text_color(26, 35, 48)
    pdf.multi_cell(0, 9, text)
    pdf.ln(2)


def h2(pdf, text):
    pdf.ln(2)
    pdf.set_font("DejaVu", "B", 12)
    pdf.set_text_color(40, 70, 120)
    pdf.multi_cell(0, 7, text)
    pdf.ln(1)


def h3(pdf, text):
    pdf.ln(1)
    pdf.set_font("DejaVu", "B", 10.5)
    pdf.set_text_color(35, 45, 55)
    pdf.multi_cell(0, 6, text)
    pdf.ln(0.5)


def body(pdf, text):
    pdf.set_font("DejaVu", "", 9.5)
    pdf.set_text_color(30, 35, 42)
    pdf.multi_cell(0, 5.4, text)
    pdf.ln(1)


def bullet(pdf, items):
    pdf.set_font("DejaVu", "", 9.5)
    pdf.set_text_color(30, 35, 42)
    for it in items:
        pdf.set_x(18)
        pdf.multi_cell(0, 5.2, f"•  {it}")
    pdf.ln(1)


def mono(pdf, text):
    pdf.set_font("DejaVuMono", "", 8)
    pdf.set_text_color(40, 50, 60)
    pdf.set_fill_color(243, 246, 250)
    pdf.multi_cell(0, 4.6, text, fill=True)
    pdf.ln(2)


def callout(pdf, title, text):
    pdf.set_fill_color(232, 242, 255)
    pdf.set_draw_color(63, 135, 245)
    left = pdf.l_margin
    pdf.set_x(left)
    pdf.set_font("DejaVu", "B", 9.5)
    pdf.set_text_color(30, 70, 140)
    pdf.multi_cell(pdf.epw, 5.5, title, fill=True)
    pdf.set_x(left)
    pdf.set_font("DejaVu", "", 9.5)
    pdf.set_text_color(30, 35, 42)
    pdf.multi_cell(pdf.epw, 5.2, text, fill=True)
    pdf.ln(2)


def build():
    pdf = Pdf(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("DejaVu", "", FONT)
    pdf.add_font("DejaVu", "B", FONT_B)
    pdf.add_font("DejaVuMono", "", FONT_M)
    pdf.set_margins(14, 16, 14)
    pdf.add_page()

    # Kapak
    pdf.set_font("DejaVu", "B", 22)
    pdf.set_text_color(26, 35, 48)
    pdf.ln(18)
    pdf.multi_cell(0, 11, "KTB ERP’yi C# Altyapısına\nTaşımak Mümkün mü?")
    pdf.ln(4)
    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(70, 80, 95)
    pdf.multi_cell(
        0,
        6.5,
        "Teknik değerlendirme · Geçiş yolu · Değişecek / kurulacak parçalar · Artılar ve eksiler\n"
        "Hazırlayan: Cursor Agent  ·  Tarih: 16 Kasım 2026 (Europe/Istanbul)\n"
        "Belge kodlaması: UTF-8 (DejaVu Sans)",
    )
    pdf.ln(6)
    callout(
        pdf,
        "Kısa cevap: EVET",
        "Program tamamen C# (ASP.NET Core) altyapısına taşınabilir. Bu bir “dil değiştirme” değil; "
        "backend (ve isteğe bağlı UI) yeniden yazımı + kontrollü kesim geçişidir. "
        "PostgreSQL veri modeli büyük ölçüde korunabilir. “C# daha verimli olur” beklentisi ise "
        "çoğu ERP senaryosunda doğru darboğaz değildir — asıl kazanç genelde tip güvenliği, "
        "kurumsal ekosistem ve ekip uyumudur.",
    )

    h2(pdf, "1. Bugünkü mimari (özet)")
    body(
        pdf,
        "KTB ERP şu an Node.js (Express) + PostgreSQL + tarayıcıda çalışan (vanilla JS) bir "
        "modular monolith’tir. REST API, JWT/LDAP kimlik doğrulama, SQL migration’lar ve "
        "ekran sözleşmeleri (screen contracts) ile büyüyen bir çekirdek vardır. "
        "ARCHITECTURE.md hedefi de zaten “tek süreç, modüllü monolit, mikroservis yok”tır — "
        "bu hedef C# ile de birebir uyumludur.",
    )
    mono(
        pdf,
        "Mevcut yığın\n"
        "  Sunucu : Node.js + Express (routes/*.js, index.js)\n"
        "  Veri   : PostgreSQL (pg) + db/migrations/*.sql\n"
        "  UI     : public/ (app.js, styles*.css) — SPA benzeri tek sayfa\n"
        "  Auth   : JWT + LDAP (ldapts)\n"
        "  Dağıtım: Docker / Node process",
    )

    h2(pdf, "2. Neden “Evet” — ve ne demek?")
    body(
        pdf,
        "Evet demek: iş kurallarını, API yüzeyini ve (gerekirse) arayüzü .NET ekosisteminde "
        "yeniden kurabileceğiniz anlamına gelir. Hayır demek için teknik bir engel yoktur. "
        "Asıl kısıt teknik değil: süre, regresyon riski, ekip yetkinliği ve geçiş sırasında "
        "çift yığın maliyeti.",
    )
    bullet(
        pdf,
        [
            "PostgreSQL kalabilir (Npgsql). SQL Server zorunlu değildir.",
            "Mevcut REST sözleşmeleri (endpoint’ler) koruma hedefi olabilir → UI daha az sarsılır.",
            "Big-bang yerine “strangler fig” (modül modül yutma) önerilir.",
            "UI’yi hemen Blazor’a almak zorunlu değildir; önce API’yi C# yapmak en düşük riskli yoldur.",
        ],
    )

    h2(pdf, "3. “C# daha verimli” iddiası — dürüst çerçeve")
    body(
        pdf,
        "Kullandığınız birçok ERP’nin Java veya C# olması tesadüf değil: kurumsal iş uygulamaları "
        "tarihsel olarak bu ekosistemlerde olgunlaştı. Bu, C#’ın Node’dan “her zaman daha hızlı” "
        "olduğu anlamına gelmez.",
    )
    h3(pdf, "Gerçek performans resmi")
    bullet(
        pdf,
        [
            "ERP’de darboğaz çoğu zaman CPU değil: SQL, kilitler, N+1 sorgu, rapor I/O, ağ gecikmesi.",
            "ASP.NET Core (Kestrel) yüksek performanslıdır; Node da I/O ağırlıklı API’lerde yeterlidir.",
            "Aynı kötü SQL, C#’ta da yavaştır. Verimlilik önce veri modeli + indeks + işlem tasarımından gelir.",
            "C#’ın asıl “verim”i geliştirici verimi olabilir: derleme zamanı hataları, IDE, refaktör, tip sistemi.",
        ],
    )
    h3(pdf, "C#’ın ERP için güçlü olduğu yerler")
    bullet(
        pdf,
        [
            "Uzun ömürlü domain katmanı (stok motoru, belge zinciri, onay) için güçlü tip modeli.",
            "Kurumsal entegrasyon (Active Directory, Windows servisleri, RDLC/SSR tarzı rapor kültürü).",
            "Büyük ekipte sözleşme + DI + test alışkanlıkları için olgun kalıplar.",
            "Sizin tanıdığınız ERP dünyasıyla kültürel uyum (ekip işe alımı, danışman, eğitim).",
        ],
    )

    h2(pdf, "4. Hedef mimari (önerilen)")
    mono(
        pdf,
        "Önerilen hedef (modular monolith — mevcut felsefeyle uyumlu)\n\n"
        "  [Tarayıcı UI]  ──HTTP/JSON──►  ASP.NET Core Web API\n"
        "                                   │\n"
        "                     Application / Domain services\n"
        "                                   │\n"
        "                     Repositories / Dapper veya EF Core\n"
        "                                   │\n"
        "                              PostgreSQL\n\n"
        "UI seçenekleri (ayrı karar):\n"
        "  A) Mevcut public/ UI kalır → sadece backend C#  (en hızlı değer)\n"
        "  B) React/Vue + C# API\n"
        "  C) Blazor Server / Blazor WASM (tam .NET UI)",
    )

    h2(pdf, "5. Nasıl yapılır? (pratik yol haritası)")
    h3(pdf, "Aşama 0 — Karar ve sınırlar")
    bullet(
        pdf,
        [
            "Hedefi netleştirin: “sadece backend C#” mı, “tamamen .NET (UI dahil)” mi?",
            "PostgreSQL’de kalma kararı (önerilir) veya SQL Server’a geçiş (ayrı maliyet).",
            "API sözleşmesini dondurun: OpenAPI/Swagger ile mevcut endpoint’leri belgeleyin.",
            "Başarı ölçütü: aynı ekranlar, aynı SQL sonuçları, aynı yetki matrisi.",
        ],
    )
    h3(pdf, "Aşama 1 — Yeni kurulacaklar")
    bullet(
        pdf,
        [
            ".NET 8/9 SDK, IDE (Visual Studio / Rider / VS Code + C# Dev Kit).",
            "ASP.NET Core Web API projesi, çözüm (solution) yapısı, CI (dotnet test / publish).",
            "Npgsql (+ isteğe bağlı EF Core veya Dapper).",
            "Kimlik: JWT bearer (mevcut token modeline yakın) veya ASP.NET Identity + LDAP bağlayıcı.",
            "Yapılandırma: appsettings.json, ortam değişkenleri, secret yönetimi.",
            "Loglama: Serilog / OpenTelemetry (Node’daki gözleme denk).",
            "Docker imajı: mcr.microsoft.com/dotnet/aspnet tabanlı.",
        ],
    )
    h3(pdf, "Aşama 2 — Değişecekler (Node → C# eşlemesi)")
    bullet(
        pdf,
        [
            "routes/*.js  →  Controllers / Minimal APIs + Application servisleri",
            "db.js / pg pool  →  Npgsql veri erişimi (transaction scope kritik: stok motoru)",
            "db/migrations/*.sql  →  aynen tutulabilir (Flyway/DbUp) veya EF migrations’a çevrilir",
            "JWT / LDAP  →  Authentication middleware + LdapConnection / özel provider",
            "public/ statik servis  →  API’den ayrı CDN/static host veya wwwroot",
            "npm test / screen contracts  →  xUnit/NUnit + söz doğrulama testleri",
            "Demo/QA script’leri (Node)  →  dotnet tool’lar veya geçici süre Node script’ler kalır",
        ],
    )
    h3(pdf, "Aşama 3 — Strangler fig (önerilen geçiş)")
    body(
        pdf,
        "Big-bang (“her şeyi bir anda C# yaz”) ERP’de yüksek risklidir. Bunun yerine:",
    )
    bullet(
        pdf,
        [
            "Ters vekil (reverse proxy / YARP / nginx): /api/stok/* C#’a, geri kalan Node’a.",
            "Önce okuma ağırlıklı veya sınırlı modülleri taşıyın (ör. tanım kartları).",
            "Sonra stok motoru + belge yazan akışlar (en kritik, en testli paket).",
            "Her kesimde sözleşme testleri: aynı request → aynı JSON / aynı DB yan etkisi.",
            "Node tamamen boşalınca kapatılır.",
        ],
    )
    h3(pdf, "Aşama 4 — UI kararı")
    bullet(
        pdf,
        [
            "Kısa vadede mevcut UI’yi korumak: taşıma maliyetini yarıya indirir.",
            "Blazor’a geçmek: tek dil avantajı, ama tüm ekran/UX yeniden üretim demektir (görünüm 1–4, form motoru, lookup…).",
            "Pratik sıra: API C# → stabilize → sonra UI yenileme (isteğe bağlı).",
        ],
    )

    h2(pdf, "6. Yeni kurulacaklar — kontrol listesi")
    mono(
        pdf,
        "Geliştirme\n"
        "  [ ] .NET SDK LTS\n"
        "  [ ] Solution: Api / Application / Domain / Infrastructure / Tests\n"
        "  [ ] OpenAPI (Swagger) + mevcut endpoint envanteri\n"
        "  [ ] Npgsql + transaction politikası (stok/belge)\n"
        "  [ ] Auth (JWT) + LDAP entegrasyon kanıtı\n"
        "  [ ] Migration stratejisi (SQL dosyalarını koru önerilir)\n\n"
        "Operasyon\n"
        "  [ ] Docker / compose (.NET API + Postgres)\n"
        "  [ ] CI: build, test, publish\n"
        "  [ ] Gözlem: health, log, metrik\n"
        "  [ ] Yedek / restore prosedürü (DB aynı kalırsa büyük ölçüde aynı)\n\n"
        "Organizasyon\n"
        "  [ ] C# bilen geliştirici kapasitesi\n"
        "  [ ] Modül öncelik sırası ve kabul kriterleri\n"
        "  [ ] Çift yığın dönemi bütçesi (Node + .NET)",
    )

    h2(pdf, "7. Artılar")
    bullet(
        pdf,
        [
            "Kurumsal ERP dünyasıyla hizalanma (işe alım, danışmanlık, beklenen mimari).",
            "Derleme zamanı tip kontrolü → büyük refaktörlerde daha az “sessiz” hata.",
            "ASP.NET Core performansı ve olgun middleware ekosistemi.",
            "Domain-Driven Design / temiz mimari kalıplarının .NET’te bol örneği.",
            "Windows / AD / kurumsal raporlama ekosistemine daha doğal köprü.",
            "Uzun vadede tek tip (C#) backend + (isterseniz) Blazor UI seçeneği.",
            "Mevcut PostgreSQL bilgisi ve migration’lar büyük ölçüde yeniden kullanılabilir.",
        ],
    )

    h2(pdf, "8. Eksiler / riskler")
    bullet(
        pdf,
        [
            "Yeniden yazım maliyeti: iş kuralları (MRP, stok, belge zinciri, yetki) bire bir taşınmalı.",
            "Geçiş süresince çift bakım: Node ve C# birlikte yaşar → hız düşer.",
            "Regresyon riski: “çalışıyordu” ekranların sessiz bozulması (özellikle form motoru / lookup).",
            "Mevcut Node demo/QA/otomasyon script’lerinin yeniden yazımı veya hibrit kalması.",
            "Ekip Node’a hakimse öğrenme eğrisi; tersi durumda avantaj.",
            "“Daha verimli” vaadi tek başına ROI kanıtı değildir — ölçüm şart (API latency, DB süreleri).",
            "UI’yi de C#’a almak ayrı ve büyük bir proje; backend taşımasından ayırın.",
            "Kısa vadede özellik hızı yavaşlar (yeni ekran yerine taşıma).",
        ],
    )

    h2(pdf, "9. Node’da kalmanın da artıları (karşı denge)")
    bullet(
        pdf,
        [
            "Bugün çalışan ürün ve birikmiş ekran/iş kuralı yatırımı korunur.",
            "Tek süreç, hızlı iterasyon, mevcut QA script’leri.",
            "Performans sorunları çoğu zaman dil değil; profilleyip SQL/indeks ile çözülür.",
            "Tam C# taşıması, yeni özellik borcuna göre daha pahalı bir “platform kararı”dır.",
        ],
    )

    h2(pdf, "10. Önerilen karar çerçevesi")
    callout(
        pdf,
        "Ne zaman C#’a gidin?",
        "Ekip .NET’e kayacaksa, uzun vadeli kurumsal ürün hedefi varsa, AD/Windows entegrasyonu "
        "kritikse ve taşıma için ayrı kapasite ayırabiliyorsanız: EVET — ama aşamalı.",
    )
    callout(
        pdf,
        "Ne zaman erteleyin / Node’da derinleştirin?",
        "Asıl ihtiyaç hızla yeni ERP modülü ise, ekip Node’da verimliyse ve ölçülen darboğaz DB ise: "
        "önce mimariyi (domain servisleri, stok motoru sınırları) Node içinde sertleştirin; "
        "C#’ı “dil modası” için yapmayın.",
    )
    body(
        pdf,
        "Pratik öneri (bu repo için): Önce OpenAPI ile API’yi dondurun → ince bir ASP.NET Core "
        "iskeleti + 1–2 salt okunur modül (strangler) → stok/belge yazan çekirdek → Node’u kapat. "
        "UI’yi ilk dalgada dokunmadan bırakın. “Verimlilik” iddiasını her aşamada ölçün "
        "(p95 latency, DB süreleri, hata oranı) — hisle değil sayıyla karar verin.",
    )

    h2(pdf, "11. Sonuç")
    body(
        pdf,
        "Evet, KTB ERP tamamen C# altyapısına taşınabilir. Teknik olarak doğru yol ASP.NET Core "
        "modular monolith + (tercihen) PostgreSQL’i korumak + UI’yi ikinci dalgaya bırakmaktır. "
        "C#’ın Java/ERP dünyasıyla uyumu ve tip güvenliği gerçek avantajlardır; ancak “daha verimli” "
        "beklentisi otomatik garanti değildir. Başarı, dil seçiminden çok: iş kurallarının doğru "
        "taşınması, aşamalı kesim, otomatik sözleşme testleri ve dürüst kapasite planına bağlıdır.",
    )

    pdf.ln(4)
    pdf.set_font("DejaVu", "", 8.5)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        4.8,
        "Bu belge karar destek amaçlıdır; bağlayıcı proje planı değildir. "
        "Kaynak: mevcut repo mimarisi (Node/Express/PostgreSQL), ARCHITECTURE.md, paket yapısı.",
    )

    OUT_DOCS.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT_DOCS))
    OUT_ART.parent.mkdir(parents=True, exist_ok=True)
    OUT_ART.write_bytes(OUT_DOCS.read_bytes())
    print(f"Wrote {OUT_DOCS}")
    print(f"Wrote {OUT_ART}")
    print(f"Size: {OUT_DOCS.stat().st_size} bytes")


if __name__ == "__main__":
    build()
