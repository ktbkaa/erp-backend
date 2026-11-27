# A1 — Altyapı ve atlanan ERP temelleri

## Bu sürümde yapılanlar

| Konu | Neden gerekli? | Ne yaptık? |
|------|----------------|------------|
| `.env` | Şifre kodda olmamalı | `db.js` artık ortam değişkeni okuyor |
| Connection Pool | Transaction için doğru model | `pg.Client` → `pg.Pool` |
| Migration | `DROP TABLE` ile şema yönetimi veri kaybettirir | `npm run migrate` + SQL dosyaları |
| Depo | Mal kabul / sevk / üretim anlamsız kalır | `depolar` tablosu + `/depolar` API |
| Stok hareket motoru | Miktar doğrudan değiştirilmemeli | `stok_hareketleri` + satırlar (yazma sonra süreçlere bağlanacak) |
| Belge numarası | Elle numara çakışması | `belge_numaralari` + otomatik üretici |
| Ölçü birimi | Serbest metin tutarsızlığı | `olcu_birimleri` + seed (AD/KG/MT/LT) |
| Stok tipi / tedarik tipi | Üretim vs satınalma ayrımı | `stoklar` kolonları |
| Sipariş `stok_id` FK | Sadece metin kod güvenli değil | Kolon + backfill + yeni kayıtlarda zorunlu yazım |
| Sipariş `durum` | Onay/kapama süreci | Taslak/Onayli/... |
| Transaction standardı | Yarım master-detail kaydı | `withTransaction` yardımcısı |
| Health check | Sistem ayakta mı? | `GET /health` |

## Bilinçli olarak bu adımda yapılmayanlar

- Auth / JWT (bir sonraki güvenlik adımı)
- Frontend
- Satınalma/satış belge zincirinin tamamı
- Üretim BOM/rota
- Stok hareketine serbest POST (yanlış kullanım riski; süreçler bağlanınca açılacak)

## Senin bilgisayarında uygulama sırası

1. Bu branch’i çek
2. `.env.example` → `.env` kopyala, şifreyi yaz
3. `npm install`
4. `npm run migrate`
5. `npm start`
6. Tarayıcı veya Thunder Client: `http://localhost:3000/health`

## Depo kullanımı (v0.2.1)

1. `GET /is-yerleri` → `id` değerini not et
2. `POST /depolar` ile Ana Depo oluştur:

```json
{
  "is_yeri_id": 1,
  "depo_kodu": "ANA",
  "depo_adi": "Ana Depo",
  "varsayilan": true
}
```

3. `GET /depolar` ile kontrol et

Kurallar:
- Depo bir iş yerine bağlıdır
- İş yerindeki ilk depo otomatik varsayılan olur
- `varsayilan: true` gönderilirse aynı iş yerindeki diğer depoların varsayılan işareti kalkar
