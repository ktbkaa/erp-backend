# PRDT03 — Ekran Alan Envanteri

Kaynak önceliği: (1) KTB mevcut `production_orders` modeli, (2) video metadata (10370), (3) Canias UI varsayımları — **videoda görülmeyen alanlar “Canias kesin” diye işaretlenmez**.

## Ekran kimliği (KTB)

| Özellik | Değer |
|---------|--------|
| Screen id | `kolay-is-emri-onayi` |
| Başlık | Kolay İş Emri Onayı |
| techId | `MFG-WO-APR-001` |
| Endpoint listesi | `GET /uretim-emirleri/onay-adaylari` |
| Onay | `POST /uretim-emirleri/:id/onayla` |
| Toplu onay | `POST /uretim-emirleri/toplu-onay` |

## Alan / işlem tablosu

| Alan / İşlem | Amacı | Veri kaynağı | Zorunluluk | KTB karşılığı |
|---|---|---|---|---|
| Firma (aktif profil) | Şirket izolasyonu | `X-Firma-Id` / `company_id` | Evet (scope) | Mevcut firma picker |
| Filtre: Emir no | Hızlı bulma | `order_no` | Hayır | LIKE |
| Filtre: Stok kodu | Ürün süzme | `items.item_code` | Hayır | LIKE |
| Filtre: Durum | Aday daraltma | `status` | Hayır (varsayılan OnayBekliyor+Taslak) | select |
| Filtre: İş yeri | Tesis | `plant_id` | Hayır | lookup `is-yerleri` |
| Filtre: Emir tipi | Tip | `order_type_id` | Hayır | lookup |
| Liste: Emir no | Kimlik | `order_no` | — | kolon |
| Liste: Emir tarihi | Tarih | `order_date` | — | kolon |
| Liste: Stok kod/ad | Ürün | `item_code`,`item_name` | — | join items |
| Liste: Miktar / Birim | Plan | `planned_quantity`,`uom_code` | — | kolon |
| Liste: Plan başlangıç/bitiş | Plan | `plan_start`,`plan_end` | — | kolon |
| Liste: İş yeri | Tesis | plant | — | join |
| Liste: Durum | Workflow | `status` | — | kolon |
| Liste: Onaylı | Bayrak | `is_approved` | — | kolon |
| Liste: Hazır mı? | Ön kontrol özeti | sunucu `ready` / `blockers[]` | — | türetilmiş |
| İncele | Detay | GET `/:id` | — | mevcut form incele |
| Onayla (tek) | Durum güncelle | POST `/onayla` | Yetki+kurallar | mevcut + sıkılaştırma |
| Toplu onay | Çoklu | POST `/toplu-onay` | Yetki | yeni |
| Detay: BOM / rota / ops / malzemeler | İnceleme | emir ilişkileri | — | mevcut getProductionOrder |
| Onaylayan / onay zamanı | Audit | `approved_by_user_code`,`approved_at` | Onayda yazılır | **yeni kolonlar** |

## Videoda doğrulanamadığı için eklenmeyenler

- Canias’a özgü çizelge seçim paneli (10410 ayrı video)
- İş merkezi yerleşim haritası (10420)
- Operasyon başlat/bitir kontrolleri (10380+)

## Liste varsayılanı

Yalnızca `status IN ('Taslak','OnayBekliyor')` ve `COALESCE(is_deleted,false)=false`.  
`Acik` + `is_approved=false` kayıtlar **aday değildir** (mevcut `/onayla` WHERE ile uyum).
