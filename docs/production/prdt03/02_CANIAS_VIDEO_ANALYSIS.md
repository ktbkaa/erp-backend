# PRDT03 — Canias Video Analizi

Kaynak: https://www.youtube.com/watch?v=hguM2VVtOrE  
Başlık (envanter): **PRD 10370 : PRDT03 - Kolay İş Emri Onayı**  
Süre: **167 sn** · Video ID: `hguM2VVtOrE`

## Erişim durumu

| Yöntem | Sonuç |
|--------|--------|
| `yt-dlp` (altyazı / indir) | **Başarısız** — YouTube bot doğrulaması (“Sign in to confirm you’re not a bot”) |
| WebFetch sayfa | Yalnızca başlık + thumbnail URL; oynatma içeriği / altyazı yok |
| Repo envanteri | Başlık, süre, TX kodu, önceki “Kismi / Onay kısayolu” eşlemesi mevcut |

**Sonuç:** Piksel düzeyinde UI yerleşimi, kolon listesi, buton metinleri ve onay diyalogları bu ortamda video karesinden doğrulanamadı. Aşağıdaki “gözlemlenen” satırlar yalnızca **güvenilir metadata + repo eşlemesi + Canias PRDT03 ailesi bağlamı**dır; uydurma ekran alanı yazılmadı.

Altyazı / video dosyası sağlanırsa bu belge alan envanteri ile güncellenmelidir.

## Metadata’dan kesin bilgiler

| Öğe | Değer |
|-----|--------|
| TX | PRDT03 |
| Konu | Kolay İş Emri Onayı |
| Amaç (başlıktan) | İş emri onayını kolay/hızlı yönetmek |
| KTB önceki eşleme | Mevcut `Onayla` endpoint’ine kısmi karşılık |

## PRDT03 ailesi (aynı TX, farklı videolar)

Envanterde PRDT03 altında 10370 onay + 10380+ saha (başlat/bitir, iş merkezi, seri/parti) videoları var.  
**Bu geliştirmenin kapsamı yalnızca 10370 Kolay İş Emri Onayıdır.**  
Operasyon başlat/bitir ve üretim girişi ayrı ekranlarla (`uretim-girisleri`, `hizli-uretim-girisi`) ele alınmıştır; onay ile karıştırılmaz.

## Görüntüden doğrulanamayanlar (bilinçli boş)

- Üst toolbar buton etiketleri
- Liste kolonlarının kesin sırası
- Filtre alanlarının tam seti
- Onay öncesi dialog / checkbox metinleri
- Toplu seçim UI’sinin videoda olup olmadığı
- Hata/uyarı toast metinleri

## Canias gözlemi vs KTB önerisi (ayırım)

| Sınıf | İçerik |
|-------|--------|
| **Canias (başlık/metadata)** | PRDT03 kolay iş emri onayı TX’i |
| **Repo eşlemesi** | KTB’de onay kısayolu var, özel ekran yok |
| **KTB önerisi (tasarım)** | Onay adayı listesi, detay inceleme, tekli/toplu onay, audit alanları, onay≠üretim kuralı |

## Thumbnail

`https://i.ytimg.com/vi/hguM2VVtOrE/sddefault.jpg` — WebFetch metin-only; kare içeriği burada çözümlenemedi.
