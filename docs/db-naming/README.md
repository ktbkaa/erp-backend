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

## Araçlar

```bash
node scripts/generate-db-en-rename.js   # haritaları yenile (042’yi ezmez)
node scripts/apply-db-en-rename-to-code.js
npm run migrate
```

`apply` Unicode kelime sınırları kullanır (`adım`, `rolü` bozulmaz) ve `yeni` UI anahtarını korur.
