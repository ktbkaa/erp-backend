#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Go-live sertleştirme — işlem sonrası detaylı UTF-8 PDF rapor."""

from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))

OUT = Path("docs/go-live/pdf/KTB_ERP_Go_Live_Sertlestirme_Raporu.pdf")
ART = Path("/opt/cursor/artifacts/KTB_ERP_Go_Live_Sertlestirme_Raporu.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = HexColor("#1a365d")
TEAL = HexColor("#0d9488")
LIGHT = HexColor("#f0f9ff")
BORDER = HexColor("#cbd5e1")
MUTED = HexColor("#475569")
GREEN = HexColor("#166534")
ORANGE = HexColor("#9a3412")
IST = ZoneInfo("Europe/Istanbul")
NOW = datetime.now(IST).strftime("%d.%m.%Y %H:%M")


def S():
    return {
        "cover": ParagraphStyle("c", fontName="DejaVu-Bold", fontSize=18, leading=24, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8),
        "sub": ParagraphStyle("s", fontName="DejaVu", fontSize=11, leading=14, textColor=MUTED, alignment=TA_CENTER, spaceAfter=6),
        "h1": ParagraphStyle("h1", fontName="DejaVu-Bold", fontSize=13, leading=17, textColor=NAVY, spaceBefore=12, spaceAfter=6),
        "h2": ParagraphStyle("h2", fontName="DejaVu-Bold", fontSize=10, leading=13, textColor=TEAL, spaceBefore=8, spaceAfter=4),
        "body": ParagraphStyle("b", fontName="DejaVu", fontSize=9, leading=12, alignment=TA_JUSTIFY, spaceAfter=4),
        "bullet": ParagraphStyle("bu", fontName="DejaVu", fontSize=8.5, leading=11, leftIndent=6, spaceAfter=2),
        "cell": ParagraphStyle("ce", fontName="DejaVu", fontSize=7.5, leading=10),
        "cell_h": ParagraphStyle("ch", fontName="DejaVu-Bold", fontSize=7.5, leading=10, textColor=white),
        "small": ParagraphStyle("sm", fontName="DejaVu", fontSize=8, leading=10, textColor=MUTED, alignment=TA_CENTER),
        "ok": ParagraphStyle("ok", fontName="DejaVu-Bold", fontSize=9, leading=12, textColor=GREEN, spaceAfter=3),
        "no": ParagraphStyle("no", fontName="DejaVu-Bold", fontSize=9, leading=12, textColor=ORANGE, spaceAfter=3),
    }


def hf(c, doc):
    c.saveState()
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.4)
    c.line(16 * mm, A4[1] - 12 * mm, A4[0] - 16 * mm, A4[1] - 12 * mm)
    c.setFont("DejaVu", 7)
    c.setFillColor(MUTED)
    c.drawString(16 * mm, A4[1] - 10 * mm, "KTB ERP — Go-live Sertleştirme Raporu")
    c.drawRightString(A4[0] - 16 * mm, A4[1] - 10 * mm, "UTF-8")
    c.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
    c.drawCentredString(A4[0] / 2, 8 * mm, f"Sayfa {doc.page} · Europe/Istanbul {NOW}")
    c.restoreState()


def tbl(rows, widths, s):
    data = [[Paragraph(str(x), s["cell_h"] if i == 0 else s["cell"]) for x in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]
    for r in range(1, len(rows)):
        if r % 2 == 0:
            cmds.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    t.setStyle(TableStyle(cmds))
    return t


def build():
    s = S()
    story = []
    story.append(Spacer(1, 28 * mm))
    story.append(Paragraph("KTB ERP", s["cover"]))
    story.append(Paragraph("Go-live Sertleştirme — İşlem Raporu", s["cover"]))
    story.append(HRFlowable(width="55%", thickness=2, color=TEAL, spaceBefore=6, spaceAfter=10))
    story.append(Paragraph(
        "P0/P1 olgunluk açıklarının mevcut kod tabanı içinde kapatılması; "
        "yapılanlar, testler ve yapılamayanlar.",
        s["sub"],
    ))
    story.append(Paragraph(f"Rapor tarihi: {NOW} (Europe/Istanbul)", s["small"]))
    story.append(Paragraph("Dal: cursor/erp-go-live-sertlestirme-4f63 · Migration: 091", s["small"]))
    story.append(PageBreak())

    story.append(Paragraph("1. Yönetici özeti", s["h1"]))
    story.append(Paragraph(
        "Önceki değerlendirmede go-live olgunluğu ~%45–50 idi. Bu çalışmada güvenlik varsayılanı, "
        "stok bütünlüğü (BUG-008/009), GKK/CKK ekran bağlama, GİB stratejisi, 3-way fatura kapısı, "
        "firma izolasyonu (kritik belgeler), cari yaşlandırma, banka mutabakat iskeleti, stok→GL "
        "opsiyonu, iade aksiyonları ve fason→taslak fatura eklendi. Canlı GİB adapter, finite CRP, "
        "tam banka import ve tüm GET-by-id tarama bu turda tamamlanmadı.",
        s["body"],
    ))
    story.append(Paragraph(
        "Tahmini etki: go-live risk skoru ~%45–50 → ~%55–60 (pilot eşiğine daha yakın; "
        "ticari unsupervised hazır değil).",
        s["body"],
    ))

    story.append(Paragraph("2. Yapılan işlemler (detay)", s["h1"]))

    story.append(Paragraph("2.1 P0 — Auth sertleştirme", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    for b in [
        "system_parameters.AUTH_ZORUNLU = Evet (migration 091).",
        "authJwt: NODE_ENV=production veya ERP_AUTH_REQUIRED=true → zorunlu JWT; ERP_AUTH_SOFT=1 lokal/CI soft.",
        "parametre varsayılanı Hayir → Evet; header spoof AUTH zorunluyken 403.",
        "Login: soft modda parolasız demo; prod’da parola şart.",
        "Test helper ERP_AUTH_SOFT=1; auth.test spoof senaryosu geçti.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.2 P0 — BUG-008 lot çıkış", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    for b in [
        "stokHareketService: lot_policy=Zorunlu → lotsuz çıkış 400 (PARTI_ZORUNLU).",
        "Lot’lu bakiye varken lotsuz çıkış engeli (PARTI_CIKIS_ENGEL).",
        "warehouseItemBalance(matchNullLot): null lot yalnız null-lot kovası — lot stoku fungible değil.",
        "Invariant test: go_live_invariants.test.js yeşil.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.3 P0 — BUG-009 CKK→mamul", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    for b in [
        "kaliteService createQcOrdersFromMovementCode: transferBetweenWarehouses’a partiId geçildi.",
        "QC deposunda Kullanilabilir→Kalitede audit izli transferStockStatus.",
        "approveQcOrder: hedefte Kalitede→Kullanilabilir raw UPDATE yerine transferStockStatus.",
        "Bug tracker BUG-008/009 → fixed.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.4 P0 — GKK/CKK ekranları", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph(
        "public/app.js içinde kk-emirleri-gkk/ckk stub’ları buildKkOrderScreen({...}) ile değiştirildi "
        "(endpoint /kk-emirleri?direction=, onay aksiyonu, alanlar, ölçüm grid).",
        s["body"],
    ))

    story.append(Paragraph("2.5 P0 — GİB stratejisi", s["h2"]))
    story.append(Paragraph("YAPILDI (doküman + koruma; canlı adapter YOK)", s["ok"]))
    for b in [
        "docs/go-live/GIB_STRATEGY.md — v1 harici entegratör kararı.",
        "GIB_CANLI parametresi; simulate=false + GIB_CANLI=Hayir → 409.",
        "provider yokken canlı Gonderildi yazılmaz; provider varken live-pending (sahte ACK yok).",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.6 P0 — Go-live kapsam kesimi", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph("docs/go-live/GO_LIVE_SCOPE.md — gün-1 zorunlu / opsiyonel / dışarıda listeler.", s["body"]))

    story.append(PageBreak())
    story.append(Paragraph("2.7 P1 — İade zinciri", s["h2"]))
    story.append(Paragraph("KISMEN YAPILDI", s["ok"]))
    story.append(Paragraph(
        "Mevcut API’ler (delivery_notes/:id/iade, mal-kabuller/:id/iade, invoices/:id/iade) UI’ya "
        "secondaryAction olarak bağlandı. Ayrı iade master ekranı / is_return filtre listesi ve "
        "tam RMA iş akışı sonraki tur.",
        s["body"],
    ))

    story.append(Paragraph("2.8 P1 — AP / 3-way / fason fatura", s["h2"]))
    story.append(Paragraph("YAPILDI (sertleştirme)", s["ok"]))
    for b in [
        "ALIS_3WAY_ZORUNLU=Evet: alış muhasebeleştirmede Uyumlu match şart (?force=1 aşım).",
        "faturaEslestirmeService: purchase_order_id alanı düzeltildi.",
        "POST /fason/siparisler/:id/fatura-olustur → taslak Alis fatura (mükerrer engeli).",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.9 P1 — Banka mutabakat + yaşlandırma", s["h2"]))
    story.append(Paragraph("YAPILDI (iskelet)", s["ok"]))
    for b in [
        "Tablolar bank_statements / bank_statement_lines.",
        "API /banka-mutabakat (CRUD + satır eşleştir + otomatik tutar/tarih/yön).",
        "API /finans-yaslandirma (0 / 1–30 / 31–60 / 61–90 / 90+).",
        "Finans menü ekranları: Banka Mutabakatı, Cari Yaşlandırma.",
        "CSV/MT940 import, çek-senet, tam mutabakat kapanış → yapılmadı.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.10 P1 — Stok → GL", s["h2"]))
    story.append(Paragraph("YAPILDI (opsiyonel parametre)", s["ok"]))
    story.append(Paragraph(
        "STOK_MUHASEBE=Hayir varsayılan. Evet iken stokMuhasebeService maliyet×miktar ile taslak fiş "
        "(hesap belirleme STOK_HAREKET: 150/600). Hesap yoksa stok işlemi bozulmaz.",
        s["body"],
    ))

    story.append(Paragraph("2.11 P1 — Firma izolasyonu GET-by-id", s["h2"]))
    story.append(Paragraph("KISMEN YAPILDI", s["ok"]))
    story.append(Paragraph(
        "assertCompanyRecord eklendi: invoices, sales_orders, purchase_orders, delivery_notes, "
        "qc_orders, e_document_queue. Tüm route’ların tarama/otomatik middleware’i sonraki tur.",
        s["body"],
    ))

    story.append(Paragraph("3. Yapılamayan / bilinçli ertelenen", s["h1"]))
    story.append(tbl(
        [
            ["Madde", "Neden / durum"],
            ["Canlı GİB SOAP/REST adapter", "Entegratör sözleşmesi + sertifika gerekir; sahte ACK yazılmadı"],
            ["Finite CRP / OEE / CMMS", "Kapsam dışı (P2); lead/kapasite alanları mevcut"],
            ["Tam banka ekstre import (MT940/CSV)", "Tablo+eşleştirme var; parser yok"],
            ["Çek-senet / sabit kıymet / e-Defter", "Finans Faz-3"],
            ["Tüm GET-by-id otomatik firma middleware", "Kritik belgeler yapıldı; HR/CRM/BOM vb. kalan"],
            ["Browser E2E / yük testi", "Ortam/CI; API invariant testleri eklendi"],
            ["Ayrı satış/alış iade master ekranları", "Aksiyon bağlandı; liste ekranı sonraki"],
            ["FIFO maliyet + dönem revalüasyon", "Ağırlıklı ortalama + opsiyonel fiş"],
        ],
        [55 * mm, 110 * mm],
        s,
    ))

    story.append(PageBreak())
    story.append(Paragraph("4. Değişen dosyalar", s["h1"]))
    story.append(tbl(
        [
            ["Dosya", "Değişiklik"],
            ["db/migrations/091_go_live_sertlestirme.sql", "Auth, param, banka tabloları, STOK_HAREKET kuralı"],
            ["src/middleware/authJwt.js", "Prod/env zorunlu auth"],
            ["src/services/stokHareketService.js", "BUG-008 + stok GL hook"],
            ["src/services/kaliteService.js", "BUG-009 lot + statü"],
            ["src/services/stokMuhasebeService.js", "Yeni — stok→fiş"],
            ["src/services/eBelgeAdapterService.js", "Canlı sahte Gonderildi yok"],
            ["src/services/faturaEslestirmeService.js", "PO id düzeltmesi"],
            ["routes/invoices.js", "3-way kapısı + firma scope"],
            ["routes/sales_orders|purchase_orders|delivery_notes|qc_orders|e_belge", "Firma GET"],
            ["routes/finans_yaslandirma.js", "Yeni aging"],
            ["routes/banka_mutabakat.js", "Yeni mutabakat"],
            ["routes/fason.js", "fatura-olustur"],
            ["routes/auth.js", "Soft/parola davranışı"],
            ["public/app.js", "GKK/CKK, iade aksiyon, finans ekranlar"],
            ["index.js", "Yeni route mount"],
            ["tests/go_live_invariants.test.js", "Yeni invariant suite"],
            ["docs/go-live/*", "GİB + kapsam + bu PDF"],
        ],
        [70 * mm, 95 * mm],
        s,
    ))

    story.append(Paragraph("5. Test sonuçları", s["h1"]))
    story.append(Paragraph(
        "ERP_AUTH_SOFT=1 node --test tests/go_live_invariants.test.js tests/auth.test.js → "
        "7/7 PASS (BUG-008, firma scope, yaşlandırma, auth spoof, JWT).",
        s["body"],
    ))
    story.append(Paragraph("Migration 091 uygulandı (bank_statements, AUTH_ZORUNLU=Evet).", s["body"]))

    story.append(Paragraph("6. Operasyon notları (müşteri / deploy)", s["h1"]))
    for b in [
        "Prod: NODE_ENV=production veya ERP_AUTH_REQUIRED=true; ERP_AUTH_SOFT kaldırın.",
        "Kullanıcılara parola atayın (AUTH_ZORUNLU=Evet iken parolasız login kapalı).",
        "GİB: GIB_CANLI=Hayir bırakın veya entegratör bağlanana kadar simulate kullanın.",
        "STOK_MUHASEBE’yi hesap planı (150/600) doğrulanmadan Evet yapmayın.",
        "ALIS_3WAY_ZORUNLU=Evet: muhasebe öncesi /eslestir veya /eslestirme-onay.",
    ]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("7. Sonuç", s["h1"]))
    story.append(Paragraph(
        "Bu tur, gerçek müşteri öncesi en kritik bütünlük ve güvenlik açıklarının bir kısmını "
        "kapattı. Sistem hâlâ “kontrollü pilot” seviyesinde; canlı GİB ve tam finans kapanış "
        "paketi olmadan unsupervised production önerilmez. Sonraki öncelik: kalan firma scope "
        "taraması, iade master ekranları, banka import, entegratör adapter.",
        s["body"],
    ))

    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
        title="KTB ERP Go-live Sertleştirme Raporu", author="KTB ERP",
    )
    doc.build(story, onFirstPage=hf, onLaterPages=hf)
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_bytes(OUT.read_bytes())
    print(f"OK {OUT} {OUT.stat().st_size}")
    print(f"OK {ART}")


if __name__ == "__main__":
    build()
