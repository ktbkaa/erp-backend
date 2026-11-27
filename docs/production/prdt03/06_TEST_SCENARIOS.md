# PRDT03 — Test Senaryoları

## Normal

| # | Senaryo | Beklenen |
|---|---------|----------|
| N1 | Onay adayı listeleme | Taslak/OnayBekliyor görünür |
| N2 | İncele detay | BOM/rota/ops/malzeme gerçek emirden |
| N3 | Geçerli emri onayla | Acik + is_approved + approved_at/by |
| N4 | Onay sonrası liste | Aday listesinden düşer; uretim-emirleri’de Onaylı |
| N5 | Onay sonrası başlat | is_started; OnayBekliyor ile başlatılamaz |
| N6 | Toplu onay (hepsi uygun) | hepsi başarılı |

## Negatif

| # | Senaryo | Beklenen |
|---|---------|----------|
| X1 | Tekrar onay | 400 |
| X2 | Iptal emri | listede yok / 400 |
| X3 | Opsüz emir | blockers, onay engeli |
| X4 | quantity≤0 | engel |
| X5 | Yanlış firma | görünmez / engel |
| X6 | Geçersiz id | 400/404 |
| X7 | Toplu karışık | basarili + hatali ayrışır |
| X8 | Onaysız başlat (OnayBekliyor) | 400 |

## Entegrasyon

| # | Senaryo | Beklenen |
|---|---------|----------|
| E1 | Onay stok hareketi yaratmaz | movement count aynı |
| E2 | Üretim girişi onaylı emirle çalışır | mevcut akış |
| E3 | Malzeme/ops korunur | satır sayıları aynı |

## UI

| # | Senaryo |
|---|--------|
| U1 | Ekran menüden açılır |
| U2 | Filtre + liste |
| U3 | Onayla butonu / sonuç |
