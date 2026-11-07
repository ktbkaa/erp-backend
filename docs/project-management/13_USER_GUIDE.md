# KTB ERP — Proje Yönetimi (PRJ) Modülü Kullanım Kılavuzu

**Sürüm:** 1.1  
**Kodlama:** UTF-8  
**Tarih:** 7 Kasım 2026 (Europe/Istanbul)  
**Hedef kitle:** Proje yöneticileri, ekip üyeleri, finans sorumluları, sistem yöneticileri

---

## 1. Modüle giriş

Sol menüden **Proje Yönetimi** modülünü açın. Üst bardan çalışılan **firmayı** seçin; tüm kayıtlar firma kapsamındadır (`X-Firma-Id`).

Ana bölümler:

1. **Projeler** — Liste, işler, proje özeti, portföy  
2. **Agile / Plan** — Board, backlog, sprint, Gantt, iş yükü  
3. **Bütçe / Risk** — Bütçe özeti, riskler  
4. **Şablon / Otomasyon** — Hazır şablonlar, otomasyon kuralları  
5. **Tanımlar** — Tür, durum, öncelik, rol, ilişki tipi  

---

## 2. Proje oluşturma

### 2.1 Elle oluşturma

1. **Proje Listesi** → Yeni  
2. Zorunlu: **Proje adı**  
3. Önerilen: tür, kategori, durum, öncelik, müşteri, yönetici, plan tarihler, bütçe, yaklaşım (`classic` / `scrum` / `kanban`)  
4. Kaydet — kod boşsa numaratör `PRJ_PROJECT` üretir (`PRJ00001` …)

### 2.2 Şablondan oluşturma

API / entegrasyon: `POST /prj-integrations/from-template/{kod}`

| Kod | Şablon |
|-----|--------|
| `TPL_YAZILIM` | Yazılım (Scrum) |
| `TPL_MAKINE` | Makine / tesis kurulum |
| `TPL_NPD` | Yeni ürün geliştirme |
| `TPL_ERP` | ERP implementasyon |
| `TPL_OZEL_URETIM` | Özel üretim / sipariş |

Şablon; faz, iş ve kilometre taşlarını otomatik oluşturur.

### 2.3 Satış / CRM’den

- Fırsat: `POST /prj-integrations/from-opportunity/{id}`  
- Satış siparişi: `POST /prj-integrations/from-sales-order/{id}` (Canias SALT01 karşılığı)

---

## 3. İş (görev) yönetimi

**İş Listesi** ekranından:

- Proje seçin, başlık girin  
- Tür: Epic, Story, Task, Bug, Activity … (tanımlardan genişletilebilir)  
- Üst iş seçerek **alt görev** oluşturun  
- Sorumlu atayın (atamada otomasyon logu oluşur)  
- Tahmini süre (saat) girin  

### Zaman kaydı (worklog)

`POST /prj-isler/{id}/work-logs` — tarih, süre, isteğe bağlı saat aralığı.  
Aynı kullanıcının çakışan saat aralığı **reddedilir**.

### Durum değiştirme

- İş akışı geçişi: `POST /prj-workflows/work-items/{id}/transition`  
- Board taşıma aynı kuralları çalıştırır  
- Açık alt görev varken **Tamamlandı** engellenir  

---

## 4. Kanban Board

1. **Kanban Board** → proje seçin (yoksa otomatik board + sütunlar oluşur)  
2. Sütunlar: Açık → Yapılacak → Devam → İnceleme → Onay → Tamamlandı  
3. Kart taşıma = durum geçişi + WIP kontrolü (Devam sütununda varsayılan limit 5)  
4. Geciken işler `is_overdue` ile işaretlenir  

---

## 5. Backlog ve Sprint

**Backlog:** Sprint’e alınmamış açık işler; `backlog_rank` ile sıralanır.  

**Sprint:**

1. Yeni sprint (ad, tarih, kapasite)  
2. İş ekle  
3. **Start** → ACTIVE  
4. **Complete** → bitmeyenler backlog’a veya başka sprint’e taşınır; kapsam değişiklikleri loglanır  
5. **Cancel** → sprint iptal, işler serbest kalır  

---

## 6. Planlama

- **Gantt / Zaman Çizelgesi:** plan tarihleri, bağımlılıklar, milestone  
- **Görsel Gantt DnD:** çubuğu sürükleyerek tarihi kaydırın; sağ kenardan genişleterek süreyi güncelleyin (`POST /prj-planning/gantt/reschedule`)  
- **Kaynak İş Yükü:** kullanıcı bazlı açık iş ve saat; 160 saati aşım uyarısı  
- Bağımlılık türleri: Blocks, Depends on, Relates … (döngü engelli)  

---

## 6.1 Belge ↔ proje bağlama

Satış / satınalma / irsaliye / fatura / stok hareketi / üretim emri / KK emri formlarında **Proje** alanı `prj-projeler` lookup’tır; seçilen değer `project_code` olarak saklanır (serbest metin yok).

---

## 7. Bütçe ve maliyet

1. Bütçe satırı ekleyin (kategori, miktar, birim fiyat, PB/kur)  
2. Gerçekleşen maliyeti **kaynaklı** girin (`source_module/table/id`) — çift sayım engeli  
3. Özet: plan, gerçekleşen, sapma, brüt sonuç (gelir − maliyet)  
4. Aşımda `BUDGET_OVERRUN` otomasyonu loglanır; **onay kaydı** (`prj-butce`) + e-posta kuyruğu açılır  
5. Otomatik maliyet: stok **çıkış** → `MALZEME`; üretim emri **kapalı** → `URETIM`; KK **fire** → `KALITE` (`project_code` doluysa)

**Not:** Satın alma siparişi varsayılan olarak **taahhüt**; fatura/stok çıkış **gerçekleşen** olarak tasarlanmıştır. SMTP yoksa e-posta `email_dispatches` içinde Bekliyor/Başarısız kalır (`PRJ_EMAIL_NOTIFY=Evet`).

---

## 8. Riskler

Olasılık × Etki → skor. Yüksek riskte otomasyon tetiklenir. Önlem ve acil plan alanlarını doldurun.

---

## 9. Proje kapatma

`POST /prj-integrations/projects/{id}/close`

- Açık iş varsa `force=true` gerekir  
- Durum **Tamamlandı (80)**  
- Kapanış checklist otomasyonu satırları oluşturur  
- Onay rotası `prj-projeler` + yöneticiye e-posta kuyruğu  

---

## 10. Yetkiler (özet)

| Rol | Tipik yetki |
|-----|-------------|
| PM | Plan, atama, kapanış talebi, bütçe |
| MEMBER / OWNER | Kendi işleri, worklog, yorum |
| FIN | Bütçe/maliyet (iş düzenleme sınırlı) |
| WATCHER | Salt okunur |
| ADMIN | Tanımlar, WF, otomasyon |

Proje görmek **bütçe görmek demek değildir** — üye flag / rol ayrımı.

---

## 11. Sık yapılan hatalar

| Durum | Çözüm |
|-------|--------|
| Bitiş &lt; başlangıç | Tarihleri düzeltin |
| Alt açıkken Done | Önce altları kapatın |
| WIP aşıldı | Sütundaki işleri bitirin veya limiti artırın |
| Worklog çakışması | Saat aralığını değiştirin |
| Yanlış firma | Üst barda firmayı kontrol edin |
| Arşivli proje | Düzenleme için arşivden çıkarın |

---

## 12. Test verisi

Demo kayıtlarında `TEST_` ön eki kullanın. Gerçek e-posta / e-fatura / banka işlemi test ortamında varsayılan kapalıdır.

---

## 13. Desteklenen API özeti

| Grup | Önek |
|------|------|
| Proje / iş | `/prj-projeler`, `/prj-isler` |
| Agile | `/prj-board`, `/prj-sprintler`, `/prj-planning/*` |
| Finans | `/prj-budget/*` |
| Rapor | `/prj-dashboard/*` |
| Entegrasyon | `/prj-integrations/*` |
| Tanım | `/prj-project-types`, `/prj-work-item-statuses`, … |

---

© KTB ERP — Proje Yönetimi Modülü. Bu kılavuz UTF-8 metin olarak saklanır; PDF türevi aynı içerikten üretilir.
