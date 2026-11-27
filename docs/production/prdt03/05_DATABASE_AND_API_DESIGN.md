# PRDT03 — Veritabanı ve API Tasarımı

## Migration `101_production_order_approval_gate.sql`

`production_orders` üzerine onaya özel kolon eklenmez. Emir, genel onay altyapısına (`docs/30_ONAY_MODULU.md` §6, migration `100_approval_gate_infra.sql`) **`URETIM_EMRI`** belge türü olarak kaydedilir:

- onay bekleyen: `{"status": "OnayBekliyor"}`
- onaylanınca: `{"status": "Acik", "is_approved": true, "is_open": "Acik"}`
- ret/iptal sonuçları: `TASLAK` → `Taslak`, `IPTAL` → `Iptal` (kural bazında seçilir)

Onay izi (kim / ne zaman) ortak `approval_audit_log` tablosundadır: kural yokken doğrudan onay `DOGRUDAN_ONAY`, kural varken `GONDERILDI` → `ADIM_ONAYLANDI` → `ONAYLANDI` / `REDDEDILDI` / `IPTAL`. Sorgu: `GET /onay-izi?document_type_code=URETIM_EMRI&document_id=…`.

## API

### `GET /uretim-emirleri/onay-adaylari`

Query: `status` (opsiyonel), `order_no`, `item_code`, `plant_id`, `order_type_id`  
Scope: `company_id`  
Dönüş: emir özeti + `ready:boolean` + `blockers:string[]` + `warnings:string[]` + `onay_no` (açık onay kaydı varsa; bu durumda `ready=false`)  
Varsayılan filtre: `status IN ('Taslak','OnayBekliyor')`.

### `POST /uretim-emirleri/:id/onayla`

Gövde opsiyonel.  
Sıkı kontroller → `URETIM_EMRI` için aktif onay kuralı yoksa emir doğrudan açılır (+ `DOGRUDAN_ONAY` izi); kural varsa emir `OnayBekliyor` olur ve onay kaydı açılır (`onay_bekliyor: true`, `onay_kayit`).  
Başarı: güncel emir JSON.  
Hata: 400 + `{ hata, blockers? }`; açık onay kaydı varsa 409 `ONAY_BEKLIYOR`.

### `POST /uretim-emirleri/toplu-onay`

```json
{ "ids": [1,2,3] }
```

Yanıt:

```json
{
  "basarili": [{ "id": 1, "order_no": "E00…", "status": "Acik", "onay_bekliyor": false }],
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
- Toplu: genel `bulkActions` (`readyKey: 'ready'`) → listelenen hazır satırlar için `/toplu-onay`
- Menü: Üretim → İş Emri grubu

Mevcut `uretim-emirleri` formu bozulmaz; onay kısayolu orada kalır.
