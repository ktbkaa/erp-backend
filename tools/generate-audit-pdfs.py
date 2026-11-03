#!/usr/bin/env python3
"""Sistem sınama + manuel ekran test PDF raporları (Europe/Istanbul zamanı)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable,
)

TR = timezone(timedelta(hours=3))
OUT = Path("/opt/cursor/artifacts")
AUDIT = OUT / "system-audit" / "results.json"
MANUEL = OUT / "manuel-test" / "results.json"
PDF_AUDIT = OUT / "ERP_Sistem_Sinama_Raporu.pdf"
PDF_MANUEL = OUT / "ERP_Manuel_Ekran_Test_Raporu.pdf"


def now_tr() -> str:
    return datetime.now(TR).strftime("%d.%m.%Y %H:%M") + " (Europe/Istanbul)"


def styles():
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontSize=16, spaceAfter=8, textColor=colors.HexColor("#0f2744")),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontSize=12, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#1a3a5c")),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=9, leading=12),
        "small": ParagraphStyle("small", parent=base["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#444")),
        "meta": ParagraphStyle("meta", parent=base["Normal"], fontSize=8, textColor=colors.HexColor("#666")),
        "ok": ParagraphStyle("ok", parent=base["Normal"], fontSize=8, textColor=colors.HexColor("#0a7a32")),
        "bad": ParagraphStyle("bad", parent=base["Normal"], fontSize=8, textColor=colors.HexColor("#a11")),
        "warn": ParagraphStyle("warn", parent=base["Normal"], fontSize=8, textColor=colors.HexColor("#9a6b00")),
    }


def sev_style(s, st):
    if s in ("P0", "Hata"):
        return st["bad"]
    if s in ("P1", "Uyarı"):
        return st["warn"]
    if s in ("OK", "Tamam"):
        return st["ok"]
    return st["small"]


def build_audit_pdf():
    data = json.loads(AUDIT.read_text())
    st = styles()
    doc = SimpleDocTemplate(str(PDF_AUDIT), pagesize=A4, leftMargin=14*mm, rightMargin=14*mm, topMargin=14*mm, bottomMargin=14*mm)
    story = []
    story.append(Paragraph("ERP Sistem Sınama Raporu", st["h1"]))
    story.append(Paragraph(f"Oluşturulma: {now_tr()}", st["meta"]))
    story.append(Paragraph(f"Kaynak JSON: {data.get('generatedAt')} · TEKS firma id={data.get('firmaTeks')}", st["meta"]))
    story.append(Spacer(1, 6))
    sm = data.get("summary", {})
    story.append(Paragraph(
        f"<b>Özet:</b> P0={sm.get('P0',0)} · P1={sm.get('P1',0)} · INFO={sm.get('INFO',0)} · OK={sm.get('OK',0)}",
        st["body"],
    ))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#ccd")))
    story.append(Paragraph("Bulgular", st["h2"]))

    # Critical first
    findings = data.get("findings", [])
    ordered = sorted(findings, key=lambda f: {"P0": 0, "P1": 1, "INFO": 2, "OK": 3}.get(f.get("severity"), 9))
    rows = [[Paragraph("<b>Sev</b>", st["small"]), Paragraph("<b>Alan</b>", st["small"]),
             Paragraph("<b>Başlık</b>", st["small"]), Paragraph("<b>Detay</b>", st["small"])]]
    for f in ordered:
        rows.append([
            Paragraph(f.get("severity", ""), sev_style(f.get("severity"), st)),
            Paragraph(f.get("area", ""), st["small"]),
            Paragraph(f.get("title", ""), st["small"]),
            Paragraph((f.get("detail") or "")[:220], st["small"]),
        ])
    t = Table(rows, colWidths=[18*mm, 18*mm, 55*mm, 85*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef5")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#ccc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph("Uygulanan düzeltmeler (bu koşuda)", st["h2"]))
    fixes = [
        "Liste ↔ GET firma kapsamı hizalandı (andStokFirma + assertStokFirmaKayit: company_id / item_plants / item_company_params).",
        "Stok ve cari PUT/DELETE için firma assert eklendi.",
        "Stok iş yeri bağında plant.company_id ile parametre firması doğrulanıyor.",
        "Tablo Bilgileri / SQL ekranlarında #screenTitle güncellenmiyordu — düzeltildi.",
        "TEKS-GY (plants.id=1) company_id daha önce TEST firmasından TEKS’e çekilmişti; mismatch 0.",
    ]
    for x in fixes:
        story.append(Paragraph(f"• {x}", st["body"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Not: Soft oturum (cihazda kullanıcı sormama) bilinçli UX olarak bırakıldı; güvenlik kapısı ayrı karar.",
        st["small"],
    ))
    doc.build(story)
    print("Wrote", PDF_AUDIT)


def score_color(score: int):
    if score >= 85:
        return colors.HexColor("#0a7a32")
    if score >= 70:
        return colors.HexColor("#9a6b00")
    return colors.HexColor("#a11")


def build_manuel_pdf():
    data = json.loads(MANUEL.read_text())
    st = styles()
    doc = SimpleDocTemplate(str(PDF_MANUEL), pagesize=A4, leftMargin=12*mm, rightMargin=12*mm, topMargin=12*mm, bottomMargin=12*mm)
    story = []
    firma = data.get("firma", {})
    sm = data.get("summary", {})
    story.append(Paragraph("ERP Manuel Ekran Test Raporu", st["h1"]))
    story.append(Paragraph(
        f"Firma: <b>{firma.get('code')}</b> — {firma.get('name')} (id={firma.get('id')})",
        st["body"],
    ))
    story.append(Paragraph(f"Oluşturulma: {now_tr()} · Kaynak: {data.get('generatedAt')}", st["meta"]))
    story.append(Paragraph(
        f"Özet: {sm.get('total')} adım · Tamam={sm.get('tamam')} · Uyarı={sm.get('uyari')} · Hata={sm.get('hata')} · "
        f"Ort. UX puanı=<b>{sm.get('avgScore')}</b>/100",
        st["body"],
    ))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#ccd")))

    # Summary table
    story.append(Paragraph("Adım özeti", st["h2"]))
    sum_rows = [[Paragraph("<b>#</b>", st["small"]), Paragraph("<b>Durum</b>", st["small"]),
                 Paragraph("<b>Puan</b>", st["small"]), Paragraph("<b>Başlık</b>", st["small"])]]
    for r in data.get("results", []):
        sum_rows.append([
            Paragraph(str(r.get("n")), st["small"]),
            Paragraph(r.get("status", ""), sev_style(r.get("status"), st)),
            Paragraph(str(r.get("score")), st["small"]),
            Paragraph(r.get("title", ""), st["small"]),
        ])
    t = Table(sum_rows, colWidths=[10*mm, 18*mm, 14*mm, 140*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef5")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#ddd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    story.append(t)
    story.append(PageBreak())

    for r in data.get("results", []):
        block = []
        block.append(Paragraph(f"{r.get('n')}. {r.get('title')}", st["h2"]))
        block.append(Paragraph(
            f"Ekran: <code>{r.get('screen')}</code> · Durum: <b>{r.get('status')}</b> · "
            f"Kullanıcı dostu puan: <b>{r.get('score')}</b>/100",
            st["body"],
        ))
        block.append(Paragraph(f"<b>Yapılacak:</b> {r.get('yap') or ''}", st["small"]))
        block.append(Paragraph(f"<b>Beklenen:</b> {r.get('beklenen') or ''}", st["small"]))
        block.append(Paragraph(f"<b>Gözlem:</b> {r.get('detail') or ''}", st["small"]))
        notes = r.get("notes") or []
        if notes:
            block.append(Paragraph(f"<b>Notlar:</b> {', '.join(notes)}", st["small"]))
        errs = r.get("pageErrors") or []
        if errs:
            block.append(Paragraph(f"<b>JS hataları:</b> {'; '.join(errs)[:300]}", st["bad"]))
        shot = r.get("shot")
        if shot and os.path.isfile(shot):
            try:
                img = Image(shot, width=170*mm, height=100*mm, kind="proportional")
                # constrain height
                img._restrictSize(170*mm, 105*mm)
                block.append(Spacer(1, 4))
                block.append(img)
            except Exception as e:
                block.append(Paragraph(f"(Ekran görüntüsü yüklenemedi: {e})", st["small"]))
        else:
            block.append(Paragraph("(Ekran görüntüsü yok)", st["small"]))
        block.append(Spacer(1, 6))
        block.append(HRFlowable(width="100%", thickness=0.4, color=colors.HexColor("#ddd")))
        story.append(KeepTogether(block))
        # page break every 2 steps for readability with screenshots
        if r.get("n") % 2 == 0:
            story.append(PageBreak())

    doc.build(story)
    print("Wrote", PDF_MANUEL)


if __name__ == "__main__":
    if AUDIT.exists():
        build_audit_pdf()
    else:
        print("Missing", AUDIT)
    if MANUEL.exists():
        build_manuel_pdf()
    else:
        print("Missing", MANUEL)
