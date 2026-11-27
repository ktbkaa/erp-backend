# Aşama 1 Tamamlananlar — Ticari ERP Standart

Tarih: 2026-10-17 · Branch: `cursor/erp-ticari-standart-4f63`  
Analiz: `docs/27_TICARI_ERP_GAP_ANALIZI.md` · Migration: `029_ticari_standart_asama1.sql`

## Tamamlananlar

| Madde | Ne yapıldı | Test |
|-------|------------|------|
| Ödeme koşulu tanımı | Tablo + CRUD + ekran + belge lookup (`odeme_kosulu` → kod) | soft-delete OK |
| Teslimat koşulu | Tablo + CRUD + ekran + sipariş alanına eklendi | seed Incoterms |
| Dil tanımı | Master tablo + ekran; `dil_kodu` lookup | seed tr/en/de/fr/ar |
| Banka tanımı | Master + SWIFT/ülke; cari banka satırına `banka_id` | 7 TR bankası |
| Döviz kurları | Günlük kur + `/cevir` API + ekran | USD/EUR/GBP→TRY |
| Transfer emri | Taslak → Onayla → çift stok hareketi; İptal | unit test taslak/iptal |
| Sayım belgesi | Sistem/sayılan/fark; Onayla → SAYIM hareketi | unit test |
| Soft-delete | `TANIM_SOFT_DELETE=Evet` ile tanım DELETE → `aktif=false` | unit test |
| ATP | `ATP_ZORUNLU` (+ mevcut `ATP_SERT`) satış siparişinde blok | param seed |

## Test sonuçları

```
node --test tests/ticari_asama1.test.js  → 4/4 pass
npm test (regresyon) → aşağıdaki koşuya bakın
```

## Kalan eksikler (Aşama 2+)

1. **AUTH_ZORUNLU=Evet** prod profili + tüm yazma route ACL  
2. Firma scope detay GET tamamı  
3. Transfer onayında depo yetkisi / yolda stok (iki aşamalı TRO)  
4. Fatura→muhasebe / cari mutabakat sertleştirme  
5. Alan seviyesi audit  
6. İK / Bakım iskeleti  
7. Kapasite, GİB, varyant BOM (bilinçli erteleme)

## Kullanım (UI)

- Sabit Tanımlar → Ödeme / Teslimat / Dil / Banka / Döviz Kurları  
- Stok → Bakiye & Hareket → **Transfer Emirleri**, **Sayım Belgeleri**  
- Satış siparişinde ödeme + teslimat koşulu lookup  

## API örnekleri

```
GET  /odeme-kosullari?aktif=true
GET  /doviz-kurlari/cevir?miktar=10&kaynak_pb=USD&hedef_pb=TRY
POST /transfer-emirleri  { kaynak_depo_id, hedef_depo_id, satirlar[] }
POST /transfer-emirleri/:id/onayla
POST /sayim-belgeleri    { depo_id, satirlar[{stok_id,sayilan_miktar}] }
POST /sayim-belgeleri/:id/onayla
```
