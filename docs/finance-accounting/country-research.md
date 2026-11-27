# Ülke muhasebe araştırması (TR / AZ / DE / NL)

Son güncelleme: 2026-10-23 (Europe/Istanbul). Kaynak doğrulama: `accounting-rules-sources.md`.

## 1. Türkiye (varsayılan ülke paketi)

### 1.1 Çerçeve
- **Tek Düzen Hesap Planı (TDHP)** ve Muhasebe Sistemi Uygulama Genel Tebliği (MSUT) uygulamaları, VUK kayıt düzeni ile birlikte işletilir.
- Büyük/halka açık işletmelerde **TFRS/TMS**; bağımsız denetime tabi orta boy için **BOBİ FRS**; küçük/mikro için **KÜMİ FRS** çerçeveleri uygulanabilir. Sistemde `raporlama_cercevesi` alanı ile ayrılır; aynı şirkette birden fazla paralel defter (ileride) desteklenebilir.
- Çift taraflı kayıt, yevmiye → kebir → mizan → bilanço / gelir tablosu zinciri zorunlu çekirdek.
- Kullanıcı GİB linki (`gib.gov.tr/.../teblig/10705`) 2026-10-23’te istemci hatası verdi → **MSUT madde metni bu oturumda doğrulanamadı**; TDHP seed “referans alt küme” olarak işaretli.

### 1.2 Hesap sınıfları (TDHP — özet)
| Sınıf | Anlam | Örnek |
|-------|-------|-------|
| 1 | Dönen varlıklar | 100 Kasa, 102 Bankalar, 120 Alıcılar, 150 Stoklar, 191 İndirilecek KDV |
| 2 | Duran varlıklar | 253 Tesis makine, 257 Birikmiş amortisman |
| 3 | Kısa vadeli yabancı kaynak | 320 Satıcılar, 360 Ödenecek vergi, 391 Hesaplanan KDV |
| 4 | Uzun vadeli yabancı kaynak | 400 Banka kredileri |
| 5 | Özkaynaklar | 500 Sermaye, 570 Geçmiş yıl kârları |
| 6 | Gelir tablosu hesapları | 600 Yurtiçi satışlar, 622 SMM, 770 GYG |
| 7 | Maliyet hesapları (7/A–7/B) | Üretim/maliyet dağıtımı |
| 8–9 | Nazım / serbest | İzleme |

Seed: migration `041` içindeki TR satırları — doğrulanmış alt küme; tam liste müşavir onayıyla genişletilir.

### 1.3 Vergi ve e-belge
- KDV: indirilecek (191) / hesaplanan (391); tevkifat, istisna, iade yapılandırılabilir vergi kodlarıyla.
- Oranlar `finans_vergi_oranlari` + geçerlilik tarihi (ör. KDV20 = %20, başlangıç 2018-01-01 yapılandırma kaydı).
- Kurumlar / geçici vergi / stopaj: dönem ve matrah raporlarına hazır veri; otomatik beyanname gönderimi **yok** (sertifika/API gerekli).
- e-Fatura / e-Arşiv / e-İrsaliye / e-Defter: mevcut ERP’de durum alanları var; GİB portal canlı gönderim bu fazda stub.

### 1.4 Dönem, döviz, dönem sonu
- Mali yıl genelde takvim yılı; `mali_yillar` / `muhasebe_donemleri` ile yönetilir.
- Kur farkı hesapları seed: 646 / 656; dönem sonu değerleme motoru sonraki fazda derinleştirilir.
- Sabit kıymet / amortisman hesap seed’i var; amortisman planı motoru bekliyor.
- Enflasyon düzeltmesi: araştırma notu; otomatik düzeltme motoru yok.

### 1.5 LioX / canias referansı (ürün, mevzuat değil)
- LioX: Muhasebe-Cari, Kasa-Banka, Çek-Senet, Nakit akış, Duran varlık, Bütçe, Mali tablolar, e-Defter.
- canias FIN: FINT01 hesap tipleri (Ana/Üst/Doğrudan), FINT02 belge, kayıt anahtarı, ters kayıt, dönem kapanış, yevmiye numaralama.

---

## 2. Azerbaycan

### 2.1 Çerçeve
- Mühasibat uçotu mevzuatı ve işletme büyüklüğüne göre yerel standartlar / IFRS seçenekleri.
- **Hesablar Planı** Türkiye TDHP ile aynı değildir; ayrı `hesap_plani_kodu = AZ_HP` paketi.
- Para birimi: **AZN**.

### 2.2 e-Vergi faturası
- Resmî sayfa: https://www.taxes.gov.az/en/page/elektron-qaime-faktura  
- **2026-10-23 erişim 504 Gateway Timeout** — şema/zorunluluk tekrar doğrulanacak.
- Entegrasyon stub: `ebelge_saglayici` / paket notu `taxes_az`. Canlı “gönderildi” simülasyonu yok.

### 2.3 Uygulama durumu
- Ülke satırı + para birimi + örnek hesap iskeleti seed edilir.
- Vergi kodları iskelet; oranlar yerel kaynakla genişletilecek.
- Canlı vergi gönderimi: **bekliyor**.

---

## 3. Almanya

### 3.1 HGB / GoB (doğrulandı)
- **HGB §238** (gesetze-im-internet, 2026-10-23):
  1. Her tüccar, ticari işlemlerini ve varlık durumunu GoB’ye göre defterlerde göstermek zorundadır.
  2. Defter, uzman üçüncü kişiye makul sürede işlemler ve işletme durumu hakkında genel bakış vermelidir.
  3. İşlemler oluşum ve sonuçlarıyla izlenebilir olmalıdır.
  4. Gönderilen ticari mektupların aslına uygun kopyası saklanmalıdır.
- GoBD (dijital): değiştirilemezlik, zamansal iz, erişilebilirlik — ERP’de kesinleşmiş fiş kilidi + audit log ile karşılanır (tam GoBD sertifikasyonu iddiası yok).

### 3.2 Hesap planı
- **SKR03 / SKR04**: Yaygın DATEV pratikleri; yasal tek zorunlu plan değildir.
- Sistemde `hesap_plani_kodu = SKR04` seçilebilir paket; örnek seed hesaplar iskelet.

### 3.3 USt / E-Rechnung (BMF FAQ, Stand März 2026 — doğrulandı)
- Wachstumschancengesetz ile §14 UStG; **01.01.2025** itibarıyla yurt içi B2B’de düzenli olarak E-Rechnung.
- E-Rechnung = yapılandırılmış elektronik format + elektronik işlenebilirlik (EN 16931 uyumlu; örn. XRechnung / uygun ZUGFeRD profilleri).
- Basit PDF 2025’ten sonra tek başına E-Rechnung sayılmaz → “sonstige Rechnung”.
- Geçiş hükümleri FAQ #11; B2C genelde kapsam dışı.
- İleride işlem bazlı Meldesystem planlanıyor; henüz bu ERP’de gönderim yok.
- Format/iletim teknik uygulama stub; “gönderildi” simülasyonu yok.

### 3.4 Para
- Fonksiyonel PB: **EUR**.

---

## 4. Hollanda

### 4.1 Kayıt zorunluluğu (doğrulandı)
- Belastingdienst: iyi bir administratie yasal zorunluluk; eksik kayıtta ispat yükü tersine dönebilir.
- Temel veriler (**basisgegevens**): büyük defter, borç/alacak, stok, alım-satım, bordro, üçüncü şahıs vergisi için önemli veriler.
- Saklama: **7 yıl** temel; **gayrimenkul 10 yıl**; **OSS 10 yıl**.
- Business.gov.nl: kasa, faturalar, banka ekstreleri, sözleşmeler, yazışmalar, yazılım/veri dosyaları kayıt kapsamındadır.
- Standart ulusal hesap planı yok; esnek COA (`NL_FLEX`) + yasal raporlama eşlemesi.

### 4.2 BTW / ICP
- BTW kodları, reverse charge, AB içi teslimat; ICP bildirimi için rapor verisi (gönderim stub).

### 4.3 Denetçi eşiği (Business.gov.nl — doğrulandı)
İki ardışık yılda üç kritere göre **2’si**: >50 çalışan, ciro €15M, bilanço toplamı €7.5M → kayıtlı muhasebeci (registeraccountant) zorunluluğu. Sistem bilgilendirme metni; otomatik yaptırım yok.

### 4.4 Para
- **EUR**.

---

## 5. Ortak mimari kararlar

1. Tek **muhasebe motoru** (borç=alacak, dönem kilidi, ters kayıt, idempotent kaynak belge).
2. Ülke paketleri: COA seed, vergi kodları, belge tipleri, rapor eşlemeleri.
3. Şirket `muhasebe_ulke_kodu` kalıcı; işlemde `islem_ulke_kodu` / `vergi_ulke_kodu` ayrı (geçici seçim ana ülkeyi değiştirmez).
4. Kesinleşmiş fiş satırları UPDATE edilmez; düzeltme = ters fiş.
5. Doğrulanmamış mevzuat kuralı “kesin kanun” olarak kodlanmaz.
