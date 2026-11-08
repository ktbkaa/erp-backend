# PRJ Modülü — Tüm Aşamalar Anlatımı

**Tarih:** 8 Kasım 2026 (Europe/Istanbul)  
**Dal:** `cursor/erp-prj-modul-analiz-4f63`  
**PR:** #80 (birleştirilmedi)  
**Amaç:** Brief’teki 8 aşamanın sırayla ne yaptığını, neden yapıldığını ve teslimatlarını tek bakışta anlatmak.

---

## Genel bakış

KTB ERP içinde **Proje Yönetimi (PRJ)** modülü üç kaynağı birleştirir:

1. **Canias PRJ** — proje kartı, satıştan proje, operasyon/bütçe disiplini  
2. **Jira** — iş kaydı, board, backlog, sprint, worklog  
3. **KTB ERP omurgası** — firma kapsamı, onay, stok/üretim/kalite, e-posta kuyruğu  

Çalışma sırası zorunluydu: önce analiz ve tasarım (kod yok), sonra çekirdek → agile → plan/finans → entegrasyon → rapor/otomasyon → test. Gap turunda (KI-009…013) belge lookup, Gantt DnD, onay/e-posta ve otomatik maliyet tamamlandı.

**Doğrulama (bu koşu):** `node --test tests/prj_core.test.js tests/prj_full.test.js tests/prj_gaps.test.js` → **14/14 PASS**.

---

## Aşama 1 — Analiz (kod yok)

**Soru:** Mevcut KTB ne sunuyor? Canias PRJ kullanıcı seviyesinde ne var? Jira’dan ne alınmalı?

| Çıktı | Konum |
|-------|--------|
| Ana plan / kapılar | `00_PROJECT_MODULE_MASTER_PLAN.md` |
| Canias 19 video analizi | `01_CANIAS_PRJ_VIDEO_ANALYSIS.md` |
| Playlist envanteri | `docs/canias_youtube/PRJ_videos.json` |
| UI mid-frame still (19) | `docs/canias_youtube/prj_hq/*_hq2.jpg` |
| Jira → KTB dönüşümü | `02_JIRA_FEATURE_ANALYSIS.md` |

**Ne anlaşıldı**

- Merkez nesne Canias’ta **PRJT05** proje kartı; satıştan proje **SALT01** karşılığı.  
- Operasyon onayı PRJT06/12 hattı; Scrum/Kanban bu playlist’te yok → Agile Jira’dan alındı.  
- YouTube bulut IP bot engeli yüzünden tam altyazı yok; mid-frame + başlıklarla alan envanteri çıkarıldı (KI-001/002).  
- KTB tarafında vanilla SPA + Express + Postgres; React planı dokümanda kalmış, uygulanmamış → PRJ de SPA’ya yazıldı.

**Kapı:** G0–G2 kapandı.

---

## Aşama 2 — Fonksiyonel tasarım (kod yok)

**Soru:** Hangi ekranlar, hangi tablolar, hangi WF, hangi ERP bağları, kim neyi görür?

| Çıktı | Konum |
|-------|--------|
| Fonksiyonel gereksinimler | `03_FUNCTIONAL_REQUIREMENTS.md` |
| Ekran envanteri | `04_SCREEN_INVENTORY.md` |
| Veri modeli | `05_DATABASE_DESIGN.md` |
| İş akışı | `06_WORKFLOW_DESIGN.md` |
| ERP entegrasyon haritası | `07_ERP_INTEGRATION_MAP.md` |
| Yetki matrisi | `08_PERMISSION_MATRIX.md` |
| Otomasyon kuralları | `09_AUTOMATION_RULES.md` |

**Kilit kararlar**

| Karar | Gerekçe |
|-------|---------|
| Modül id `proje`, techId `PRJ-` | Mevcut MODULES / naming standardı |
| `project_code` VARCHAR | Belgelerde serbest kod bağlama (sonra lookup) |
| Maliyet `source_module/table/id` unique | Çift sayım yasağı |
| Finans ayrı üye flag | Proje görmek ≠ bütçe görmek |
| Migration 056+ | Mevcut şema zinciri |

**Kapı:** G3 kilitlendi (zayıf-frame alanlar KI-002’de açık bırakıldı).

---

## Aşama 3 — Temel geliştirme

**Soru:** Proje ve iş kaydı CRUD’suz ayakta mı?

| Çıktı | Konum |
|-------|--------|
| Şema | `db/migrations/056_prj_core.sql` (+ rollback) |
| API | `/prj-projeler`, `/prj-isler`, `/prj-*-types|statuses|…` |
| UI | MODULES `proje` — liste + tanımlar |
| Test | `tests/prj_core.test.js` (3) |

**Kapsam:** proje master, üyeler, fazlar, iş kayıtları, üst-alt hiyerarşi, worklog (+ çakışma engeli), ilişkiler (döngü engeli), bütçe/maliyet tabloları, seed tür/durum/öncelik/rol.

**Kapı:** G4 — ilk kod.

---

## Aşama 4 — İş yönetimi (Agile + WF)

**Soru:** Jira tarzı board / backlog / sprint / geçiş kuralları çalışıyor mu?

| Çıktı | Konum |
|-------|--------|
| Şema | `db/migrations/057_prj_agile_finance.sql` (WF, board, sprint, ekler, otomasyon, şablon) |
| WF | `src/services/prjWorkflowService.js` |
| Board | `routes/prj_boards.js` — WIP + move=WF |
| Sprint | `routes/prj_sprints.js` — start / complete / cancel |
| Backlog | `/prj-planning/backlog` + reorder |
| Otomasyon çekirdeği | `src/services/prjAutomationService.js` |

**Kurallar (özet):** açık alt görev varken Done engeli; Devam sütununda WIP; atamada otomasyon logu; sprint bitince kalan iş backlog’a taşınabilir.

**UI:** Kanban Board, Backlog, Sprintler.

---

## Aşama 5 — Planlama ve finans

**Soru:** Zaman çizelgesi, kaynak yükü ve bütçe izlenebilir mi?

| API | İşlev |
|-----|--------|
| `/prj-planning/gantt` | Görev + bağımlılık + milestone |
| `/prj-planning/gantt/reschedule` | DnD tarih/süre güncelleme |
| `/prj-planning/calendar` | Takvim olayları |
| `/prj-planning/workload` | Kullanıcı iş yükü / aşım uyarısı |
| `/prj-budget/...` | Bütçe satırı, maliyet, özet, aşım |
| `/prj-riskler` | Olasılık × etki skor |

**UI:** Gantt (liste + görsel çubuk DnD), İş Yükü, Bütçe Özeti, Riskler.

---

## Aşama 6 — ERP entegrasyonları

**Soru:** CRM / satış / satınalma / stok / üretim / kalite projeye bağlanıyor mu?

| Endpoint / bağ | Kaynak |
|----------------|--------|
| `POST /prj-integrations/from-opportunity/:id` | CRM fırsat → proje |
| `POST /prj-integrations/from-sales-order/:id` | Satış siparişi → proje (SALT01) |
| `POST /prj-integrations/link-purchase` | PUR belge bağ |
| `POST /prj-integrations/from-template/:code` | 5 hazır şablon |
| Belge `project_code` lookup | PUR/SAL/INV/MFG/QLT formları → `prj-projeler` |
| `prjCostService` | Stok çıkış / üretim kapanış / KK fire → maliyet |
| Migration `058` | `project_code` kolonları + onay seed |

Şablonlar: `TPL_YAZILIM`, `TPL_MAKINE`, `TPL_NPD`, `TPL_ERP`, `TPL_OZEL_URETIM`.

---

## Aşama 6b — Gap turu (KI-009…013)

Bilinçli eksikler kapatıldı:

| ID | Konu | Sonuç |
|----|------|--------|
| KI-009 | Belge lookup UI | Kapandı |
| KI-005 / Gantt | Görsel DnD | Kapandı (vanilla) |
| KI-012 | onayService + e-posta | Kapandı (`prjNotifyService`) |
| KI-013 | Stok/üretim/KK maliyet | Kapandı |
| Test | `tests/prj_gaps.test.js` | 4/4 PASS |

---

## Aşama 7 — Raporlama, otomasyon, kapanış

| API | İşlev |
|-----|--------|
| `/prj-dashboard/overview` | Proje kokpiti |
| `/prj-dashboard/portfolio` | Firma portföyü |
| `/prj-automations` | Kurallar + log + manuel run |
| `POST .../projects/:id/close` | Kapanış + checklist + onay/e-posta |

Bütçe aşımında ve kapanışta onay kaydı + `email_dispatches` kuyruğu (SMTP yoksa Bekliyor/Başarısız; `PRJ_EMAIL_NOTIFY`).

---

## Aşama 8 — Test ve kalite

| Suite | Sonuç |
|-------|--------|
| `tests/prj_core.test.js` | 3/3 PASS |
| `tests/prj_full.test.js` | 7/7 PASS |
| `tests/prj_gaps.test.js` | 4/4 PASS |
| **Toplam** | **14/14 PASS** |

Plan / sonuç / açıklar: `10_TEST_PLAN.md`, `11_TEST_RESULTS.md`, `12_KNOWN_ISSUES.md`.  
Nihai skor: `14_FINAL_ASSESSMENT.md` → **~74/100**.  
Kullanım kılavuzu: `13_USER_GUIDE.md` + PDF + UTF-8 txt.

---

## Başarı kriterleri (15 soru)

| # | Soru | Durum |
|---|------|--------|
| 1 | Farklı proje türleri | Evet (seed + şablon) |
| 2 | Faz / iş paketi | Evet |
| 3 | Alt görev | Evet |
| 4 | Kanban / Scrum | Evet (board kart DnD sınırlı) |
| 5 | Bağımlılık | Evet (+ döngü engeli) |
| 6 | Gantt / takvim | Evet + görsel DnD |
| 7 | İş yükü | Evet |
| 8 | Worklog | Evet |
| 9 | Bütçe / maliyet | Evet + otomatik kaynak |
| 10 | ERP bağları | CRM/SAL/PUR + stok/üretim/KK; HR açık |
| 11 | Tek ekran izleme | Dashboard + portföy |
| 12 | Yetki | Matris + üye flag (ekran seed kısmi) |
| 13 | Otomasyon | Seed + log + onay/e-posta |
| 14 | Audit | work_item_history + audit |
| 15 | Uçtan uca senaryo | Test suite’te yeşil |

---

## Kalan bilinçli açıklar

- Board kart DnD zenginleştirme (KI-010)  
- Proje workspace sekmeli tek ekran (KI-011)  
- HR izin/vardiya → kapasite  
- Ekran yetki seed tam set  
- Muhasebe fiş motoruna derin maliyet bağları  
- YouTube/DMS (KI-001…003) — altyapı / ürün dışı  

---

## Okuma sırası (yeni gelen için)

1. Bu dosya (`15_…`) — ne yapıldı  
2. `13_USER_GUIDE.md` / PDF — nasıl kullanılır  
3. `14_FINAL_ASSESSMENT.md` — dürüst skor  
4. `00`…`09` — tasarım derinliği  
5. `12_KNOWN_ISSUES.md` — açıklar  

© KTB ERP — Proje Yönetimi. Aşama anlatımı UTF-8.
