# Muhasebe / mevzuat kaynakları ve doğrulama durumu

Son güncelleme: 2026-10-23 (Europe/Istanbul).  
Kural: Doğrulanmamış oran/eşik kodda sabit “kanun” olarak gömülmez; `gecerlilik_baslangic` / `gecerlilik_bitis` alanlı yapılandırmada tutulur.

| # | Konu | Kaynak | Erişim / tarih | Doğrulama | Not |
|---|------|--------|----------------|-----------|-----|
| DE-HGB | HGB §238 Buchführungspflicht | https://www.gesetze-im-internet.de/hgb/__238.html | 2026-10-23 okundu | Doğrulandı | Her tüccar defter tutar; üçüncü uzman makul sürede işlemleri/varlık durumunu anlayabilmeli; işlemler izlenebilir olmalı; ticari mektup kopyası saklama |
| DE-ERECH | Zorunlu E-Rechnung (B2B, 2025+) | https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html | Stand: März 2026; sayfa tarihi 23.03.2026; okuma 2026-10-23 | Doğrulandı | 01.01.2025+ yapılandırılmış elektronik format (EN 16931); basit PDF = “sonstige Rechnung”; geçiş kuralları FAQ #11; Meldesystem henüz yasal olarak sonraki adım |
| NL-BD | Belastingdienst — administratie | https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/ondernemen/administratie/ | 2026-10-23 | Doğrulandı | Temel veriler 7 yıl; gayrimenkul 10 yıl; OSS 10 yıl; büyük defter, borç/alacak, stok, alım-satım, kasa, bordro |
| NL-BG | Business.gov.nl — records | https://business.gov.nl/running-your-business/administration/how-to-keep-business-records/ | 2026-10-23 | Doğrulandı | Zorunlu kayıt türleri; 7/10 yıl; denetçi eşiği: 2 ardışık yılda 3 kritere göre 2’si (>50 çalışan, €15M ciro, €7.5M bilanço) |
| AZ-EQ | e-qaimə-faktura | https://www.taxes.gov.az/en/page/elektron-qaime-faktura | 2026-10-23 **504** | Beklemede | Tekrar denenecek; canlı gönderim entegrasyonu yok |
| TR-GIB | GİB tebliğ (kullanıcı linki) | https://gib.gov.tr/mevzuat/kanun/444/teblig/10705 | 2026-10-23 istemci tarafı hata | Beklemede | Path şüpheli / sayfa render hatası; MSUT/TDHP için resmi GİB mevzuat ağacından teyit gerekli |
| TR-TDHP | Tek Düzen Hesap Planı / MSUT | GİB / Resmî Gazete — Muhasebe Sistemi Uygulama Genel Tebliği | Seed kodlar sektör pratiği + mevcut ERP seed | Kısmi | Seed “referans TDHP alt kümesi”; tam resmi liste kullanıcı/müşavir onayıyla genişletilir |
| REF-UYUM | LioX ERP Finans (Uyumsoft) | Yüklenen HTML (`uploads/LioX_ERP_…`) | 2026-10-23 | Ürün referansı | Muhasebe-cari, kasa-banka, çek-senet, nakit akış, duran varlık, bütçe, mali tablolar, e-defter — yasal kaynak değil |
| REF-CANIAS | canias FIN playlist | docs/canias_youtube/FIN_videos.tsv + @caniasofficial | Mevcut | Ürün referansı | FINT01 hesap planı; FINT02 belge; yevmiye/kebir; dönem kapanış |

## Açık sorular

1. AZ e-qaimə zorunluluk kapsamı ve API şeması (sayfa erişilemedi).
2. TR e-Defter GİB berat/XML şema sürümü ve sertifika yolu (entegrasyon stub).
3. DE SKR03/SKR04 — DATEV sektör pratiği; yasal zorunlu hesap planı değil.
4. NL standart hesap planı yok; raporlama BW2 büyüklük sınıflarına göre.
5. TR VUK saklama sürelerinin güncel maddeleri (ayrı resmi teyit).

## Uygulama ilkesi

- Resmî gönderim (e-Defter, e-Beyanname, DE Meldesystem, AZ e-qaimə) için sertifika/API yoksa özellik **hazırlık arayüzü** olarak işaretlenir; “gönderildi” simülasyonu yapılmaz.
- Vergi oranları `finans_vergi_oranlari` tablosunda tarih aralığıyla tutulur.
- Doğrulanmamış eşik/oran “kanun sabiti” olarak dağıtılmaz.
