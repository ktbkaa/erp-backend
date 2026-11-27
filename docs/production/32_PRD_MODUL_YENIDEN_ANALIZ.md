# Üretim (PRD) Modülü — Yeniden Analiz & Tasarım Yönergesi

**Tarih:** 2026-11-13 (Europe/Istanbul)  
**Kaynaklar:**
1. WeTransfer eğitim paketi (`we.tl/t-2FobsapZeRbwQBaf`) — 90 dosya / ~63 MB (PRDT01…PRDT60 PDF + Bel44 + süreç görseli)
2. YouTube `@caniasofficial` → **PRD - EN - User Level** oynatma listesi (64 video)  
   `https://www.youtube.com/playlist?list=PLItkgPiGskZwbVW0l6_rK9FN0lLlM9I8L`
3. Kullanıcı prompt’u (Üretim Planlama ve Kontrol / Emir / Operasyon / Onay / Analiz / Entegrasyon)
4. Süreç şeması: `docs/production/canias-prd-pack/PRD_SUREC_AKISI.png`
5. KTB mevcut kod: `public/app.js` Üretim menüsü + `routes/production_*.js` + önceki Canias analizleri (`15_*`, `29_*`, `prdt03/*`)

**Amaç:** Canias PRD davranışını KTB’nin kendi UI diline harmanlayarak üretim süreçlerini yeniden tasarlamak için **tek yönerge**. Uygulama dalgaları bu dokümana bağlanır.

**Hedef ürün dokümanı (yeni hali):** `docs/production/33_URETIM_MODULU_YENI_HAL.md` · ekran envanteri: `33_URETIM_EKRAN_ENVANTERI.csv`

**Video notu:** Flat playlist metadata (64 başlık) alındı. Video karesi / altyazı bu ortamda YouTube bot doğrulaması nedeniyle indirilemedi; UI piksel doğrulaması PDF eğitim ekran görüntülerinden + başlık/metadata’dan yapıldı. Cookie ile altyazı gelirse bu belge güncellenir.

---

## 0. Yönetici özeti

Canias PRD’nin omurgası sabittir:

```
Master (BAS/BOM/ROU)
  → MRP plan (MRPT02) ──PRDT06──► İş emri (PRDT01)
  → Satış siparişi     ──PRDT13──► İş emri (PRDT01)
  → Plan/IE            ──CAP─────► Çizelgeleme / kapasite
  → İş emri            ──INV─────► Malzeme çıkış (manuel / oto emiş / operasyonel)
  → Operasyon          ──PRDT02/03/05──► Onay (+ QLT)
  → Onay               ──INV─────► Mamul / yan ürün giriş
  → Rapor              ──PRDT5x──► Planlanan–gerçekleşen / WIP / maliyet
```

Şema (`PRD_SUREC_AKISI.png`) aynı zinciri gösterir: **PRJ/SRV/MNT/PRD/MRP/SAL → Üretim planlama ↔ CAP/AUT → INV (+QLT) → Mobil BDE / Üretim onayı → INV → Raporlama**.

KTB’de **çekirdek yol var** (BOM → Rota → Plan → IE → Onay → Üretim girişi → KK). Eksik olan çoğunlukla:

| Katman | Durum |
|--------|--------|
| Normal IE kabuğu (PRDT01) | Var — sekmeler sığ; kolektif/bileşik/demontaj yok |
| Onay ailesi (PRDT02/03/05) | Kısmi — kolay onay + operasyonel/hızlı giriş; düzeltme/metrik/seri-parti zayıf |
| Plan→IE / Sipariş→IE | Var — UX Canias PRDT06/13’ten sığ |
| Fason / birleşik op (40/42/43) | Yok (rota bayrağı hariç) |
| Ağ / maliyet / muhasebe (10/5x/60) | Yok veya stub |
| Ekranlar arası bağlantı | Kısmi — formLinks + belge zinciri; Canias “belge takip / Zoom” disiplini eksik |

**Tasarım ilkesi (harman):** Canias TX ayrımını ve süreç sırasını koru; KTB’nin liste+sekmeli form, yuvarlak lookup, bağımsız scroll, formLinks dilini kullan. Yeni ekran uydurma; önce mevcut kabukları derinleştir, sonra TX ailesini ekle.

---

## 1. Kaynak envanteri

### 1.1 WeTransfer paketi (90 dosya)

Dosya listesi: `docs/production/canias-prd-pack/FILE_LIST.txt`

| TX ailesi | PDF adedi | Konu |
|-----------|-----------|------|
| PRDT01 | 24 + overview | IE oluşturma/güncelleme, normal/kolektif/bileşik/demontaj, malzeme çıkış, ürün giriş, yan ürün, kaynak, standart maliyet, seri planlama |
| PRDT02 | 17 + overview | Onay & düzeltme (tüm emir tipleri), oto emiş, otomatik giriş/çıkış, yarımamül kontrol, parti/seri, metrik, yeniden işleme |
| PRDT03 | 10 | Kolay onay, ilk parça, iş merkezi tipi, çizelgeli iş seçimi, yerleşim, operasyonel çıkış, otomatik giriş, seri/parti bitirme, boş duruş |
| PRDT05 | 2 | Onay no ile hızlı / detaylı onay |
| PRDT06 | 1 + overview | Plan → IE |
| PRDT08–17, 20–22, 28, 33 | 1’er | Rapor / yardımcı TX’ler (pakette mevcut) |
| PRDT10 | 1 | İş emri ağı |
| PRDT13 | 1 | Satış siparişinden IE |
| PRDT40 | 4 | Fason op + SA sipariş/istek + INV13 giriş/çıkış |
| PRDT42/43 | 5+1 | Birleşik operasyonlar + kolay onay |
| PRDT51/52/60 | 1+8+1 | Maliyetlendirme / maliyet raporları / muhasebeleştirme |
| Bel44.docx | 1 | Modül özet metni (kullanıcı prompt’u ile aynı içerik) |

### 1.2 YouTube — PRD EN User Level (64 video)

Envanter: `docs/production/youtube/PRD_EN_User_Level_playlist.tsv`

Özet dağılım (başlıktan):

| Blok | Video # | TX |
|------|---------|-----|
| IE oluştur / çizelgele / komponent-op | 01–20, 25 | PRDT01 |
| Onay & düzeltme | 21–24, 26–38 | PRDT02 |
| Saha / kolay onay | 39–48 | PRDT03 |
| Onay numarası | 49–50 | PRDT05 |
| Plan→IE | 51 | PRDT06 |
| Satış→IE | 52 | PRDT13 |
| Fason | 53–57 | PRDT40 + INVT13 |
| Birleşik operasyon | 58–64 | PRDT42/43 |

TR envanter (önceki): `docs/canias_youtube/PRD_videos.tsv` (66 satır) — EN listesiyle birebir akraba; İngilizce başlıklar aynı TX kodlarını taşır.

### 1.3 Süreç şeması (görsel)

`docs/production/canias-prd-pack/PRD_SUREC_AKISI.png`

- Sol girdiler: PRJ, SRV, MNT, PRD, MRP, SAL → **(PRD) Üretim planlama**
- Üst master: BOM (bileşen), ROU (iş akışı / IM), CAP (çizelgeleme ↔ planlama)
- Orta: INV malzeme hareketi + QLT (üretim öncesi / tekrar / sonrası KK)
- Sağ yürütme: Mobil BDE + Üretim onayı → INV → **Raporlama & planlanan–gerçekleşen**
- Geri besleme: rapor ↔ CAP

---

## 2. Canias süreç modeli (yönerge)

### 2.1 Üretim emri yaşam döngüsü

```
Taslak / Plan
  → (eksik malzeme analizi + rezervasyon)
  → Çizelgele (ileri / geri / orta nokta)
  → Başlat (is_started) 
  → Operasyon onayları (kısmi/tam)
  → Malzeme tüketimi (manuel | oto emiş | operasyonel)
  → Mamul / yan ürün giriş (manuel | otomatik)
  → Kapat / maliyet / muhasebe
```

**Emir tipleri (PRDT01 ailesi):**
1. **Normal** — tek seviyeli
2. **Kolektif** — benzer mamuller tek emir
3. **Bileşik (combined)** — çok seviyeli ağ (yarı mamul + mamul)
4. **Demontaj** — basit / kompleks parçalama

KTB bugün fiilen **Normal** + sipariş/plan kaynaklı oluşturma sunuyor.

### 2.2 Onay çeşitleri (prompt + PDF)

| Yöntem | Canias TX | Detay seviyesi | KTB karşılığı |
|--------|-----------|----------------|---------------|
| Normal | PRDT02 | Üretilen miktar, düzeltme listesi, oto emiş popup | `uretim-girisleri` (kısmi) |
| Basit / kolay | PRDT03 | Saha: başlat/bitir, IM tipi, çizelgeli iş, duruş | `kolay-is-emri-onayi` ≠ saha; `uretim-girisleri` kısmi |
| Hızlı | PRDT05 | Onay numarasıyla | `hizli-uretim-girisi` (kısmi) |
| Birleşik kolay | PRDT43 | Birleşik op kolay onay | Yok |

**Kritik kural (PDF PRDT02):** Oto emiş malzemeler **emir başlatmada değil, operasyon onayında** çıkar. Çıkış tipi BAST03 veya PRDT01 kalem detayından gelir (`OtomatikEmiş` / `Operasyonel` / `Yok`).

### 2.3 Entegrasyon düğümleri

| Modül | PRD temas noktası | KTB durumu |
|-------|-------------------|------------|
| BOM / ROU | IE kopyası, alternatif | Var; alternatif/varyant zayıf |
| MRP | Plan belgesi → PRDT06 | Plan + `/cevir` var |
| SAL | PRDT13 sipariş→IE | `siparis-is-emri` / `toplu-is-emri` |
| CAP | Çizelgeleme / kapasite | Yok (tarih alanları var) |
| INV | Çıkış / giriş / fason transfer | Stok hareket + üretim girişi |
| QLT | Onay öncesi/sırası/sonrası KK | GKK/CKK emirleri |
| PRJ / SRV / MNT | Planlama girdileri | PRJ kısmi; SRV/MNT yok |
| COS / CAL | Standart / gerçekleşen maliyet | Yok / stub |
| AUT | BDE besleme | Yok |

---

## 3. KTB mevcut kapsam (2026-11-13)

### 3.1 Ekranlar (Üretim menüsü)

| KTB id | Rol | Canias TX |
|--------|-----|-----------|
| `urun-agaci` / patlatma / seviye / malzeme değişikliği | BOM | BOMT01+ |
| `is-merkezleri` / `is-istasyonlari` / `routings` | ROU | ROUT02/01 |
| `uretim-emri-tipleri` | Tip | — |
| `uretim-planlari` | Plan | MRPT02 ≈ |
| `uretim-emirleri` | IE kabuğu | PRDT01 |
| `kolay-is-emri-onayi` | Onay kuyruğu | PRDT03 **başlık** (saha değil) |
| `siparis-is-emri` / `toplu-is-emri` | Sipariş→IE | PRDT13 |
| `uretim-girisleri` / `hizli-uretim-girisi` | Operasyonel / hızlı giriş | PRDT02/05 karışımı |
| MRP konsol / sonuç / anlık | MRP | MRPT05/04 |
| KK emirleri GKK/CKK | Kalite | QLT |

### 3.2 API omurgası

`/uretim-emirleri` — CRUD, sipariş/toplu oluşturma, onayla, başlat, malzemeleri/operasyonları doldur, bom-rota değiştir, operasyon tamamla, üretim giriş  
`/uretim-girisleri` — önizleme + kayıt  
`/uretim-planlari` — CRUD + `/cevir`  
`/mrp/*` — çalıştır / sonuç / talep / IE oluştur

### 3.3 Son UI iyileştirmeleri (bu sprint hattı)

- Liste ↔ ekran bağımsız scroll  
- Satır Kaydet/Düzelt/Kopyala/Sil sessiz  
- Siparişten IE: stok filtresi, BOM/rota/tip/miktar, **iş emri no**, plan datetime  
- Malzemeleri Getir + rota satırı otodoldur  
- Lookup tarayıcı kolon zenginliği  
- Sayfalama CSS düzeltmesi  

Bunlar **kabuk disiplinidir**; PRD süreç derinliğini tamamlamaz.

---

## 4. Gap matrisi (Canias → KTB)

Skor: **0** yok · **1** stub · **2** kısmi · **3** kullanılabilir · **4** Canias’a yakın

| # | Yetenek | TX | Skor | Not |
|---|---------|----|------|-----|
| A1 | Normal IE oluştur + çizelgele | PRDT01 | 3 | Datetime plan eklendi; CAP yok |
| A2 | Komponent + operasyon sekmeleri | PRDT01 | 3 | Malzemeleri Getir / rota otodoldur |
| A3 | Kolektif IE | PRDT01 | 0 | — |
| A4 | Bileşik / çok seviyeli IE | PRDT01 | 1 | Ağ yok; çoklu IE manuel |
| A5 | Demontaj IE | PRDT01 | 0 | — |
| A6 | Malzeme çıkış (manuel) | PRDT01/INV | 2 | Stok hareket / üretim girişi |
| A7 | Oto emiş (onaya bağlı) | PRDT02 | 1 | Tip alanı var; onay anı emiş zayıf |
| A8 | Operasyonel çıkış (başlatırken) | PRDT03 | 1 | — |
| A9 | Ürün giriş (manuel/oto) | PRDT01/02 | 2 | Üretim girişi |
| A10 | Yan ürün | PRDT01/02 | 0 | — |
| A11 | Kaynak / ekipman IE’de | PRDT01 | 1 | Rota bileşeni sınırlı |
| A12 | Seri / parti plan + onay | PRDT01/02/03 | 1 | Parti altyapısı kısmi |
| A13 | Standart maliyet IE’de | PRDT01 | 0 | — |
| B1 | Normal onay + düzeltme | PRDT02 | 2 | Düzeltme listesi yok |
| B2 | Kolay saha onay (BDE) | PRDT03 | 1 | Kolay onay = yönetim onayı |
| B3 | Onay no ile hızlı | PRDT05 | 2 | Hızlı giriş |
| B4 | Onay metrikleri / rework | PRDT02 | 0 | — |
| B5 | Yarımamül stok kontrolü | PRDT02 | 0 | — |
| C1 | Plan→IE (PRDT06) | PRDT06 | 3 | `/cevir` |
| C2 | Satış→IE (PRDT13) | PRDT13 | 3 | Form/liste iyileşti |
| C3 | İş emri ağı | PRDT10 | 0 | — |
| D1 | Fason op + SA/INV | PRDT40/INV13 | 0 | `is_subcontract` bayrak |
| D2 | Birleşik operasyon | PRDT42/43 | 0 | — |
| E1 | Eksik malzeme analizi | PRDT01 | 1 | Rezervasyon ayrı |
| E2 | İleri/geri çizelgeleme | CAP | 0 | Elle tarih |
| E3 | Planlanan–gerçekleşen rapor | PRDT5x | 0–1 | — |
| E4 | WIP / hurda / yeniden işleme | Analiz | 0 | — |
| E5 | IE maliyet / muhasebe | PRDT51/60 | 0 | — |
| F1 | QLT onay öncesi/sonrası | QLT | 2 | Emir var; PRD’ye sıkı bağ zayıf |
| F2 | Belge takip / Zoom zinciri | Kabuk | 2 | Zincir şeridi kısmi |

---

## 5. Hedef bilgi mimarisi (KTB menü — öneri)

Canias TX’lerini **KTB modül diline** çevir; kullanıcıya “PRDT02” demeden aynı ayrımı koru.

```
Üretim
├─ Tanımlar
│  ├─ Üretim Emri Tipleri
│  ├─ İş Merkezleri / İstasyonlar
│  └─ (ileride) Aktivite / Duruş nedenleri
├─ Ürün Ağacı & Rota          ← BOM + ROU (mevcut)
├─ Planlama
│  ├─ Üretim Planları         ← PRDT06 kaynağı
│  └─ MRP Konsol / Sonuç      ← (Stok altında da kalabilir; çapraz link)
├─ İş Emirleri
│  ├─ Üretim Emirleri         ← PRDT01 (tip ile normal/kolektif/…)
│  ├─ Siparişten İş Emri      ← PRDT13
│  ├─ Toplu / Plan’dan Çevir  ← PRDT06 UX
│  └─ İş Emri Ağı             ← PRDT10 (Faz 2)
├─ Atölye / Onay
│  ├─ Kolay İş Emri Onayı     ← yönetim onayı (PRDT03 adı karışıklığını netleştir)
│  ├─ Operasyonel Üretim Girişi ← PRDT02/03 saha
│  ├─ Hızlı Üretim Girişi     ← PRDT05
│  └─ (Faz 2) Birleşik Operasyon Onayı
├─ Fason (Faz 2)
│  └─ Fason Operasyon + Tedarikçi transfer
└─ Analiz (Faz 2–3)
   ├─ Planlanan–Gerçekleşen
   ├─ WIP / Fire / Rework
   └─ IE Maliyet
```

**İsim netliği:** Bugünkü `kolay-is-emri-onayi` = Canias’taki “kolay saha onayı” değil; **yönetimsel IE onayı**. Ya adı değiştir (`İş Emri Onayı`) ya da PRDT03 saha ekranı ayrı açılsın.

---

## 6. Ekranlar arası bağlantı sözleşmesi

Canias’ta Zoom / belge takip tek dil; KTB’de aynı sözleşmeyi sabitle:

| Kaynak | Hedef | Tetik | Veri |
|--------|-------|-------|------|
| Satış siparişi satırı | Siparişten IE | Yeni / Düzelt | `sales_order_id`, `item_id`, kalan miktar, önerilen BOM/rota |
| Siparişten IE kaydet | Üretim Emirleri | Kayıt sonrası | `order_no`, açılan form |
| Üretim planı | Plan→IE | Çevir | plan id, tip, miktar |
| IE stok | BOM varsayılan | formLinks | `product_bom_id`, `route_id`, depolar, uom |
| IE rota | Operasyon grid | route change | `operasyonlar` |
| IE BOM | Malzeme grid | Malzemeleri Getir | `malzemeler` |
| IE | Operasyonel giriş | Bağlı ekran / toolbar | `order_id` + op lookup |
| Op onay | Stok çıkış/giriş | Onay kaydı | emiş tipi + miktar |
| Op onay | KK emri | Kural | plan varsa GKK/CKK |
| IE | Belge takip | Sekme | sipariş, plan, rezervasyon, hareketler |

**Lookup kuralı (yerleşik):** Yuvarlak buton tarayıcısı kod + ad + (gerekirse) miktar/belge no gösterir — tüm PRD lookup’larında aynı.

**Zaman kuralı:** Plan başlangıç/bitiş = `datetime` (tarih+saat); çizelgeleme CAP gelene kadar en azından termin hassasiyeti korunur.

---

## 7. Tasarım harmanı (Canias × KTB)

| Canias | KTB karşılığı | Karar |
|--------|---------------|--------|
| Ara / Göster / Değiştir / Yeni / Yazdır | Action bar Yeni/İncele/Düzelt/… | Koru; Yazdır/PDF sonra |
| Master-detail sekmeler (Genel, Kalem, Op, Belge takip) | `formTabs` Bilgiler / Malzemeler / Rota | Genişlet: Belge takip, Kaynak, Maliyet (Faz 2) |
| Detay popup (kalem çıkış tipi) | Satır ✎ + yan panel veya modal | Satır detayında çıkış tipi |
| Onay listesi + Düzeltme | Grid + sessiz satır aksiyonları | Düzeltme = seçili onay pozisyonu |
| BDE tek tuş başlat/bitir | Operasyonel giriş üst alanları | Büyük CTA; az alan |
| TX kodu ile açılış | techId + ekran ara | techId zaten var; aramada göster |

Görsel dil: mevcut KTB (krem alan, mavi aksan, yuvarlak lookup) — Canias gri-toolbar kopyalanmaz; **davranış** kopyalanır.

---

## 8. Uygulama dalgaları (yeniden analiz sonrası iş programı)

### Dalga P0 — Omurga sıkılaştırma (mevcut ekranlar)

1. `uretim-emirleri` belge takip sekmesi (sipariş, plan, rezervasyon, hareket linkleri)  
2. Kalem satırında **çıkış tipi** (Manuel / OtoEmiş / Operasyonel) + onay anında emiş  
3. `kolay-is-emri-onayi` ad/rol netliği; onay ≠ üretim girişi kuralı dokümante + UI ipucu  
4. Operasyonel giriş ↔ IE/op lookup zincirini bozmama testleri  
5. Eksik malzeme uyarısı (IE kaydet/onay öncesi, rezervasyon opsiyonel)

### Dalga P1 — Canias PRDT02/03/05 derinliği

1. Onay düzeltme listesi (verilmiş onay pozisyonu seç → miktar düşür)  
2. Hızlı girişte onay numarası arama  
3. Saha “Başlat / Bitir” akışı (IM tipi etkisi, çizelgeli iş seçimi) — mevcut operasyonel ekranı genişlet  
4. Parti/seri ile bitirme (mevcut parti altyapısına bağla)  
5. QLT kancası: onay öncesi/sonrası kontrol planı

### Dalga P2 — Emir tipleri + ağ + fason

1. Kolektif / bileşik / demontaj (tip + UI)  
2. PRDT10 iş emri ağı  
3. PRDT40 fason + INV13 benzeri tedarikçi transfer  
4. PRDT42 birleşik operasyon (grupla → ortak onay)

### Dalga P3 — CAP / analitik / maliyet

1. İleri-geri çizelgeleme motoru (CAP entegrasyon veya hafif motor)  
2. Planlanan–gerçekleşen, WIP, fire, rework raporları  
3. PRDT51/52/60 maliyet ve muhasebeleştirme

---

## 9. Video ↔ PDF ↔ KTB eşleme (çekirdek 20)

| EN video (playlist #) | TX | PDF (paket) | KTB hedef |
|----------------------|----|-------------|-----------|
| 02 Create normal PO | PRDT01-10030 | PRDT01-10030-…pdf | `uretim-emirleri` Yeni |
| 03 Components & ops | PRDT01-10031 | PRDT01-10031-… | Malzemeler + Rota sekmeleri |
| 04–07 Collective/Combine | PRDT01-10040… | ilgili PDF | Faz P2 tip |
| 08–09 Demontage | PRDT01-10055/56 | ilgili PDF | Faz P2 |
| 10–12 Goods issue | PRDT01-10060… | ilgili PDF | Stok çıkış / emiş |
| 13–15 Receipt | PRDT01-10090… | ilgili PDF | Üretim girişi |
| 21 Confirm normal | PRDT02-10200 | PRDT02-10200-… | Operasyonel giriş + düzeltme |
| 27 Retroactive components | PRDT02-10280 | PRDT02-10280-… | Oto emiş |
| 39 Easy confirmation | PRDT03-10370 | PRDT03-10370-… | Saha kolay (şimdi yönetim onayı ayrılacak) |
| 49–50 Confirm by number | PRDT05 | PRDT05-10470/80 | Hızlı giriş |
| 51 Plan→PO | PRDT06 | PRDT06-10490 | `uretim-planlari` Çevir |
| 52 SO→PO | PRDT13 | PRDT13-10580 | `siparis-is-emri` |
| 53–57 External op | PRDT40/INV13 | PRDT40-* | Faz P2 |
| 58–64 Combined ops | PRDT42/43 | PRDT42-* | Faz P2 |

Tam 64 satır: `docs/production/youtube/PRD_EN_User_Level_playlist.tsv`  
Tam PDF listesi: `docs/production/canias-prd-pack/FILE_LIST.txt`

---

## 10. Yeniden analiz oturumu için kontrol listesi

Bir sonraki “tüm üretim süreçlerini yeniden analiz” turunda sıra:

1. **P0 uçtan uca demo** (GIDA/ELEK): sipariş → IE → malzeme getir → onay → üretim girişi → CKK → stok  
2. Her adımda: Canias PDF’deki buton/sekme ile KTB ekranını yan yana işaretle (var / kısmi / yok)  
3. formLinks + belge takip boşluklarını listele  
4. Emir tipi matrisi (normal only mı kalacak?) kararını kilitle  
5. Onay ailesi isimlendirme kararını kilitle (yönetim onayı vs saha BDE)  
6. P0 backlog’u PR’lara böl (ekran başına 1 PR tercihen)

---

## 11. Bilinçli sınırlar

- 64 videonun **kare kare** UI envanteri bu ortamda yapılamadı (YouTube bot). PDF’ler ekran görüntülü eğitim olduğu için süreç/alan doğrulaması PDF + metadata ile yapıldı.  
- WeTransfer zip’in tamamı CI’ye gömülmedi (~63 MB); metin özetleri + dosya listesi repoda. Ham paket lokal `/tmp/prd-canias/wetransfer/` veya yeniden WeTransfer linkinden alınır.  
- Bu belge **uygulama kodu yazmaz**; yönergedir. Kod değişiklikleri dalga P0+ PR’larında gelir.

---

## 12. Sonuç

Canias PRD, KTB’de “bir üretim emri ekranı” değil; **plan → emir → malzeme/op → onay ailesi → stok/KK → analitik** zinciridir. Mevcut KTB omurgası bu zincirin iskeletini taşıyor. Yeniden tasarımın işi: Canias’ın emir tipi / onay çeşidi / emiş zamanlaması disiplinini almak; KTB’nin form kabuğu, lookup ve ekran bağlantı dilini korumak; eksikleri P0→P3 dalgalarıyla bilinçli sırada doldurmak.

**Bir sonraki adım:** P0 kontrol listesi üzerinden canlı demo + gap işaretleme; ardından ilk uygulama PR’ı (öneri: IE belge takip + kalem çıkış tipi + onay anı oto emiş).
