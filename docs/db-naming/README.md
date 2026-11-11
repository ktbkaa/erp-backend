# Veritabanı adlandırma standardı (TR → EN)

UI etiketleri Türkçe kalır. Fiziksel şema (tablo, kolon, index, kısıt) ve API alan anahtarları İngilizce `snake_case` olur.

## Kurallar

1. **Yalnızca RENAME** — veri silinmez, tip değişmez.
2. **Tablolar** çoğul İngilizce iş adına göre (`faturalar` → `invoices`, `cariler` → `partners`).
3. **Kolonlar** ekran / alan anlamına göre (`stok_kodu` → `item_code`, `yeniden_siparis_seviyesi` → `reorder_level`).
4. **Reserved sözcük yok** — örn. yetki kolonu `yeni` → `can_create` (UI aksiyon anahtarı `yeni` alias ile korunur).
5. **Bağlama duyarlı FK** — satınalmada `siparis_id` → `purchase_order_id`; satışta → `sales_order_id`.

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `schema-inventory.json` | Rename öncesi PG envanteri |
| `rename-map.json` | Tablo / kolon / index / FK eşlemesi |
| `column-flat-map.json` | Kod dönüşümü için kolon oylaması |
| `042_schema_english_rename.desired.sql` | Düzeltilmiş sözlükle üretilmiş hedef 042 |

## Migration

- `042_schema_english_rename.sql` — ana TR→EN rename (uygulandı; tarihsel ilk sözlük).
- `043_schema_english_rename_fixups.sql` — reserved/`new`, reorder/safety, PO `purchase_order_id`, vb.
- `044_schema_english_rename_fixups2.sql` — `created_by_user`→`created_by`, `item_uom`→`stock_uom`.
- `076_english_column_names.sql` — kalan Türkçe kolonlar (eşleme: `scripts/i18n-rename/column-map.json`).
- `077_english_index_constraint_names.sql` — index / kısıt / sequence adları katalogdan PG varsayılan kalıbıyla üretilir.

## Global terimler

| Alan | Terim |
|------|-------|
| Cari | `partner` |
| Stok kartı | `item` |
| Depo / raf / konum | `warehouse` / `bin_code` / `location_code` |
| Firma / iş yeri | `company` / `plant` |
| İrsaliye | `delivery_note` |
| Ürün ağacı / rota | `bom` / `routing` |
| Giriş / çıkış kalite kontrol | `incoming_qc` / `outgoing_qc` |
| Satınalma talebi / teklif | `requisition` / `quotation` |
| Muhasebe fişi | `journal_entry` |
| Tedarik tipi | `procurement_type` |
| Fırsat | `opportunity` |
| Silindi / varsayılan / onaylı | `is_deleted` / `is_default` / `is_approved` |
| Onay tarihi / son tarih | `approved_at` / `due_date` |

Boolean kolonlar `is_` / `can_` / `allow_` önekli; zaman damgaları `_at`, tarihler `_date`.

## Index / kısıt adları (077)

| Nesne | Ad |
|-------|----|
| Birincil anahtar | `<table>_pkey` |
| Unique kısıt | `<table>_<cols>_key` |
| Yabancı anahtar | `<table>_<cols>_fkey` |
| Check | `<table>_<cols>_check` |
| Index | `idx_<table>_<cols>` (unique: `uq_`, ifade: `_expr`, kısmi: `_partial`) |
| Sequence | `<table>_<col>_seq` |

Yeni migration'larda bu kalıbı elle yazın; 077 tekrar çalıştırılırsa aynı adları üretir.

## Kod adları

Fonksiyon adları İngilizce camelCase (`scripts/i18n-rename/function-map.json`, ör. `createQcOrder`, `nextDocumentNo`). Arayüz metinleri Türkçe kalır.

Henüz Türkçe kalanlar (ayrı faz): ekran yetki kolonları (`erisim/incele/duzelt/kopyala/sil`), URL yolları (`/crm-firsatlar`), dosya adları (`kaliteService.js`), enum değerleri (`'Taslak'`, `'Giris'`).

## Araçlar

```bash
node scripts/generate-db-en-rename.js   # haritaları yenile (042’yi ezmez)
node scripts/apply-db-en-rename-to-code.js
npm run migrate
```

`apply` Unicode kelime sınırları kullanır (`adım`, `rolü` bozulmaz) ve `yeni` UI anahtarını korur.
