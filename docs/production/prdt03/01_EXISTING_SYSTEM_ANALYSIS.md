# PRDT03 — Mevcut Sistem Analizi (KTB ERP)

Tarih: 2026-11-12 · Dal: `cursor/erp-prdt03-kolay-onay-4f63`

## Özet

KTB ERP’de üretim iş emirleri `production_orders` tablosunda tutulur. Onay zaten `POST /uretim-emirleri/:id/onayla` ile yapılır; **yalnızca durum/bayrak günceller**, stok hareketi üretmez. PRDT03 “Kolay İş Emri Onayı” için eksik olan şey bağımsız/kolay bir onay listesi ekranı, toplu onay, onay audit alanları ve onay öncesi kontrollü geri bildirimdir.

---

## 1. İş emri nereden oluşturuluyor?

| Yol | Ekran | Endpoint | İlk `status` |
|-----|--------|----------|--------------|
| Manuel | `uretim-emirleri` | `POST /uretim-emirleri` | `Acik` (varsayılan) |
| Satış siparişinden | `siparis-is-emri` | `POST /uretim-emirleri/satis-siparisinden` | `OnayBekliyor` |
| Toplu | `toplu-is-emri` | `POST /uretim-emirleri/toplu` | SO varsa `OnayBekliyor`, yoksa `Acik` |
| Plandan | `uretim-planlari` | `POST /uretim-planlari/:id/cevir` | `Acik` (doğrudan INSERT; ops/malzeme doldurma `createOrder` dışı) |

Çekirdek: `routes/production_orders.js` → `createOrder` → `validateBomRouting` + `fillOrderOperations` + `fillOrderMaterials`.

## 2. Veritabanı tabloları

- `production_orders` — başlık
- `production_order_operations` — rota kopyası
- `production_order_components` — BOM kopyası
- `production_order_operation_components` — operasyon bileşenleri
- `production_order_types` — tip
- `production_receipts` (+ `production_receipt_materials`) — üretim girişi / gerçekleşme
- Master: `items`, `boms`/`bom_lines`, `routings`/`routing_operations`, `work_centers`, `warehouses`, `plants`, `companies`

Onayla ilgili kolonlar (mevcut): `status`, `is_approved`, `is_open`, `is_released`, `is_started`.  
**Yok:** `approved_at`, `approved_by_*` (audit eksik).

## 3. İlk statü

- Manuel / plan: çoğunlukla `Acik`, `is_approved=false`
- Satış siparişi kaynaklı: `OnayBekliyor`
- CHECK: `Taslak | OnayBekliyor | Acik | Uretimde | Kapali | Iptal`
- **`Onaylandi` diye ayrı status yok** — onay `is_approved=TRUE` + `status='Acik'`

## 4. Onay öncesi mevcut kontroller

`POST /:id/onayla` bugün yalnızca:

```sql
WHERE status IN ('Taslak', 'OnayBekliyor')
```

Yapılmıyor: ürün aktifliği, BOM/rota varlık, operasyon doluluğu, iş merkezi, miktar, stok yeterliliği, şirket izolasyonu (firma scope request’te var ama onay SQL’inde company filtresi yok), yetki bit’i.

## 5. Onay neyi etkiliyor?

```text
status → Acik
is_approved → TRUE
is_open → Acik
```

Stok hareketi / QC / malzeme tüketimi **oluşturulmaz**.

## 6. Onay sonrası görünüm

- `uretim-emirleri` listesinde durum `Acik`, Onaylı tikli
- `POST /:id/baslat` ile `is_started` + isteğe `Uretimde`
- Operasyon tamamla / `uretim-girisleri` / `hizli-uretim-girisi` ile stok hareketleri

Not (güncellendi): `baslat` artık yalnızca `Acik` / `Uretimde` kabul eder; `OnayBekliyor` / `Taslak` ile başlatma kapalıdır. Legacy `Acik` + `is_approved=false` emirler geriye uyum için hâlâ başlatılabilir.

## 7. Malzeme / rota / operasyon kaynağı

Oluşturma veya `detaylari-doldur` / `bom-rota-degistir` ile:

1. `product_bom_id` → `bom_lines` → `production_order_components`
2. `route_id` → `routing_operations` (+ WC) → `production_order_operations`
3. Op bileşenleri → `production_order_operation_components`

## 8. Stok hareketi mi, hazırlık mı?

**Onay = üretime hazır / açık durum.** Stok hareketi üretim girişi / operasyon tamamlamada.

## 9. Onay sonrası yapılabilecekler

Başlat → operasyon tamamla / üretim girişi → (opsiyonel CKK) → emir `Kapali`.

## 10. İptal / geri alma / revizyon

- Onay geri alma endpoint’i **yok**
- `PUT` ile `status='Iptal'` mümkün (genel güncelleme)
- `DELETE` hard delete (FK riski)
- Üretim başladıysa / tüketim varsa detay yeniden doldurma engellenir (`canFillOrderDetails`)

## Ekranlar (UI)

- `uretim-emirleri`: `approveAction` → `/onayla` (yalnızca formda, status Taslak/OnayBekliyor)
- `siparis-is-emri` / `toplu-is-emri`: onay aksiyonu yok
- Ayrı PRDT03 kolay onay listesi: **yok** (gap)

## Yetki

- API: JWT `authRequired`; ekran-aksiyon yetkisi onayda yok
- UI onay butonu status’a bağlı; özel `onay` yetki biti yok
- Genel onay motoru (`onay-kayitlari`) WO `/onayla` yoluna bağlı değil

## Canias eşlemesi (repo envanteri)

`docs/15_CANIAS_YOUTUBE_TX_ESLESTIRME.csv` satır 39:

- Video: `hguM2VVtOrE` — PRD 10370 PRDT03 Kolay İş Emri Onayı
- Durum: **Kismi** — not: “Onay kısayolu” / mevcut Onayla endpoint
