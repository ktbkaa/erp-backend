# Canias Eğitim Paketi — Derin Analiz & KTB ERP Eşleştirme

**Tarih:** 2026-10-19  
**Kaynak 1 (proje başı):** `canias_modül_kitabı` + `docs/01_DOCUMENT_ANALYSIS.md` + YouTube/gap paketleri (`15_*`, `16_*`, `12_*`)  
**Kaynak 2 (WeTransfer):** 19 benzersiz eğitim PDF + 1 süreç şeması (`caniasERP Tam Döngü Süreç Akışı.png`)  
**Amaç:** Profesyonel forma geçişte hangi Canias davranışlarını öncelikle taşıyacağımızı **0–100 puan** ile kilitlemek. Uygulama komutları bu dokümana göre verilecek.

---

## 0. Yönetici özeti

Canias eğitim paketi şunu net söylüyor:

1. **Master data yoksa süreç yok.** BAST03 (malzeme) + BAST02 (cari) tüm belgelere default taşır.
2. **Tek satış kabuğu (SALT01)** teklif → sipariş → irsaliye → fatura’yı *belge tipi* ile ayırır; satınalmada ise **PURT04 (istek) ≠ PURT05 (sipariş)** ayrı uygulamadır.
3. **MRP omurgadır.** Satış siparişi → MRP → (satınalma isteği **veya** üretim planı) → kesin belge.
4. **INVT01 tek stok hareket kabuğudur**; yön (Giriş/Çıkış) + bağlaç (Sipariş / İrsaliye / İş Emri / Manuel) ile çalışır. Belge ≠ stok hareketi.
5. **PRDT01 plan değil yürütmedir**; plan (MRPT02) → PRDT06 çevir → IE → PRDT02 onay → stok.
6. **FINT02 entegrasyon ucudur**; ticari belge muhasebeleşmeden döngü kapanmaz.
7. **UI dili tektir:** Liste + Ara / Göster / Değiştir / Yeni / Yazdır / Soft-Sil → master-detail sekmeler.

KTB’de omurga büyük ölçüde **iskelet olarak var**; eksik olan çoğunlukla **iş kuralı disiplini, belge tipi birliği, miktar izi, onay→stok zamanlaması ve master sekmelerin süreç alanları**.

---

## 1. Süreç şeması (Tam Döngü) — düğüm haritası

Şema: `docs/canias_ref/SEMASI_caniasERP_Tam_Döngü_Süreç_Akışı.png`

| # | Canias TX | Anlam | KTB ekran(lar) | Durum (özet) |
|---|-----------|-------|----------------|--------------|
| 1 | BAST03 | Malzeme master | Stok Kartı | Kısmi (sekmeler zayıf) |
| 2 | BOMT01 | Ürün ağacı | Ürün Ağacı / Patlatma | Var; alternatif/varyant yok |
| 3 | BAST06 | Maliyet merkezi | — / Hesap Planı kısmi | Zayıf |
| 4 | ROUT02 | İş merkezi | İş Merkezleri | Basit CRUD |
| 5 | ROUT01 | Rota | Rotalar | Var; nested UI sınırlı |
| — | CALT01 | Standart maliyet | — | Yok |
| 6 | BAST02 | Müşteri/tedarikçi | Cari Kartları | İyi; ilişki rolleri eksik |
| 7 | SALT02 | Satış fiyat listesi | Fiyat Listeleri | Stub/kısmi |
| 8–9 | SALT01 | Teklif / Sipariş | Satış Teklifleri + Satış Siparişleri | Ayrı ekranlar; tek kabuk değil |
| 10 | MRPT05/06 | MRP çalıştır | MRP Çalıştır / Anlık Hesap | Var (iskelet) |
| 11 | MRPT04/07 | Stok-ihtiyaç analizi | MRP Sonuçları | Kısmi |
| 12 | PURT04/12 | Satınalma isteği | Satınalma Talepleri | Var (profesyonel alanlar eklendi) |
| 13 | PURT01 | Teklif isteği | Satınalma Teklif İstekleri | Var |
| 14 | PURT02 | Satınalma info | — | Yok |
| 15 | PURT05 | SA sipariş | Satınalma Siparişleri | Var (profesyonel alanlar) |
| 16 | INVT01 | Mal girişi (PO) | Mal Kabuller + Stok Hareketleri | Ayrı; köprü kısmi |
| 17 | VERT01 | Alış fatura kontrol | Fatura Kontrolleri (3-way) / Alış Faturaları | Kısmi |
| 18 | MRPT02 | Üretim planı | — (MRP sonuç → emir) | Plan belgesi zayıf |
| 19 | PRDT06 | Plan→IE | Toplu İş Emri / Siparişten İş Emri | Kısmi UI |
| 20 | PRDT01 | İş emri | Üretim Emirleri | Var |
| 21 | INVT01 | IE malzeme çıkış | Stok Hareketleri / Üretim Girişleri | Kısmi (emiş) |
| 22 | PRDT02 | İş bitiş onayı | Üretim Girişleri | Basitleştirilmiş |
| 23 | INVT01 | IE mamul giriş | Üretim Girişleri | Var |
| 24 | SALT01 | Satış irsaliyesi | İrsaliyeler / Sevk Emirleri | Var; tek kabuk değil |
| 25 | INVT01 | Manuel/oto çıkış | Stok Hareketleri | Var |
| 26 | SALT01 | Satış faturası | Satış Faturaları | Var |
| FIN | FINT02 | Muhasebe belgesi | Muhasebe Belgeleri | Stub/kısmi entegrasyon |
| INV | INVT04 | Stok sorgu | Depo Bakiye | Var (kullanılabilir/bloke ayrımı zayıf) |

**Şemanın mesajı:** Sol master → üst satış → orta MRP → alt satınalma / sağ üretim → stok → finans. Profesyonel form = bu zinciri kırmadan belge ve stok hareketini ayırmak.

---

## 2. Proje başı Canias hafızası (kısa yenileme)

`01_DOCUMENT_ANALYSIS` + modül kitabından sabitlenenler:

- BAS / BOM / ROU / INV / PUR / SAL / PRD / MRP çekirdek; ACC/e-Dönüşüm v1 sonrası.
- Stok **hareketten** doğar; bakiye elle yazılmaz.
- Satınalma: istek → (teklif) → sipariş → mal giriş → fatura kontrol → muhasebe.
- Satış: teklif → sipariş → irsaliye → fatura.
- Üretim: BOM+rota → emir → tüketim → onay → mamul giriş.

YouTube/gap listeleri (`16_*`) ile uyumlu: belge referans omurgası, hareket kodu, açık miktar, rezervasyon, 3-way VER, MRP iskeleti, FIN entegrasyonu hâlâ yüksek skorlu açıklar.

---

## 3. Doküman bazlı analiz (WeTransfer)

> Not: PDF’ler ekran görüntülü eğitimdir; OCR/metin yer yer bozuk. Aşağıdaki içerik metin + sayfa görselleri + şema birleşimidir. Detaylı SALT/PUR/INV metin dökümü: `docs/canias_ref/SALT01_PUR_INV_EGITIM_ANALIZ.md`.

### 3.1 Giriş Ekranı ve Kullanıcı Arayüzü

| | |
|--|--|
| **Amaç** | Login, toolbar, favori/geçmiş, standart uygulama kabuğu, grid/rapor, trace |
| **Kullanım** | Menü / kod yazarak aç / Zoom; Ara-Göster-Değiştir-Yeni-Yazdır; soft-sil |
| **KTB eşleşmesi** | `public/app.js` shell (nav + form tabs + liste) |
| **Ne diyor?** | Tüm TX’ler aynı dili konuşur; kullanıcı her ekranda aynı kası kullanır |
| **Eksik** | TX kodu ile açılış, favori URL (filtrelenmiş), trace/debug paneli, anasayfa widget |
| **Öneri skoru** | **88** — Kabuk disiplinini sabitlemeden “profesyonel form” algısı oluşmaz |

### 3.2 BAST02 & BAST03 (Müşteri/Tedarikçi + Malzeme)

| | |
|--|--|
| **Amaç** | Tüm süreçlerin default kaynağı |
| **BAST03 sekmeler** | Genel, Teknik, Birimler, MRP, Depolar, Satış, Satınalma, Muhasebe, Üretim, Resim, KK, Ekler, Notlar (B/M/S/P), Bakım/Servis |
| **Kritik alanlar** | Tip, tedarik tipi, stok birimi (immutable), MRP parti/emniyet/süre/fire/çıkış tipi, SA tolerans, KDV, hesap grubu, soft-sil |
| **BAST02** | Kayıt tipi Aday/Müşteri/Tedarikçi; Faturayı Alan / Malı Alan; banka “ilk”; ödeme; yazdırma şablonları |
| **KTB** | Stok Kartı + Cari Kartları (çok sekmeli) — alanların bir kısmı yeni eklendi (GTİP, SA birim, KDV, tolerans, MRP) |
| **Ne diyor?** | Belge ekranı şişmez; master zenginleşir |
| **Eksik** | Çıkış tipi (oto emiş), parti metodu tam set, soft-sil+Silindi filtre, cari ilişki rolleri, Notlar B/M/S/P |
| **Öneri skoru** | **96** — En yüksek kaldıraç; her süreç buradan beslenir |

### 3.3 BOMT01 — Ürün Ağacı

| | |
|--|--|
| **Amaç** | Reçete; MRP patlatma + IE kopyası |
| **Kullanım** | Kategori (Standart/Alternatif/Varyant/Demontaj/Benzer) → Genel + Elemanlar grid → soft-sil |
| **KTB** | Ürün Ağacı, Patlatma, Seviye Listesi |
| **Ne diyor?** | Alternatif no + geçerlilik + temel miktar + satırda operasyon sırası |
| **Eksik** | Alternatif/varyant, soft-sil, çoklu malzeme ekleme UX, geçerlilik tarihi |
| **Öneri skoru** | **82** — Üretim/MRP kalitesi için şart; varyant Faz 2 |

### 3.4 ROUT01 (+ ROUT02 iş merkezi)

| | |
|--|--|
| **Amaç** | Operasyon sırası, süre, IM, BOM bileşen ataması; MRP lead time kaynağı |
| **Kullanım** | Header malzeme + operasyon grid → Detay (Genel/Malzeme); IM ideal süre şablonu |
| **KTB** | Rotalar, İş Merkezleri |
| **Ne diyor?** | BOM alternatif no = rota alternatif no; süreler BAST03 üretim sekmesine senkron |
| **Eksik** | Nested malzeme ataması UI, IM aktivite şablonu (SETU/MACH/LABO), senkron butonu |
| **Öneri skoru** | **85** |

### 3.5 SALT01 — Teklif & Sipariş / İrsaliye / Fatura

| | |
|--|--|
| **Amaç** | Tek uygulama, belge tipi ile süreç adımı |
| **Akış** | Anahtar (firma+iş alanı+tip+no+cari) → kalem → Kaydet; referans ile tip değiştirerek kalem kopyala; Açık→Kısmen Açık→Kapalı |
| **Kalem izi** | Sipariş / irsaliye / fatura miktarları ayrı; tolerans; otomatik kapama |
| **KTB** | Ayrı ekranlar: Satış Teklifleri, Siparişleri, İrsaliyeler, Faturalar (+ Sevk Emirleri) |
| **Ne diyor?** | Ayrı menü ≠ ayrı veri modeli; dönüşüm ve miktar izi tek belgede yaşar |
| **Eksik** | Tek kabuk veya en azından ortak kalem motoru + açık miktar + rezervasyon + ATP |
| **Öneri skoru** | **94** — Ticari profesyonellik buradan okunur |

### 3.6 PURT04 & PURT05 — SA istek / sipariş

| | |
|--|--|
| **Amaç** | İstek (iç ihtiyaç) ≠ Sipariş (tedarikçi taahhüdü); Başlat kapısı |
| **Akış** | PURT04 → Başlatılmış → PURT05 (istekten veya manuel); PO’da İmza/Teslimat/Fatura şeritleri |
| **KTB** | Satınalma Talepleri / Siparişleri (+ teklif/anlaşma) — profesyonel alanlar 032 ile genişledi |
| **Ne diyor?** | Satıştaki tek-tx modelinin aksine PUR bilinçli ayrılmış; onay/başlat disiplinli |
| **Eksik** | Başlat kapısı, istek→sipariş UX simetrisi, tedarikçi ≠ mal/fatura gönderen rolleri, 3 şerit durum |
| **Öneri skoru** | **91** |

### 3.7 INVT01 + VERT01 — Stok hareket + fatura kontrol

| | |
|--|--|
| **Amaç** | INVT01: yön+bağlaç ile stok belgesi; VERT01: 3-way (PO fiyat × mal giriş miktar × fatura) |
| **Senaryolar** | PO mal giriş; irsaliye çıkış; IE giriş (mamul+oto emiş); IE çıkış (manuel) |
| **KTB** | Mal Kabul, Stok Hareketleri, Alış Fatura, Fatura Kontrolleri |
| **Ne diyor?** | Lojistik belge ile stok hareketi ayrılır; fatura kontrolü stoksuz kapanmaz |
| **Eksik** | Tek INVT01 kabuğu, zorunlu hareket kodu her yolda, 3-way sert kontrol, muhasebe kilidi |
| **Öneri skoru** | **93** |

### 3.8 INVT04 — Stok sorgu

| | |
|--|--|
| **Amaç** | Anlık görünüm: Toplam / Kullanılabilir / Bloke / Tahsis / Yolda |
| **KTB** | Depo Bakiye |
| **Ne diyor?** | Tek “bakiye” yetersiz; rezervasyon/kalite/yolda ayrılmalı |
| **Öneri skoru** | **80** |

### 3.9 MRPT05 & MRPT04 / MRPT02

| | |
|--|--|
| **Amaç** | MRPT05 motor; MRPT04 planlamacı ekranı; MRPT02 üretim plan belgesi |
| **KTB** | MRP Çalıştır / Sonuçlar / Anlık Hesap — plan belgesi zayıf |
| **Ne diyor?** | Parametre BAST03’te; “Başlatılmış” plan → PRDT06; Sabit plan MRP silmesin |
| **Eksik** | Plan belgesi + Başlat + Sabit bayrak; MRPT04 zaman eksenli kümülatif grid; mevcut plan sil bilinci |
| **Öneri skoru** | **87** |

### 3.10 PRDT01 / PRDT02 / PRDT06

| | |
|--|--|
| **Amaç** | IE yürütme; operasyon onayı; plan/siparişten çevirme |
| **Kritik kurallar** | Başlatıldı olmadan onay yok; çıkış/giriş tipi (Manuel/Otomatik/Operasyonel); oto emiş onay anında; düzeltme stoku tersler |
| **KTB** | Üretim Emirleri / Girişleri / Siparişten-Toplu IE |
| **Ne diyor?** | Plan ≠ emir; onay = stok post tetikleyicisi |
| **Eksik** | Başlatıldı bayrağı, G/Ç tipi konfig, op. bazlı onay, emiş ara ekranı, çevirme UX |
| **Öneri skoru** | **90** |

### 3.11 FINT02 — Muhasebe belgeleri

| | |
|--|--|
| **Amaç** | Manuel + kayıt anahtarı + entegrasyon yevmiyesi; iptal=ters kayıt |
| **KTB** | Muhasebe Belgeleri + hesap belirleme kuralları (iskelet) |
| **Ne diyor?** | Entegrasyon silinince kaynak “muhasebeleşmemiş”e döner; audit trail şart |
| **Öneri skoru** | **78** — Ticari kapanış için gerekli; tam GL Faz 2 olabilir, **entegrasyon bayrağı** erken |

### 3.12 Eğitim paketi dışı ama şemada olanlar

| TX | Skor | Not |
|----|------|-----|
| SALT02 fiyat listesi | **84** | Teklif/sipariş fiyatını besler |
| PURT01/02 | **70** | Teklif isteği KTB’de var; info kaydı sonra |
| CALT01 / BAST06 | **55** | Maliyet merkezli fiyatlama ileri faz |
| CAP kapasite | **45** | PRD olgunlaşınca |

---

## 4. Ekran eşleştirme matrisi (özet)

| Canias | KTB ekran | Eşleşme % | Ana boşluk |
|--------|-----------|-----------|------------|
| UI Shell | Ana shell | 70 | TX kod, favori, trace |
| BAST03 | Stok Kartı | 65 | MRP/çıkış tipi/soft-sil/satış-SA sekmeleri |
| BAST02 | Cari Kartları | 75 | Faturayı/Malı Alan, uyarı/kredi |
| BOMT01 | Ürün Ağacı | 70 | Alternatif, geçerlilik |
| ROUT01/02 | Rotalar / İş Merkezleri | 65 | Nested bileşen, aktivite şablonu |
| SALT01* | 4 ayrı satış ekranı | 55 | Tek kabuk / miktar izi / rezervasyon |
| PURT04/05 | SA Talep/Sipariş | 70 | Başlat, 3 şerit, roller |
| INVT01 | Mal Kabul + Stok Hareket | 50 | Tek kabuk, bağlaç modeli |
| VERT01 | Fatura Kontrol / Alış Fatura | 45 | Sert 3-way |
| INVT04 | Depo Bakiye | 60 | Kullanılabilir/bloke/tahsis |
| MRPT05/04/02 | MRP* | 50 | Plan belgesi + analiz grid |
| PRDT01/02/06 | Üretim* | 55 | Başlat, onay→emiş, çevirme |
| FINT02 | Muhasebe Belgeleri | 40 | Entegrasyon kilidi |

\*SALT01 dört belge tipi tek TX.

---

## 5. Özellikle kullanmamız gerekenler (puanlı öneri listesi)

Puan = **iş etkisi (0–40) + KTB’ye uyum kolaylığı (0–30) + Canias’taki netlik (0–20) + risk azaltma (0–10)**.

| Sıra | Öneri | Puan | Ne işimize yarar? |
|------|-------|------|-------------------|
| 1 | **Master’da süreç default’ları** (BAST03/02): KDV, tolerans, tedarik süresi, emniyet, çıkış tipi, SA/satış birimi, cari ödeme & sevk rolleri | **96** | Her belgede tekrar giriş azalır; hata oranı düşer |
| 2 | **Belge referans omurgası + açık miktar izi** (REFDOC + sipariş/irsaliye/fatura kalan) | **95** | Kısmi sevk/fatura; izlenebilirlik; Canias ORDSTAT karşılığı |
| 3 | **INVT01 zihniyeti:** yön + bağlaç + hareket kodu; belge≠hareket | **93** | Stok tutarlılığı; mal kabul/irsaliye/IE tek dil |
| 4 | **SALT01 süreç dili** (ister tek ekran ister 4 ekran): tip değiştirerek dönüştür, soft-sil, Göster=read-only | **94** | Kullanıcı öğrenme maliyeti düşer |
| 5 | **PUR Başlat + talep→sipariş simetrisi** | **91** | İç ihtiyaç ile tedarikçi taahhüdü ayrılır |
| 6 | **PRD: Başlatıldı + G/Ç tipi + onayda emiş** | **90** | WIP ve stok zamanlaması kontrol altında |
| 7 | **UI shell standart buton seti** | **88** | Tüm formlar “aynı ERP” gibi durur |
| 8 | **MRP: BAST parametre → çalıştır → plan/istek → kesin belge** | **87** | Satıştan üretime/satınalmaya otomatik köprü |
| 9 | **ROUT↔BOM bileşen-operasyon + süre→stok senkron** | **85** | IE ve MRP lead time doğru çıkar |
| 10 | **SALT02 / fiyat listesi besleme** | **84** | Teklif-sipariş fiyat disiplini |
| 11 | **BOM alternatif + geçerlilik (varyant yok)** | **82** | Üretim esnekliği; konfigüratör şart değil |
| 12 | **INVT04 bakiye boyutları** | **80** | ATP/rezervasyon/kalite için zemin |
| 13 | **VERT 3-way + FIN entegrasyon bayrağı** | **78** | Mali kapanış; audit |
| 14 | Soft-delete + Silindi filtresi (tüm master/belge) | **77** | Veri kaybı yok; Canias güvenlik modeli |
| 15 | Trace / olay günlüğü (DEVT31 benzeri) | **72** | Entegrasyon hatalarını çözmek |
| 16 | PURT02 satınalma info | **70** | Tekrarlayan tedarikçi-malzeme fiyatı |
| 17 | CALT01 / maliyet merkezi derinliği | **55** | İleri maliyet; erken şart değil |
| 18 | Tam varyant/konfigüratör | **48** | Sektör ihtiyacı yoksa ertele |
| 19 | Tam CAP çizelgeleme | **45** | PRD olgunlaşınca |

### Bilinçli kullanmayacaklarımız (şimdilik)

- Canias’ın **5 BOM/ROU kategorisinin tamamı** (Demontaj/Benzer) — skor **42**
- E-defter / B-Form / çek-senet derin FIN — skor **40** (TR uyumu ayrı proje)
- Eğitim videolarındaki her sekme alanını birebir kopyalamak — skor **35** (form şişer, UX bozulur)

---

## 6. Profesyonel forma geçiş — önerilen uygulama dalgaları

Komut verdiğinde bu sırayla ilerlenmeli:

### Dalga P0 — Dil ve omurga (hemen)
1. UI: Ara/Göster/Değiştir/Yeni + soft-sil pattern’ini tüm CRUD’a kilitle  
2. Belge `kaynak_belge_tipi/id` + kalem ref + açık miktar  
3. Hareket kodu zorunlu bağ (mal kabul, irsaliye, üretim, fatura stok etkisi)

### Dalga P1 — Master & ticari
4. Stok/cari süreç sekmeleri (MRP çıkış tipi, tolerans, roller)  
5. Satış/satınalma dönüştür UX + miktar izi + (satış) rezervasyon  
6. SA Başlat kapısı; VERT 3-way sertleştirme  

### Dalga P2 — Üretim & MRP
7. Üretim plan belgesi + PRDT06 çevirme + IE Başlatıldı  
8. Onayda oto emiş / G/Ç tipi  
9. MRP parametrelerinin BAST03 ile tam bağlanması  

### Dalga P3 — Finans kapanış
10. Fatura onay → muhasebe belgesi önerisi/otomatik + geri alma kuralı  

---

## 7. Doküman envanteri (WeTransfer)

| Dosya | Sayfa | Rol |
|-------|------:|-----|
| Giriş Ekranı ve Kullanıcı Arayüzü.pdf | 32 | Shell |
| BAST02 & BAST03.pdf | 190 | Master |
| BOMT01.pdf | 24 | BOM |
| ROUT01.pdf | 45 | Rota |
| SALT01 - Teklif & Sipariş.pdf | 84 | Satış |
| SALT01 - İrsaliye.pdf | 22 | Satış lojistik |
| SALT01 - Fatura.pdf | 30 | Satış fatura |
| PURT04 & PURT05.pdf | 138 | Satınalma |
| INVT01 - VERT01.pdf | 50 | Mal giriş + VER |
| INVT01 - İrsaliye Çıkış.pdf | 3 | Stok çıkış |
| INVT01 - İş Emri Giriş/Çıkış.pdf | 8+9 | Üretim stok |
| INVT04.pdf | 3 | Stok sorgu |
| MRPT05 & MRPT04.pdf | 16 | MRP |
| MRPT02.pdf | 10 | Üretim planı |
| PRDT01 / PRDT02 / PRDT06.pdf | 49+35+6 | Üretim |
| FINT02.pdf | 118 | Muhasebe |
| caniasERP Tam Döngü Süreç Akışı.png | 1 | Omurga şema |
| BAST02&03 (1).pdf | — | Yinelenen kopya (analiz dışı) |

Ham paket VM’de `/tmp/wetransfer/` altında; git’e PDF konmadı (≈147 MB). Şema: `docs/canias_ref/SEMASI_caniasERP_Tam_Döngü_Süreç_Akışı.png`.

---

## 8. Sonuç cümlesi

Canias bize “daha çok alan” değil **daha sıkı süreç dili** öğretiyor: master’dan default, belgede tip/dönüşüm/miktar izi, stokta yön+bağlaç, üretimde başlat/onay, MRP’de plan→kesin belge, finance’te entegrasyon kilidi.

Bir sonraki komutunla **Dalga P0 / P1 / tek ekran** seçerek uygulamaya geçebiliriz.
