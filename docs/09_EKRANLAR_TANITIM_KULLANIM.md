# KTB ERP — Ekranlar Tanıtımı, Kullanımı ve Fonksiyonları

Bu doküman, şu ana kadar yapılan arayüz ve fonksiyon çalışmalarının özetidir.  
Her geliştirme turunun sonunda bu dosya güncellenir.

- **Uygulama adresi:** `http://localhost:3000/`
- **Dal (güncel UI):** `cursor/erp-cari-stok-kart-4f63`
- **UI build işareti:** sol menü altında `UI build …` (doğru kod yüklü mü diye bakılır)
- **Cari/Stok eşleştirme:** `docs/10_CARI_STOK_ESLESTIRME.md`
- **UX standardı:** `docs/11_UX_DONT_MAKE_ME_THINK.md` (Don’t Make Me Think)

### Modül: Sabit Tanımlar
Tanım ekranları burada toplanır: **Numaratör Tanımı**, **Ölçü Birimleri**, **Kategori Tanımı**.

---

## 1) Genel kabuk (shell)

### 1.1 Sol menü

- Sol tarafta modül grupları ve ekran listesi vardır.
- Üstte **KTB ERP** markası: tıklanınca ana sayfaya döner.
- Menü varsayılan olarak açıktır; üstteki **☰** ile kapatılıp açılabilir.
- Ekrana menüden tıklayarak gidilir.

### 1.2 Ana sayfa

- Henüz ekran açılmamışken sağ alanda silik/kabartmalı **KTB** görünür.
- Üstte ekran arama kutusu vardır.
- Arama **en az 3 karakter** yazılınca çalışır; sonuçtan ekrana geçilebilir.

### 1.3 Liste ekranı düzeni

Bir ekran açıldığında sağ alanda:

1. **Yeşil şerit** — hangi ekranın açık olduğu
2. **Aksiyon çubuğu** — Yeni / İncele / Düzelt / Kopyala / Sil
3. **Filtre alanı** (üst ~%30)
4. **Liste alanı** (alt ~%70)

### 1.4 Üst belge sekmeleri

- Açılan listeler ve kartlar **üstte yan yana sekmeler** olarak durur.
- **Yeni / İncele / Düzelt / Kopyala** her biri ayrı form sekmesi açar; liste sekmesi yerinde kalır.
- Sekmeye tıklayınca geçiş yapılır; **×** ile o sekme kapanır.
- Formdaki **Liste sekmesi** düğmesi formu kapatmaz, liste sekmesine döner.

---

## 2) Ortak fonksiyonlar

### 2.1 Filtre

Her filtre satırında:

| Operatör | Anlamı |
|----------|--------|
| **Eşit** | Alan değeri tam eşleşir |
| **Eşit değil** | Alan değeri farklıdır |
| **Arasında** | Başlangıç–bitiş aralığı (iki değer) |

- **Uygula:** filtreyi listeye uygular  
- **Temizle:** filtreleri sıfırlar  

### 2.2 Kart aksiyonları

Listeden (gerekirse) satır seçilir, sonra:

| Aksiyon | Davranış |
|---------|----------|
| **Yeni** | Boş kart açar. Kod alanı ilgili **numaratörden** bir adım ilerletilerek gelir ve kilitlidir. |
| **İncele** | Kartı salt okunur açar; hiçbir alan değiştirilemez. |
| **Düzelt** | Karta girilir; **kod gibi disable alanlar** hariç diğer alanlar değiştirilebilir. |
| **Kopyala** | Seçili satırı kopyalar; **yeni kod** numaratörden alınır; **ad alanı boş** gelir; diğer alanlar dolu gelir. |
| **Sil** | Seçili kaydı siler (onay sorar). |

**Not:** Depo Bakiye ekranı hareket özeti olduğu için yalnızca **İncele** mantıklıdır; Yeni/Sil vb. kapalıdır.

### 2.3 Kart formu düzeni

**Klasik kartlar** (firma, depo, belgeler…):

- **Üst ~%20 — Master:** ana kart alanları  
- **Alt ~%80 — Detay:** detay alanları  
- “Satır ekle” yoktur; detay blokları önceden açıktır. Boş bloklar kayda yazılmaz.

**Tüm kart formları:**

- Form içinde **boydan sabit sol sekme menüsü** + sağ içerik.
- **Master sabit:** master alanlar yerinde kilitli; kaydırma yalnızca detayda.
- **Master / Detay** ayrımı: ana kimlik alanları master’da, diğerleri detayda (veya ilgili sekmede).
- **Sarı alanlar** = lookup; **\*** = zorunlu.
- **Yeni / İncele / Düzelt / Kopyala** üstte **ayrı belge sekmesi** olarak açılır (liste sekmesi kalır).
- Kapsamı netleşmeyen sekmeler kısa stub; sahte CRUD yoktur.
- Metinler kısa ve tarama dostu (Don’t Make Me Think).

### 2.4 Numaratör

- Sistem menüsünde **Numaratör Tanımı** ekranı vardır.
- Her seri bir ekrana bağlanabilir (`ekran_kodu` / `ekran_adi`).
- **Yeni** veya **Kopyala** açıldığında ilgili seri **+1** ilerler (takip için).
- Örnek kod formatı: `H00001`, `M00001`, `T00001`, `D00001` …

Detay: `docs/08_KOD_SISTEMI.md`

---

## 3) Modül ve ekran kataloğu

### 3.1 Sabit Tanımlar

#### Numaratör Tanımı
- **Amaç:** Kod serilerini tanımlamak / izlemek  
- **API:** `/kod-serileri`  
- **Master:** seri kodu, önek, açıklama  
- **Detay:** ekran kodu/adı, son numara, aktif  
- **Fonksiyonlar:** Yeni, İncele, Düzelt, Kopyala (seri silinmez; pasife alınır)

#### Ölçü Birimleri
- **API:** `/olcu-birimleri`  
- **Master:** birim kodu, birim adı

#### Kategori Tanımı
- **Amaç:** Stok kartı kategori lookup kaynağı (ABC / Marka / TeminSekli)  
- **API:** `/kategoriler`  
- **Kod serisi:** `KATEGORI` (`KT00001`…)  
- **Master:** kod, ad, tip  
- **Detay:** açıklama, aktif

---

### 3.2 Ana Veri

#### Firmalar
- **Amaç:** Firma kartları  
- **API:** `/firmalar`  
- **Kod serisi:** `FIRMA`  
- **Filtre:** firma kodu, firma adı  
- **Fonksiyonlar:** tam CRUD dörtlüsü + sil

#### İş Yerleri
- **Amaç:** Firmaya bağlı iş yerleri  
- **API:** `/is-yerleri`  
- **Kod serisi:** `ISYERI`  
- **Filtre:** firma, iş yeri kodu/adı  
- **Master:** kod, ad, firma ID, adres

#### Depolar
- **Amaç:** İş yeri altı depolar  
- **API:** `/depolar`  
- **Kod serisi:** `DEPO`  
- **Filtre:** firma, iş yeri, depo kodu/adı  
- **Master:** kod, ad, iş yeri ID, aktif, varsayılan

---

### 3.3 Stok

#### Stok Kartı
- **Amaç:** Hammadde / yarı mamul / mamul / ticari stok kartları  
- **API:** `/stoklar`  
- **Kod serisi:** tip’e göre `HAMMADDE` / `YARIMAMUL` / `MAMUL` / `TICARI`  
- **Filtre:** firma, iş yeri, stok kodu, stok adı  
- **Zorunlu:** stok kodu, stok adı, stok tipi  
- **Stok Kart:** master alanlar + detayda ülke menşei / temin şekli  
- **Kategoriler:** ABC, marka, temin şekli → `Kategori Tanımı` lookup (sarı)  
- **Diğer sekmeler:** Ölçü Bilgileri, Birim Tanımları, Stok Detay; stub: Barkod, Dil, MRP  
- **Kaldırıldı:** Alternatif Stok  
- **Alt kayıt:** `birim_tanimlari`, `stok_detaylari`  
- **Not:** Bakiye karttan elle değişmez  
- **Fonksiyonlar:** tam CRUD

#### Depo Bakiye
- **Amaç:** Depo–stok bakiyelerini izlemek (hareket sonucu)  
- **API:** `/stok-bakiyeleri`  
- **Filtre:** depo kodu, stok kodu/adı, tip  
- **Fonksiyonlar:** yalnızca **İncele** (bakiye doğrudan düzeltilmez)

---

### 3.4 Cari

#### Cari Kartları
- **Amaç:** Müşteri / tedarikçi kartları  
- **API:** `/cariler`  
- **Kod serisi:** türe göre `MUSTERI` / `TEDARIKCI` / `CARI_HERIKISI`  
- **İş kuralı:** satınalma → tedarikçi; satış → müşteri  
- **Filtre:** iş yeri, cari kodu/adı, tür  
- **Zorunlu:** cari kodu, cari adı, müşteri tipi  
- **Cari Kart master:** kod, ad, açıklama, müşteri tipi, VKN, adres 1  
- **Cari Kart detay:** iletişim, adres devamı, firma/iş yeri, vade…  
- **Diğer sekmeler:** Banka, Sevk, Genel, Dil; stub: Kategoriler, Ek Alanlar  
- **Kaldırıldı:** e-Uyum  
- **Lookup:** firma, iş yeri  
- **Alt kayıt:** `banka_bilgileri`, `sevk_adresleri`, `dil_tanimlari`  
- **Fonksiyonlar:** tam CRUD

---

### 3.5 Üretim

#### Ürün Ağacı
- **Amaç:** Mamul için çok seviyeli BOM (MM ← YM ← hammaddeler)  
- **API:** `/urun-agaclari`  
- **Kod serisi:** `URUN_AGACI`  
- **Filtre:** ağaç kodu/adı, stok kodu/adı  
- **Detay blokları:** bileşen stok ID, miktar, birim (önceden açık)

#### İş Merkezleri
- **Amaç:** Üretim iş merkezleri  
- **API:** `/is-merkezleri`  
- **Kod serisi:** `IS_MERKEZI`  
- **Filtre:** merkez kodu/adı, iş yeri

#### Rotalar
- **Amaç:** Operasyon sırası (ör. OP10 → OP20 → OP30)  
- **API:** `/rotalar`  
- **Kod serisi:** `ROTA`  
- **Detay blokları:** operasyon kodu/adı, süre

#### Üretim Emirleri
- **Amaç:** İş emri ve operasyon takibi  
- **API:** `/uretim-emirleri`  
- **Kod serisi:** `URETIM_EMRI`  
- **Filtre:** emir no, stok kodu, durum  
- **Detay blokları:** operasyon kodu/adı, durum

---

### 3.6 Satınalma

#### Satınalma Talepleri
- **Amaç:** İhtiyaç talebi  
- **API:** `/satin-alma-talepleri`  
- **Kod serisi:** `SATINALMA_TALEP` (`L…..`)  
- **Detay blokları:** stok ID, miktar, birim

#### Satınalma Siparişleri
- **Amaç:** Talebin tedarikçiye siparişe dönüşmesi  
- **API:** `/satin-alma-siparisleri`  
- **Kod serisi:** `SATINALMA_SIPARIS` (`P…..`)  
- **Kural:** yalnızca tedarikçi cariye açılır

#### Mal Kabuller
- **Amaç:** Siparişten depoya giriş  
- **API:** `/mal-kabuller`  
- **Kod serisi:** `MAL_KABUL` (`R…..`)  
- **Etki:** stok bakiyesi **yalnızca hareket** ile değişir

---

## 4) Tipik kullanım akışları

### 4.1 Ana veri hazırlığı
1. Firmalar → Yeni  
2. İş Yerleri → Yeni (firma ID)  
3. Depolar → Yeni (iş yeri ID; biri varsayılan Ana Depo)  
4. Numaratör Tanımı’ndan serilerin ekrana bağlı olduğunu kontrol et  

### 4.2 Stok + satınalma + üretim (özet)
1. Stok Kartı’nda hammaddeler / YM / mamul kartlarını aç  
2. Ürün Ağacı ve Rota tanımla  
3. Satınalma Talebi → Sipariş → Mal Kabul (Ana Depo)  
4. Üretim Emri ile operasyonları sırayla tamamla  
5. Depo Bakiye’den sonucu kontrol et  

Hazır senaryo komutu:

```bash
npm run demo:cycle
```

Detay: `docs/07_DEMO_CYCLE.md`

---

## 5) Çalıştırma hatırlatması

```powershell
npm install
npm run migrate
npm run demo:cycle   # isteğe bağlı örnek veri
npm start
```

- Health: `http://localhost:3000/health`  
- UI: `http://localhost:3000/`  
- Güncellemeden sonra: `git pull` + sunucuyu yeniden başlat + tarayıcıda **Ctrl+Shift+R**

---

## 6) Doküman güncelleme kuralı

Her çalışma turunun sonunda:

1. Bu dosyaya **yeni/değişen ekranlar** eklenir veya güncellenir.  
2. Yeni ortak fonksiyonlar (filtre, aksiyon, sekme vb.) ilgili bölüme işlenir.  
3. Kısa “ne değişti” notu gerektiğinde `CHANGELOG.md` ile uyumlu tutulur.

---

## 7) İlgili dokümanlar

| Dosya | Konu |
|-------|------|
| `docs/08_KOD_SISTEMI.md` | Kod / numaratör kuralları |
| `docs/07_DEMO_CYCLE.md` | Demo döngüsü |
| `docs/06_A1_INFRA.md` | Altyapı (env, pool, migrate) |
| `docs/04_DATA_MODEL.md` | Veri modeli |
| `ERP_RULES.md` | İş kuralları |
| `ARCHITECTURE.md` | Mimari özet |

---

*Son güncelleme: Yeni/İncele/Düzelt/Kopyala üstte yan belge sekmesi; liste sekmesi kalır; UI build 20261014d.*
