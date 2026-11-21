# PR #129 — Önce / Sonra (kısmi ⚠️ düzeltmeleri)

Tarih: 21.11.2026 Europe/Istanbul

## Madde özeti

| # | Konu | Önce | Sonra |
|---|------|------|-------|
| 1 | PRJ tanım POST | `line_no` / `rank_no` / `hierarchy_level` / boolean null → 500 | Varsayılan: sıra max+10, hierarchy=`task`, category=`todo`, bool=false → 201 |
| 2 | prj-automations | POST/PUT/DELETE yok veya PUT null’a çekiyordu | Tam CRUD + toggle/run; PUT yalnız gönderilen alanları günceller |
| 3 | dashboard/board/backlog/gantt | `project_id` yok → 400 | Portföy / boş liste / `needs_project` mesajı (graceful) |
| 4 | Unique 23505 | Ham 500 | 409 + «Bu kod zaten kayıtlı…» (ortak `errorHandler`) |
| 5 | kk-stok / vergi / bordro | Zorunlu alanlar belirsiz, varsayılan yok | Formda lookup + TR/bugün varsayılan; API anlaşılır 400 |
| 6 | bom-level-listesi | Kayıt/kaydet izlenimi | `readOnly` + `hideSave`; sim yalnız GET |
| 7 | item_warehouses | Otomatik INSERT (yanlış) | **Otomatik oluşturma yok.** Stok depoya tanımlı değilse işlem engellenir; Türkçe mesaj (stok, depo, stok-depo ekranı). `depoZorunluAtla` atlamaz. Simler bağları önce tanımlar. |

## Stok-depo kuralı (madde 7)

- Merkez: `assertItemWarehouseAllowed` — mesaj: hangi stok, hangi depo, nereden tanımlanır.
- `createStockMovement` her zaman bağ kontrolü yapar (üretim, mal kabul, irsaliye, transfer, sayım, fason, kalite…).
- Üretim emri açılışında mamul + BOM bileşenleri için depo bağı zorunlu.
- Fason teslimatta otomatik `item_warehouses` INSERT kaldırıldı.

## Test / simülasyon

| Çalışma | Sonuç |
|---------|--------|
| `npm test` | 110/110 geçti (+ screen contracts OK) |
| `tests/sim_partial_fix.test.js` | 11/11 |
| `sim-adgida-egepack.js` | OK (252 adım) |
| `demo-adgida-egepack-4ornek.js` | 4 senaryo tamam |
| `sim-iki-sektor-eksik-ekran.js` | Miss kalan 0, **Hata 0** |

## Artefaktlar

- `/opt/cursor/artifacts/npm-test-full.log`
- `/opt/cursor/artifacts/sim-adgida-egepack.log` + audit xlsx/md/json
- `/opt/cursor/artifacts/demo-adgida-egepack-4ornek.log` + `ornek-4-surec-rapor.*`
- `/opt/cursor/artifacts/sim-iki-sektor-eksik-ekran.log` + audit xlsx/md/json
