#!/usr/bin/env python3
"""Tüm ERP ekranları için uçtan uca manuel test Word listesi üretir."""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "public" / "app.js").read_text(encoding="utf-8")
OUT = ROOT / "docs" / "MANUEL_TEST_EKRAN_LISTESI.docx"

# MODULES dizisini kaba parse: ekran techId blokları + en yakın modül
screen_re = re.compile(
    r"id:\s*'([^']+)'\s*,\s*\n\s*techId:\s*'([^']+)'\s*,\s*\n\s*businessNameEn:\s*'([^']*)'\s*,\s*\n\s*title:\s*'([^']*)'"
    r"([\s\S]{0,900}?)endpoint:\s*'([^']*)'",
)

modules: list[dict] = []
# Modül başlıkları
for m in re.finditer(
    r"\{\s*\n\s*id:\s*'([^']+)'\s*,\s*\n\s*title:\s*'([^']+)'\s*,\s*\n\s*(?:sections:|screens:)",
    APP,
):
    modules.append({"id": m.group(1), "title": m.group(2), "pos": m.start(), "screens": []})

screens = []
for m in screen_re.finditer(APP):
    mid = m.group(5)
    if re.search(r"\bscreens:\s*\[", mid):
        continue
    after = APP[m.start() : m.start() + 900]
    screen = {
        "id": m.group(1),
        "techId": m.group(2),
        "businessNameEn": m.group(3),
        "title": m.group(4),
        "endpoint": m.group(6),
        "crud": bool(re.search(r"\bcrud:\s*true\b", after)),
        "readOnly": bool(re.search(r"\breadOnly:\s*true\b", after)),
        "pos": m.start(),
    }
    # en yakın önceki modül
    mod = None
    for cand in modules:
        if cand["pos"] <= m.start():
            mod = cand
    screen["moduleId"] = (mod or {}).get("id", "diger")
    screen["moduleTitle"] = (mod or {}).get("title", "Diğer")
    if screen["moduleId"] == "fixed-tanimlar":
        screen["moduleTitle"] = "Sabit Tanımlar"
    screens.append(screen)

# Modül sırası
order = []
seen = set()
for s in screens:
    if s["moduleId"] not in seen:
        seen.add(s["moduleId"])
        order.append((s["moduleId"], s["moduleTitle"]))

by_mod: dict[str, list] = {k: [] for k, _ in order}
for s in screens:
    by_mod.setdefault(s["moduleId"], []).append(s)

doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.8)
section.bottom_margin = Cm(1.8)
section.left_margin = Cm(1.8)
section.right_margin = Cm(1.8)

title = doc.add_heading("KTB ERP — Manuel Uçtan Uca Test Listesi", level=0)
title.alignment = WD_ALIGN_PARAGRAPH.LEFT

meta = doc.add_paragraph()
now = datetime.now(ZoneInfo("Europe/Istanbul")).strftime("%d.%m.%Y %H:%M")
meta.add_run(
    f"Oluşturma (Europe/Istanbul): {now}\n"
    f"Toplam ekran: {len(screens)}\n"
    f"Amaç: TEKS (Denim Tekstil / Telstil) firmasında sıfırdan tüm ekranları sırayla denemek.\n"
    f"Not: Firma kodu TEKS; arayüzde «Telstil» diye aranmaz — Denim Tekstil Üretim A.Ş."
).font.size = Pt(10)

doc.add_heading("0. Hazırlık", level=1)
prep = [
    "Uygulamayı açın; admin ile giriş yapın.",
    "Aktif firma = TEKS (Denim Tekstil Üretim A.Ş.) seçili olsun.",
    "İş verisi temizlenmiş olmalı (purge sonrası iskelet: firma / iş yeri / depo kalabilir).",
    "Her adımda: Liste açılır mı? Yeni kayıt kaydolur mu? Düzelt / sil çalışır mı? Lookup doldurur mu?",
    "Hata görürseniz: ekran adı + teknik kimlik + hata metni not edin.",
    "Onay / e-belge adımlarında gerçek GİB gönderimi gerekmez; durum alanını kontrol edin.",
]
for i, t in enumerate(prep, 1):
    doc.add_paragraph(f"{i}. {t}", style="List Number")

doc.add_heading("Önerilen süreç sırası (özet)", level=1)
flow = [
    "Sabit Tanımlar → Ana Veri (firma/iş yeri/depo) → Stok + Cari kartları",
    "Üretim: ürün ağacı, rota, iş merkezi/istasyon, üretim emri",
    "Satınalma: talep → teklif → sipariş → mal kabul → alış faturası",
    "Satış: teklif → sipariş → sevk → irsaliye → satış faturası",
    "Kalite / CRM / Onay / Finans / İK ekranları",
    "Sistem: kullanıcı, audit, Tablo Bilgileri, SQL sorgu",
]
for t in flow:
    doc.add_paragraph(t, style="List Bullet")

doc.add_heading("Kontrol sütunları (her ekran)", level=1)
doc.add_paragraph(
    "☐ Açıldı   ☐ Liste / veri   ☐ Yeni kayıt   ☐ Düzelt   ☐ Sil / iptal   ☐ Lookup / F1   ☐ Not"
)

n = 0
for mod_id, mod_title in order:
    items = by_mod.get(mod_id) or []
    if not items:
        continue
    doc.add_heading(f"{mod_title} ({len(items)} ekran)", level=1)
    table = doc.add_table(rows=1, cols=6)
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    hdr[0].text = "#"
    hdr[1].text = "Ekran"
    hdr[2].text = "Route / id"
    hdr[3].text = "TechId"
    hdr[4].text = "API"
    hdr[5].text = "Kontrol"
    for s in items:
        n += 1
        row = table.add_row().cells
        row[0].text = str(n)
        tip = "CRUD" if s["crud"] else ("Salt okunur" if s["readOnly"] else "İşlem")
        row[1].text = f"{s['title']} ({tip})"
        row[2].text = f"#{s['id']}"
        row[3].text = s["techId"]
        row[4].text = s["endpoint"]
        row[5].text = "☐ Aç ☐ Liste ☐ Yeni ☐ Düzelt ☐ Not"

doc.add_heading("Kapanış kontrolü", level=1)
close = [
    "Kokpit / mizan gibi özet ekranlarda TEKS verisi görünüyor mu?",
    "Tablo Bilgileri → İnsan Kaynakları ve diğer yeni modüller listeleniyor mu?",
    "Audit log’da denenen işlemler var mı?",
    "Başka firmaya geçince TEKS kayıtları izole mi?",
]
for t in close:
    doc.add_paragraph(t, style="List Number")

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)
# machine-readable sidecar
sidecar = {
    "generatedAt": datetime.now(ZoneInfo("Europe/Istanbul")).isoformat(),
    "screenCount": len(screens),
    "modules": [
        {
            "id": mid,
            "title": title,
            "screens": [
                {
                    "id": s["id"],
                    "title": s["title"],
                    "techId": s["techId"],
                    "endpoint": s["endpoint"],
                    "crud": s["crud"],
                    "readOnly": s["readOnly"],
                }
                for s in by_mod.get(mid, [])
            ],
        }
        for mid, title in order
    ],
}
(ROOT / "docs" / "manuel-test-ekran-listesi.json").write_text(
    json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Wrote {OUT} ({len(screens)} screens)")
