# Canias PRJ Video Analizi

**Durum:** KISMI — tam PRJ playlist henüz sağlanmadı  
**Kural:** Videoda görülmeyen özellik “Canias’ta kesin var” sayılmaz.  
**Sınıflar:** `Gözlemlendi` | `Çıkarıldı` | `ERP önerisi` | `Araştırma`

---

## 0. Video paketi durumu

| Kaynak | Bulgu |
|--------|--------|
| `docs/canias_youtube/inventory_all.json` | Modül playlist’leri: BAS/BOM/FIN/PRD/PUR/SYS… — **ayrı `PRJ` playlist yok** |
| Kullanıcı beyanı | Canias PRJ eğitim videoları **sağlanacak** |
| Aşama kapısı | Videoların tamamı işlenmeden **PRJ koduna geçilmez** (`00_…` G1) |

Videolar geldiğinde her biri için şablon (§4) doldurulacak; bu dosya güncellenecek.

---

## 1. Mevcut Canias envanterinde “proje” geçen kanıtlar

Bunlar **tam PRJ modülü videoları değildir**; ERP’de proje boyutunun nasıl kullanıldığına dair ön kanıt.

### 1.1 BAST20 — Proje Oluşturma (PRD/BAS playlist)

| Alan | Değer |
|------|--------|
| Video | `PRD,BAS 10211 : BAST20 - Proje Oluşturma` |
| YouTube | https://www.youtube.com/watch?v=Y-L8hdAImQM |
| Playlist | `PLItkgPiGskZy0NHWsz2Fj1wYMy6rVRLOK` (PRD_BAS) |
| TX | BAST20 (konfigüratör ailesi) |
| KTB eşleme (`15_*`) | **Yapilmadi** / Faz 2 — “Konfigüratör şablonu” |

**Ön sınıflandırma (video bu turda frame-by-frame izlenmedi — envanter/CSV):**

| Bulgu | Sınıf | Not |
|-------|--------|-----|
| BAST20 akışında “Proje Oluşturma” adımı var | `Çıkarıldı` | Aynı seride şablon → teklif → malzeme → BOM → rota → **proje** → fiyatlama |
| Proje, konfigüratör çıktısı olarak oluşuyor olabilir | `Çıkarıldı` | Klasik WBS/PM ekranı olduğu doğrulanmadı |
| Alan listesi / zorunluluklar | `Araştırma` | Video gelince veya bu URL izlenince doldurulacak |

**Uyarı:** BAST20 “Proje Oluşturma”, Canias **PRJ** modülünün tamamı yerine **konfigüratörden proje üretme** olabilir. Ayrı PRJ playlist ile karıştırılmamalı.

### 1.2 FINT62 — Projeye göre gruplanmış mizan

| Alan | Değer |
|------|--------|
| Video | `FIN 10481 : FINT62 - Projeye göre gruplanmış mizan raporu` |
| YouTube | https://www.youtube.com/watch?v=jHBOTCoauJw |
| KTB | Mizan var; proje boyutlu mizan **Kismi / Yapilmadi** bandında |

| Bulgu | Sınıf |
|-------|--------|
| Muhasebe belgelerinde proje boyutu ile mizan gruplanabiliyor | `Çıkarıldı` (başlık + gap CSV) |
| KTB’de YE satırlarında `project_code` zaten var → PRJ master sonrası FINT62 benzeri rapor doğal entegrasyon | `ERP önerisi` |

### 1.3 FIN 10580 — Hesap planına göre proje kontrolü

| Alan | Değer |
|------|--------|
| Video | `FIN 10580 : Muhasebe belgelerinde, hesap planı ayarlarına göre proje kontrolü` |
| YouTube | https://www.youtube.com/watch?v=eX1BAnWvY2E |
| KTB eşleme | **Yapilmadi** |

| Bulgu | Sınıf |
|-------|--------|
| Bazı hesaplarda proje zorunlu / kontrollü olabilir | `Çıkarıldı` |
| PRJ + COA bayrağı ile belge kaydında validasyon | `ERP önerisi` / `Araştırma` |

### 1.4 Modül kitabı / referans metin

- `docs/01_DOCUMENT_ANALYSIS.md`: “Proje ve Üretim Yönetimi” grup başlığı — v1 kapsamında derin PRJ yok.
- `docs/canias_ref/SALT01_PUR_INV_EGITIM_ANALIZ.md`: PRJ, CRM→…→FIN zincirinde adı geçen modüller listesinde.
- `docs/screen-naming-standard.md`: `PRJ` kodu rezerve.

---

## 2. Canias’tan beklenen PRJ fonksiyon kümeleri (hipotez — video ile doğrulanacak)

Aşağıdakiler **ERP önerisi / Araştırma**; video paketi gelince her satır `Gözlemlendi` veya düşürülecek.

| Küme | Beklenen içerik | Video doğrulama |
|------|-----------------|-----------------|
| Proje kartı | Kod, ad, müşteri, tarih, durum, bütçe | Bekliyor |
| WBS / faz / aktivite | Hiyerarşik plan | Bekliyor |
| Kaynak | Personel/makine atama | Bekliyor |
| Maliyet toplama | PUR/INV/PRD/FIN’den proje boyutu | FINT62 ile kısmen destekleniyor |
| Zaman / ilerleme | % veya süre | Bekliyor |
| Belge bağları | Sipariş, WO, fatura | `project_code` KTB’de kısmi hazır |

---

## 3. KTB’ye taşıma ilkeleri (Canias tarafı)

1. Canias ekran adlarını (BAST20, FINT62…) birebir UI etiketi yapma; `PRJ-…-SCR-NNN` + Türkçe menü.
2. Konfigüratör (BAST20) ile PM (PRJ) **ayrı** ürün kesitleri; ilki üretim/teklif, ikincisi program/proje yönetimi.
3. Finansal proje boyutu Canias’taki gibi zorunlu hesap kontrolü → KTB COA / belge validasyonu (Aşama 5–6).
4. Gap CSV’deki “Yapilmadi” maddeleri PRJ backlog’una **doğrudan kopyalanmaz**; video kanıtı sonrası alınır.

---

## 4. Video analiz şablonu (her video için)

```markdown
### V-NNN — <başlık>
- URL / süre / tarih:
- Ekran adı ve amacı:
- Alanlar (ad, tip, zorunlu, lookup kaynağı):
- Butonlar ve işlevler:
- Liste/filtre/sıralama:
- CRUD / kopyalama:
- Durum / iş akışı:
- Otomatik hesaplar:
- Yetki / onay:
- Diğer modül bağları:
- Arka plan iş kuralı çıkarımı:
- Sınıf etiketleri: Gözlemlendi / Çıkarıldı / ERP önerisi / Araştırma
```

---

## 5. Açık aksiyon

Kullanıcıdan beklenen: Canias **PRJ** eğitim video seti (dosya, playlist URL veya sıralı link listesi).  
Alındığında bu dosya video-video doldurulur; `00_…` kapısı **G1** kapanır.
