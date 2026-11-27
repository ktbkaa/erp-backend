#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""KTB ERP Fason Yönetimi — bilgilendirme ve kullanım kılavuzu (UTF-8 PDF)."""

from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("DejaVu", FONT_REG))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_BOLD))

OUT = Path("docs/subcontracting/pdf/KTB_ERP_Fason_Yonetimi_Kilavuz.pdf")
ARTIFACT = Path("/opt/cursor/artifacts/KTB_ERP_Fason_Yonetimi_Kilavuz.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = HexColor("#1a365d")
TEAL = HexColor("#0d9488")
LIGHT = HexColor("#f0f9ff")
BORDER = HexColor("#cbd5e1")
MUTED = HexColor("#475569")

IST = ZoneInfo("Europe/Istanbul")
NOW = datetime.now(IST).strftime("%d.%m.%Y %H:%M")


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_title": ParagraphStyle(
            "cover_title", fontName="DejaVu-Bold", fontSize=22, leading=28,
            textColor=NAVY, alignment=TA_CENTER, spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName="DejaVu", fontSize=12, leading=16,
            textColor=MUTED, alignment=TA_CENTER, spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1", fontName="DejaVu-Bold", fontSize=14, leading=18,
            textColor=NAVY, spaceBefore=14, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2", fontName="DejaVu-Bold", fontSize=11, leading=14,
            textColor=TEAL, spaceBefore=10, spaceAfter=5,
        ),
        "h3": ParagraphStyle(
            "h3", fontName="DejaVu-Bold", fontSize=10, leading=13,
            textColor=NAVY, spaceBefore=8, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body", fontName="DejaVu", fontSize=9, leading=12,
            textColor=black, alignment=TA_JUSTIFY, spaceAfter=5,
        ),
        "bullet": ParagraphStyle(
            "bullet", fontName="DejaVu", fontSize=9, leading=12,
            textColor=black, leftIndent=8, spaceAfter=2,
        ),
        "small": ParagraphStyle(
            "small", fontName="DejaVu", fontSize=8, leading=10,
            textColor=MUTED, alignment=TA_CENTER,
        ),
        "cell": ParagraphStyle(
            "cell", fontName="DejaVu", fontSize=8, leading=10, textColor=black,
        ),
        "cell_h": ParagraphStyle(
            "cell_h", fontName="DejaVu-Bold", fontSize=8, leading=10, textColor=white,
        ),
        "step": ParagraphStyle(
            "step", fontName="DejaVu", fontSize=9, leading=12,
            textColor=black, leftIndent=4, spaceAfter=3,
        ),
        "warn": ParagraphStyle(
            "warn", fontName="DejaVu", fontSize=9, leading=12,
            textColor=HexColor("#9a3412"), backColor=HexColor("#fff7ed"),
            borderPadding=6, spaceBefore=4, spaceAfter=6,
        ),
    }
    return s


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(16 * mm, A4[1] - 12 * mm, A4[0] - 16 * mm, A4[1] - 12 * mm)
    canvas.setFont("DejaVu", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(16 * mm, A4[1] - 10 * mm, "KTB ERP — Fason Yönetimi Kullanım Kılavuzu")
    canvas.drawRightString(A4[0] - 16 * mm, A4[1] - 10 * mm, "UTF-8")
    canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
    canvas.drawCentredString(A4[0] / 2, 8 * mm, f"Sayfa {doc.page}  ·  Europe/Istanbul {NOW}")
    canvas.restoreState()


def tbl(rows, col_widths, s):
    data = []
    for i, row in enumerate(rows):
        sty = s["cell_h"] if i == 0 else s["cell"]
        data.append([Paragraph(str(c), sty) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, -1), "DejaVu"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    for r in range(1, len(rows)):
        if r % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    t.setStyle(TableStyle(style_cmds))
    return t


def bullets(items, s):
    return [
        Paragraph(f"• {it}", s["bullet"]) for it in items
    ]


def build():
    s = styles()
    story = []
    W = A4[0] - 32 * mm

    # Kapak
    story.append(Spacer(1, 40 * mm))
    story.append(Paragraph("KTB ERP", s["cover_title"]))
    story.append(Paragraph("Fason Üretim ve Fason Operasyon Yönetimi", s["cover_title"]))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="60%", thickness=2, color=TEAL, spaceBefore=4, spaceAfter=10))
    story.append(Paragraph("Bilgilendirme ve Kullanım Kılavuzu", s["cover_sub"]))
    story.append(Paragraph(
        "Üretim · Satınalma · Stok · Kalite · Finans · Maliyet · Onay ile entegre",
        s["cover_sub"],
    ))
    story.append(Spacer(1, 16 * mm))
    story.append(Paragraph(f"Belge tarihi: {NOW} (Europe/Istanbul)", s["small"]))
    story.append(Paragraph("Kodlama: UTF-8  ·  Migration: 090_fason_yonetim.sql", s["small"]))
    story.append(PageBreak())

    # 1. Amaç
    story.append(Paragraph("1. Amaç ve kapsam", s["h1"]))
    story.append(Paragraph(
        "Bu kılavuz, KTB ERP içinde fason üretim ve fason operasyon süreçlerinin nasıl "
        "tanımlandığını, hangi ekranlardan yönetildiğini ve uçtan uca belge zincirinin "
        "nasıl işletileceğini anlatır. Fason, bağımsız bir silo değil; mevcut iş süreçlerinin "
        "doğal parçası olarak tasarlanmıştır.",
        s["body"],
    ))
    story.append(Paragraph("İki çalışma modeli", s["h2"]))
    story.append(tbl(
        [
            ["Model", "Ne zaman", "Sipariş modu"],
            ["Fason operasyon", "Rotanın bir/birkaç operasyonu dışarıda (ör. boyama)", "Operasyon"],
            ["Komple fason üretim", "Ürünün tamamı dış üreticiye yaptırılır", "Komple"],
        ],
        [40 * mm, 95 * mm, 30 * mm],
        s,
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Korunan tasarım ayrımları (kritik)", s["h2"]))
    story.append(tbl(
        [
            ["İşlem", "Birbirinden ayrılan kavramlar"],
            ["Malzeme sevki", "Depodan çıkış ≠ malzeme tüketimi"],
            ["Fason teslimatı", "Teslim alınan ≠ kalite kontrolünden geçen"],
            ["Üretim", "Fason hizmeti ≠ üretim gerçekleşmesi"],
            ["Finans", "Fason siparişi ≠ alış faturası"],
            ["Maliyet", "Tahmini maliyet ≠ gerçekleşen maliyet"],
            ["Fire", "Fire bildirimi ≠ otomatik stok silme"],
        ],
        [45 * mm, 120 * mm],
        s,
    ))
    story.append(PageBreak())

    # 2. Menü
    story.append(Paragraph("2. Menü ve ekranlar", s["h1"]))
    story.append(Paragraph(
        "Ayrı bir ana Fason modülü yoktur. Ekranlar <b>Üretim Yönetimi → Fason Operasyon</b> "
        "grubunda toplanır; cari, rota ve iş emri mevcut ekranlarda genişletilmiştir.",
        s["body"],
    ))
    story.append(tbl(
        [
            ["Ekran", "Ne işe yarar"],
            ["Fason Operasyon Takibi", "Açık sipariş / durum özeti"],
            ["Fason Siparişleri", "Sipariş oluşturma, sevk, teslimat, iptal"],
            ["Fason Operasyon Tanımları", "Boyama, kaplama vb. katalog"],
            ["Fason Fiyat Tarifeleri", "Fasoncu / op / ürün fiyatları (tarihsel)"],
            ["Fason Parametreleri", "Şirket kuralları (fire, KK, fazla teslim…)"],
            ["Fasona Malzeme Sevki", "Sevk belgeleri listesi"],
            ["Fason Malzeme Tüketimi", "Tüketim / fire bildirimleri"],
            ["Fason Ürün Teslim Alma", "Teslimat belgeleri"],
            ["Fasoncu Emanet Stokları", "Fasoncuda kalan gerçek stok bakiyesi"],
        ],
        [55 * mm, 110 * mm],
        s,
    ))
    story.append(Paragraph("Genişletilen mevcut ekranlar", s["h2"]))
    story.append(tbl(
        [
            ["Ekran", "Eklenen alanlar"],
            ["Cari Kart", "Fasoncu işareti, kapasite, lead, min. sipariş, fiyat yöntemi, kalite skoru"],
            ["Üretim Rotası / Operasyon", "Fason operasyon, varsayılan fasoncu, birim fiyat, PB, lead gün"],
            ["Üretim Emri", "Fason emri, fasoncu; operasyonlarda sevk/teslim/kabul miktarları"],
        ],
        [50 * mm, 115 * mm],
        s,
    ))
    story.append(PageBreak())

    # 3. Tanımlar
    story.append(Paragraph("3. Başlamadan önce tanımlamalar", s["h1"]))
    story.append(Paragraph("3.1 Fasoncu cari", s["h2"]))
    story.append(Paragraph(
        "Cari Kartta <b>Fasoncu</b> kutusunu işaretleyin. Aynı cari hem normal tedarikçi "
        "hem fasoncu olabilir; ikinci cari kartı oluşturmayın. Lookup anahtarı: "
        "<b>partners-fasoncu</b>.",
        s["body"],
    ))
    story.append(Paragraph("3.2 Operasyon kataloğu", s["h2"]))
    story.append(Paragraph(
        "Fason Operasyon Tanımları ekranından kod, ad, ölçü birimi, standart süre, "
        "fiyatlandırma yöntemi ve kalite kontrol zorunluluğunu girin. Bu tanımlar "
        "üretim rotasındaki fason satırlarıyla birlikte kullanılır.",
        s["body"],
    ))
    story.append(Paragraph("3.3 Fiyat tarifesi", s["h2"]))
    story.append(Paragraph(
        "Fasoncu + (isteğe bağlı) operasyon + (isteğe bağlı) malzeme için birim fiyat, "
        "para birimi ve geçerlilik tarihleri tanımlayın. Geçmiş fiyatlar korunur; "
        "yeni tarife eski siparişlerin birim fiyatını geriye dönük değiştirmez. "
        "Sipariş satırı kendi fiyatını kilitler.",
        s["body"],
    ))
    story.append(Paragraph("3.4 Şirket parametreleri", s["h2"]))
    story.append(tbl(
        [
            ["Parametre", "Anlam"],
            ["Sevk deposu", "Malzeme çıkış deposu"],
            ["Varsayılan / max fire %", "Tolerans ve üst sınır"],
            ["Kısmi teslimat", "Açık/kapalı"],
            ["Fazla teslimat + tolerans", "Varsayılan kapalı — onay/parametre olmadan red"],
            ["KK zorunlu", "Teslimattan sonra kalite"],
            ["Sipariş onay zorunlu", "Onay Yönetimi ile"],
            ["Otomatik SA siparişi", "Varsayılan kapalı"],
            ["Otomatik fason ihtiyacı", "WO’da fason op varsa"],
        ],
        [55 * mm, 110 * mm],
        s,
    ))
    story.append(PageBreak())

    # 4. Akış
    story.append(Paragraph("4. Uçtan uca süreç — Fason operasyon", s["h1"]))
    story.append(Paragraph(
        "Örnek: Sac kesim → Büküm → <b>Boyama (fason)</b> → Montaj → Son kontrol",
        s["body"],
    ))
    steps = [
        ("1. Ürün ağacı ve rota", "Rota satırında Boyama için «Fason operasyon» işaretleyin; varsayılan fasoncu, fiyat ve lead gün girin."),
        ("2. İş emri", "Üretim emri oluşturun. Fason operasyonlar emre kopyalanır. Gerekirse emir üzerinde fasoncu seçin."),
        ("3. Fason siparişi", "Fason Siparişleri → Yeni. Fasoncu, ürün/op, miktar, birim hizmet fiyatı, termin. İlgili iş emrini bağlayın. Numara FS* serisinden üretilir."),
        ("4. Malzeme sevki", "Sipariş üzerinde Sevk. Çıkış deposu → fasoncu emanet deposu (FasonEmanet). Lot/seri girilebilir. Şirket kullanılabilir stok azalır; emanet artar. Bu adım tüketim değildir."),
        ("5. Emanet kontrol", "Fasoncu Emanet Stokları ekranından fasoncuda bekleyen miktarı doğrulayın. Bakiye gerçek stok motorundadır."),
        ("6. Giriş kalite kontrol (GKK)", "Fasoncudan gelen ürünler önce GKK’dan geçer; hemen üretime çıkmaz. Firma parametreleri: <b>qc_on_receipt</b> (teslimatta GKK emri), <b>block_production_until_qc</b> (kabul öncesi produced_qty yok), <b>require_qc_before_consume</b> (açıksa GKK bitmeden tüketim engeli — 5→GKK→6 sırası). Stok Kalitede bekler; onay Kalite → GKK Emirleri ekranından yapılır."),
        ("7. Tüketim / fire", "Tüketim bildirimi: tüketilen + fire + (varsa) iade tutarlı olmalıdır. Emanet azalır; üretim malzeme tüketimi ve fire kaydı oluşur. Stok «silinmez»."),
        ("8. Ürün teslimatı", "Kısmi teslimat desteklenir (ör. 400 + 350 + 250). Kalan miktar hesaplanır. Sipariş+tolerans üstü teslimat engellenir. GKK açıksa teslimat adımı 6 ile birlikte GKK emri üretir."),
        ("9. Üretim güncelleme", "Yalnızca GKK kabul miktarı operasyona yansır; fason op tamamlanmadan bağlı sonraki iç operasyon başlatılmamalıdır."),
        ("10. Fatura ve maliyet", "Alış faturası ile hizmet bedeli. Tahmini (sipariş) ile gerçekleşen (kabul×fiyat / fatura) ayrı izlenir; WO maliyetine fason bileşeni eklenir."),
    ]
    for title, body in steps:
        story.append(Paragraph(f"<b>{title}</b>", s["h3"]))
        story.append(Paragraph(body, s["step"]))

    story.append(PageBreak())
    story.append(Paragraph("5. Komple fason üretim", s["h1"]))
    story.append(Paragraph(
        "Ürünün tamamı dış üreticiye yaptırıldığında sipariş modu <b>Komple</b> seçilir. "
        "Akış aynıdır: fasoncu ve fiyat → sipariş → malzeme sevki (veya fasoncu kendi malzemesi) "
        "→ kısmi teslimat + GKK → (opsiyonel sıkı) tüketim → fatura → maliyet. "
        "Örnek: 1.000 adet tekstil; 1. teslimat 400, 2. teslimat 600.",
        s["body"],
    ))

    story.append(Paragraph("6. Sipariş ekranında tek bakışta izlenenler", s["h1"]))
    story.append(tbl(
        [
            ["Alan", "Anlam"],
            ["Sipariş miktarı", "Planlanan hizmet / ürün miktarı"],
            ["Gönderilen", "Sevk edilen (emanete giden)"],
            ["Fasoncuda bulunan", "Emanet bakiyesi"],
            ["Tüketilen", "Bildirilen tüketim"],
            ["Teslim alınan", "Fiziksel teslimat toplamı"],
            ["Kabul / Red", "KK sonuçları"],
            ["Kalan", "Sipariş − teslim (tolerans kurallarıyla)"],
            ["Toplam fason maliyeti", "Tahmini / gerçekleşen"],
            ["Fatura edilen", "Alış faturası bağlantısı"],
        ],
        [50 * mm, 115 * mm],
        s,
    ))

    story.append(PageBreak())
    story.append(Paragraph("7. Stok ve emanet mantığı", s["h1"]))
    story.append(Paragraph(
        "Fasoncuya gönderilen malzeme şirket deposundan çıkar ancak mülkiyet / değerleme "
        "takibi emanet stokta devam eder. Her fasoncuya ait <b>FasonEmanet</b> rolündeki "
        "depo (`partner_id` bağlı) gerçek bakiyedir; yalnızca rapor satırı değildir. "
        "Böylece stok, MRP ve üretim ekranları fasoncuda bekleyen miktarı doğru görür.",
        s["body"],
    ))
    story.extend(bullets([
        "Sevk → TRANSFER (şirket → emanet)",
        "Tüketim → emanet↓ + üretim tüketimi",
        "İade → emanet↓ + şirket girişi (gerekirse KK/karantina)",
        "Teslimat → mamul/YM stok girişi (KK kabulünden ayrı adım)",
    ], s))

    story.append(Paragraph("8. API özeti (entegrasyon)", s["h1"]))
    story.append(Paragraph(
        "Tüm uçlar <b>/fason</b> öneki altındadır. Örnekler:",
        s["body"],
    ))
    story.append(tbl(
        [
            ["Metot", "Yol", "İş"],
            ["GET/POST", "/fason/parametreler", "Şirket parametreleri"],
            ["CRUD", "/fason/operasyonlar", "Op tanımları"],
            ["CRUD", "/fason/fiyatlar", "Tarifeler"],
            ["CRUD", "/fason/siparisler", "Siparişler"],
            ["POST", "/fason/siparisler/:id/sevk", "Malzeme sevki"],
            ["POST", "/fason/siparisler/:id/tuketim", "Tüketim / fire"],
            ["POST", "/fason/siparisler/:id/iade", "Malzeme iadesi"],
            ["POST", "/fason/siparisler/:id/teslimat", "Ürün teslimatı"],
            ["POST", "/fason/teslimat-satirlari/:id/kalite", "KK sonucu"],
            ["POST", "/fason/siparisler/:id/iptal", "İptal"],
            ["GET", "/fason/emanet-stok", "Emanet bakiye"],
            ["POST", "/fason/is-emri/:id/siparis-olustur", "WO’dan sipariş"],
        ],
        [28 * mm, 72 * mm, 65 * mm],
        s,
    ))

    story.append(PageBreak())
    story.append(Paragraph("9. İstisnai durumlar", s["h1"]))
    story.append(tbl(
        [
            ["Durum", "Beklenen davranış"],
            ["Fazla teslimat", "Parametre/tolerans yoksa engellenir"],
            ["Tolerans üzeri fire", "Kayıt + onay; stok silinmez"],
            ["KK ret", "İade / yeniden işleme / hurda"],
            ["Sipariş iptali", "Açık hareket yoksa veya ters kayıt"],
            ["Fiyat değişikliği", "Yeni tarife; eski sipariş fiyatı sabit"],
            ["Mükerrer teslim/fatura", "Kalan miktar / belge id kontrolü"],
            ["Yetkisiz işlem", "Modül/ekran yetkisi + onay"],
        ],
        [50 * mm, 115 * mm],
        s,
    ))

    story.append(Paragraph("10. Test durumu", s["h1"]))
    story.append(Paragraph(
        "Uçtan uca API/DB senaryosu <b>scripts/test-fason-e2e.mjs</b> ile çalıştırılmıştır: "
        "17/17 başarılı (sipariş, sevk, emanet, tüketim, kısmi teslimat, fazla teslim engeli, "
        "maliyet, iptal). Detay: docs/subcontracting/TEST_REPORT.md",
        s["body"],
    ))

    story.append(Paragraph("11. İlgili dokümanlar", s["h1"]))
    story.extend(bullets([
        "docs/subcontracting/CURRENT_SYSTEM_ANALYSIS.md",
        "docs/subcontracting/SUBCONTRACTING_ARCHITECTURE.md",
        "docs/subcontracting/MENU_STRUCTURE.md",
        "docs/subcontracting/MASTER_DATA.md",
        "docs/subcontracting/BUSINESS_WORKFLOWS.md",
        "docs/subcontracting/DATABASE_DESIGN.md",
        "docs/subcontracting/INTEGRATION_MAP.md",
        "docs/subcontracting/COSTING_RULES.md",
        "docs/subcontracting/PERMISSIONS_AND_APPROVALS.md",
        "docs/subcontracting/TEST_REPORT.md",
    ], s))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(
        "Nihai hedef: Fasoncu tanımından planlamaya, sevkiyattan emanet stoka, "
        "teslimattan kaliteye, faturadan maliyet analizine kadar tüm sürecin tek entegre "
        "ERP üzerinden yönetilmesi.",
        s["body"],
    ))

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="KTB ERP Fason Yönetimi Kullanım Kılavuzu",
        author="KTB ERP",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_bytes(OUT.read_bytes())
    print(f"OK {OUT} bytes={OUT.stat().st_size} pages≈")
    print(f"OK {ARTIFACT}")


if __name__ == "__main__":
    build()
