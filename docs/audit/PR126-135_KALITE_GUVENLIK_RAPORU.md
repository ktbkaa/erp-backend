# PR #126–#135 Kalite ve Güvenlik Denetim Raporu

**Tarih:** 2026-11-23 (Europe/Istanbul)  
**Kapsam:** Açık PR’lar #126, #127, #128, #129, #131, #132, #133, #134, #135 (#130 yok)  
**Araçlar:** Semgrep OSS (`p/javascript`, `p/nodejs`, `p/sql-injection`, `p/secrets`), `npm audit`, manuel CodeRabbit tarzı diff incelemesi, Playwright e2e smoke  
**Düzeltme PR’ı:** `cursor/erp-audit-guvenlik-4f63` (bu dal)

> Bu raporda parola, token veya gizli anahtar değeri **yoktur**.

---

## 1) Özet

| Kaynak | Kritik | Yüksek | Orta / Uyarı | Sonuç |
|--------|--------|--------|--------------|--------|
| Semgrep (çalışma dalı + PR head’leri) | 0 | 0 | 1 → 0 | TLS doğrulama atlama (`db-restore-demo.js`) düzeltildi; final tarama 0 bulgu |
| `npm audit` (önce) | 0 | 2 | 1 | `body-parser`, `nodemailer`, `qs` |
| `npm audit` (sonra) | 0 | 0 | 0 | Overrides + nodemailer yükseltmesi |
| Manuel inceleme | 0 | 1 | birkaç | Proje alt uçlarında firma kapsamı eksikti |
| Stok–depo kuralı | — | — | — | Üretim yolunda `assertItemWarehouseAllowed` zorunlu; otomatik IW yok |

---

## 2) Semgrep

Komut:

```bash
pip install semgrep
semgrep scan --config p/javascript --config p/nodejs --config p/sql-injection --config p/secrets
```

Ayrıca PR head ağaçları (#126, #129, #134, #135) ayrı tarandı; tümünde aynı bulgu:

| Önem | Kural | Dosya | Satır (önce) | Açıklama | Durum |
|------|-------|-------|--------------|----------|--------|
| Orta (WARNING) | `bypass-tls-verification` | `scripts/db-restore-demo.js` | ~66 | Uzak Postgres için `rejectUnauthorized: false` | **Düzeltildi** — varsayılan doğrulamalı TLS; güvensiz SSL yalnızca açık env bayrağı ile |

SQL injection / secrets paketlerinde ek bulgu çıkmadı.

---

## 3) npm audit

### Önce

| Önem | Paket | Not |
|------|-------|-----|
| Yüksek | `body-parser` 2.3.0 (express üzerinden) | Sıkıştırılmış gövde DoS (GHSA-27r3-jxmh-p828) |
| Yüksek | `nodemailer` ≤10.1.3 ailesi (kurulu 6.10.1) | SMTP/header/DoS/TLS ile ilgili birden fazla GHSA |
| Orta | `qs` 6.16.0 | `qs.stringify` DoS |

### Sonra (düzeltme dalı)

- `nodemailer` → `^10.6.1`
- `overrides`: `body-parser@2.4.0`, `qs@6.17.1`
- `npm audit`: **0 vulnerabilities**

`epostaService.js` yalnızca `createTransport` / `sendMail` kullanıyor; API uyumu korundu.

---

## 4) CodeRabbit tarzı diff incelemesi

### 4.1 Yüksek — firma kapsamı (IDOR) — **düzeltildi**

**PR:** #135 (mevcut uçlar tip stack’te de vardı)  
**Dosya:** `routes/projects.js`  
**Etkilenen uçlar:**

- `POST /:id/archive`
- `POST /:id/members`
- `DELETE /:id/members/:memberId` (#135)
- `POST /:id/phases` (firma karşılaştırması eksikti)
- `DELETE /:id`

**Sorun:** Proje kimliği ile mutasyon yapılıyor, `companyIdFromReq` ile `projects.company_id` doğrulanmıyordu. Yanlış `X-Firma-Id` ile başka firmanın projesine üye/faz/arşiv işlemi mümkün olabilirdi.

**Düzeltme:** `loadProjectForFirma()` eklendi; yukarıdaki uçlarda 404/403 uygulanıyor. Regresyon testi: `tests/projects_firma_scope.test.js`.

### 4.2 Stok–depo kuralı

| Konum | Bulgu | Önem | Durum |
|-------|-------|------|--------|
| `src/services/stokHareketService.js` (~47–49, ~105–107, ~249+) | `depoZorunluAtla` yok sayılıyor; `assertItemWarehouseAllowed` zorunlu | — | **Uyumlu** (PR #129 ile güçlendirilmiş) |
| `routes/item_warehouses.js`, `routes/items.js` | Bilinçli master CRUD INSERT | — | Beklenen (ekran üzerinden tanım) |
| Demo/sim script’leri (`scripts/demo-*`, `scripts/sim-*`) | Seed için `INSERT INTO item_warehouses` | Düşük | Kasıtlı demo seed; üretim yolu değil |
| PR #129 / #134 demo | Seed IW | Düşük | Raporlandı; üretim servisinde otomatik oluşturma yok |

**Kural doğrulaması:** Stok depoya bağlı değilse hareket 400/`STOK_DEPO_YOK`; `item_warehouses` stok hareketinde otomatik oluşturulmuyor.

### 4.3 SQL injection

Dinamik tablo/sütun kullanımları (`routes/prj_defs.js`, `_belgeCrud.js`, `partners.js`) sabit/whitelist kaynaklı. `stock_movements.js` savepoint adı karakter temizliği yapıyor (`[^a-zA-Z0-9_]`). PR diff’lerinde kullanıcı girdisiyle birleştirilmiş SQL deseni bulunmadı.

### 4.4 Transaction / rollback

İncelenen PR’larda `withTransaction` kullanımı genel olarak tutarlı. Yeni proje sync (`members` / `work_items` / `phases`) tek transaction içinde (#135). Kritik TX açığı görülmedi.

### 4.5 Gömülü kimlik bilgileri (demo script)

Birçok demo/sim/capture script’inde sabit demo kullanıcı/parola kalıpları var (ör. `scripts/sim-*.js`, `scripts/capture-*.js`, `scripts/qa/*.mjs`).

| Önem | Değerlendirme | Durum |
|------|---------------|--------|
| Orta (operasyonel) | Yalnızca yerel/demo script; üretim runtime değil | **Kaldı** — toplu değiştirmek demo regresyonu riski; e2e yeni testler env kullanıyor |

Rapora gerçek parola değerleri yazılmamıştır.

### 4.6 PR bazlı kısa notlar

| PR | İçerik | Güvenlik notu |
|----|--------|---------------|
| #126 | Fason GKK kapısı | Serviste IW assert; demo test seed IW |
| #127 | Excel doküman | Kod riski düşük |
| #128 | ADGIDA/EGEPACK sim | Script seed |
| #129 | Eksik ekran + stok-depo sertleştirme | Üretimde IW otomatik kaldırılmış; olumlu |
| #131 | İki firma demo | Demo script |
| #132 | DEMO sunum doldurma | Demo login kalıpları |
| #133 | Sunum PDF stack | Dönüşüm/Kapalı mantığı |
| #134 | XELEK süreç | Onay + seed; demo parola kalıpları |
| #135 | Projeler ekip/iş | Firma kapsamı eksikleri → düzeltildi |

---

## 5) Playwright smoke

**Dosyalar:**

- `playwright.config.js`
- `tests/e2e/smoke-ana-ekranlar.spec.js`
- `package.json` → `test:e2e`, `@playwright/test`

**Senaryolar (form-solo):**

1. Satış siparişi formu  
2. Sevk emri formu  
3. İş emri formu + sekmeler  
4. Projeler: Genel / Ekip / İşler sekmeleri  

**Çalıştırma:** kimlik bilgileri yalnızca ortam değişkeninden (`ERP_E2E_USER` / `ERP_E2E_PASS`).  
**Son koşum:** 4/4 geçti.

---

## 6) Düzeltme PR’sinde yapılanlar

| Madde | Dosya(lar) |
|-------|------------|
| Proje firma kapsamı | `routes/projects.js` |
| TLS varsayılanı | `scripts/db-restore-demo.js` |
| npm yüksek açıklar | `package.json`, `package-lock.json` |
| Playwright smoke | `playwright.config.js`, `tests/e2e/*` |
| IDOR regresyon testi | `tests/projects_firma_scope.test.js` |
| Bu rapor | `docs/audit/PR126-135_KALITE_GUVENLIK_RAPORU.md` |

---

## 7) Bilinçli olarak kalanlar

| Önem | Konu | Gerekçe |
|------|------|---------|
| Orta | Demo script sabit kimlik bilgileri | Demo/regresyon; env’e taşıma ayrı iş |
| Düşük | Demo/sim `item_warehouses` seed INSERT | Master seed; üretim hareket yolunda yok |
| Bilgi | `depoZorunluAtla: true` çağrıları hâlâ var | İmza geriye uyumlu; servis içinde yok sayılıyor |

---

## 8) Önerilen sonraki adımlar

1. Düzeltme PR’sini (#135 tabanlı) birleştirmek.  
2. Demo script kimliklerini kademeli olarak yalnızca env’e almak.  
3. CI’ya `npm audit --audit-level=high` ve `npm run test:e2e` (secret’lı runner) eklemek.  
4. Semgrep’i PR pipeline’ına eklemek.
