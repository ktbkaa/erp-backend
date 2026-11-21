# Kullanılmayan Ekran Analizi + İki Sektör Simülasyonu

Oluşturma: 21.11.2026 14:45:59 (Europe/Istanbul)

## Kaynaklar
- Excel: `docs/system/KTB_ERP_Sistem_Tanitim.xlsx` → 182 ekran
- Önceki sim: ADGIDA+EGEPACK audit (`sim-adgida-egepack-audit.json`) + 4 örnek süreç
- Yeni sim: NORMAK (metal) + LAVANDE (kozmetik) — `scripts/sim-iki-sektor-eksik-ekran.js`

## 1) Önceki simülasyonlarda HİÇ kullanılmayan ekranlar (60)

### Stok (1)
- `mrp-hesap` — MRP Anlık Hesap (`/mrp`)

### Satınalma (1)
- `satin-alma-teklif-istekleri` — Satınalma Teklif İstekleri (`/satin-alma-teklif-istekleri`)

### Üretim (7)
- `bom-level-listesi` — Ürün Ağacı Seviye Listesi (`/bom/level-listesi`)
- `bom-malzeme-degisikligi` — Malzeme Değişikliği (`/bom/malzeme-degisikligi`)
- `siparis-is-emri` — Siparişten İş Emri (`/uretim-emirleri/siparis-adaylari`)
- `toplu-is-emri` — Toplu İş Emri (`/uretim-emirleri/siparis-adaylari`)
- `sinif-tanimi` — Sınıf Tanımı (`/stok-siniflari`)
- `uretim-parametre-dogrulama` — Üretim Parametre Doğrulama (`/uretim-parametreleri/dogrula`)
- `fason-operasyon-takip` — Fason Operasyon Takibi (`/fason/siparisler`)

### Kalite (1)
- `kk-stok-planlari` — Stok Plan Bağları (`/kk-stok-planlari`)

### Finans (5)
- `hesap-belirleme-kurallari` — Hesap Belirleme Kuralları (`/hesap-belirleme-kurallari`)
- `finans-vergi-kodlari` — Vergi Kodları (`/finans-vergi-kodlari`)
- `mali-yillar` — Mali Yıllar (`/muhasebe-donemleri/mali-yillar`)
- `gl-butceler` — GL Bütçeler (`/gl-butceler`)
- `vergi-kodlari` — Vergi Kodları (`/finans-vergi-kodlari`)

### CRM (2)
- `crm-firsat-asamalari` — Fırsat Aşamaları (`/crm-firsat-asamalari`)
- `crm-faaliyet-tipleri` — Faaliyet Tipleri (`/crm-faaliyet-tipleri`)

### Proje Yönetimi (18)
- `prj-dashboard` — Proje Özeti (`/prj-dashboard/overview`)
- `prj-portfolio` — Portföy Özeti (`/prj-dashboard/portfolio`)
- `prj-board` — Kanban (`/prj-board`)
- `prj-backlog` — Backlog (`/prj-planning/backlog`)
- `prj-gantt` — Gantt / Zaman Çizelgesi (`/prj-planning/gantt`)
- `prj-workload` — Kaynak İş Yükü (`/prj-planning/workload`)
- `prj-butce` — Proje Bütçesi (`/prj-budget`)
- `prj-sablonlar` — Proje Şablonları (`/prj-sablonlar`)
- `prj-automations` — Otomasyon Kuralları (`/prj-automations`)
- `prj-project-types` — Proje Türleri (`/prj-project-types`)
- `prj-project-categories` — Proje Kategorileri (`/prj-project-categories`)
- `prj-project-statuses` — Proje Durumları (`/prj-project-statuses`)
- `prj-project-priorities` — Proje Öncelikleri (`/prj-project-priorities`)
- `prj-work-item-types` — İş Türleri (`/prj-work-item-types`)
- `prj-work-item-statuses` — İş Durumları (`/prj-work-item-statuses`)
- `prj-work-item-priorities` — İş Öncelikleri (`/prj-work-item-priorities`)
- `prj-project-roles` — Proje Rolleri (`/prj-project-roles`)
- `prj-relation-types` — İş İlişki Türleri (`/prj-relation-types`)

### İnsan Kaynakları (16)
- `hr-calisma-takvimleri` — Çalışma Takvimleri (`/hr-takvim/takvimler`)
- `hr-vardiyalar` — Vardiyalar (`/hr-takvim/vardiyalar`)
- `hr-vardiya-atamalari` — Vardiya Atamaları (`/hr-takvim/vardiya-atamalari`)
- `hr-resmi-tatiller` — Resmî Tatiller (`/hr-takvim/tatiller`)
- `hr-izin-turleri` — İzin Türleri (`/hr-izin/turler`)
- `hr-izin-bakiyeleri` — İzin Bakiyeleri (`/hr-izin/bakiyeler`)
- `hr-ucretler` — Ücret Tanımları (`/hr-bordro/ucretler`)
- `hr-avanslar` — Avanslar (`/hr-bordro/avanslar`)
- `hr-bordro-parametreleri` — Bordro Parametreleri (`/hr-bordro/parametreler`)
- `hr-bordro-donemleri` — Bordro Dönemleri (`/hr-bordro/donemler`)
- `hr-is-ilanlari` — İş İlanları (`/hr-ise-alim/ilanlar`)
- `hr-adaylar` — Adaylar (`/hr-ise-alim/adaylar`)
- `hr-onboarding` — İşe Giriş Görevleri (`/hr-ise-alim/onboarding`)
- `hr-zimmetler` — Zimmetler (`/hr-ise-alim/zimmetler`)
- `hr-isten-cikis` — İşten Çıkış (`/hr-ise-alim/cikislar`)
- `hr-cikis-nedenleri` — Çıkış Nedenleri (`/hr-ise-alim/cikis-nedenleri`)

### Onay Yönetimi (3)
- `onay-message-template` — Onay Mesaj Şablonları (`/onay-message-sablonlari`)
- `onay-status-tanim` — Onay Durumları (`/onay-durumlari`)
- `onay-modul-kullanimlari` — Onay Modül Kullanımları (`/onay-module-kullanimlari`)

### Sistem (6)
- `zorunlu-alan-tanimlari` — Zorunlu Alanlar (`/zorunlu-alan-tanimlari`)
- `eposta-gonderimleri` — E-posta Gönderimleri (`/eposta-gonderimleri`)
- `sistem-guncelleme` — Sistem Güncelleme (`/sistem-guncelleme`)
- `tablo-bilgileri` — Tablo Bilgileri (`/meta/ekranlar`)
- `sql-sorgu` — SQL Sorgu (`/sql-console`)
- `sayfa-sorgulari` — Sayfa Sorguları (`/meta/sorgular`)

## 2) Yeni simülasyon özeti

| Firma | Sektör | Odak | Örnek belgeler |
|-------|--------|------|----------------|
| **NORMAK** | Metal / talaşlı imalat | Üretim, fason, BOM, sipariş→UE | SO `B00170`, PO `P00132`, UE `E00267`, SE `SE00112` |
| **LAVANDE** | Kozmetik / kimya | CRM·İK·PRJ·Finans + MRP | SO `B00171`, PO `P00133`, MRP `MR00048`, UE `E00268`, SE `SE00113` |

Önceki 60 miss’ten bu turda API dokunuşu: **60/60** (hiç dokunulmayan kalan: **0**).

## 3) Dokunuldu ama yazma/işlem eksik veya hatalı kalanlar

Aşağıdakiler liste/GET ile kapsandı; bazı POST/iş kuralları başarısız (API sözleşmesi, zorunlu alan, proje_id, mükerrer kayıt vb.):

- ✅ `mrp-hesap` (Stok) — GET/işlem başarılı
- ✅ `satin-alma-teklif-istekleri` (Satınalma) — Menüde deprecated/hidden RFQ; GET/POST denendi
- ⚠️ kısmi `bom-level-listesi` (Üretim) — GET var; POST /bom/level-listesi yok (404) — salt okunur araç
- ✅ `bom-malzeme-degisikligi` (Üretim) — GET/işlem başarılı
- ✅ `siparis-is-emri` (Üretim) — GET/işlem başarılı
- ✅ `toplu-is-emri` (Üretim) — GET/işlem başarılı
- ⚠️ kısmi `sinif-tanimi` (Üretim) — API: POST /stok-siniflari → 500: duplicate key value violates unique constraint "item_classes_class_code_key"
- ✅ `uretim-parametre-dogrulama` (Üretim) — Doğrulama GET /uretim-parametreleri/dogrula ile; eski /dogrula POST yok
- ✅ `fason-operasyon-takip` (Üretim) — GET/işlem başarılı
- ⚠️ kısmi `kk-stok-planlari` (Kalite) — POST için plan_id+direction zorunlu; kontrol planı bağlanmalı
- ✅ `hesap-belirleme-kurallari` (Finans) — GET/işlem başarılı
- ⚠️ kısmi `finans-vergi-kodlari` (Finans) — POST country_code zorunlu
- ✅ `mali-yillar` (Finans) — GET/işlem başarılı
- ✅ `gl-butceler` (Finans) — GET/işlem başarılı
- ✅ `vergi-kodlari` (Finans) — finans-vergi-kodlari ile mükerrer orphan ekran
- ⚠️ kısmi `crm-firsat-asamalari` (CRM) — API: POST /crm-firsat-asamalari → 500: duplicate key value violates unique constraint "crm_opportunity_stages_stage_code_key"
- ⚠️ kısmi `crm-faaliyet-tipleri` (CRM) — API: POST /crm-faaliyet-tipleri → 500: duplicate key value violates unique constraint "crm_activity_types_type_code_key"
- ⚠️ kısmi `prj-dashboard` (Proje Yönetimi) — API: GET /prj-dashboard/overview → 400: project_id zorunlu.
- ✅ `prj-portfolio` (Proje Yönetimi) — GET/işlem başarılı
- ⚠️ kısmi `prj-board` (Proje Yönetimi) — API: GET /prj-board → 400: project_id zorunlu.
- ⚠️ kısmi `prj-backlog` (Proje Yönetimi) — API: GET /prj-planning/backlog → 400: project_id zorunlu.
- ⚠️ kısmi `prj-gantt` (Proje Yönetimi) — API: GET /prj-planning/gantt → 400: project_id zorunlu.
- ✅ `prj-workload` (Proje Yönetimi) — GET/işlem başarılı
- ✅ `prj-butce` (Proje Yönetimi) — GET/işlem başarılı
- ✅ `prj-sablonlar` (Proje Yönetimi) — GET/işlem başarılı
- ⚠️ kısmi `prj-automations` (Proje Yönetimi) — GET var; POST endpoint 404 — yazma API eksik
- ⚠️ kısmi `prj-project-types` (Proje Yönetimi) — POST varsayılanları (line_no vb.) API’de zorunlu alan set edilmiyor → 500
- ⚠️ kısmi `prj-project-categories` (Proje Yönetimi) — POST line_no zorunlu → 500 (API varsayılan eksik)
- ⚠️ kısmi `prj-project-statuses` (Proje Yönetimi) — POST line_no zorunlu → 500
- ⚠️ kısmi `prj-project-priorities` (Proje Yönetimi) — POST rank_no zorunlu → 500
- ⚠️ kısmi `prj-work-item-types` (Proje Yönetimi) — POST hierarchy_level zorunlu → 500
- ⚠️ kısmi `prj-work-item-statuses` (Proje Yönetimi) — POST line_no zorunlu → 500
- ⚠️ kısmi `prj-work-item-priorities` (Proje Yönetimi) — POST rank_no zorunlu → 500
- ⚠️ kısmi `prj-project-roles` (Proje Yönetimi) — POST can_view_budget zorunlu → 500
- ⚠️ kısmi `prj-relation-types` (Proje Yönetimi) — POST blocks_schedule zorunlu → 500
- ✅ `hr-calisma-takvimleri` (İnsan Kaynakları) — GET/işlem başarılı
- ⚠️ kısmi `hr-vardiyalar` (İnsan Kaynakları) — API: POST /hr-takvim/vardiyalar → 500: duplicate key value violates unique constraint "hr_shifts_company_id_shift_code_key"
- ✅ `hr-vardiya-atamalari` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-resmi-tatiller` (İnsan Kaynakları) — GET/işlem başarılı
- ⚠️ kısmi `hr-izin-turleri` (İnsan Kaynakları) — API: POST /hr-izin/turler → 500: duplicate key value violates unique constraint "uq_hr_leave_types_leave_code_expr"
- ✅ `hr-izin-bakiyeleri` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-ucretler` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-avanslar` (İnsan Kaynakları) — GET/işlem başarılı
- ⚠️ kısmi `hr-bordro-parametreleri` (İnsan Kaynakları) — POST set_code/country_code/effective_from zorunlu
- ✅ `hr-bordro-donemleri` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-is-ilanlari` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-adaylar` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-onboarding` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-zimmetler` (İnsan Kaynakları) — GET/işlem başarılı
- ✅ `hr-isten-cikis` (İnsan Kaynakları) — GET/işlem başarılı
- ⚠️ kısmi `hr-cikis-nedenleri` (İnsan Kaynakları) — API: POST /hr-ise-alim/cikis-nedenleri → 500: duplicate key value violates unique constraint "uq_hr_termination_reasons_country_code_reason_code_expr"
- ✅ `onay-message-template` (Onay Yönetimi) — GET/işlem başarılı
- ✅ `onay-status-tanim` (Onay Yönetimi) — GET/işlem başarılı
- ✅ `onay-modul-kullanimlari` (Onay Yönetimi) — GET/işlem başarılı
- ✅ `zorunlu-alan-tanimlari` (Sistem) — GET/işlem başarılı
- ✅ `eposta-gonderimleri` (Sistem) — GET/işlem başarılı
- ✅ `sistem-guncelleme` (Sistem) — GET/işlem başarılı
- ✅ `tablo-bilgileri` (Sistem) — GET/işlem başarılı
- ✅ `sql-sorgu` (Sistem) — GET/işlem başarılı
- ✅ `sayfa-sorgulari` (Sistem) — GET/işlem başarılı

## 4) Simülasyonda bulunan hatalar / eksikler

- PRJ tanım POST API’leri zorunlu kolonlara default vermiyor (line_no, rank_no, hierarchy_level, can_view_budget, blocks_schedule) → 500
- prj-dashboard / board / backlog / gantt project_id olmadan 400; UI muhtemelen seçili projeyi bekliyor
- POST /bom/level-listesi ve POST /prj-automations → 404 (yalnızca GET)
- kk-stok-planlari POST sözleşmesi plan_id + direction istiyor
- finans-vergi-kodlari POST country_code zorunlu
- hr-bordro/calismalar aynı kesinleşmiş dönem için 409 (yeniden koşumda)
- Malzeme-depo (item_warehouses) bağlanmadan üretim emri açılamıyor — simde bağlandı

### Ham hata örnekleri
- **bom-level-listesi**: POST /bom/level-listesi → 404: Endpoint bulunamadı.
- **sinif-tanimi**: POST /stok-siniflari → 500: duplicate key value violates unique constraint "item_classes_class_code_key"
- **kk-stok-planlari**: POST /kk-stok-planlari → 400: item_id, plan_id, direction zorunlu.
- **finans-vergi-kodlari**: POST /finans-vergi-kodlari → 400: country_code, tax_code, tax_name zorunlu.
- **crm-firsat-asamalari**: POST /crm-firsat-asamalari → 500: duplicate key value violates unique constraint "crm_opportunity_stages_stage_code_key"
- **crm-faaliyet-tipleri**: POST /crm-faaliyet-tipleri → 500: duplicate key value violates unique constraint "crm_activity_types_type_code_key"
- **prj-project-types**: POST /prj-project-types → 500: null value in column "line_no" of relation "prj_project_types" violates not-null constraint
- **prj-project-categories**: POST /prj-project-categories → 500: null value in column "line_no" of relation "prj_project_categories" violates not-null constraint
- **prj-project-statuses**: POST /prj-project-statuses → 500: null value in column "line_no" of relation "prj_project_statuses" violates not-null constraint
- **prj-project-priorities**: POST /prj-project-priorities → 500: null value in column "rank_no" of relation "prj_project_priorities" violates not-null constraint
- **prj-work-item-types**: POST /prj-work-item-types → 500: null value in column "hierarchy_level" of relation "prj_work_item_types" violates not-null constraint
- **prj-work-item-statuses**: POST /prj-work-item-statuses → 500: null value in column "line_no" of relation "prj_work_item_statuses" violates not-null constraint
- **prj-work-item-priorities**: POST /prj-work-item-priorities → 500: null value in column "rank_no" of relation "prj_work_item_priorities" violates not-null constraint
- **prj-project-roles**: POST /prj-project-roles → 500: null value in column "can_view_budget" of relation "prj_project_roles" violates not-null constraint
- **prj-relation-types**: POST /prj-relation-types → 500: null value in column "blocks_schedule" of relation "prj_relation_types" violates not-null constraint
- **prj-dashboard**: GET /prj-dashboard/overview → 400: project_id zorunlu.
- **prj-board**: GET /prj-board → 400: project_id zorunlu.
- **prj-backlog**: GET /prj-planning/backlog → 400: project_id zorunlu.
- **prj-gantt**: GET /prj-planning/gantt → 400: project_id zorunlu.
- **prj-automations**: POST /prj-automations → 404: Endpoint bulunamadı.
- **hr-vardiyalar**: POST /hr-takvim/vardiyalar → 500: duplicate key value violates unique constraint "hr_shifts_company_id_shift_code_key"
- **hr-izin-turleri**: POST /hr-izin/turler → 500: duplicate key value violates unique constraint "uq_hr_leave_types_leave_code_expr"
- **hr-bordro-parametreleri**: POST /hr-bordro/parametreler → 400: country_code, set_code, set_name, effective_from zorunlu.
- **hr-cikis-nedenleri**: POST /hr-ise-alim/cikis-nedenleri → 500: duplicate key value violates unique constraint "uq_hr_termination_reasons_country_code_reason_code_expr"

## 5) Artifacts

- `/opt/cursor/artifacts/kullanilmayan-ekranlar.md`
- `/opt/cursor/artifacts/sim-iki-sektor-eksik-ekran-audit.xlsx`
- `/opt/cursor/artifacts/sim-iki-sektor-eksik-ekran-audit.md`
- `docs/system/sim-iki-sektor-eksik-ekran-audit.{json,md,xlsx}`
