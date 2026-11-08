# KTB ERP — Proje Yönetimi (PRJ) Modülü  
## Tanıtım ve Kullanım Kılavuzu

**Sürüm:** 1.2  
**Kodlama:** UTF-8  
**Tarih:** 8 Kasım 2026 (Europe/Istanbul)  
**Dal / PR:** `cursor/erp-prj-modul-analiz-4f63` · PR #80  
**Hedef kitle:** Proje yöneticileri, ekip üyeleri, finans sorumluları, sistem yöneticileri

Bu belge modülü **tanıtır** ve ekran/API üzerinden **nasıl kullanılacağını** adım adım anlatır. PDF türevi aynı metinden üretilir.

---

## 1. Modül nedir?

**Proje Yönetimi (PRJ)**, KTB ERP içinde:

- Canias tarzı **proje kartı / bütçe / belge bağı**,  
- Jira tarzı **iş, board, backlog, sprint, worklog**,  
- ERP omurgasıyla **onay, stok, üretim, kalite, e-posta**  

birleştiren ticari kullanım odaklı bir modüldür.

**Teknik kimlik**

| Öğe | Değer |
|-----|--------|
| Sol menü | Proje Yönetimi |
| MODULES id | `proje` |
| Ekran techId öneki | `PRJ-` |
| API öneki | `/prj-*` |
| Firma kapsamı | `X-Firma-Id` / `company_id` |
| Şema | migration `056` + `057` + `058` |

---

## 2. Menü haritası

Sol menüden **Proje Yönetimi**’ni açın. Üst bardan firmayı seçin.

| Bölüm | Ekranlar |
|-------|----------|
| Projeler | Proje Listesi, İş Listesi, Proje Özeti, Portföy |
| Agile / Plan | Kanban Board, Backlog, Sprintler, Gantt, Kaynak İş Yükü |
| Bütçe / Risk | Bütçe Özeti, Riskler |
| Şablon / Otomasyon | Şablonlar, Otomasyon kuralları |
| Tanımlar | Tür, kategori, durum, öncelik, rol, iş tipi/durum/öncelik, ilişki tipi |

---

## 3. Hızlı başlangıç (10 dakika)

1. **Tanımlar** seed’inin geldiğini kontrol edin (tür / durum listeleri dolu olmalı).  
2. **Proje Listesi → Yeni** → proje adı + yönetici + plan tarihler + bütçe.  
3. **İş Listesi**’nden 2–3 iş açın; birine alt görev bağlayın.  
4. **Kanban Board**’da projeyi seçin; kartı “Devam”a taşıyın.  
5. **Gantt**’ta çubuğu sürükleyerek tarihi kaydırın.  
6. **Bütçe** satırı ekleyin; maliyet girin (aşımda onay + e-posta kuyruğu oluşur).  
7. İsteğe bağlı: şablondan proje — `POST /prj-integrations/from-template/TPL_MAKINE`.

Demo / test kayıtlarında `TEST_` ön eki kullanın.

---

## 4. Proje oluşturma

### 4.1 Elle

1. Proje Listesi → **Yeni**  
2. Zorunlu: **Proje adı**  
3. Önerilen: tür, kategori, durum, öncelik, müşteri, yönetici, plan başlangıç/bitiş, planlanan bütçe, yaklaşım (`classic` / `scrum` / `kanban`)  
4. Kaydet — kod boşsa numaratör `PRJ_PROJECT` (`PRJ00001` …)

### 4.2 Şablondan

`POST /prj-integrations/from-template/{kod}`

| Kod | İçerik |
|-----|--------|
| `TPL_YAZILIM` | Yazılım (Scrum) |
| `TPL_MAKINE` | Makine / tesis kurulum |
| `TPL_NPD` | Yeni ürün geliştirme |
| `TPL_ERP` | ERP implementasyon |
| `TPL_OZEL_URETIM` | Özel üretim / sipariş |

Şablon faz, iş ve kilometre taşlarını otomatik üretir.

### 4.3 CRM / satıştan

- Fırsat: `POST /prj-integrations/from-opportunity/{id}`  
- Satış siparişi: `POST /prj-integrations/from-sales-order/{id}` (Canias SALT01 karşılığı)

---

## 5. İş (görev) yönetimi

**İş Listesi** ekranından:

- Proje seçin, başlık girin  
- Tür: Epic, Story, Task, Bug, Activity …  
- Üst iş ile **alt görev** oluşturun  
- Sorumlu atayın (atamada otomasyon + isteğe bağlı e-posta)  
- Tahmini süre (saat) girin  

### Worklog

`POST /prj-isler/{id}/work-logs` — tarih, süre, isteğe bağlı saat aralığı.  
Aynı kullanıcının çakışan aralığı **reddedilir**.

### Durum değiştirme

- `POST /prj-workflows/work-items/{id}/transition`  
- Board taşıma aynı WF kurallarını çalıştırır  
- Açık alt görev varken **Tamamlandı (DONE)** engellenir  
- Durum **APPROVAL** olunca onay kaydı + e-posta kuyruğu açılır  

---

## 6. Kanban Board

1. Kanban Board → proje seçin (yoksa board + sütunlar oluşur)  
2. Tipik sütunlar: Açık → Yapılacak → Devam → İnceleme → Onay → Tamamlandı  
3. Kart taşıma = durum geçişi + **WIP** kontrolü (Devam’da varsayılan limit 5)  
4. Geciken işler `is_overdue` işaretli gelir  

Not: Kart sürükle-bırak API üzerinden çalışır; zengin kart DnD sonraki iyileştirmedir.

---

## 7. Backlog ve Sprint

**Backlog:** Sprint’e alınmamış açık işler; `backlog_rank` ile sıralanır.

**Sprint yaşam döngüsü**

1. Yeni sprint (ad, tarih, kapasite saati)  
2. İş ekle  
3. **Start** → ACTIVE  
4. **Complete** → bitmeyenler backlog’a veya başka sprint’e; kapsam değişiklikleri loglanır  
5. **Cancel** → sprint iptal, işler serbest  

---

## 8. Planlama (Gantt ve iş yükü)

- **Gantt / Zaman Çizelgesi:** plan tarihleri, bağımlılıklar, milestone  
- **Görsel Gantt DnD:**  
  - çubuğu sürükleyin → tarih kayar  
  - sağ kenardan çekin → süre uzar/kısalır  
  - API: `POST /prj-planning/gantt/reschedule`  
- **Kaynak İş Yükü:** kullanıcı bazlı açık iş ve saat; ~160 saati aşım uyarısı  
- Bağımlılık: Blocks, Depends on, Relates … (döngü engelli)  

---

## 9. Belge ↔ proje bağlama

Satış, satınalma, irsaliye, fatura, stok hareketi, üretim emri ve KK emri formlarında **Proje** alanı `prj-projeler` **lookup**’tır. Seçim `project_code` olarak saklanır (serbest metin yoktur).

Bu kod sayesinde stok çıkış / üretim kapanış / KK fire otomatik maliyet yazabilir.

---

## 10. Bütçe ve maliyet

1. Bütçe satırı ekleyin (kategori, miktar, birim fiyat, PB/kur).  
2. Gerçekleşen maliyeti **kaynaklı** girin (`source_module` / `source_table` / `source_id`) — çift sayım engeli.  
3. Özet: plan, gerçekleşen, sapma, brüt sonuç (gelir − maliyet).  
4. Aşımda: otomasyon logu + **onay** (`prj-butce`) + e-posta kuyruğu.  

### Otomatik maliyet kaynakları

| Kaynak | Kategori | Ne zaman |
|--------|----------|----------|
| Stok çıkış satırı | `MALZEME` | `project_code` dolu + çıkış + tutar > 0 |
| Üretim emri | `URETIM` | Emir **Kapali** + `project_code` |
| KK fire | `KALITE` | Reddedilen miktar / fire + `project_code` |

**Not:** Satın alma siparişi genelde **taahhüt**; fatura / stok çıkış **gerçekleşen**.  
SMTP yoksa e-posta `email_dispatches` içinde Bekliyor/Başarısız kalır (`PRJ_EMAIL_NOTIFY=Evet`).

---

## 11. Riskler

Olasılık × Etki → skor. Yüksek riskte otomasyon tetiklenir. Önlem ve acil plan alanlarını doldurun.

---

## 12. Dashboard ve portföy

- **Proje özeti:** ilerleme, geciken iş, kritik bağımlılık, bütçe, risk, son aktivite  
- **Portföy:** firma bazında proje listesi ve özet göstergeler  

---

## 13. Proje kapatma

`POST /prj-integrations/projects/{id}/close`

- Açık iş varsa `force=true` gerekir  
- Durum **Tamamlandı (80)**  
- Kapanış checklist satırları oluşur  
- Onay rotası `prj-projeler` + yöneticiye e-posta kuyruğu  

---

## 14. Yetkiler (özet)

| Rol | Tipik yetki |
|-----|-------------|
| PM | Plan, atama, kapanış talebi, bütçe |
| MEMBER / OWNER | Kendi işleri, worklog, yorum |
| FIN | Bütçe/maliyet (iş düzenleme sınırlı) |
| WATCHER | Salt okunur |
| ADMIN | Tanımlar, WF, otomasyon |

Proje görmek **bütçe görmek demek değildir** — üye flag / rol ayrımı.

---

## 15. Sık yapılan hatalar

| Durum | Çözüm |
|-------|--------|
| Bitiş &lt; başlangıç | Tarihleri düzeltin |
| Alt açıkken Done | Önce altları kapatın |
| WIP aşıldı | Sütundaki işleri bitirin veya limiti artırın |
| Worklog çakışması | Saat aralığını değiştirin |
| Yanlış firma | Üst barda firmayı kontrol edin |
| Arşivli / kapalı proje | Düzenleme için durumu kontrol edin |
| Maliyet yazılmadı | Belgede `project_code` ve çıkış/fire tutarını kontrol edin |

---

## 16. API özeti

| Grup | Önek |
|------|------|
| Proje / iş | `/prj-projeler`, `/prj-isler` |
| Agile | `/prj-board`, `/prj-sprintler`, `/prj-planning/*` |
| Finans | `/prj-budget/*` |
| Rapor | `/prj-dashboard/*` |
| Entegrasyon | `/prj-integrations/*` |
| Otomasyon | `/prj-automations` |
| Tanım | `/prj-project-types`, `/prj-work-item-statuses`, … |

Kimlik: oturum JWT ve/veya `X-Kullanici-Kodu`; firma: `X-Firma-Id`.

---

## 17. İlgili dokümanlar

| Dosya | İçerik |
|-------|--------|
| `15_STAGES_WALKTHROUGH.md` | 8 aşamanın anlatımı |
| `14_FINAL_ASSESSMENT.md` | Dürüst skor (~74/100) |
| `12_KNOWN_ISSUES.md` | Açık maddeler |
| `00`…`09` | Analiz ve tasarım paketi |
| `11_TEST_RESULTS.md` | 14/14 test sonucu |

---

## 18. Kapsam dışı / sonraki

Board kart DnD zenginleştirme, sekmeli proje workspace, HR kapasite entegrasyonu, tam ekran yetki seed, muhasebe fiş motoruna derin bağ.

---

© KTB ERP — Proje Yönetimi Modülü.  
UTF-8 kaynak: bu dosya · PDF: `KTB_ERP_PRJ_Kullanim_Kilavuzu.pdf` · düz metin: `KTB_ERP_PRJ_Kullanim_Kilavuzu.utf8.txt`
