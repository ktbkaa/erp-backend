# Veritabanı Notları

## Motor

PostgreSQL.

## İlkeler

1. İlişkiler Foreign Key ile kurulur.
2. Belge-satır yapılarında `ON DELETE` kuralları bilinçli seçilir (genelde satır için CASCADE, master referanslarda RESTRICT).
3. Para/miktar alanları `NUMERIC` / `DECIMAL` olur; floating point kullanılmaz.
4. Şema değişiklikleri migration dosyalarıyla yapılır.
5. Üretim verisine el ile destructive müdahale yapılmaz.

## Mevcut prototip tabloları (gözlem)

Koddan anlaşılan / kullanılan tablolar:
- `firmalar`
- `is_yerleri`
- `stoklar`, `stok_detaylari`
- `cariler`, `cari_detaylari`
- `faturalar`, `fatura_detaylari`
- `kisiler`
- `siparisler`, `siparis_detaylari`

Eksik kritik tablolar:
- `depolar`
- `stok_hareketleri` (+ satırlar)
- üretim / satın alma / satış belge zinciri tabloları (ayrıştırılmış)

Detaylı hedef entity listesi: `docs/04_DATA_MODEL.md`.

## Bağlantı güvenliği

Veritabanı kimlik bilgileri ortam değişkenlerinde tutulur. Kaynak koda şifre gömülmez.
)
