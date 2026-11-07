# Fonksiyonel Gereksinimler (Taslak)

**Durum:** **G3 kilitli (taslak)** — Aşama 3 çekirdek uygulamaya geçildi; eksik video alanları KI-002 ile izlenir.  
**Kaynaklar:** Brief §2–§10 · `01_CANIAS_PRJ_VIDEO_ANALYSIS.md` (19 video) · `02_JIRA_FEATURE_ANALYSIS.md` · KTB mevcut mimari.

Gereksinim kimliği: `PRJ-FR-NNN`. Öncelik: P0/P1/P2/P3.

---

## 1. Mevcut sistemle uyum (zorunlu kısıtlar)

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| PRJ-FR-001 | Modül `MODULES` içine `proje` (veya `prj`) olarak eklenir; `techId` öneki `PRJ-` | P0 |
| PRJ-FR-002 | Tüm iş kayıtlarında `company_id`; `X-Firma-Id` kapsamı | P0 |
| PRJ-FR-003 | Ekran yetkileri `user_screen_permissions`; modül `module_permissions` | P0 |
| PRJ-FR-004 | Yazma işlemleri mevcut audit middleware ile loglanır | P0 |
| PRJ-FR-005 | Basit tanım ekranları `createTanimRouter` ile | P1 |
| PRJ-FR-006 | Onay gerektiren işlemler `onayService` + `onay_ekranlari` kataloğu | P0 |
| PRJ-FR-007 | Mevcut belgelerdeki `project_code` korunur; master sonrası lookup | P0 |
| PRJ-FR-008 | `crm_tasks` PRJ iş kaydı yerine geçmez | P0 |
| PRJ-FR-009 | Test ortamında gerçek e-posta varsayılan kapalı | P0 |
| PRJ-FR-010 | Migration **056+**; soft archive; finans bağında cascade delete yok | P0 |

---

## 2. Proje yönetimi

| ID | Gereksinim | Öncelik | Kaynak |
|----|------------|---------|--------|
| PRJ-FR-020 | Proje listesi: kod, ad, müşteri, yönetici, durum, öncelik, tarihler, %, bütçe, gerçekleşen | P0 | Brief 7.1 · Canias PRJT30 |
| PRJ-FR-021 | Proje kartı (Genel + WBS/Operasyon/Gantt/Ekip-Bütçe/Maliyet sekmeleri) | P0 | Brief 2.1 · PRJT05 V01 |
| PRJ-FR-022 | Proje türleri yapılandırılabilir; türe göre alan/süreç | P1 | Brief · PRJT05 Tip |
| PRJ-FR-023 | Ekip, faz/WBS, aktivite, milestone, takvim, bağımlılık, kapanış, arşiv | P0–P1 | Brief · PRJT05 |
| PRJ-FR-024 | Çalışma alanı sekmeleri şablona göre gizlenebilir (+ Agile sekmeleri Jira) | P1 | Brief 7.2 · V01 sekmeler |
| PRJ-FR-025 | Proje dashboard (ilerleme, geciken, bütçe sapması, risk, aktivite) | P1 | Brief 7.3 · PRJT30 |
| PRJ-FR-026 | Şablondan oluşturma (yazılım, makine, NPD, ERP, özel üretim) | P0 | Brief §9 |
| PRJ-FR-027 | CRM fırsat / kabul teklif / **satış siparişi veya kaleminden** proje | P0 | Brief 3.1–3.2 · SALT01 V02–03 |
| PRJ-FR-028 | Aktiviteye rol + malzeme/bileşen; plan tipi aktivite | P0 | PRJT05 V04–06 |
| PRJ-FR-029 | Proje fon / finansman satırları + fon faturalandırma | P1 | PRJT05 V08–09 |
| PRJ-FR-030 | Bileşen plan vs güncel maliyet görünümü | P0 | PRJT05 V07 · PRJT09 |
| PRJ-FR-031 | Proje üzerinden satınalma malzemesi / talep bağlama | P0 | PRJT05 V10 |
| PRJ-FR-032 | Operasyon onayı (confirmation) + kullanıcı bazlı onay kuyruğu | P0 | PRJT06/12 |
| PRJ-FR-033 | Kaynak atama (çoklu) operasyonlara | P0 | PRJT17–18 |
| PRJ-FR-034 | Proje fiyatlama / onay maliyetlendirme | P1 | PRJT14–15 |
| PRJ-FR-035 | Rapor hiyerarşisi (WBS/aktivite ağacı) | P1 | PRJT10 |

---

## 3. İş kayıtları ve hiyerarşi

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| PRJ-FR-040 | Yapılandırılabilir iş türleri + tür bazlı ek alanlar | P0 |
| PRJ-FR-041 | İş kartı: kimlik, tür, başlık, açıklama, proje, üst/alt, sorumlu, öncelik, durum, etiket, tarihler, süreler, %, ilişkiler, ek, yorum, geçmiş | P0 |
| PRJ-FR-042 | Detay sekmeleri: Genel, Alt, Bağlantılar, Zaman, Yorum, Dosya, Geçmiş, İlgili ERP | P0 |
| PRJ-FR-043 | Opsiyonel Portföy…Alt görev hiyerarşisi; roll-up % | P1 |
| PRJ-FR-044 | İlişki türleri + döngü engeli; blocks → plan etkisi | P0 |
| PRJ-FR-045 | Toplu atama / durum (yetkili) | P2 |

---

## 4. İş akışı, Agile, zaman

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| PRJ-FR-060 | Tür/şablon bazlı WF; geçişte rol, zorunlu alan, otomasyon, bildirim | P0 |
| PRJ-FR-061 | Durum geçmişi saklanır | P0 |
| PRJ-FR-062 | Kanban: sürükle-bırak = WF API; WIP | P1 |
| PRJ-FR-063 | Backlog önceliklendirme | P1 |
| PRJ-FR-064 | Sprint yaşam döngüsü + kalan iş taşıma + scope log | P1 |
| PRJ-FR-065 | Worklog + çakışma kontrolü + history | P0 |
| PRJ-FR-066 | Scrum/Kanban/Klasik proje yaklaşımı seçimi | P0 |

---

## 5. Kaynak, planlama, risk, doküman

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| PRJ-FR-080 | Proje rolleri/üyeler; kapasite aşımı uyarısı | P1 |
| PRJ-FR-081 | İK takvim/izin/vardiya dikkate alınır | P1 |
| PRJ-FR-082 | Gantt/timeline/takvim; bağımlılık etkisi; kritik yol | P1–P2 |
| PRJ-FR-083 | Risk/problem/CR: olasılık×etki, önlem, ERP bağları | P1 |
| PRJ-FR-084 | Dosya ekleri versiyonlu; yetki proje/kayıt bazlı | P1 |

---

## 6. Bütçe, maliyet, entegrasyon

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| PRJ-FR-100 | Bütçe kalemleri (plan/gerçek/kalan; PB/kur) | P0 |
| PRJ-FR-101 | Bütçe aşımı uyarısı + yetkili revizyon/onay | P0 |
| PRJ-FR-102 | Gerçekleşen maliyet kaynakları drill-down; **çift sayım yok** | P0 |
| PRJ-FR-103 | Gelir − maliyet = brüt sonuç (muhasebe politikasıyla uyumlu) | P1 |
| PRJ-FR-110 | CRM / satış / satınalma / stok / üretim / kalite / İK / finans / bakım bağları (brief §3) | P0–P2 kademeli |
| PRJ-FR-111 | FINT62 benzeri proje mizanı (Canias kanıtı kısmi) | P2 — video/FIN tasarımı sonrası |

---

## 7. Otomasyon, güvenlik, UX

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| PRJ-FR-120 | Tetik+koşul+eylem otomasyonları; log; idempotent | P1 |
| PRJ-FR-121 | Proje bazlı roller; bütçe ayrı yetki | P0 |
| PRJ-FR-122 | Alan seviyesi audit (kritik alanlar) | P1 |
| PRJ-FR-123 | Mevcut KTB form/liste diline uyum; Jira benzeri az tıklama iş kartında | P0 |
| PRJ-FR-124 | Büyük listelerde sayfalama | P1 |

---

## 8. Uçtan uca senaryo (kabul)

Brief §10 (CRM → teklif → proje → WBS → PUR → stok → kurulum → KK → worklog → maliyet → kapanış) **gerçek DB** ile Aşama 8’de zorunlu kabul testi. Sahte-only demo kabul edilmez.

---

## 9. Bilinçli ertelemeler

| Konu | Neden |
|------|--------|
| V03/05/06/08/09/12/13 tam alan listesi | Mid-frame zayıf (PRJ-KI-002); yerel MP4 ile tamamlanır |
| Kesin migration DDL (CREATE TABLE) | Aşama 2 sonu / Aşama 3 başı — `05` mantıksal model hazır |
| Gantt/Kanban DnD kütüphanesi | Aşama 5 (vanilla SPA) |
| Tam DMS | PRJ önce `storage_key`; DMS ayrı |
| Scrum/Kanban Canias kanıtı | Bu playlist’te yok — yalnızca Jira brief |

---

## 10. Sonraki kilitleme

1. ~~G1 Canias playlist~~ ✓  
2. `08_PERMISSION_MATRIX` + `09_AUTOMATION_RULES` + FR freeze → G3 kapat  
3. Aşama 3 kod (migration 056+, MODULES `proje`)
