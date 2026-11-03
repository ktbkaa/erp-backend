#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CaseForm KILIF — sunum + kullanım kılavuzu PDF (UTF-8)."""
from __future__ import annotations

import json
import os
import shutil
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
    PageBreak, Image, HRFlowable, KeepTogether,
)

TR = timezone(timedelta(hours=3))
OUT = Path("/opt/cursor/artifacts/kilif-demo")
SHOTS_JSON = OUT / "shots.json"
SUMMARY = OUT / "summary.json"
PDF = OUT / "KILIF_CaseForm_Sunum_Kilavuz.pdf"
DOCS_PDF = Path("/workspace/docs/kilif-demo/KILIF_CaseForm_Sunum_Kilavuz.pdf")

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
        pdfmetrics.registerFont(TTFont("KilifSans", p))
        FONT = "KilifSans"
        break
for p in FONT_BOLD_CANDIDATES:
    if os.path.isfile(p):
        pdfmetrics.registerFont(TTFont("KilifSans-Bold", p))
        FONT_B = "KilifSans-Bold"
        break

BRAND = colors.HexColor("#0c4a6e")
ACCENT = colors.HexColor("#0369a1")
SOFT = colors.HexColor("#e0f2fe")
LINE = colors.HexColor("#94a3b8")


def now_tr() -> str:
    return datetime.now(TR).strftime("%d.%m.%Y %H:%M") + " (Europe/Istanbul)"


def styles():
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=FONT_B, fontSize=20, spaceAfter=8, textColor=BRAND),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=FONT_B, fontSize=13, spaceBefore=8, spaceAfter=5, textColor=ACCENT),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName=FONT_B, fontSize=11, spaceBefore=6, spaceAfter=3, textColor=BRAND),
        "body": ParagraphStyle("body", parent=base["Normal"], fontName=FONT, fontSize=10, leading=14),
        "small": ParagraphStyle("small", parent=base["Normal"], fontName=FONT, fontSize=8.5, leading=11, textColor=colors.HexColor("#334155")),
        "meta": ParagraphStyle("meta", parent=base["Normal"], fontName=FONT, fontSize=8, textColor=colors.HexColor("#64748b")),
        "bullet": ParagraphStyle("bullet", parent=base["Normal"], fontName=FONT, fontSize=10, leading=13, leftIndent=6),
        "step": ParagraphStyle("step", parent=base["Normal"], fontName=FONT, fontSize=9.5, leading=12.5, leftIndent=4),
    }


def img(path, w=255 * mm, h=120 * mm):
    if not path or not os.path.isfile(path):
        return Paragraph("(görüntü yok)", styles()["small"])
    im = Image(path)
    im._restrictSize(w, h)
    return im


def kv_table(rows, st, c1=55 * mm, c2=180 * mm):
    data = [[Paragraph(f"<b>{k}</b>", st["small"]), Paragraph(str(v), st["small"])] for k, v in rows]
    t = Table(data, colWidths=[c1, c2])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), SOFT),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def build():
    summary = json.loads(SUMMARY.read_text(encoding="utf-8"))
    shots = {}
    if SHOTS_JSON.is_file():
        shots = json.loads(SHOTS_JSON.read_text(encoding="utf-8"))
    st = styles()
    doc = SimpleDocTemplate(
        str(PDF), pagesize=landscape(A4),
        leftMargin=12 * mm, rightMargin=12 * mm, topMargin=11 * mm, bottomMargin=11 * mm,
    )
    story = []
    pa = summary.get("processA") or {}
    pb = summary.get("processB") or {}
    firma = summary.get("firma") or {}
    plants = summary.get("plants") or {}
    items = summary.get("items") or {}
    crm = summary.get("crm") or {}

    # ——— KAPAK ———
    story.append(Paragraph("CaseForm Silikon &amp; Plastik Kılıf A.Ş.", st["h1"]))
    story.append(Paragraph("ERP Sunumu ve Kullanım Kılavuzu — KILIF", st["h2"]))
    story.append(Paragraph(f"Oluşturulma: {now_tr()} · Kod sayfası: UTF-8", st["meta"]))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.2, color=BRAND))
    story.append(Paragraph(
        f"Firma kodu: <b>{firma.get('code')}</b> · "
        f"{plants.get('gm', {}).get('code')} (Genel Merkez) · "
        f"{plants.get('fb', {}).get('code')} (Fabrika)",
        st["body"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Bu doküman ne için?", st["h2"]))
    for b in [
        "CaseForm’a (silikon ve plastik telefon kılıfı üreticisi) yapılan demo sunumudur.",
        "İki uçtan uca süreç anlatılır: <b>MRP’siz (manuel planlama)</b> ve <b>MRP’li (öneri → talep → emir)</b>.",
        "Her süreçte kullanılan ERP ekranları, belge numaraları ve adım adım kullanım notları yer alır.",
        "Amaç: satınalma–kalite–üretim–sevk–fatura zincirinin ve MRP’nin günlük işte nasıl işlediğini göstermek.",
    ]:
        story.append(Paragraph(f"• {b}", st["bullet"]))
    story.append(PageBreak())

    # ——— FİRMA KURGUSU ———
    story.append(Paragraph("1. Firma ve master veri kurgusu", st["h1"]))
    story.append(kv_table([
        ("Firma", f"{firma.get('name')} ({firma.get('code')})"),
        ("İş yeri GM", f"{plants.get('gm', {}).get('name')} / {plants.get('gm', {}).get('code')}"),
        ("İş yeri FB", f"{plants.get('fb', {}).get('name')} / {plants.get('fb', {}).get('code')}"),
        ("Mamul (silikon)", items.get("fgSilikon")),
        ("Mamul (plastik)", items.get("fgPlastik")),
        ("Hammadde örnekleri", f"{items.get('hmSilikon')}, {items.get('hmTpu')}, {items.get('hmMurekkep')}, {items.get('hmPoşet')}"),
        ("Sarf (yalnız GM)", f"{items.get('sarfEtiket')}, {items.get('sarfTemizlik')}"),
        ("BOM / Rota", f"Silikon {summary.get('bom', {}).get('silikon', {}).get('code')} · Plastik {summary.get('bom', {}).get('plastik', {}).get('code')}"),
        ("Fiyat listesi", crm.get("price_list")),
        ("CRM fırsat", crm.get("opportunity")),
    ], st))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Depo rolleri (fabrika)", st["h3"]))
    story.append(Paragraph(
        "FB-GIRIS → FB-GKK → FB-HMD (hammadde) · Üretim WIP (FB-ANA) · FB-CKK → FB-MAM (mamul). "
        "Sarf malzemeler Genel Merkez GM-SARF deposunda tutulur; mal kabulde kaliteye uğramaz.",
        st["body"],
    ))
    story.append(Paragraph("Kullanılan ekranlar (demo)", st["h3"]))
    story.append(Paragraph(", ".join(summary.get("screensTouched") or []), st["small"]))
    story.append(PageBreak())

    # ——— SÜREÇ A ———
    story.append(Paragraph("2. Süreç A — MRP’siz (manuel planlama)", st["h1"]))
    story.append(Paragraph(
        f"Ürün: <b>Sert plastik Galaxy kılıf ({pa.get('product')})</b> · Miktar: <b>{pa.get('qty')}</b> · Müşteri: EuroCase",
        st["body"],
    ))
    story.append(Paragraph("Akış", st["h2"]))
    for i, step in enumerate([
        "CRM / satış: fırsat bilgisinden sonra <b>Satış Teklifi</b> oluşturulur (EuroCase).",
        "<b>Satış Siparişi</b> açılır — planlama MRP’ye bırakılmaz; üretim miktarı siparişten okunur.",
        "Planör BOM’a bakarak hammaddeleri <b>manuel Satınalma Siparişi</b> ile tedarik eder.",
        "<b>Mal Kabul</b> → Giriş kontrol → <b>GKK</b> onayı → Hammadde deposu.",
        "Merkez <b>sarf</b> satınalması QC’siz doğrudan GM-SARF’a alınır.",
        "<b>Üretim Emri</b> manuel açılır (BOM+rota) → onay → başlat → operasyonlar → <b>CKK</b> → Mamul.",
        "<b>Sevk Emri</b> → <b>İrsaliye</b> → <b>Satış Faturası</b>.",
    ], 1):
        story.append(Paragraph(f"<b>A{i}.</b> {step}", st["step"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Belge özeti (Süreç A)", st["h2"]))
    story.append(kv_table([
        ("Teklif", pa.get("quotation")),
        ("Satış siparişi", pa.get("sales_order")),
        ("SA siparişi", pa.get("purchase_order")),
        ("Mal kabul", pa.get("goods_receipt")),
        ("GKK aktif?", pa.get("gkk")),
        ("Sarf PO", pa.get("sarf_po")),
        ("Üretim emri", pa.get("production_order")),
        ("Sevk", pa.get("shipment")),
        ("İrsaliye", pa.get("delivery_note")),
        ("Fatura", pa.get("invoice")),
    ], st))
    story.append(Paragraph("Ne zaman tercih edilir?", st["h3"]))
    story.append(Paragraph(
        "Tek seferlik / düşük hacimli siparişler, acil numune, MRP parametreleri henüz oturmamış ürünler. "
        "Planör ihtiyaçları kendisi hesaplar; sistem belge zincirini yürütür.",
        st["body"],
    ))
    story.append(PageBreak())

    # ——— SÜREÇ B ———
    story.append(Paragraph("3. Süreç B — MRP’li planlama", st["h1"]))
    story.append(Paragraph(
        f"Ürün: <b>Silikon iPhone kılıf ({pb.get('product')})</b> · Miktar: <b>{pb.get('qty')}</b> · Müşteri: TeknoMarket",
        st["body"],
    ))
    story.append(Paragraph("Akış", st["h2"]))
    for i, step in enumerate([
        "<b>Satış Siparişi</b> açılır (bağımsız ihtiyacın kaynağı).",
        "<b>MRP Bağımsız İhtiyaç</b> kaydı oluşturulur (tarih + miktar + stok).",
        "<b>MRP Çalıştır</b> → BOM patlatılır; net ihtiyaç ve öneriler (Satınalma / Üretim emri) üretilir.",
        "Önerilerden <b>Satınalma Talebi</b> ve <b>Üretim Emri</b> oluşturulur.",
        "Talep <b>Satınalma Siparişi</b>ne dönüştürülür → Mal kabul → GKK.",
        "MRP’den gelen UE onaylanır, operasyonlar tamamlanır, CKK → Mamul.",
        "Sevk → İrsaliye → Fatura ile süreç kapanır.",
    ], 1):
        story.append(Paragraph(f"<b>B{i}.</b> {step}", st["step"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Belge özeti (Süreç B)", st["h2"]))
    story.append(kv_table([
        ("Satış siparişi", pb.get("sales_order")),
        ("Bağımsız ihtiyaç", pb.get("independent_requirement")),
        ("MRP çalışması", f"{pb.get('mrp_run')} · satır={pb.get('mrp_lines')} · net&gt;0={pb.get('mrp_net_positive')}"),
        ("SA talep", pb.get("purchase_requisition")),
        ("SA siparişi", pb.get("purchase_order")),
        ("Mal kabul", pb.get("goods_receipt")),
        ("Üretim emri", pb.get("production_order")),
        ("Sevk", pb.get("shipment")),
        ("İrsaliye", pb.get("delivery_note")),
        ("Fatura", pb.get("invoice")),
    ], st))
    story.append(Paragraph("Ne zaman tercih edilir?", st["h3"]))
    story.append(Paragraph(
        "Tekrarlayan siparişler, çok seviyeli BOM, emniyet stok / temin süresi ile çalışan seri üretim. "
        "MRP net ihtiyacı hesaplar; kullanıcı önerileri belgeye dönüştürür.",
        st["body"],
    ))
    story.append(PageBreak())

    # ——— KARŞILAŞTIRMA ———
    story.append(Paragraph("4. MRP’siz vs MRP’li — karşılaştırma", st["h1"]))
    cmp_rows = [
        [Paragraph("<b>Konu</b>", st["small"]), Paragraph("<b>MRP’siz (A)</b>", st["small"]), Paragraph("<b>MRP’li (B)</b>", st["small"])],
        [Paragraph("İhtiyaç hesabı", st["small"]), Paragraph("Planör / Excel / deneyim", st["small"]), Paragraph("Sistem: BI + BOM patlatma", st["small"])],
        [Paragraph("Satınalma", st["small"]), Paragraph("Manuel PO", st["small"]), Paragraph("Talep ← MRP önerisi → PO", st["small"])],
        [Paragraph("Üretim", st["small"]), Paragraph("Manuel UE", st["small"]), Paragraph("UE ← MRP önerisi", st["small"])],
        [Paragraph("Demo ürün", st["small"]), Paragraph(f"Plastik {pa.get('product')} × {pa.get('qty')}", st["small"]),
         Paragraph(f"Silikon {pb.get('product')} × {pb.get('qty')}", st["small"])],
        [Paragraph("Tipik kullanıcı", st["small"]), Paragraph("Küçük parti / acil", st["small"]), Paragraph("Seri üretim / planlama", st["small"])],
    ]
    ct = Table(cmp_rows, colWidths=[45 * mm, 100 * mm, 100 * mm])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SOFT),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f8fafc")),
    ]))
    story.append(ct)
    story.append(PageBreak())

    # ——— KULLANIM KILAVUZU ———
    story.append(Paragraph("5. Kullanım kılavuzu — ekran adımları", st["h1"]))
    story.append(Paragraph(
        "Aşağıdaki adımlar CaseForm operatörünün günlük ekran sırasını verir. "
        "Üstteki <b>firma profili</b>nden KILIF seçili olmalıdır; böylece diğer firmaların verisi gelmez.",
        st["body"],
    ))

    guide = [
        ("Firma profili", "Sağ üst / üst bardaki firma seçiciden <b>CaseForm (KILIF)</b> seçin. Listeler ve formlar bu firmaya kilitlenir."),
        ("Stok Kartı", "Kartlar → Stok Kartı. Mamul/hammadde açın. Firmalar sekmesinde firma zorunlu; iş yerleri varsayılan hepsi işaretli, istisna isteğe bağlı."),
        ("Cari Kart", "Tedarikçi ve müşteri carilerini firma/iş yerine bağlayın."),
        ("Ürün Ağacı / Rota", "Mamul için BOM ve rota tanımlayın; iş emri ve MRP bunları kullanır."),
        ("Fiyat Listesi", "Satış fiyatlarını listeye alın; teklif/siparişte referans olur."),
        ("CRM", "Aday → Kontak → Fırsat → Faaliyet ile satış hunisini takip edin."),
        ("Satış Teklifi / Sipariş", "Teklif onaylandıktan sonra siparişe dönün veya doğrudan sipariş açın."),
        ("MRP (Süreç B)", "Planlama → Bağımsız İhtiyaç ekleyin → MRP Çalıştır → Sonuçlardan Talep / UE oluşturun."),
        ("Satınalma", "Talep→PO veya doğrudan PO. Mal Kabul’de QC’li ürünler Giriş→GKK yoluna girer; sarf muaf kalır."),
        ("Üretim", "UE onay/başlat → operasyon tamamla → CKK onay → mamul depo."),
        ("Sevk / İrsaliye / Fatura", "Siparişten sevk emri → irsaliye (taşıyıcı alanları) → fatura."),
    ]
    for title, body in guide:
        story.append(Paragraph(title, st["h3"]))
        story.append(Paragraph(body, st["step"]))
    story.append(PageBreak())

    # ——— EKRAN GÖRÜNTÜLERİ ———
    story.append(Paragraph("6. Ekran görüntüleri", st["h1"]))
    story.append(Paragraph(
        "Aşağıdaki slaytlar demo sırasında kullanılan canlı ekranlardır (KILIF firma profili).",
        st["body"],
    ))
    story.append(PageBreak())

    results = shots.get("results") or []
    if not results:
        story.append(Paragraph("Ekran görüntüsü yakalanamadı; summary belge numaraları geçerlidir.", st["body"]))
    for i, r in enumerate(results):
        if not r.get("ok"):
            continue
        block = []
        block.append(Paragraph(f"{i + 1}. {r.get('title')}", st["h2"]))
        block.append(Paragraph(r.get("note") or "", st["body"]))
        block.append(Paragraph(
            f"Ekran id: <b>{r.get('screen')}</b> · "
            f"Başlık: {((r.get('snap') or {}).get('title') or '')[:80]}",
            st["small"],
        ))
        block.append(Spacer(1, 3))
        block.append(img(r.get("path")))
        block.append(PageBreak())
        story.append(KeepTogether(block[:-1]))
        story.append(block[-1])

    # ——— KAPANIŞ ———
    story.append(Paragraph("7. Sonuç ve önerilen sonraki adımlar", st["h1"]))
    for b in [
        "CaseForm için iki süreç canlı kuruldu: plastik kılıfta manuel planlama, silikon kılıfta MRP.",
        "Kalite (GKK/CKK), depo rolleri ve belge zinciri (sipariş→sevk→irsaliye→fatura) aynı omurgayı kullanır.",
        "Öneri: emniyet stok / temin süresi parametrelerini mamul-hammadde kartlarında netleştirin; MRP sonuçları buna göre keskinleşir.",
        "Öneri: onay rotalarını (SA PO, UE, fatura) CaseForm organizasyonuna göre bağlayın.",
        "Öneri: e-İrsaliye / e-Fatura alanlarını taşıyıcı ve vergi kimlikleriyle şablon haline getirin.",
    ]:
        story.append(Paragraph(f"• {b}", st["bullet"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND))
    story.append(Paragraph(
        f"KTB ERP · KILIF demo · {now_tr()} · UTF-8 · tools/generate-kilif-presentation-pdf.py",
        st["meta"],
    ))

    doc.build(story)
    DOCS_PDF.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PDF, DOCS_PDF)
    print(f"PDF: {PDF}")
    print(f"Kopya: {DOCS_PDF}")


if __name__ == "__main__":
    build()
