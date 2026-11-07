# Canias PRJ Video Analizi — `PRJ - TR - Kullanıcı Seviyesi`

**Playlist:** [PRJ - TR - Kullanıcı Seviyesi](https://www.youtube.com/playlist?list=PLItkgPiGskZxM2nXsGEO9YJTkC7qKI_uu)  
**Playlist ID:** `PLItkgPiGskZxM2nXsGEO9YJTkC7qKI_uu`  
**Video sayısı:** **19 / 19**  
**EN paralel:** `PLItkgPiGskZxI7wbTnSIpfRZhIOr3wzS9` (`PRJ - EN - User Level`)  
**Envanter:** `docs/canias_youtube/PRJ_videos.json` · `PRJ_videos.tsv`  
**UI kareleri:** `docs/canias_youtube/prj_hq/*_hq2.jpg` (YouTube mid-frame still)

**Kanıt sınırı (dürüstlük):** Bulut IP’sinden YouTube tam oynatma / altyazı / indirme engelli (`Sign in to confirm you’re not a bot`). Analiz = (1) playlist metadata + TR/EN başlıklar, (2) mid-frame UI still’leri, (3) Trendsoft/Prezi ürün-eğitim metinleri (ayrı sınıf). Frame’de görülmeyen alan listesi **uydurulmadı**.

**Sınıflar:** `Gözlemlendi` | `Çıkarıldı` | `Ürün dokümanı` | `ERP önerisi` | `Araştırma`

---

## 0. TX / ekran haritası (19 video)

| # | Süre | TX | TR konu | EN konu | Ana kanıt |
|---|------|-----|---------|---------|-----------|
| 01 | 111s | **PRJT05** | Yeni Proje Oluşturma | Inserting a New Project | hq2: Proje Yönetimi – Genel form |
| 02 | 181s | **SALT01** | Satış Siparişinden Proje Oluşturma | Creating Project from Sales Order | hq2: Satış Belgeleri + Projeler lookup ağacı |
| 03 | 110s | **SALT01** | Satış Kaleminden Yeni Proje | Creating from Sales Order Item | başlık + EN; hq2 çoğunlukla ana sayfa |
| 04 | 206s | **PRJT05** | Plan Tipi Aktivite Oluşturma | Adding Plan Order Type Activity | hq2: Operasyonlar + Malzeme Seçimi modal |
| 05 | 122s | **PRJT05** | Aktiviteye Rol Eklenmesi | Adding Role to Activity | başlık/EN; hq2 zayıf (ana sayfa) |
| 06 | 109s | **PRJT05** | Aktiviteye Malzeme Eklenmesi | Adding Material to Activity | başlık/EN; V04 modal ile destek |
| 07 | 169s | **PRJT05** | Proje Bileşenlerinin Güncel Maliyeti | Showing Project Components Actual Cost | hq2: Maliyetler / plan vs gerçekleşen + timeline |
| 08 | 121s | **PRJT05** | Projeye Fon Eklenmesi | Adding Fund to Project | başlık/EN; hq2 Operasyonlar/Gantt bandı |
| 09 | 103s | **PRJT05** | Fon Faturalandırma | Financing Funds | başlık/EN |
| 10 | 213s | **PRJT05** | Projeye Satınalma Eklenmesi | Adding Purchase Materials | hq2: Proje–Satınalma + bileşen ağacı |
| 11 | 151s | **PRJT06** | Yeni Onay Verilmesi | Creating a New Confirmation | hq2: Operasyon Onayı modal |
| 12 | 137s | **PRJT09** | Proje Zaman ve Maliyet Analizi | (TR odaklı) | başlık; maliyet/zaman birleşik analiz |
| 13 | 71s | **PRJT10** | Proje Rapor Hiyerarşisi | Showing Report Hierarchy | başlık/EN |
| 14 | 157s | **PRJT12** | Kullanıcı Bazlı Aktivite Onayı | Activities Connected to the User | hq2: Kaynak onayı + uyarı diyaloğu |
| 15 | 203s | **PRJT14** | Proje Fiyatlama | Selecting Project to be Priced | hq2: Proje malzemeleri fiyatlandırma + info popup |
| 16 | 107s | **PRJT15** | Proje Fiyatlama için Aktivite Seçimi | Selecting Confirmation to be Financed | hq2: Onay maliyetlendirme listesi |
| 17 | 191s | **PRJT17** | Kaynak Ekleme için Proje Seçimi (doküman) | Selecting project to add resources (Documents) | hq2: Operasyonlara kaynak atama |
| 18 | 149s | **PRJT18** | Kaynak Ekleme için Proje Seçimi | Selecting Projects to Add Resources | hq2: Çoklu kaynak atama split panel |
| 19 | 155s | **PRJT30** | Proje Özeti | Reporting Projects as Dashboard | hq2: Proje Özeti dashboard |

**TX özeti (Gözlemlendi – başlık):** PRJT05 (merkez kart), PRJT06 (onay/teyit), PRJT09 (zaman-maliyet), PRJT10 (rapor hiyerarşisi), PRJT12 (kullanıcı aktivite/onay), PRJT14–15 (fiyatlama), PRJT17–18 (kaynak atama), PRJT30 (özet dashboard), SALT01 (satış→proje).

Prezi ek TX (video playlist’te yok): PRJT01, PRJT07/08/11/13, IASPRJ000 parametreler — sınıf: `Ürün dokümanı` / `Araştırma`.

---

## 1. Video-video teknik çıkarım

### V01 — PRJT05 Yeni Proje Oluşturma (`wfXhBoL4Pgc`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | `Proje Yönetimi - Genel` | Gözlemlendi (hq2) |
| Sekmeler | Genel, WBS, Operasyonlar, Gantt-Plan, Ekip-Bütçe, İstatistik-Maliyet, Log, Dokümanlar, Haberleşme, Kapak/Not | Gözlemlendi |
| Alanlar | Firma, Proje No, Proje Adı, Açıklama, Müşteri (lookup), Başlangıç/Bitiş, Planlanan vs Gerçekleşen tarihler, Proje Yöneticisi, Sorumlu Bölüm, Durum (`10-Başlatıldı`), Tip, Öncelik, Kategori | Gözlemlendi |
| Alt bloklar | Müşteri/satış belge bağları; Satınalma & Stoklar (tesis, depo, stok takip); Bütçe (döviz, KDV, masraf merkezi); Kodlar | Gözlemlendi |
| Butonlar | Değerlendirmeler, İşe Emir Verme, yazdır, kapat | Gözlemlendi |
| İş kuralı | Durum kodlu state machine (`10-…`) | Çıkarıldı |
| KTB bağ | Proje kartı + formTabs; müşteri=`partners`; satış/satınalma `project_code` lookup | ERP önerisi |

### V02 — SALT01 Satış Siparişinden Proje (`qMaHte6dEUE`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Bağlam | Satış Belgeleri Yönetimi üzerinde **Projeler** lookup | Gözlemlendi |
| Lookup | Hiyerarşik ağaç: proje + alt kırılım (ör. Ar-Ge/Tasarım) | Gözlemlendi |
| Alan bağ | Satış satırında Proje / PRJ / No paneli | Gözlemlendi |
| İş kuralı | Satış belgesinden proje oluşturma / bağlama | Çıkarıldı (başlık+UI) |
| KTB | `sales_orders` → `projects` create/link | ERP önerisi |

### V03 — SALT01 Satış Kaleminden Proje (`SYnhCMmgAJM`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Sipariş **kaleminden** proje | Çıkarıldı (TR/EN başlık) |
| Fark V02 | Belge seviyesi değil kalem seviyesi bağ | Çıkarıldı |
| Frame | hq2 zayıf (anasayfa / PRJT01 komut) | Araştırma (tam UI) |

### V04 — PRJT05 Plan Tipi Aktivite (`GkJYzXUAuL0`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Proje Yönetimi – Operasyonlar; Operasyon – Yeni | Gözlemlendi |
| Sekmeler | Ana, Detay, Operasyonlar, Kalite Planı, Kullanılabilir Malzemeler, Notlar, Dosyalar | Gözlemlendi |
| Modal | Malzeme Seçimi: Firma, Tesis, Malzeme, Grup, Üretim Tipi, Malzeme Tipi, Tanım, Ara | Gözlemlendi |
| Grid | Tesis, Malzeme, Versiyon, Dil, Kısa Açıklama, Birim, Tip, Stok | Gözlemlendi |
| Sol panel | Proje hiyerarşi / nesne listesi | Gözlemlendi |
| KTB | work_item / aktivite + malzeme satırı + item lookup | ERP önerisi |

### V05 — Aktiviteye Rol (`rDPw4G2k_2I`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Aktiviteye rol ekleme | Çıkarıldı (başlık/EN) |
| KTB | `project_members` / work_item assignee + rol | ERP önerisi |
| Frame | Yetersiz | Araştırma |

### V06 — Aktiviteye Malzeme (`ZTde16PcmaM`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Aktiviteye malzeme | Çıkarıldı |
| Destek | V04 malzeme modalı aynı PRJT05 ailesi | Çıkarıldı |
| KTB | Proje malzeme ihtiyacı → stok/PUR | ERP önerisi |

### V07 — Bileşen güncel maliyeti (`a1J4XfHwGG4`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Maliyetler / Maliyet Karşılaştırma | Gözlemlendi |
| Filtre | Firma, Proje, Bütçe, Proje Grubu, Portföy No, Durum | Gözlemlendi |
| Sekmeler | Genel, Metin, Dokümanlar, Aktiviteler, Stoklar, İşlemler, Planlar, Bağlantılar + Maliyetler | Gözlemlendi |
| Grid | Hiyerarşik kalem; Plan (Bütçe) vs Gerçekleşen (TL) | Gözlemlendi |
| Kategoriler | Malzeme, Stok, Hizmet, Kaynak maliyetleri (SET1, MACH, LAB2…) | Gözlemlendi |
| Sağ panel | Maliyet timeline / çubuklar; bağımlılık çizgileri | Gözlemlendi |
| KTB | `project_budget_lines` + `project_cost_entries`; çift sayım yasağı | ERP önerisi |

### V08 — Projeye Fon (`ibXVLMly73Y`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Projeye fon ekleme | Çıkarıldı (başlık) |
| Destek | Trendsoft: fon yönetimi, gecikmede proje durdurma | Ürün dokümanı |
| hq2 | Operasyonlar + Gantt çizelgele, Kritik checkbox | Gözlemlendi (kısmi bağlam) |
| KTB | `project_revenues` / fon tipi gelir; P2 | ERP önerisi |

### V09 — Fon Faturalandırma (`Up0yvWDxyz0`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Fon faturalama | Çıkarıldı |
| Destek | Trendsoft: fon sonrası fatura | Ürün dokümanı |
| KTB | Proje → satış faturası bağ | ERP önerisi |

### V10 — Projeye Satınalma (`sbPdiNja6Qk`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Proje Yönetimi – Satın Alma | Gözlemlendi |
| Sekmeler | Genel, Adres, Organizasyon, Teknik, Ek, Doküman, Finansal | Gözlemlendi |
| Grid | Kalem, Malzeme/Servis, Açıklama, Miktar, Birim, Net Fiyat, Döviz | Gözlemlendi |
| Modal | Proje Bileşeni Seçimi (WBS ağacı) | Gözlemlendi |
| Alt grid | Satınalma Dokümanları (Belge No, Kalem, Miktar, Birim) | Gözlemlendi |
| Buton | Satınalma Belgesi | Gözlemlendi |
| KTB | PUR talep/PO ↔ proje bileşeni FK | ERP önerisi |

### V11 — PRJT06 Yeni Onay (`Z0PYn0aeh8A`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Modal | Operasyon Onayı | Gözlemlendi |
| Bağlam | Firma, Tesis, Proje, Aktivite, Operasyon, İş Merkezi | Gözlemlendi |
| Sekmeler | Genel, Personel, Maliyetler, Malzemeler, Operasyon Süreleri, Metin | Gözlemlendi |
| Genel alanlar | Teyit No, Başlangıç/Bitiş, Miktar, Birim (SAAT), Onay durumu | Gözlemlendi |
| Checkbox | Son Teyit, İptal, Değişti, Planlı, Sitede, Aktif | Gözlemlendi |
| İş kuralı | Süre/miktar teyidi; personel/malzeme/maliyet sekmeleri | Çıkarıldı |
| KTB | worklog + onay; mevcut `onayService` ile birleşik tasarım | ERP önerisi |

### V12 — PRJT09 Zaman ve Maliyet Analizi (`0PTTszsg-e4`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Zaman + maliyet birlikte analiz | Çıkarıldı |
| Destek | V07 maliyet UI; Gantt | Çıkarıldı |
| KTB | Rapor: tahmini/gerçek süre + maliyet | ERP önerisi |

### V13 — PRJT10 Rapor Hiyerarşisi (`hx35geoKcCs`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Amaç | Rapor hiyerarşisi gösterme | Çıkarıldı (EN) |
| KTB | Portföy/proje/WBS kırılımlı rapor | ERP önerisi |

### V14 — PRJT12 Kullanıcı Bazlı Aktivite Onayı (`ijk1_QNtxQc`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Operasyon için Kaynak Onayı; breadcrumb PRJT05 | Gözlemlendi |
| Filtre | Proje, Ağ Yapısı, İş Paketi, Operasyon No | Gözlemlendi |
| Özet | Başlangıç/Bitiş, Planlanan/Gerçekleşen/Kalan | Gözlemlendi |
| Grid | Proje/OP hiyerarşi, Durum (Hazırlandı), tarihler, süre, kaynak grubu/kaynak | Gözlemlendi |
| Diyalog | Uyarı: öngörülen OPER süresi; Evet / Hepsine Evet / Hayır | Gözlemlendi |
| KTB | Kullanıcıya düşen onay kuyruğu + süre teyidi | ERP önerisi |

### V15 — PRJT14 Proje Fiyatlama (`2cTt2j7zvR8`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Proje Malzemelerinin Fiyatlandırılması | Gözlemlendi |
| Filtre | Firma, Dönem, Proje No, Müşteri, Proje Tipi, Durum | Gözlemlendi |
| Grid | Malzeme No, Açıklama, Teklif Birim Fiyatı, Yeni Fiyat, Birim, Döviz | Gözlemlendi |
| Aksiyon | Fiyatlandırmayı Kaydet; Seçilenleri Fiyatlandır | Gözlemlendi |
| Mesaj | Info popup kodlu: `PRJ S08:145` — “satış fiyatları kaydedildi” | Gözlemlendi |
| KTB | Proje satış fiyatı → beklenen gelir / teklif bağ | ERP önerisi |

### V16 — PRJT15 Fiyatlama için aktivite/onay seçimi (`UH_yxS62CNA`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Proje Onayları Maliyetlendirmesi (liste) | Gözlemlendi |
| Filtre | Firma, İş Merkezi, Tesis, Müşteri, PY, Dış Ref, Belge No/Tip, Plan tarihler, Onay Tipi, Durum | Gözlemlendi |
| Grid | İş paketi, açıklama, onaylayan, işlem tarihi, maliyet, PB; durum ikonları | Gözlemlendi |
| Toplu | Hepsi / Kabul / Reddet / Bekliyor | Gözlemlendi |
| EN başlık | “Selecting Confirmation to be Financed” | Çıkarıldı |
| KTB | Onaylanmış iş → faturalama adayı seçim | ERP önerisi |

### V17 — PRJT17 Kaynak (doküman) (`x3CLby0xOpo`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Operasyonlara Kaynak Atama; breadcrumb PRJT12→PRJT22 | Gözlemlendi |
| Sekmeler | Operasyonlar Listesi / Atanan Kaynak Listesi | Gözlemlendi |
| Filtre | Proje, Sıra, Proje Sorumlusu, tarih aralığı | Gözlemlendi |
| Grid | İş No, İşlem, tarihler, kapasite, sorumlu, durum, süre; renkli hiyerarşi | Gözlemlendi |
| EN | Resources (Documents) — doküman kaynak tipi olasılığı | Çıkarıldı |
| KTB | Kaynak atama + DOC bağ | ERP önerisi |

### V18 — PRJT18 Çoklu kaynak (`ZNS_UGakN74`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Operasyonlara Çoklu Kaynak Atama | Gözlemlendi |
| Sol | Proje yapısı tree-grid; renkli tip/durum; süre/birim | Gözlemlendi |
| Sağ | Tesis, İş Merkezi, Kaynak Tipi; Kaynakları Listele; Seçilenlere Ata | Gözlemlendi |
| Alt | Personel/Operasyon/Kaynak grubu; plan tarih; fiili durum; Tümünü Seç/Bırak | Gözlemlendi |
| KTB | Toplu kaynak atama; HR personel + iş merkezi | ERP önerisi |

### V19 — PRJT30 Proje Özeti (`iRXtPaWHK-4`)

| Madde | Bulgu | Sınıf |
|-------|--------|--------|
| Ekran | Proje Özeti dashboard | Gözlemlendi |
| Üst | Proje No; Detayı/Açıklamaları/Bağımlılıkları Göster | Gözlemlendi |
| Ana grid | WBS: İşlem, Şirket, Referans, Hedef Baş/Bit, Durum, Sorumlu, %, Hafta, Öncelik | Gözlemlendi |
| Sağ filtre | Tarih aralığı; Başlanmadı/Devam/Bitti/İptal/Tümü | Gözlemlendi |
| Alt widget | Malzemeler; Proje Durumu sayaçları; Faaliyet Kullanımı; Dosya; Aktivite Kayıtları | Gözlemlendi |
| KTB | Proje çalışma alanı “Genel Bakış” sekmesi | ERP önerisi |

---

## 2. Canias → KTB tasarım kararları (video kanıtlı)

1. **Merkez nesne = Proje kartı (PRJT05)** çok sekmeli: Genel / WBS / Operasyonlar / Gantt / Bütçe / Maliyet / Doküman / Log. KTB’de `formTabs` + proje workspace sekmeleri.
2. **Aktivite/Operasyon** proje altında planlanır; malzeme, rol, kaynak, onay (teyit) bağlanır — Jira “issue” + ERP operasyon hibriti.
3. **Satış entegrasyonu birinci sınıf** (SALT01 belge + kalem) — brief §3.2 ile uyumlu; KTB’de zorunlu P0.
4. **Satınalma proje bileşenine** bağlanır (WBS seçimi) — P0.
5. **Plan vs gerçekleşen maliyet** hiyerarşik + zaman ekseni (V07) — finans çekirdeği.
6. **Onay = operasyon teyidi** (süre/miktar/personel/malzeme) — Jira worklog + Canias confirmation; KTB `work_logs` + opsiyonel onay motoru.
7. **Fiyatlama / fon faturalama** proje gelir tarafı — KTB beklenen/gerçekleşen gelir.
8. **Kaynak atama** tekli/çoklu, tesis/iş merkezi/personel — İK entegrasyonu.
9. **Proje Özeti** tek ekranda WBS + malzeme + durum + dosya + log — dashboard P0.
10. **Jira Scrum/Kanban** bu playlist’te **görülmedi** → KTB’de Jira’dan gelir; Canias’tan dayatılmaz (`Gözlemlendi` değil).

---

## 3. Ürün dokümanı (video dışı — ayrı sınıf)

**Trendsoft PRJ sayfası** (`Ürün dokümanı`): EPS, WBS, Gantt, kritik yol, taban planı (baseline), To-Do, fon, maliyet plan/fiili, satıştan proje, satınalma termin aktarımı, üretim/kapasite çizelgeleme, DOC.

**Prezi eğitim** (`Ürün dokümanı`): EPS/OBS, proje tipleri, PRJT01/05/07–14, IASPRJ000 parametreler, BAS/ROU/CAL/HCM/MRP/COS/VER/PUR bağları.

Bunlar playlist still’lerinde doğrulanmayan ekstra TX’ler için yalnızca `Araştırma` / şablon önerisi olarak kullanılır.

---

## 4. G1 kapı durumu

| Kriter | Durum |
|--------|--------|
| 19 video kimliği + TX + konu | **Tamam** |
| Süreç/entegrasyon haritası | **Tamam** (başlık + mid-frame) |
| Her videoda eksiksiz alan envanteri | **Kısmi** — güçlü frame’ler V01,02,04,07,10,11,14–19; V03,05,06,08,09,12,13 sınırlı |
| Tam altyazı/oynatma | **Engelli** (YouTube bot/IP) |

**Karar (güncel):** G1 playlist analizi + Aşama 2 taslaklar tamam → Aşama 3 çekirdek kod açıldı (`056_prj_core`). Zayıf frame’li videoların alan envanteri MP4 ile sonradan tamamlanır; uydurma alan yok.

---

## 5. Açık araştırma listesi

- PRJT01 ana liste ekranı alanları (komut kutusunda görüldü, form frame’i yok)
- Rol ekleme (V05) alan detayı
- Fon ekleme/faturalama form alanları (V08–09)
- Baseline (taban planı) TX — yalnızca ürün dokümanı
- EPS kurumsal proje yapısı ekranı — ürün dokümanı
