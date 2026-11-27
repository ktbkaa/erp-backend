# Güvenlik ve Yetki Test Sonuçları

**Tarih:** 2026-11-05 Europe/Istanbul

| # | Senaryo | Beklenen | Gerçekleşen | Sonuç |
|---|---|---|---|---|
| S1 | Login `ADMIN`/`admin` | 200 + access_token | 200 | PASS |
| S2 | Token’sız korumalı endpoint | 401 | Smoke sonrası 401/redirect | PASS |
| S3 | ADMIN firma listesi GIDA’sızken X-Firma-Id=9 | Firma yetkisi yoksa engel | Önce GIDA yoktu; seed sonrası grant | FIXED |
| S4 | Cross-company orphan (DB audit) | 0 | 0 | PASS |
| S5 | Rol matrisi (satış/finans/depo ayrı kullanıcı) | Yetkisiz ekran 403 | Bu turda otomatize edilmedi | SKIP |
| S6 | Frontend buton gizleme ≠ backend engeli | Backend enforce | Kısmi örnekleme | PARTIAL |

## Bulgular
- `user_company_permissions` boşken UI firma seçimi sınırlı; API’de `X-Firma-Id` ile erişim politikası middleware’e bağlı — GIDA grant `ensure-gida-org` içine eklendi.
- Tam 10 roller matrisi: **açık iş** (P2 süreç borcu).

## Açık
- Rol bazlı negatif matris otomasyonu yok → final puanda güvenlik 6/10.
