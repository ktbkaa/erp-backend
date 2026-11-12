# PRDT03 — Veritabanı ve API Tasarımı

## Migration `085_production_order_approval_audit.sql`

```sql
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by_user_code VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_production_orders_approval_queue
  ON production_orders (company_id, status, is_approved)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
```

Yeni tablo yok — mevcut `production_orders` genişletilir.

## API

### `GET /uretim-emirleri/onay-adaylari`

Query: `status` (opsiyonel), `order_no`, `item_code`, `plant_id`, `order_type_id`  
Scope: `company_id`  
Dönüş: emir özeti + `ready:boolean` + `blockers:string[]` + `warnings:string[]`  
Varsayılan filtre: `status IN ('Taslak','OnayBekliyor')`.

### `POST /uretim-emirleri/:id/onayla`

Gövde opsiyonel.  
Sıkı kontroller + audit yazımı.  
Başarı: güncel emir JSON.  
Hata: 400 + `{ hata, blockers? }`.

### `POST /uretim-emirleri/toplu-onay`

```json
{ "ids": [1,2,3] }
```

Yanıt:

```json
{
  "basarili": [{ "id": 1, "order_no": "E00…" }],
  "hatali": [{ "id": 2, "hata": "…" }],
  "basarili_sayisi": 1,
  "hata_sayisi": 1
}
```

### `POST /uretim-emirleri/:id/baslat` (düzeltme)

`OnayBekliyor` / `Taslak` kabul edilmez. Yalnızca `Acik` / `Uretimde` ve henüz başlatılmamış emirler. Legacy `Acik` + `is_approved=false` hâlâ başlatılabilir (geriye uyum).

## UI ekranı

`public/app.js` → `kolay-is-emri-onayi`:

- `endpoint: '/uretim-emirleri/onay-adaylari'`
- `crud: false`, `listActions: ['incele']`
- `approveAction` → `/uretim-emirleri/{id}/onayla`
- Toplu: seçili satırlar için client’tan `/toplu-onay` (secondary / özel buton)
- Menü: Üretim → İş Emri grubu

Mevcut `uretim-emirleri` formu bozulmaz; onay kısayolu orada kalır.
