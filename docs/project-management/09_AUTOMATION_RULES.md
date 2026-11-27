# Otomasyon Kuralları — PRJ

**Durum:** Aşama 2 taslak (G3 kilidi)  
**Kaynak:** Brief §5 · Jira Automation modeli · Canias onay/maliyet olayları (PRJT06/07/12)  
**İlke:** `tetikleyici + koşullar + eylemler`; çalıştırma logu; **idempotent** (aynı olay anahtarı tekrar işlenmez); test ortamında e-posta kapalı.

---

## 1. Veri modeli (özet)

| Varlık | Alanlar |
|--------|---------|
| `prj_automations` | company_id, name, enabled, scope (global/project/template), trigger_code, condition_json, action_json, priority |
| `prj_automation_logs` | automation_id, event_key (unique), payload, status (ok/fail/skip), error, started_at, finished_at, retry_count |

`event_key` örn: `workitem:{id}:status:{from}->{to}:{transition_at_iso}`

---

## 2. Tetikleyiciler (katalog)

| Kod | Olay |
|-----|------|
| `WI_CREATED` | İş kaydı oluşturuldu |
| `WI_ASSIGNED` | Sorumlu değişti |
| `WI_STATUS` | Durum geçişi |
| `WI_DUE_SOON` | Bitiş − N gün (zamanlayıcı) |
| `WI_OVERDUE` | Bitiş geçti, tamamlanmadı (zamanlayıcı) |
| `WI_ALL_CHILDREN_DONE` | Tüm alt işler tamam |
| `WI_PROGRESS_ROLLUP` | Alt iş % değişti |
| `RISK_LEVEL` | Risk skoru eşik aşımı |
| `BUDGET_OVERRUN` | Gerçekleşen > plan (kalem veya toplam) |
| `PUR_DELAY` | Bağlı satınalma teslim gecikmesi |
| `SPRINT_CLOSED` | Sprint tamamlandı/iptal |
| `PROJECT_STATUS` | Proje durum değişimi |
| `CONFIRMATION_CREATED` | Operasyon onayı (Canias PRJT06) |
| `WORKLOG_SUBMITTED` | Zaman kaydı girildi |

Zamanlayıcı tetikler: mevcut job/queue altyapısı (e-posta kuyruğu benzeri); polling aralığı yapılandırılır.

---

## 3. Koşul operatörleri

- Alan karşılaştırma: `eq`, `neq`, `in`, `gt`, `lt`, `contains`
- Rol/proje türü/şablon filtresi
- `and` / `or` ağacı (`condition_json`)

Örnek: `status == DONE AND estimated_hours IS NOT NULL AND actual_hours IS NULL` → zorunlu alan otomasyonu yerine WF transition validator tercih edilir; otomasyon yalnızca bildirim/yan etki için.

---

## 4. Eylemler

| Kod | Eylem | Not |
|-----|-------|-----|
| `NOTIFY_USER` | Bildirim (in-app; e-posta opsiyonel) | Testte e-posta off |
| `NOTIFY_ROLE` | Projedeki role (PM, FIN…) | |
| `SET_FIELD` | Alan güncelle (whitelist) | Audit zorunlu |
| `TRANSITION` | WF geçişi | Yetki + validator |
| `CREATE_WI` | Alt/ilişkili iş oluştur | Şablon satırından |
| `UPDATE_PARENT_PCT` | Üst % roll-up | |
| `START_APPROVAL` | `onayService` başlat | Bütçe/kapanış |
| `ADD_WATCHER` | İzleyici ekle | |
| `CREATE_REPORT_SNAP` | Sprint/proje özet snapshot | |
| `LINK_ERP` | Belge bağını işaretle / uyarı | Yan etki; belge üretmez |

---

## 5. Seed kuralları (Brief §5 → uygulama)

| # | Ad | Tetik | Koşul | Eylem |
|---|-----|-------|-------|-------|
| 1 | Atama bildirimi | `WI_ASSIGNED` | assignee not null | `NOTIFY_USER` → assignee |
| 2 | Bitiş hatırlatma | `WI_DUE_SOON` | N=3, status not done | `NOTIFY_USER` assignee |
| 3 | Gecikme → PM | `WI_OVERDUE` | — | `NOTIFY_ROLE` PM |
| 4 | Alt tamam → üst % | `WI_STATUS` / rollup | child → done | `UPDATE_PARENT_PCT` |
| 5 | Tüm alt done → inceleme | `WI_ALL_CHILDREN_DONE` | parent WF izinli | `TRANSITION` → İncelemede + notify lead |
| 6 | Kritik risk | `RISK_LEVEL` | score ≥ kritik | `NOTIFY_ROLE` PM + SPONSOR |
| 7 | Bütçe aşımı | `BUDGET_OVERRUN` | — | `NOTIFY_ROLE` FIN+PM; `START_APPROVAL` revizyon |
| 8 | SA teslim gecikme | `PUR_DELAY` | linked WI | `NOTIFY_USER` WI owner; isteğe bağlı status=Bloke |
| 9 | Sprint kapanış raporu | `SPRINT_CLOSED` | — | `CREATE_REPORT_SNAP` + notify PM |
| 10 | Proje kapanış checklist | `PROJECT_STATUS` | → Closing | `CREATE_WI` checklist şablonu |

---

## 6. Canias kaynaklı ek kurallar

| # | Ad | Kaynak | Not |
|---|-----|--------|-----|
| C1 | Confirmation sonrası maliyet yenile | PRJT06/07 | `CONFIRMATION_CREATED` → maliyet özeti dirty flag |
| C2 | Kullanıcı onay kuyruğu hatırlatma | PRJT12 | Bekleyen confirmation > SLA → notify |
| C3 | Fon faturalandırma sonrası gelir satırı | V08–09 | FIN entegrasyonu olgunlaşınca |

---

## 7. Güvenlik ve kalite

- Otomasyon **WF validator’ı bypass etmez**; `TRANSITION` eylemi aynı API’yi kullanır.
- `SET_FIELD` whitelist: durum, öncelik, %, assignee (ADMIN tanımı genişletebilir).
- Başarısız log: UI’dan yeniden çalıştır (`event_key` aynı kalırsa skip).
- Döngü koruması: aynı WI için max N otomasyon zinciri / olay.
- Çift bildirim: `event_key` unique + kullanıcı başına debounce (örn. overdue günde 1).

---

## 8. Yönetim ekranı

`PRJ-AUTO`: liste, enable/disable, JSON koşul editörü (ileri: görsel builder), son 50 log, retry.

Aşama 7’de UI; Aşama 3–4’te en az seed #1–5 + log tablosu.
