# PRJ Modülü — Tüm Aşamalar Özeti

**Tarih:** 7 Kasım 2026 (Europe/Istanbul)  
**Dal:** `cursor/erp-prj-modul-analiz-4f63`  
**Amaç:** Brief’teki 8 aşamanın sırayla ne yaptığını ve teslimatları tek bakışta göstermek.

---

## Aşama 1 — Mevcut sistem + Canias + Jira analizi

| Çıktı | Konum |
|-------|--------|
| Master plan / kapılar | `00_PROJECT_MODULE_MASTER_PLAN.md` |
| Canias 19 video analizi | `01_CANIAS_PRJ_VIDEO_ANALYSIS.md` |
| Playlist envanteri | `docs/canias_youtube/PRJ_videos.json` |
| UI mid-frame still | `docs/canias_youtube/prj_hq/*_hq2.jpg` |
| Jira → KTB dönüşümü | `02_JIRA_FEATURE_ANALYSIS.md` |

**Bulgular:** Merkez nesne PRJT05 proje kartı; SALT01 satış→proje; operasyon onayı PRJT06/12; Scrum/Kanban bu playlist’te yok (Jira’dan). YouTube bulut IP bot engeli → alan envanteri kısmi (KI-001/002).

---

## Aşama 2 — Fonksiyonel tasarım

| Çıktı | Konum |
|-------|--------|
| FR | `03_FUNCTIONAL_REQUIREMENTS.md` (G3 kilitli taslak) |
| Ekran envanteri | `04_SCREEN_INVENTORY.md` |
| Veri modeli | `05_DATABASE_DESIGN.md` |
| İş akışı | `06_WORKFLOW_DESIGN.md` |
| ERP entegrasyon haritası | `07_ERP_INTEGRATION_MAP.md` |
| Yetki matrisi | `08_PERMISSION_MATRIX.md` |
| Otomasyon kuralları | `09_AUTOMATION_RULES.md` |

**Kararlar:** Vanilla SPA + Express + Postgres; modül id `proje`; techId `PRJ-`; migration 056+; `project_code` VARCHAR korunur; maliyet çift sayım yasağı; finans yetkisi ayrı flag.

---

## Aşama 3 — Temel geliştirme

| Çıktı | Konum |
|-------|--------|
| Şema | `db/migrations/056_prj_core.sql` |
| Rollback | `db/rollbacks/056_prj_core.sql` |
| API | `/prj-projeler`, `/prj-isler`, tanım router’ları |
| UI | MODULES `proje` — liste + tanımlar |
| Test | `tests/prj_core.test.js` |

**Kapsam:** Proje master, üyeler, fazlar, iş kayıtları, üst-alt, worklog (+ çakışma), ilişkiler (döngü engeli), bütçe/maliyet tabloları, seed tür/durum/öncelik/rol.

---

## Aşama 4 — İş yönetimi (Agile + WF)

| Çıktı | Konum |
|-------|--------|
| Şema | `db/migrations/057_prj_agile_finance.sql` (WF/board/sprint/ekler/otomasyon/şablon) |
| WF servisi | `src/services/prjWorkflowService.js` |
| Board | `routes/prj_boards.js` — WIP + move=WF |
| Sprint | `routes/prj_sprints.js` — start/complete/cancel + kalan iş taşıma |
| Backlog | `/prj-planning/backlog` + reorder |
| Otomasyon | `src/services/prjAutomationService.js` + seed kurallar |

**UI:** Kanban Board, Backlog, Sprintler ekranları.

---

## Aşama 5 — Planlama ve finans

| API | İşlev |
|-----|--------|
| `/prj-planning/gantt` | Görev + bağımlılık + milestone |
| `/prj-planning/calendar` | Takvim olayları |
| `/prj-planning/workload` | Kullanıcı iş yükü / aşım uyarısı |
| `/prj-budget/...` | Bütçe satırları, maliyet (kaynak drill-down), özet, aşım otomasyonu |
| `/prj-riskler` | Olasılık×etki skor |

**UI:** Gantt, İş Yükü, Bütçe Özeti, Riskler.

---

## Aşama 6 — ERP entegrasyonları

| Endpoint | Kaynak |
|----------|--------|
| `POST /prj-integrations/from-opportunity/:id` | CRM fırsat → proje |
| `POST /prj-integrations/from-sales-order/:id` | SALT01 satış siparişi → proje + sales_link |
| `POST /prj-integrations/link-purchase` | PUR belge bağ (V10) |
| `POST /prj-integrations/from-template/:code` | 5 şablon (yazılım/makine/NPD/ERP/özel üretim) |

Belge `project_code` alanları SPA’da `prj-projeler` lookup’a bağlandı (KI-009). Stok / üretim / KK kolonları migration `058` ile eklendi; otomatik maliyet `prjCostService`.

---

## Aşama 6b — Gap turu (KI-009…013)

| Konu | Teslimat |
|------|----------|
| Belge lookup | `public/app.js` — PUR/SAL/INV/MFG/QLT `project_code` → lookup |
| Gantt DnD | `POST /prj-planning/gantt/reschedule` + görsel çubuk UI |
| Onay + e-posta | `prjNotifyService` → `baslatOnay` + `email_dispatches`; onay ekran kataloğu |
| Otomatik maliyet | Stok çıkış / üretim Kapali / KK fire → `project_cost_entries` |
| Test | `tests/prj_gaps.test.js` (4) — toplam **14/14 PASS** |
| Şema | `db/migrations/058_prj_gaps_lookup_cost.sql` |

---

## Aşama 7 — Raporlama, otomasyon, kapanış

| API | İşlev |
|-----|--------|
| `/prj-dashboard/overview` | Proje kokpiti (ilerleme, geciken, kritik, bütçe, risk, aktivite) |
| `/prj-dashboard/portfolio` | Firma portföy özeti (PRJT30) |
| `/prj-automations` | Kurallar + log + manuel run |
| `POST .../projects/:id/close` | Kapanış + checklist otomasyonu |

---

## Aşama 8 — Test ve kalite

| Suite | Sonuç |
|-------|--------|
| `tests/prj_core.test.js` | 3/3 PASS |
| `tests/prj_full.test.js` | 7/7 PASS (şablon, board, sprint, bütçe, gantt/dashboard, risk/kapanış, WF guard) |
| `tests/prj_gaps.test.js` | 4/4 PASS (lookup UI, Gantt reschedule, onay+e-posta, otomatik maliyet) |

Bilinen açıklar: `12_KNOWN_ISSUES.md` (KI-001…004, 007–008, 010 board, 011).  
Kullanıcı kılavuzu PDF: `docs/project-management/KTB_ERP_PRJ_Kullanim_Kilavuzu.pdf`  
UTF-8 kaynak: `docs/project-management/13_USER_GUIDE.md`

---

## Başarı kriterleri (özet)

| # | Soru | Durum |
|---|------|--------|
| 1 | Farklı proje türleri | Evet (seed + şablon) |
| 2 | Faz / iş paketi | Evet (phases + epic/task) |
| 3 | Alt görev | Evet |
| 4 | Kanban / Scrum | Evet (API+ekran; board kart DnD sınırlı) |
| 5 | Bağımlılık | Evet (+ döngü engeli) |
| 6 | Gantt / takvim API | Evet + görsel DnD tarih/süre |
| 7 | İş yükü | Evet |
| 8 | Worklog | Evet |
| 9 | Bütçe / maliyet | Evet + stok/üretim/KK otomatik |
| 10 | ERP bağları | CRM/SAL/PUR/şablon + stok/üretim/KK maliyet; HR kapasite açık |
| 11 | Tek ekran izleme | Dashboard + portföy (workspace sekmeleri açık) |
| 12 | Yetki | Matris + üye flag (tam ekran yetki seed sonraki) |
| 13 | Otomasyon | Seed + log + idempotent + onay/e-posta |
| 14 | Audit | work_item_history + audit middleware |
| 15 | Uçtan uca senaryo | Şablon→board→sprint→bütçe→risk→kapanış + gaps testte |

**100 üzerinden (dürüst):** Fonksiyonel ~80 · ERP entegrasyon ~72 · UX ~74 · WF esnekliği ~78 · Finans ~78 · Güvenlik ~62 · Performans ~72 · Test ~82 · Ticari hazırlık ~72. Ortalama **~74/100**. Kalan: board kart DnD, HR kapasite, workspace sekmeleri, muhasebe motor derin bağ, ekran yetki seed.
