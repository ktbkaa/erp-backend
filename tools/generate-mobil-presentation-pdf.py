#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOBIL tekerlekli sandalye — UTF-8 sunum PDF."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable, ListFlowable, ListItem,
)

TR = timezone(timedelta(hours=3))
OUT = Path("/opt/cursor/artifacts/mobil-demo")
SHOTS_JSON = OUT / "shots.json"
SUMMARY = OUT / "summary.json"
PDF = OUT / "MOBIL_Tekerlekli_Sandalye_Sunum.pdf"

# UTF-8 / Türkçe glyph desteği
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]
FONT_BOLD_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]
FONT = "Helvetica"
FONT_B = "Helvetica-Bold"
for p in FONT_CANDIDATES:
    if os.path.isfile(p):
        pdfmetrics.registerFont(TTFont("MobilSans", p))
        FONT = "MobilSans"
        break
for p in FONT_BOLD_CANDIDATES:
    if os.path.isfile(p):
        pdfmetrics.registerFont(TTFont("MobilSans-Bold", p))
        FONT_B = "MobilSans-Bold"
        break


def now_tr() -> str:
    return datetime.now(TR).strftime("%d.%m.%Y %H:%M") + " (Europe/Istanbul)"


def styles():
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=FONT_B, fontSize=20, spaceAfter=10, textColor=colors.HexColor("#0b3d2e")),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=FONT_B, fontSize=13, spaceBefore=8, spaceAfter=6, textColor=colors.HexColor("#145c45")),
        "body": ParagraphStyle("body", parent=base["Normal"], fontName=FONT, fontSize=10, leading=14),
        "small": ParagraphStyle("small", parent=base["Normal"], fontName=FONT, fontSize=8.5, leading=11, textColor=colors.HexColor("#333")),
        "meta": ParagraphStyle("meta", parent=base["Normal"], fontName=FONT, fontSize=8, textColor=colors.HexColor("#666")),
        "bullet": ParagraphStyle("bullet", parent=base["Normal"], fontName=FONT, fontSize=10, leading=13, leftIndent=8),
    }


def img(path, w=250*mm, h=130*mm):
    if not path or not os.path.isfile(path):
        return Paragraph("(görüntü yok)", styles()["small"])
    im = Image(path)
    im._restrictSize(w, h)
    return im


def build():
    data = json.loads(SHOTS_JSON.read_text(encoding="utf-8"))
    summary = data.get("summary") or json.loads(SUMMARY.read_text(encoding="utf-8"))
    st = styles()
    doc = SimpleDocTemplate(
        str(PDF), pagesize=landscape(A4),
        leftMargin=12*mm, rightMargin=12*mm, topMargin=12*mm, bottomMargin=12*mm,
    )
    story = []

    # Kapak
    story.append(Paragraph("Mobilite Tekerlekli Sandalye A.Ş.", st["h1"]))
    story.append(Paragraph("ERP Uçtan Uca Süreç Sunumu — MOBIL", st["h2"]))
    story.append(Paragraph(f"Oluşturulma: {now_tr()}", st["meta"]))
    story.append(Paragraph(
        f"Firma kodu: <b>{summary['firma']['code']}</b> · "
        f"Genel Merkez: {summary['plants']['gm']['code']} · "
        f"Fabrika: {summary['plants']['fb']['code']}",
        st["body"],
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#145c45")))
    story.append(Paragraph("Kurgu", st["h2"]))
    for b in [
        "İki iş yeri: Genel Merkez (MOBIL-GM) ve Fabrika (MOBIL-FB).",
        "Hammadde, mamul, cari, BOM ve rota her iki iş yerine bağlıdır.",
        "Sarf malzemeler yalnızca Genel Merkez’de kayıtlıdır.",
        "Sarf satınalma mal kabulünde kalite (GKK) sürecine girmez.",
        "Fabrika hammaddeleri: Mal kabul → Giriş kontrol → GKK → Hammadde deposu.",
        "Üretim: İş emri → operasyonlar → CKK → Mamul → sevk / irsaliye / fatura.",
    ]:
        story.append(Paragraph(f"• {b}", st["bullet"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Belge özeti", st["h2"]))
    docs = summary.get("docs") or {}
    rows = [[Paragraph("<b>Belge</b>", st["small"]), Paragraph("<b>No / değer</b>", st["small"])]]
    for k, v in docs.items():
        rows.append([Paragraph(str(k), st["small"]), Paragraph(str(v), st["small"])])
    t = Table(rows, colWidths=[70*mm, 160*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d8efe6")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#bbb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Paragraph(
        f"Sarf QC bayrağı: gkk_gerekli=<b>{docs.get('sarf_gkk')}</b> · "
        f"Hammadde QC: gkk_gerekli=<b>{docs.get('hammadde_gkk')}</b>",
        st["body"],
    ))
    story.append(PageBreak())

    # Slaytlar
    for i, r in enumerate(data.get("results") or []):
        story.append(Paragraph(f"{i+1}. {r.get('title')}", st["h2"]))
        story.append(Paragraph(r.get("note") or "", st["body"]))
        story.append(Paragraph(
            f"Ekran: <b>{r.get('screen') or '—'}</b> · "
            f"Başlık: {r.get('snap', {}).get('title', '')} · "
            f"Satır: {r.get('snap', {}).get('rows', '')}",
            st["small"],
        ))
        story.append(Spacer(1, 4))
        story.append(img(r.get("path"), 260*mm, 125*mm))
        if r.get("formShot") and os.path.isfile(r["formShot"]):
            story.append(Spacer(1, 4))
            story.append(Paragraph("Kayıt içi (Düzelt formu)", st["small"]))
            story.append(img(r["formShot"], 260*mm, 115*mm))
        story.append(PageBreak())

    # Teknik notlar
    story.append(Paragraph("Kod / yapı düzeltmeleri", st["h2"]))
    for b in [
        "items.item_type: Sarf tipi eklendi (migration 064).",
        "Mal kabul: Sarf veya kalite_control_gerekli=false ise GKK/giriş kontrol atlanır; stok doğrudan Normal/Sarf depoya alınır.",
        "Üretim operasyon tamamla: son operasyonda output_item_id yoksa emir mamulü çıktı olarak kullanılır (CKK).",
        "Purge: warehouses → plants sırası düzeltildi; rastgele tekstil firma eşlemesi kaldırıldı.",
    ]:
        story.append(Paragraph(f"• {b}", st["bullet"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Stok örnekleri", st["h2"]))
    items = summary.get("items") or {}
    for k, v in items.items():
        story.append(Paragraph(f"• {k}: <b>{v}</b>", st["small"]))

    doc.build(story)
    print("Wrote", PDF)


if __name__ == "__main__":
    build()
