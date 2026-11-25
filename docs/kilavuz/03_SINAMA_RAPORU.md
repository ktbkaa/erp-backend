# KTB ERP — Sınama Raporu

**Tarih:** 25 Kasım 2025 (Europe/Istanbul)  
**Ortam:** `http://127.0.0.1:3000` · health OK · DB bağlı  
**Araçlar:** `scripts/sinama-full-audit.js`, `npm run qa:smoke`, `scripts/capture-kilavuz-shots.js`

## Özet

| Metrik | Değer |
|--------|-------|
| Firma kapsamlı API (6 firma × ~51 endpoint) | **130 verili OK · 176 boş · 0 HTTP hata** |
| Süreç akışları | **36 OK · 6 FAIL** (FAIL = TEKS/ELEK/DOKUM’da üretim/BOM verisi yok) |
| UI ekran görüntüsü | **31 / 31** (MARVEL) |
| QA smoke | **127 pass · 2 fail · 3 skip** |

### Firma bazlı

| Firma | Verili OK | Boş | Hata | Akış |
|-------|-----------|-----|------|------|
| MARVEL | 40 | 11 | 0 | 8/8 |
| DEMO | 33 | 18 | 0 | 8/8 |
| GIDA | 27 | 24 | 0 | 8/8 |
| ELEK | 10 | 41 | 0 | 4/6 |
| TEKS | 10 | 41 | 0 | 4/6 |
| DOKUM | 10 | 41 | 0 | 4/6 |

MARVEL / DEMO / GIDA’da doğrulanan akışlar: üretim girişi önizleme, rota **aktarılan**, malzeme **tüketilen/kalan**, BOM patlatma, satış/SA sipariş, mal kabul, health.

## QA smoke failures

1. **sql-sorgu** → `GET /sql-console` **404** (ekran envanterinde var, route yok veya farklı path).  
2. **onaylarim** → `GET /onay-kayitlari?benim=true` **401** (smoke oturumu kullanıcı bağlamı eksik; UI login ile açılıyor).

## Gap / durum matrisi

| Konu | Gözlem | Durum |
|------|--------|-------|
| Endpoint path düzeltmeleri | `/para-birimleri`, `/stok-bakiyeleri`, `/kk-kalite/*`, `/hr-ise-alim/ilanlar`, `/hr-bordro/calismalar`, `/onay-rotalari`, `/lisanslar` | OK |
| TEKS / ELEK demo seed | `seedBase` TypeError (`undefined.id`) | GAP |
| MARVEL GKK lot | Lotlu bakiyede lotsuz çıkış engeli (BUG-008) | BİLİNEN |
| MARVEL onay sim | `screen_id` / `rule_id` / `route_id` gerekli | BİLİNEN |
| Fason / nakit boş | Birçok firmada fason + kasa/banka boş | VERİ |
| SQL konsol | Inventory endpoint 404 | GAP |
| Onaylarım smoke | Auth bağlamı | SMOKE |

## Kanıt dosyaları

- `evidence/sinama-audit.json` — firma×endpoint+akış  
- `evidence/screens-inventory.json` — 13 modül / 184 ekran  
- `evidence/qa-smoke.log` + `docs/qa/api-smoke-results.json`  
- `shots/` — 31 PNG  
- `KTB_ERP_Sistem_Kilavuz_Sinama.pdf` — birleşik kılavuz+rapor  

## Sonuç

Sistem, verili firmalarda (özellikle **MARVEL**, **DEMO**, **GIDA**) uçtan uca API ve UI seviyesinde çalışır durumda. Kritik üretim alanları (önizleme, tüketilen/kalan, aktarılan, BOM patlatma) geçti. Açık konular: TEKS/ELEK seed, SQL konsol route, bazı firmalarda fason/finans boşluğu, lot/onay sim kenarları.
