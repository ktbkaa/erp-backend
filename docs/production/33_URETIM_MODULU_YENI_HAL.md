# Üretim Modülü — Yeni Hali (Hedef Tasarım)

**Belge tipi:** Hedef ürün / süreç dokümanı  
**Tarih:** 2026-11-13 (Europe/Istanbul)  
**Durum:** Onaylı tasarım yönergesi → uygulama dalgaları P0–P3  
**İlgili:** `32_PRD_MODUL_YENIDEN_ANALIZ.md` (kaynak analizi) · `32_PRD_GAP_MATRISI.csv` · `33_URETIM_EKRAN_ENVANTERI.csv`

Bu belge, KTB ERP üretim modülünün **yeni halini** tanımlar: menü, ekranlar, sekmeler, iş kuralları, ekranlar arası bağlantılar ve kabul kriterleri. Canias PRD davranışı alınır; KTB’nin kendi form kabuğu (liste + sekmeli kart, yuvarlak lookup, formLinks, bağımsız scroll) korunur.

---

## 1. Amaç ve kapsam

### 1.1 Ne sağlar?

Üretim Yönetimi; tek veya çok seviyeli üretimde:

- Üretim planlarını ve satış siparişlerini **iş emrine** çevirir  
- Emri BOM + rota + depo + termin ile yönetir  
- Malzeme tüketimini ve mamul girişini kontrollü üretir  
- Operasyon onaylarını (normal / kolay saha / hızlı) alır  
- Kalite, stok, MRP ve (sonraki dalgalarda) kapasite / maliyet ile entegre çalışır  

### 1.2 Ne değildir?

- MRP motorunun kendisi (MRP Stok → Planlama altındadır; PRD onu tüketir)  
- Stok bakiyesinin elle yazılması (bakiye yalnız hareketten doğar)  
- Canias gri toolbar kopyası (davranış alınır, görsel dil KTB’dir)

### 1.3 Tasarım ilkeleri

1. **Zincir kırılmaz:** Plan / sipariş → IE → malzeme/op → onay → stok/KK → rapor  
2. **Onay ≠ üretim ≠ stok:** Yönetim onayı emri açar; operasyon onayı miktar üretir; stok hareketi emiş/giriş tipine göre doğar  
3. **Tek kabuk dili:** Yeni / İncele / Düzelt / Kopyala / Sil; master-detail sekmeler; lookup’ta kod+ad (+miktar/belge)  
4. **Önce derinleştir, sonra çoğalt:** Mevcut ekranları Canias derinliğine getir; yeni TX’i yalnızca P2+ ekle  

---

## 2. Süreç haritası (yeni hali)

```
                    ┌──────── BOM / ROU / Tip ────────┐
                    ▼                                 │
 SAL ──► Siparişten IE ──┐                            │
 MRP ──► Üretim Planı ───┼─► Üretim Emri (PRDT01) ◄───┘
 Manuel Yeni ────────────┘         │
                                   ├─ Malzemeleri Getir (BOM)
                                   ├─ Rota operasyonları (otodoldur)
                                   ├─ Eksik malzeme analizi / rezervasyon
                                   ▼
                        İş Emri Onayı (yönetim)
                                   ▼
                        Başlat (is_started)
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   Operasyonel Giriş      Hızlı Üretim Girişi      (P2) Fason / Birleşik
   (normal onay)          (onay no)                Op
           │                       │
           ├─ Oto emiş / operasyonel çıkış ──► INV
           ├─ Mamul / yan ürün giriş ───────► INV
           └─ KK tetik (önce/sırası/sonra) ──► QLT
                                   ▼
                        Planlanan–Gerçekleşen / WIP (P3)
```

Şema referansı: `canias-prd-pack/PRD_SUREC_AKISI.png`

---

## 3. Menü yapısı (yeni)

```
Üretim
├─ Ürün Ağacı
│  ├─ Ürün Ağacı
│  ├─ Ürün Ağacı Patlatma
│  ├─ Ürün Ağacı Seviye Listesi
│  └─ Malzeme Değişikliği
├─ Planlama
│  ├─ Üretim Planları              ← Plan → IE çevir
│  └─ (çapraz) MRP Konsol / Sonuç  ← Stok menüsünde de kalır
├─ İş Emirleri
│  ├─ Üretim Emirleri              ← ana kabuk
│  ├─ Siparişten İş Emri
│  ├─ Toplu İş Emri
│  └─ İş Emri Ağı                  ← P2
├─ Atölye
│  ├─ İş Emri Onayı                ← eski “Kolay İş Emri Onayı” (yeniden adlandır)
│  ├─ Operasyonel Üretim Girişi    ← normal / saha onay
│  ├─ Hızlı Üretim Girişi          ← onay no
│  └─ Birleşik Operasyon Onayı     ← P2
├─ Fason                           ← P2
│  ├─ Fason Operasyon
│  └─ Tedarikçi Parça / Ürün Transfer
├─ Analiz                          ← P3
│  ├─ Planlanan–Gerçekleşen
│  ├─ WIP / Fire / Rework
│  └─ İş Emri Maliyet
└─ Tanımlar
   ├─ Üretim Emri Tipleri
   ├─ İş Merkezleri
   ├─ İş İstasyonları
   ├─ Rotalar
   └─ (P1+) Duruş / Aktivite nedenleri
```

**İsim kararı:** `kolay-is-emri-onayi` ekran başlığı → **İş Emri Onayı**. Canias PRDT03 “kolay saha onayı” davranışı Operasyonel Üretim Girişi içinde yaşar.

---

## 4. Ortak UI kuralları

| Kural | Yeni hali |
|-------|-----------|
| Liste / form scroll | `#listTableScroll` ve `#viewScreen` bağımsız; overscroll contain |
| Satır Kaydet / Düzelt / Kopyala / Sil | Uyarı toast yok (sessiz başarı) |
| Lookup tarayıcı (○) | Kod + ad; gerekirse miktar, belge no, durum |
| Plan başlangıç / bitiş | `datetime-local` (tarih + saat) |
| Belge zinciri | Formda “Belge Takip” sekmesi + üst zincir şeridi |
| techId | Ekran aramada görünür (MFG-…) |

---

## 5. Ekranlar — hedef tanım

### 5.1 Üretim Emirleri (`uretim-emirleri`) — ana kabuk

**Rol:** Canias PRDT01. Emrin tüm üretim özelliklerini taşır.

**Liste kolonları:** Emir no · Tip · Stok · Sipariş · Plan miktar · Üretilen · P/K · A/K · Onay · Başlatıldı · Durum  

**Aksiyonlar:** Yeni / İncele / Düzelt / Kopyala / Sil · **Onayla** · **Başlat** · **Malzemeleri Getir** · **BOM/Rota Uygula**

**Sekmeler:**

| Sekme | İçerik |
|-------|--------|
| İş Emri Bilgileri | Organizasyon, kimlik, depo, planlama, durum |
| İş Emri Malzemeleri | BOM’dan gelen kalemler; çıkış tipi satırda |
| Rota | Operasyon satırları; rota seçilince otodoldur |
| Belge Takip (P0) | Sipariş, plan, rezervasyon, stok hareketleri, KK emirleri |
| Kaynak (P2) | Ekipman / araç |
| Maliyet (P3) | Standart / gerçekleşen özet |

**Master alan grupları (hedef):**

- Organizasyon: iş yeri, emir tipi  
- Kimlik: emir no, tarih, stok → ürün ağacı → rota, birim, plan/üretilen miktar, satış siparişi, proje  
- Depo: hammadde, yarı mamul, mamul  
- Planlama: plan başlangıç/bitiş (datetime), bitiş tarihi, planlı/kesin, çıkış tipi, giriş tipi  
- Durum: açık/kapalı, durum, onaylı, yayınlandı, başlatıldı, ürün girişi tamam  

**Malzeme satırı (hedef alanlar):** sıra · stok · birim · plan · tüketilen · depo · **çıkış tipi** (`Manuel` / `OtoEmis` / `Operasyonel`) · operasyon bağı (op. no)

**formLinks:** stok → varsayılan BOM, rota, birim, depolar; BOM → rota tercihi  

**Emir tipleri (hedef):**

| Tip kodu | Anlam | Dalga |
|----------|-------|-------|
| `NORMAL` / `SIP` | Tek seviyeli | P0 (mevcut) |
| `KOL` | Kolektif | P2 |
| `BIL` | Bileşik (çok seviyeli ağ) | P2 |
| `DEM` | Demontaj | P2 |

---

### 5.2 Siparişten İş Emri (`siparis-is-emri`)

**Rol:** Canias PRDT13.

**Akış:**
1. Satış siparişi seç  
2. Stok listesi **yalnız o sipariş satırlarıyla** sınırlı  
3. Stok seçilince varsayılan BOM + rota + birim + depolar gelir  
4. Emir tipi otomatik (`SIP` veya tip tanımından)  
5. Miktar = açık sipariş miktarı (düzenlenebilir, üst sınır açık miktar)  
6. İş emri no (numaratör) + plan başlangıç/bitiş (datetime)  
7. Kaydet → `Üretim Emirleri` kaydı oluşur; belge takipte sipariş görünür  

**Liste:** Aday satırlar + mevcut `wo_order_no` / `wo_order_id` (varsa)

---

### 5.3 Toplu İş Emri (`toplu-is-emri`)

**Rol:** Birden fazla sipariş satırından / plandan toplu IE.

**Hedef:** Çoklu seçim → tip seç → oluştur; sonuç listesinde oluşan emir no’ları.

---

### 5.4 Üretim Planları (`uretim-planlari`)

**Rol:** Canias PRDT06 kaynağı.

**Akış:** MRP veya manuel plan → **Başlatıldı** → **Çevir** → IE  
Çevirmede: emir tipi seçimi, önerilen miktar/tarih (MRP değerleri yönlendirir, zorlamaz).

---

### 5.5 İş Emri Onayı (`kolay-is-emri-onayi` → başlık: İş Emri Onayı)

**Rol:** Yönetimsel emir onayı. **Stok hareketi üretmez.**

**Banner (zorunlu):** Onay bekleyen emirler. Onay üretime açar; üretim girişi değildir.

**Liste:** Emir · tarih · stok · miktar · plan · iş yeri · durum · hazır · engeller  

**Aksiyonlar:** İncele · Onayla · Uygunları Toplu Onayla  

**Kurallar:** `32` / `prdt03/04_BUSINESS_RULES.md` — `status ∈ {Taslak, OnayBekliyor}`, miktar > 0, stok dolu, en az bir operasyon.

---

### 5.6 Operasyonel Üretim Girişi (`uretim-girisleri`)

**Rol:** Canias PRDT02 + PRDT03 saha derinliği (P0 iskelet, P1 tam).

**Üst alanlar:** İş emri · operasyon · üretilen miktar · depo · parti/seri (P1)  

**Aksiyonlar:** Detayları Getir · Kaydet (onay) · (P1) Düzeltme · Başlat / Bitir  

**Onay anı davranışları:**

| Emir / satır tipi | Davranış |
|-------------------|----------|
| Çıkış `OtoEmis` | Onay miktarına orantılı otomatik stok çıkış |
| Çıkış `Operasyonel` | Başlatırken çıkış (P1) |
| Çıkış `Manuel` | Ayrı stok hareketi gerekir |
| Giriş `Otomatik` | Son op / kural sağlanınca mamul giriş |
| Giriş `Manuel` | Bu ekrandan veya stok hareketinden |

**P1 ekleri:** Onay listesi (pozisyon seç → miktar düzelt), yeniden işleme miktarı, yarımamül stok kontrolü (opsiyonel kural), KK kancası.

---

### 5.7 Hızlı Üretim Girişi (`hizli-uretim-girisi`)

**Rol:** Canias PRDT05.

**Hedef:** Onay numarası / emir+op ile az alanlı kayıt; detaylı düzeltme yolu Operasyonel ekrana link.

---

### 5.8 Master ekranlar (BOM / ROU / Tip)

| Ekran | Yeni hali beklentisi |
|-------|----------------------|
| Ürün Ağacı | Alternatif no + geçerlilik (P2 varyant); patlatma / seviye / malzeme değişikliği korunur |
| Rotalar | Op sırası, IM, süre; şablon uygula; fason bayrağı (P2) |
| İş Merkezleri / İstasyonlar | CRUD + (P3) kapasite takvimi |
| Üretim Emri Tipleri | Kod, ad, varsayılan çıkış/giriş tipi, numaratör bağları |

---

### 5.9 P2 / P3 ekranlar (özet)

| Ekran | Canias | Özet |
|-------|--------|------|
| İş Emri Ağı | PRDT10 | Çok seviyeli IE hiyerarşisi |
| Fason Operasyon | PRDT40 | Tedarikçi op; SA istek/sipariş; parça gönder / ürün al |
| Birleşik Operasyon | PRDT42/43 | Benzer op’ları grupla, ortak onay |
| Planlanan–Gerçekleşen | Analiz | Miktar / süre / kademe |
| WIP / Fire / Rework | Analiz | Ara stok ve fire |
| IE Maliyet | PRDT51/52/60 | Malzeme / aktivite / fason / muhasebe |

---

## 6. Durum makinesi

```
Taslak ──► OnayBekliyor ──► Acik ──► Uretimde ──► Kapali
                │              │
                │              └──► Iptal (üretilen=0 ve başlatılmamışsa)
                └──► Iptal
```

| Geçiş | Koşul | Etki |
|-------|-------|------|
| Onayla | Kurallar OK | `is_approved`, `status=Acik` |
| Başlat | Onaylı + Acik | `is_started`, `status=Uretimde` |
| Op onay | Başlatılmış (veya kurala göre Acik) | `produced_quantity` artar; emiş/giriş |
| Kapat | Üretilen ≥ plan veya manuel kapat | `is_open=Kapali`, `status=Kapali` |

---

## 7. Stok ve kalite entegrasyonu

### 7.1 Stok

- Bakiye yalnız hareketten.  
- IE çıkış tipi satır veya başlık varsayılanından gelir.  
- Oto emiş **onay anında**; operasyonel çıkış **başlat anında**; manuel ayrı belge.  
- Mamul giriş: otomatik (tüm zorunlu op’lar onaylıysa) veya manuel.  

### 7.2 Kalite

| An | Tetik |
|----|-------|
| Üretim öncesi | Hammadde / GKK (gerekirse) |
| Onay sırasında | Kontrol planı varsa zorunlu sonuç |
| Üretim sonrası | CKK emri (mamul girişte) |

Mevcut `kk-emirleri-gkk` / `kk-emirleri-ckk` ekranları PRD belge takip sekmesinden açılır.

### 7.3 MRP / rezervasyon

- IE oluştururken eksik malzeme analizi (uyarı veya engel — tip parametresi).  
- İhtiyaç tarihine rezervasyon (opsiyonel, P0 uyarı / P1 rezervasyon yaz).  

---

## 8. Ekranlar arası bağlantı sözleşmesi

| Kaynak | Hedef | Tetik | Taşınan |
|--------|-------|-------|---------|
| Satış siparişi | Siparişten IE | Toolbar / bağlı ekran | `sales_order_id`, satır, miktar |
| Siparişten IE | Üretim Emirleri | Kayıt sonrası | `order_no` |
| Üretim planı | Üretim Emirleri | Çevir | plan id, tip, miktar, termin |
| Üretim Emirleri | Operasyonel Giriş | Bağlı ekran | `order_id`, op |
| Üretim Emirleri | İş Emri Onayı | Durum filtresi | aday kuyruğu |
| Rota değişimi | Rota sekmesi | Otomatik | operasyon satırları |
| Malzemeleri Getir | Malzeme sekmesi | Buton | BOM kalemleri |
| Op onay | Stok hareket | Sistem | çıkış/giriş |
| Op onay / giriş | KK emri | Kural | plan bağları |
| Tüm PRD lookup | Tarayıcı | ○ | kod+ad+bağlam |

---

## 9. Veri modeli (hedef özet)

Mevcut tablolar korunur; P0–P1 alan sıkılaştırması:

| Varlık | Kritik alanlar |
|--------|----------------|
| `production_orders` | order_no, tip, stok, BOM, rota, miktarlar, plan_start/end (timestamp), çıkış/giriş tipi, durum bayrakları, sales_order_id, plan_id |
| `production_order_materials` | item_id, miktar, depo, **issue_type**, op bağı, consumed |
| `production_order_operations` | op kod, IM, plan/üretilen, durum, ilk/son |
| `production_receipts` (+ satırlar) | order_id, op, miktar, onay no, düzeltme bağı (P1) |
| `production_plans` | başlatıldı, çevrildi, önerilen miktar/tarih |
| (P2) ağ / fason / birleşik | ayrı tablolar veya bağ tabloları |

---

## 10. API sözleşmesi (hedef)

| Method | Path | Not |
|--------|------|-----|
| CRUD | `/uretim-emirleri` | Mevcut |
| POST | `/:id/malzemeleri-doldur` | Mevcut |
| POST | `/:id/operasyonlari-doldur` | Mevcut |
| POST | `/:id/onayla` · `/toplu-onay` | Yönetim onayı |
| POST | `/:id/baslat` | Yalnız onaylı |
| POST | `/satis-siparisinden` · `/toplu` | Sipariş / toplu |
| POST | `/uretim-planlari/:id/cevir` | Plan→IE |
| CRUD | `/uretim-girisleri` | Operasyonel / hızlı |
| GET | `/uretim-girisleri/onizleme` | Detayları getir |
| (P0) GET | `/uretim-emirleri/:id/belge-takip` | Zincir özeti |
| (P1) POST | `/uretim-girisleri/:id/duzelt` | Onay düzeltme |

---

## 11. Tipik kullanım senaryoları (kabul)

### S1 — Siparişten normal üretim (P0)

1. Satış siparişi aç → Siparişten İş Emri  
2. Stok yalnız sipariş satırlarından seçilir; BOM/rota/tip/miktar dolu  
3. Emir no + plan datetime kaydedilir  
4. Üretim Emirleri’nde Malzemeleri Getir + rota satırları dolu  
5. İş Emri Onayı → Onayla  
6. Başlat  
7. Operasyonel giriş ile op onay → (oto emiş varsa) çıkış + mamul giriş  
8. Depo bakiye ve belge takip doğrulanır  

### S2 — MRP planından IE (P0)

1. MRP çalıştır → plan oluşur  
2. Üretim Planları’nda Başlatıldı → Çevir  
3. IE oluşur; S1 adım 4’ten devam  

### S3 — Onay düzeltme (P1)

1. Verilmiş op onayında miktar fazla  
2. Onay listesinden pozisyon seç → Düzelt → miktar düş  
3. İlişkili oto emiş / giriş ters hareket veya fark hareketi  

### S4 — Fason (P2)

1. Rotada fason op  
2. Fason ekranından SA istek/sipariş  
3. Parça tedarikçiye çıkış → ürün giriş  

---

## 12. Uygulama dalgaları (özet)

| Dalga | Odak | Çıktı |
|-------|------|--------|
| **P0** | Omurga | Belge takip, satır çıkış tipi + onay anı oto emiş, isim netliği, eksik malzeme uyarısı, bağlantı testleri |
| **P1** | Onay derinliği | Düzeltme listesi, onay no, başlat/bitir, parti/seri, KK kancası |
| **P2** | Tip / fason / ağ | Kolektif-bileşik-demontaj, PRDT10, PRDT40, PRDT42 |
| **P3** | CAP / analitik | Çizelgeleme, planlanan–gerçekleşen, WIP, maliyet |

Detaylı gap skorları: `32_PRD_GAP_MATRISI.csv`

---

## 13. Kabul kriterleri (P0 bitiş)

- [ ] Siparişten IE: stok filtresi + BOM/rota/tip + emir no + datetime  
- [ ] Üretim Emirleri: Malzemeleri Getir + rota otodoldur  
- [ ] Belge takip sekmesinde sipariş / plan / hareket linkleri  
- [ ] Malzeme satırında çıkış tipi; OtoEmis onayda stok çıkışı üretir  
- [ ] İş Emri Onayı stok hareketi üretmez; Operasyonel giriş üretir  
- [ ] Lookup tarayıcıları kod+ad (+bağlam) gösterir  
- [ ] Liste/form scroll bağımsız; satır aksiyonları sessiz  

---

## 14. Bilinçli sınırlar

- Bu belge **hedef tasarımı**dır; P2/P3 ekranları yazılana kadar menüde “yakında” veya gizli tutulabilir.  
- Canias video kareleri ortam kısıtı nedeniyle PDF + metadata ile doğrulanmıştır.  
- Muhasebe / maliyet / tam CAP P3’e ertelenmiştir; P0 ticari döngüyü kapatmaya yeter.

---

## 15. Sonuç

Yeni üretim modülü, KTB kabuğunda Canias PRD zincirini yaşatır: **plan/sipariş → emir → malzeme/op → yönetim onayı → operasyon onayı → stok/KK → analiz**. Uygulama bu belgeye ve gap matrisine göre dalga dalga ilerler; her dalga S1–S4 senaryolarıyla kabul edilir.
