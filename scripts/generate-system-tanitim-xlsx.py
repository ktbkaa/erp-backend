# -*- coding: utf-8 -*-
"""docs/system/screen-map.json → KTB_ERP_Sistem_Tanitim.xlsx (Unicode/UTF-8)."""
from __future__ import annotations
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
IST = ZoneInfo("Europe/Istanbul")
NOW = datetime.now(IST).strftime("%d.%m.%Y %H:%M")

data = json.loads((ROOT / "docs/system/screen-map.json").read_text(encoding="utf-8"))
mod_titles = {m["id"]: m.get("title") or m["id"] for m in data["modules"]}
screens = data["screens"]
for s in screens:
    if not s.get("moduleTitle"):
        s["moduleTitle"] = mod_titles.get(s.get("moduleId"), s.get("moduleId") or "—")
modules = data["modules"]
regions = data["regions"]
chains = data["chains"]
features = data["features"]
legend = data["legend"]
by_id = {s["id"]: s for s in screens}

wb = Workbook()
NAVY, TEAL, LIGHT = "1A365D", "0D9488", "F0F9FF"
HEADER_FILL = PatternFill("solid", fgColor=NAVY)
HEADER_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
TITLE_FONT = Font(name="Calibri", bold=True, color=NAVY, size=16)
SUB_FONT = Font(name="Calibri", color="475569", size=10)
CELL_FONT = Font(name="Calibri", size=10)
ALT_FILL = PatternFill("solid", fgColor=LIGHT)
THIN = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="CBD5E1"),
    bottom=Side(style="thin", color="CBD5E1"),
)
WRAP = Alignment(wrap_text=True, vertical="top")


def style_header(ws, row, cols):
    for c in range(1, cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        cell.border = THIN


def autosize(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def write_rows(ws, start_row, headers, rows):
    for i, h in enumerate(headers, 1):
        ws.cell(row=start_row, column=i, value=h)
    style_header(ws, start_row, len(headers))
    for r_i, row in enumerate(rows):
        r = start_row + 1 + r_i
        for c_i, val in enumerate(row, 1):
            if val in (None, ""):
                val = "—"
            cell = ws.cell(row=r, column=c_i, value=val)
            cell.font = CELL_FONT
            cell.alignment = WRAP
            cell.border = THIN
            if r_i % 2 == 1:
                cell.fill = ALT_FILL
    if rows:
        ws.auto_filter.ref = f"A{start_row}:{get_column_letter(len(headers))}{start_row + len(rows)}"
    ws.freeze_panes = f"A{start_row + 1}"


ws = wb.active
ws.title = "01_Kapak"
ws["A1"] = "KTB ERP — Sistem Tanıtım Dosyası"
ws["A1"].font = TITLE_FONT
ws["A2"] = (
    f"Oluşturulma: {NOW} (Europe/Istanbul) · Kaynak: public/app.js MODULES · "
    "Kodlama: Unicode (UTF-8 XLSX)"
)
ws["A2"].font = SUB_FONT
ws["A4"] = (
    "Bu çalışma kitabı sistemi tanıtır: tüm ekranlar, özellikler, "
    "bölgesel bağlantılar ve sembolik çalışma mantığı."
)
ws["A4"].alignment = WRAP
ws["A6"] = "Özet"
ws["A6"].font = Font(name="Calibri", bold=True, size=13, color=NAVY)
for i, (k, v) in enumerate(
    [
        ("Toplam ekran", data["totalScreens"]),
        ("Modül sayısı", data["totalModules"]),
        ("Menü bölümü (region)", len(regions)),
        ("Uçtan uca süreç zinciri", len(chains)),
        ("Özellik kartı", len(features)),
    ],
    7,
):
    ws.cell(row=i, column=1, value=k).font = Font(name="Calibri", bold=True, size=10)
    ws.cell(row=i, column=2, value=v).font = CELL_FONT
ws["A14"] = "Sayfa içeriği"
ws["A14"].font = Font(name="Calibri", bold=True, size=13, color=NAVY)
for i, (a, b) in enumerate(
    [
        ("01_Kapak", "Bu sayfa — özet ve lejant"),
        ("02_Ekran_Listesi", "Tüm ekranların envanteri"),
        ("03_Ozellikler", "Sistem yetenek / özellik kataloğu"),
        ("04_Bolgeler_Baglantilar", "Menü bölgeleri + süreç zincirleri"),
        ("05_Sembolik_Mantik", "Ekran çalışma mantığı sembolleri"),
        ("06_Lookup_Haritasi", "Lookup bağlantı haritası"),
        ("07_Modul_Ozet", "Modül bazlı özet"),
    ],
    15,
):
    ws.cell(row=i, column=1, value=a).font = Font(name="Calibri", bold=True, color=TEAL, size=10)
    ws.cell(row=i, column=2, value=b).font = CELL_FONT
ws["A24"] = "Sembol lejantı"
ws["A24"].font = Font(name="Calibri", bold=True, size=13, color=NAVY)
ws["A25"] = "Sembol"
ws["B25"] = "Anlam"
style_header(ws, 25, 2)
for i, (sym, meaning) in enumerate(legend.items(), 26):
    ws.cell(row=i, column=1, value=sym).font = Font(name="Calibri", size=14, bold=True)
    ws.cell(row=i, column=2, value=meaning).font = CELL_FONT
    ws.cell(row=i, column=1).border = THIN
    ws.cell(row=i, column=2).border = THIN
ws["A42"] = "Not: .xlsx dahili UTF-8 XML kullanır; Türkçe karakterler korunur."
ws["A42"].font = SUB_FONT
autosize(ws, [36, 70])

ws2 = wb.create_sheet("02_Ekran_Listesi")
ws2["A1"] = "Tüm ekran envanteri"
ws2["A1"].font = TITLE_FONT
ws2["A2"] = f"Toplam {len(screens)} ekran · {NOW}"
ws2["A2"].font = SUB_FONT
write_rows(
    ws2,
    4,
    [
        "Modül", "Bölüm", "Ekran ID", "Tech ID", "Başlık", "EN Ad", "Endpoint",
        "CRUD", "RO", "Bayraklar", "Numaratör", "Sekmeler",
        "Master alan", "Detay alan", "Filtre", "Kolon", "Detay anahtar",
        "Aksiyonlar", "Lookup’lar", "İpucu",
    ],
    [
        [
            s.get("moduleTitle"), s.get("sectionTitle"), s.get("id"), s.get("techId"), s.get("title"),
            s.get("businessNameEn"), s.get("endpoint"),
            "Evet" if s.get("crud") else "Hayır",
            "Evet" if s.get("readOnly") else "Hayır",
            s.get("flags"), s.get("numeratorSeri"), s.get("formTabs"),
            s.get("masterFields"), s.get("detailFields"), s.get("filters"), s.get("columns"),
            s.get("detailKey"), s.get("actions"), s.get("lookups"), s.get("hint"),
        ]
        for s in screens
    ],
)
autosize(ws2, [16, 16, 26, 16, 28, 22, 32, 8, 6, 28, 16, 24, 10, 10, 8, 8, 14, 28, 28, 40])

ws3 = wb.create_sheet("03_Ozellikler")
ws3["A1"] = "Sistem özellik / yetenek kataloğu"
ws3["A1"].font = TITLE_FONT
write_rows(
    ws3,
    4,
    ["Alan", "Özellik", "Durum", "Not"],
    [[f["alan"], f["ozellik"], f["durum"], f["not"]] for f in features],
)
autosize(ws3, [14, 48, 14, 40])

ws4 = wb.create_sheet("04_Bolgeler_Baglantilar")
ws4["A1"] = "Bölgeler (menü) ve ekran bağlantıları"
ws4["A1"].font = TITLE_FONT
ws4["A4"] = "A) Menü bölgeleri → ekranlar"
ws4["A4"].font = Font(name="Calibri", bold=True, size=12, color=TEAL)
rows4a = []
for reg in regions:
    for idx, sid in enumerate(reg.get("screenIds") or [], 1):
        sc = by_id.get(sid, {})
        rows4a.append(
            [
                reg.get("moduleTitle") or mod_titles.get(reg.get("moduleId"), ""),
                reg.get("sectionId"),
                reg.get("sectionTitle"),
                idx,
                sid,
                sc.get("title", sid),
                sc.get("endpoint", ""),
            ]
        )
write_rows(
    ws4,
    5,
    ["Modül", "Bölüm ID", "Bölüm adı", "Sıra", "Ekran ID", "Ekran başlığı", "Endpoint"],
    rows4a,
)
start_chains = 5 + len(rows4a) + 3
ws4.cell(row=start_chains, column=1, value="B) Süreç zincirleri").font = Font(
    name="Calibri", bold=True, size=12, color=TEAL
)
rows4b = []
for ch in chains:
    titles = ch.get("stepTitles") or ch["steps"]
    for idx, sid in enumerate(ch["steps"], 1):
        title = titles[idx - 1] if idx - 1 < len(titles) else sid
        missing = "EVET" if sid in (ch.get("missing") or []) else ""
        rows4b.append([ch["region"], ch["name"], ch["symbol"], idx, sid, title, missing])
write_rows(
    ws4,
    start_chains + 1,
    ["Bölge", "Zincir adı", "Sembolik akış", "Adım no", "Ekran ID", "Ekran başlığı", "Eksik?"],
    rows4b,
)
autosize(ws4, [16, 18, 22, 8, 28, 28, 36])

ws5 = wb.create_sheet("05_Sembolik_Mantik")
ws5["A1"] = "Ekran çalışma mantığı — sembolleştirilmiş"
ws5["A1"].font = TITLE_FONT
ws5["A2"] = (
    "○ Liste · ◉ Form · ◆ Detay · ▤ Sekme · № Numaratör · ★ Onay · ▷ Dönüşüm · "
    "▶ Aksiyon · ⚙ MRP · ↗ Lookup · ◎ Rapor"
)
ws5["A2"].font = SUB_FONT
write_rows(
    ws5,
    4,
    [
        "Modül", "Ekran ID", "Başlık", "Sembol dizisi", "Akış (sembolleştirilmiş)",
        "Çalışma açıklaması", "Endpoint", "Bayraklar",
    ],
    [
        [
            s.get("moduleTitle"), s.get("id"), s.get("title"), s.get("logicSymbol"),
            s.get("logicFlow"), s.get("logicDesc"), s.get("endpoint"), s.get("flags"),
        ]
        for s in screens
    ],
)
autosize(ws5, [16, 26, 28, 28, 55, 55, 30, 28])

ws6 = wb.create_sheet("06_Lookup_Haritasi")
ws6["A1"] = "Ekran → Lookup bağlantı haritası"
ws6["A1"].font = TITLE_FONT
rows6 = []
for s in screens:
    detail = s.get("lookupDetail") or ""
    if not detail:
        continue
    for part in detail.split(";"):
        part = part.strip()
        if "→" not in part:
            continue
        field, lookup = part.split("→", 1)
        target = by_id.get(lookup.strip(), {})
        rows6.append(
            [
                s.get("moduleTitle"),
                s.get("id"),
                s.get("title"),
                field.strip(),
                lookup.strip(),
                target.get("title", ""),
            ]
        )
write_rows(
    ws6,
    4,
    ["Kaynak modül", "Kaynak ekran", "Başlık", "Alan", "Lookup hedef", "Hedef ekran başlığı"],
    rows6,
)
autosize(ws6, [16, 26, 28, 22, 26, 28])

ws7 = wb.create_sheet("07_Modul_Ozet")
ws7["A1"] = "Modül özeti"
ws7["A1"].font = TITLE_FONT
write_rows(
    ws7,
    3,
    ["Modül ID", "Modül adı", "Ekran sayısı", "Bölüm sayısı", "Bölümler"],
    [
        [
            m["id"],
            m.get("title") or m["id"],
            m["screenCount"],
            len(m.get("sections") or []),
            " · ".join((s.get("title") or s.get("id") or "") for s in (m.get("sections") or [])),
        ]
        for m in modules
    ],
)
autosize(ws7, [20, 22, 12, 12, 70])

out_docs = ROOT / "docs/system/KTB_ERP_Sistem_Tanitim.xlsx"
out_art = Path("/opt/cursor/artifacts/KTB_ERP_Sistem_Tanitim.xlsx")
out_docs.parent.mkdir(parents=True, exist_ok=True)
out_art.parent.mkdir(parents=True, exist_ok=True)
wb.save(out_docs)
wb.save(out_art)
print(f"OK {out_docs} bytes={out_docs.stat().st_size} screens={len(screens)} lookups={len(rows6)}")
