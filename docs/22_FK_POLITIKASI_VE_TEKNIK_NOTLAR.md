# FK politikası, legacy ve frontend kararları

## Master–detail FK (REQ-TEC-003)

| İlişki | Politika |
|--------|----------|
| Belge satırı → belge başlığı | `ON DELETE CASCADE` |
| Belge başlığı → cari/stok/depo | genelde `RESTRICT` / varsayılan (yetim engeli) |
| Cross-doc ref (`kaynak_belge_id`) | soft ref; fiziksel FK yok veya `ON DELETE` yok |

Yeni tablolarda çocuk satırlar her zaman `ON DELETE CASCADE` ile bağlanmalı.

## Legacy: `belge_numaralari` (REQ-TEC-010)

- Runtime numara üretimi: `kod_serileri` + `kodUretici` / `belgeNo`.
- `belge_numaralari` yalnızca eski seed/geçiş; **yeni kod yazmayın** (COMMENT 019).

## Frontend stack (REQ-TEC-008)

- Karar (2026-10-16): **vanilla SPA (`public/app.js`) devam**.
- React+Vite migrasyonu bilinçli ertelendi; bakım maliyeti kabul edildi.
- Yeni ekranlar MODULES tanımına eklenir.

## Vergi / kur (REQ-FIN-008)

- Varsayılan para: `TRY` (`VARSAYILAN_PARA`).
- Varsayılan KDV %: `VARSAYILAN_KDV` (20).
- Çoklu kur motoru v2; fatura satırında `kur` / `kdv_oran` alanları hazır.

## N+1 (REQ-TEC-006)

- Fatura listesi tek sorguda başlık (detay opsiyonel `?detay=1`).
- İndeksler: `019_kismi_eksik_kapatma.sql`.
