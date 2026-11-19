#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("DejaVu", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))

OUT = Path("docs/go-live/pdf/KTB_ERP_P2_Derinlestirme_Raporu.pdf")
ART = Path("/opt/cursor/artifacts/KTB_ERP_P2_Derinlestirme_Raporu.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY, TEAL, LIGHT, BORDER, MUTED = HexColor("#1a365d"), HexColor("#0d9488"), HexColor("#f0f9ff"), HexColor("#cbd5e1"), HexColor("#475569")
GREEN, ORANGE = HexColor("#166534"), HexColor("#9a3412")
NOW = datetime.now(ZoneInfo("Europe/Istanbul")).strftime("%d.%m.%Y %H:%M")


def S():
    return {
        "cover": ParagraphStyle("c", fontName="DejaVu-Bold", fontSize=18, leading=24, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8),
        "sub": ParagraphStyle("s", fontName="DejaVu", fontSize=11, leading=14, textColor=MUTED, alignment=TA_CENTER),
        "h1": ParagraphStyle("h1", fontName="DejaVu-Bold", fontSize=12, leading=16, textColor=NAVY, spaceBefore=10, spaceAfter=5),
        "h2": ParagraphStyle("h2", fontName="DejaVu-Bold", fontSize=10, leading=13, textColor=TEAL, spaceBefore=6, spaceAfter=3),
        "body": ParagraphStyle("b", fontName="DejaVu", fontSize=9, leading=12, alignment=TA_JUSTIFY, spaceAfter=4),
        "bullet": ParagraphStyle("bu", fontName="DejaVu", fontSize=8.5, leading=11, leftIndent=4, spaceAfter=2),
        "cell": ParagraphStyle("ce", fontName="DejaVu", fontSize=7.5, leading=10),
        "cell_h": ParagraphStyle("ch", fontName="DejaVu-Bold", fontSize=7.5, leading=10, textColor=white),
        "small": ParagraphStyle("sm", fontName="DejaVu", fontSize=8, textColor=MUTED, alignment=TA_CENTER),
        "ok": ParagraphStyle("ok", fontName="DejaVu-Bold", fontSize=9, textColor=GREEN, spaceAfter=2),
        "no": ParagraphStyle("no", fontName="DejaVu-Bold", fontSize=9, textColor=ORANGE, spaceAfter=2),
    }


def hf(c, doc):
    c.saveState()
    c.setStrokeColor(BORDER); c.setLineWidth(0.4)
    c.line(16*mm, A4[1]-12*mm, A4[0]-16*mm, A4[1]-12*mm)
    c.setFont("DejaVu", 7); c.setFillColor(MUTED)
    c.drawString(16*mm, A4[1]-10*mm, "KTB ERP — P2 Derinleştirme Raporu")
    c.drawRightString(A4[0]-16*mm, A4[1]-10*mm, "UTF-8")
    c.line(16*mm, 12*mm, A4[0]-16*mm, 12*mm)
    c.drawCentredString(A4[0]/2, 8*mm, f"Sayfa {doc.page} · Europe/Istanbul {NOW}")
    c.restoreState()


def tbl(rows, widths, s):
    data = [[Paragraph(str(x), s["cell_h"] if i == 0 else s["cell"]) for x in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1)
    cmds = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.35, BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    for r in range(1, len(rows)):
        if r % 2 == 0: cmds.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    t.setStyle(TableStyle(cmds)); return t


def build():
    s = S(); story = []
    story += [Spacer(1, 24*mm), Paragraph("KTB ERP", s["cover"]), Paragraph("P2 Derinleştirme — İşlem Raporu", s["cover"]),
              HRFlowable(width="55%", thickness=2, color=TEAL, spaceBefore=6, spaceAfter=10),
              Paragraph("Kapasite, iade ekranları, banka CSV, sabit kıymet, bütçe, CMMS iskelet, firma scope", s["sub"]),
              Paragraph(f"Rapor: {NOW} (Europe/Istanbul) · Dal: cursor/erp-p2-derinlestirme-4f63 · Mig 092", s["small"]), PageBreak()]

    story.append(Paragraph("1. Özet", s["h1"]))
    story.append(Paragraph(
        "P2 maddelerinden mevcut mimariyle güvenli olanlar uygulandı. Finite CRP motoru, varyant BOM motoru, "
        "canlı e-Defter, MT940, app.js bölme ve mobil terminal bu turda yapılmadı.",
        s["body"]))

    story.append(Paragraph("2. Yapılanlar", s["h1"]))
    story.append(Paragraph("2.1 Kapasite / iş merkezi yükü", s["h2"]))
    story.append(Paragraph("YAPILDI (kaba CRP iyileştirme — finite değil)", s["ok"]))
    for b in ["work_center_load: routing_operations.op_time/setup_time ile yük hesabı (CRP_OP_TIME).",
              "Süre yoksa eski 0.1 saat/birim fallback.",
              "UI’da uses_route_time kolonu."]:
        story.append(Paragraph(f"• {b}", s["bullet"]))

    story.append(Paragraph("2.2 İade master ekranları", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph("Satış İade Faturaları + Alış İade Faturaları (filtreli /invoices). Mevcut iade API’leri korunur.", s["body"]))

    story.append(Paragraph("2.3 Banka CSV import", s["h2"]))
    story.append(Paragraph("YAPILDI (MT940 yok)", s["ok"]))
    story.append(Paragraph("POST /banka-mutabakat/import-csv — tarih;tutar;yon;aciklama;ref", s["body"]))

    story.append(Paragraph("2.4 Sabit kıymet + amortisman stub", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph("/sabit-kiymetler CRUD + POST /:id/amortisman (düz hat aylık) + depreciation_runs log. GL fiş bağlaması sonraki.", s["body"]))

    story.append(Paragraph("2.5 GL bütçe iskeleti", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph("gl_budgets / gl_budget_lines + /gl-butceler/:id/karsilastirma (yevmiye net).", s["body"]))

    story.append(Paragraph("2.6 CMMS hafif", s["h2"]))
    story.append(Paragraph("YAPILDI (iskelet)", s["ok"]))
    story.append(Paragraph("maintenance_orders + /bakim-emirleri + Üretim menü bölümü. Periyodik plan/OEE yok.", s["body"]))

    story.append(Paragraph("2.7 Firma scope genişletme", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph(
        "requireCompanyRecord helper. GET scope: production_orders, goods_receipts, boms, routings, "
        "sales_quotations, shipment_orders, journal_entries, plants (+ önceki go-live seti).",
        s["body"]))

    story.append(Paragraph("2.8 Concurrent smoke", s["h2"]))
    story.append(Paragraph("YAPILDI", s["ok"]))
    story.append(Paragraph("scripts/smoke-concurrent.js — paralel liste GET + çapraz firma 404.", s["body"]))

    story.append(PageBreak())
    story.append(Paragraph("3. Yapılamayanlar (SKIP)", s["h1"]))
    story.append(tbl([
        ["Madde", "Neden"],
        ["Finite CRP / çizelge tahtası", "Takvim, dispatch, kilitleme motoru gerekir"],
        ["Varyant BOM motoru", "Konfigüratör + patlatma — yeni domain"],
        ["MT940 / e-Defter canlı", "Parser + yasal paket / entegratör"],
        ["Amortisman → otomatik GL fiş", "Hesap belirleme onayı sonrası"],
        ["public/app.js bölme", "Tek PR’da regresyon riski yüksek"],
        ["Mobil saha terminali", "Ayrı yüzey"],
    ], [55*mm, 110*mm], s))

    story.append(Paragraph("4. Test", s["h1"]))
    story.append(Paragraph("tests/p2_smoke.test.js — 4/4 PASS (kıymet+amortisman, CSV, bakım, iş merkezi yükü).", s["body"]))
    story.append(Paragraph("Migration 092 uygulandı.", s["body"]))

    story.append(Paragraph("5. Sonuç", s["h1"]))
    story.append(Paragraph(
        "P2’nin satılabilir / operasyonel iskeletleri eklendi. Sistem hâlâ pilot seviyesinde; "
        "finite üretim çizelgesi ve yasal e-Defter olmadan “ileri üretim ERP” iddiası yapılmamalı.",
        s["body"]))

    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=16*mm, bottomMargin=16*mm,
                            title="KTB ERP P2 Derinleştirme Raporu", author="KTB ERP")
    doc.build(story, onFirstPage=hf, onLaterPages=hf)
    ART.parent.mkdir(parents=True, exist_ok=True)
    ART.write_bytes(OUT.read_bytes())
    print("OK", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    build()
