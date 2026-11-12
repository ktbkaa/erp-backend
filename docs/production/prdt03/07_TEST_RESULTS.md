# PRDT03 — Test Sonuçları

Tarih: 2026-11-12 (Europe/Istanbul) · Dal: `cursor/erp-prdt03-kolay-onay-4f63`  
Ortam: yerel Postgres + `node index.js` :3000 · Firma: GIDA (id=9) · Kullanıcı: `owner` (JWT)

Test kayıtları `description LIKE 'PRDT03%'` ile oluşturuldu; mevcut demo üretim emirleri kalıcı olarak bozulmadı (yalnızca yeni satırlar + test amaçlı ops silme / iptal).

## API

| # | Senaryo | Sonuç | Not |
|---|---------|-------|-----|
| N1 | `GET /onay-adaylari` | PASS | Taslak/OnayBekliyor + `ready`/`blockers` |
| N2 | Detay `GET /:id` | PASS | ops/malzeme gerçek emirden |
| N3 | `POST /:id/onayla` (hazır) | PASS | `status=Acik`, `is_approved=true`, `approved_at`, `approved_by_user_code=owner` (JWT) |
| N4 | Onay sonrası aday listesi | PASS | onaylanan düşer |
| N5 | `POST /:id/baslat` OnayBekliyor | PASS | 400 |
| N5b | `baslat` onaylı Acik | PASS | `Uretimde` + `is_started` |
| N6 | `POST /toplu-onay` karışık | PASS | basarili + hatali ayrışır |
| X1 | Tekrar onay | PASS | 400 blockers |
| X2 | Iptal emri onay | PASS | 400 |
| X3 | Opsüz emir | PASS | blocker |
| X5 | Yanlış firma (X-Firma-Id) | PASS | 403 |
| X6 | Geçersiz id | PASS | 404 |
| X7 | Eşzamanlı çift onay | PASS | biri Acik, diğeri 409 |
| E1 | Onay stok hareketi | PASS | onay SQL yalnız `production_orders` günceller |

## UI (headless Chrome / puppeteer-core)

ComputerUse ajanı bu koşuda model limiti nedeniyle çalıştırılamadı; UI doğrulama sistem Chrome + puppeteer-core ile yapıldı.

| # | Senaryo | Sonuç | Kanıt |
|---|---------|-------|--------|
| U1 | Menü → Kolay İş Emri Onayı | PASS | `prdt03-list.png` / `prdt03-list-gida.png` |
| U2 | Liste kolonları Hazır/Engeller | PASS | aynı |
| U3 | Toplu Onayla butonu | PASS | görünür; ready yoksa disabled |
| U4 | İncele + Onayla (inPlace) | PASS | `prdt03-form-inplace.png` → `prdt03-after-approve.png` (“Onayla tamam.”) |
| U5 | Üretim Emirleri entegrasyonu | PASS | onaylı kayıt Acik + Onaylı |
| U6 | Toplu onay UI | PASS* | API tarafı 145/147 onaylandı; toast modal (“Bilgi”) olduğu için `.toast` yakalanamadı |

\* Toplu onay işlevsel olarak doğrulandı (DB/API); UI toast metni otomasyonda kaçırıldı.

## Yapılmayan / kısmi

| # | Senaryo | Durum |
|---|---------|--------|
| X1-auth | Yetkisiz rol ile onay | Yapılmadı — ayrı Personel kullanıcısında production yetkisi matrisi bu dalda seed edilmedi |
| Video kare doğrulama | Canias UI birebir | Yapılamadı — YouTube bot duvarı (`02_CANIAS_VIDEO_ANALYSIS.md`) |
| Canlı tarayıcı (computerUse) | Manuel agent | Limit; headless ile ikame |

## Örnek yanıtlar (özet)

```text
POST /uretim-emirleri/138/onayla → Acik, is_approved=true, approved_by=owner
POST /uretim-emirleri/138/onayla (tekrar) → 400 Durum uygun değil / zaten onaylı
POST /uretim-emirleri/toplu-onay {ids:[142,143,139,999999]}
  → basarili_sayisi=2, hata_sayisi=2
POST /uretim-emirleri/140/baslat (OnayBekliyor) → 400
```
