# Veritabanı Notları

## Motor

PostgreSQL.

## İlkeler

1. İlişkiler Foreign Key ile kurulur.
2. Belge-satır yapılarında `ON DELETE` kuralları bilinçli seçilir (genelde satır için CASCADE, master referanslarda RESTRICT).
3. Para/miktar alanları `NUMERIC` / `DECIMAL` olur; floating point kullanılmaz.
4. Şema değişiklikleri migration dosyalarıyla yapılır.
5. Üretim verisine el ile destructive müdahale yapılmaz.

## Migration

```bash
npm run migrate
```

Dosyalar: `db/migrations/`

| Dosya | İçerik |
|-------|--------|
| `001_baseline_existing_tables.sql` | Mevcut prototip tablolar |
| `002_erp_foundation.sql` | Depo, stok hareket, belge no, ölçü birimi, stok-işyeri |
| `003_siparis_stok_fk_and_status.sql` | Sipariş stok FK + durum; stok tipi |

Uygulananlar `schema_migrations` tablosunda tutulur.

## Tablolar (v0.2)

**Ana veri:** `firmalar`, `is_yerleri`, `depolar`, `olcu_birimleri`, `stoklar`, `stok_detaylari`, `stok_is_yeri`, `cariler`, `cari_detaylari`, `kisiler`

**Belgeler (prototip):** `siparisler`, `siparis_detaylari`, `faturalar`, `fatura_detaylari`

**Motor:** `stok_hareketleri`, `stok_hareket_satirlari`, `belge_numaralari`

Detaylı hedef entity listesi: `docs/04_DATA_MODEL.md`.

## Bağlantı güvenliği

`.env` dosyası kullan. Kaynak koda şifre gömülmez.
)
