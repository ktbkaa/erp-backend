# KTB ERP — Proje Yönetimi (PRJ) Modülü · Ana Plan

**Durum:** Aşama 1 — Analiz (kod yok)  
**Dal:** `cursor/erp-prj-modul-analiz-4f63`  
**Tarih:** 2026-11-06 (Europe/Istanbul)  
**Modül kodu:** `PRJ` (screen-naming-standard’da rezerve)

---

## 1. Amaç

KTB ERP içinde Jira tarzı iş/süreç yönetimi + Canias tarzı ERP süreç bağları + kurumsal planlama/maliyet/kaynak yeteneklerini birleştiren **ticari kullanıma uygun** Proje Yönetimi modülü.

Bu belge Aşama 1 çıktısıdır: mevcut sistem analizi, bağlanacak noktalar, aşama kapıları ve **kod yazmama kuralı**.

---

## 2. Çalışma kapıları (zorunlu)

| Kapı | Koşul | Durum |
|------|--------|--------|
| G0 | Mevcut KTB ERP mimarisi incelendi | **Tamam** — bu paket |
| G1 | Canias **PRJ - TR - Kullanıcı Seviyesi** (19 video) süreç/TX/UI analizi | **Tamam (kanıt sınırlı)** — playlist `PLItkgPiGskZxM2nXsGEO9YJTkC7qKI_uu`; mid-frame UI + başlıklar; tam altyazı/IP engeli notu `01_…` |
| G2 | Jira özellik → KTB gereksinim dönüşümü | **Tamam** — `02_JIRA_FEATURE_ANALYSIS.md` |
| G3 | Fonksiyonel tasarım + veri modeli + ekran/WF/entegrasyon/yetki/otomasyon | **Taslaklar hazır** — `04`–`09`; FR freeze + zayıf-frame alan tamamlaması ile kilitlenecek |
| G4 | İlk migration / MODULES / route kodu (Aşama 3+) | **Yasak** ta ki G3 kilitlenene kadar |

**Kural (kullanıcı talimatı):** Videolar analiz edilmeden ve mevcut sistem incelenmeden modül **uygulama koduna** geçilmez.

---

## 3. Mevcut KTB ERP özeti (bağlam)

| Katman | Gerçek durum | Not |
|--------|--------------|-----|
| Frontend | Vanilla SPA: `public/index.html` + `public/app.js` + `styles.css` | React planı dokümanda; **uygulanmamış** |
| Backend | Express 5, CommonJS, `routes/*`, `src/*` | Modüler monolit |
| DB | PostgreSQL; `db/migrations/` | Son numara bu dalda **055** → PRJ için sonraki **056+** |
| Auth | JWT + `X-Kullanici-Kodu`; ekran ACL `user_screen_permissions` | `module_permissions` JSON |
| Çoklu firma | `X-Firma-Id` / `req.firmaId` | Tüm PRJ kayıtlarında `company_id` |
| Ekran modeli | `MODULES[]` deklaratif list/form | Yeni modül: `id: 'proje'` önerisi |
| Onay | `onayService` + rota/kural/kayıt | PRJ ekranları `onay_ekranlari` kataloğuna eklenecek |
| Audit | `audit_logs` middleware | Yazma işlemleri otomatik |
| E-posta | `email_dispatches` kuyruk | Testte SMTP kapalı tutulacak |
| Dosya | Genel DMS yok; HR `storage_key` metadata | PRJ ekleri aynı desene veya ileride `DMS` |
| Proje alanı bugün | Belgelerde serbest `project_code` (FK yok) | Master `projects` sonrası lookup’a çevrilecek |

**Mevcut modül id’leri:** `fixed-tanimlar`, `sistem`, `ana-veri`, `stok`, `cari`, `uretim`, `satinalma`, `crm`, `satis`, `kalite`, `onay`, `finans`, `insan-kaynaklari`.

**PRJ tablosu/ekranı:** Yok. `crm_tasks` satış/CRM görevidir; PM yerine kullanılmayacak.

Detay: aşağıdaki §5 ve `03_FUNCTIONAL_REQUIREMENTS.md` (mevcut bağlar).

---

## 4. Tasarım ilkeleri (kararlar)

1. **Kopyalama yok** — Jira/Canias’tan prensip alınır; KTB `MODULES`/REST/onay/audit diline uyarlanır.
2. **Yeniden yazma yok** — `createTanimRouter` (basit tanımlar), onay motoru, audit, e-posta kuyruğu, HR personel/takvim/izin, belge `project_code` alanı yeniden kullanılır.
3. **`project_code` geçişi** — Kısa vadede mevcut VARCHAR alanlar korunur; master oluşunca validated lookup + opsiyonel `project_id` FK. Çift maliyet sayımı (PO + fatura) finans kurallarında tek kaynak politikasıyla çözülür (Aşama 2/5 tasarımı).
4. **İş türleri/akışlar yapılandırılabilir** — sabit enum değil; tanım ekranları.
5. **Agile opsiyonel** — Proje şablonunda Scrum / Kanban / Klasik (Gantt) seçimi; her projede hepsi zorunlu değil.
6. **Finansal gizlilik ayrı yetki** — Projeyi gören bütçeyi görmeyebilir.
7. **Test verisi** — `TEST_` / `DEMO_` önek; gerçek e-posta/e-fatura/banka yok.

---

## 5. ERP bağ noktaları (özet harita)

| Modül | Mevcut kanca | PRJ hedefi |
|-------|--------------|------------|
| CRM | Fırsat, görev, ajanda | Fırsat → proje; faaliyet/görüşme bağlama |
| Satış | Teklif/sipariş/`project_code` | Teklif/sipariş ↔ proje; beklenen gelir |
| Satınalma | Talep/sipariş/`project_code` | Talep/PO ↔ proje/görev; teslimat → takvim uyarısı |
| Stok | Rezervasyon, hareket | Proje rezervasyonu; çıkış → maliyet |
| Üretim | İş emri, BOM, rota | WO ↔ proje; ilerleme/maliyet |
| Kalite | KK emri, uygunsuzluk, CAPA | NCR → proje görevi / CAPA |
| İK | Personel, izin, takvim, vardiya | Ekip, kapasite, worklog maliyeti |
| Finans | YE satır `project_code`, mizan | Bütçe/gerçekleşen; Canias FINT62 benzeri proje mizanı |
| Onay | Rota motoru | Bütçe aşımı, kapanış, değişiklik talebi |
| Sistem | Audit, e-posta, SQL/meta | Log, bildirim, Sayfa Sorgu kaydı |

Tam harita Aşama 2’de: `07_ERP_INTEGRATION_MAP.md`.

---

## 6. Aşama planı (kullanıcı §13 ile hizalı)

| Aşama | İçerik | Kod? | Kapı |
|------|--------|------|------|
| **1 Analiz** | Mimari + Canias video + Jira → gereksinim | Hayır | G0–G2 |
| **2 Tasarım** | Ekran envanteri, WF, DB, entegrasyon, yetki | Hayır (şema taslak OK) | G3 |
| **3 Temel** | Proje kartı/liste, iş kaydı, hiyerarşi, ekip | Evet | G4 |
| **4 İş yönetimi** | WF, board, backlog, sprint, worklog, yorum/dosya | Evet | — |
| **5 Planlama/finans** | Gantt, bağımlılık, kaynak, bütçe, maliyet | Evet | — |
| **6 Entegrasyon** | CRM…FIN bağları gerçek API/FK | Evet | — |
| **7 Rapor/otomasyon** | Dashboard, rapor, otomasyon, kapanış | Evet | — |
| **8 Test** | Fonksiyonel/negatif/UI/regresyon + uçtan uca senaryo | Evet | — |

Paralel yalnızca bağımlılığı olmayan doküman/tasarım işleri için.

---

## 7. Doküman paketi

| Dosya | Aşama 1 durumu |
|-------|----------------|
| `00_PROJECT_MODULE_MASTER_PLAN.md` | **Yazıldı** |
| `01_CANIAS_PRJ_VIDEO_ANALYSIS.md` | **İskelet + mevcut kanıt**; video paketi bekleniyor |
| `02_JIRA_FEATURE_ANALYSIS.md` | **Yazıldı** |
| `03_FUNCTIONAL_REQUIREMENTS.md` | **Taslak** (video sonrası kilitlenecek) |
| `04_SCREEN_INVENTORY.md` … `14_FINAL_ASSESSMENT.md` | Aşama 2+ / 8 — yer tutucu başlıklar |

---

## 8. Başarı ölçütü (ileride)

Kullanıcı §17’deki 15 soru + 100 üzerinden skor kartı `14_FINAL_ASSESSMENT.md` içinde doldurulacak. Aşama 1’de skor verilmez (yanıltıcı olur).

---

## 9. Sonraki adım

1. ~~PRJ playlist~~ → **yapıldı** (19/19 envanter + UI still analizi).
2. Aşama 2 kilidi: yetki matrisi (`08`), otomasyon (`09`), FR kesinleştirme; isteğe bağlı yerel MP4 ile eksik frame’li videoların alan tamamlaması.
3. G3 kapanınca Aşama 3 kod (056+ migration, MODULES `proje`) — **şimdilik kod yok**.
