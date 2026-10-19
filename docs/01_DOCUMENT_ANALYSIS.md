# Aşama 1 — ERP Doküman Analizi

Kaynaklar:
- `gemini_erp_gecmisi.pdf` — Gemini sohbet geçmişi (görüntü tabanlı PDF; OCR ile okundu)
- `canias_modül_kitabı.pdf` — Canias ERP Modül Kitabı (134 sayfa; metin olarak çıkarıldı)

Analiz tarihi: 2026-10-10

---

## A. Dokümanların genel yapısı

### Gemini geçmişi (`gemini_erp_gecmisi.pdf`)
Bu doküman bir ürün kılavuzu değildir. Express + PostgreSQL ile başlanmış bir ERP backend öğrenme / geliştirme sohbetinin çıktısıdır.

İçerik özeti:
- `kisiler` tablosunda ad/soyad ayrımı
- Firma, iş yeri, stok, cari, fatura, kişi, sipariş modüllerinin route’lara eklenmesi
- Siparişte cari kodu / stok kodu ile otomatik alan doldurma isteği
- Git + GitHub bağlama adımları
- Sonraki aday modüller: irsaliye, finans/muhasebe, üretim (ürün ağacı, rota, üretim girişi)

### Canias Modül Kitabı
Satış / pazarlama odaklı modül kataloğudur. Ekran alanları, tablo şemaları veya kesin iş kuralı SQL’i vermez. Bunun yerine modül gruplarını, amaçlarını ve entegrasyon ilişkilerini anlatır.

Ana gruplar:
1. Ortak Modüller (CMN) — Temel Veriler, Ürün Ağaçları, Rotalar
2. Destekleyici Modüller — BPM, BI, doküman, EDI, e-dönüşüm vb.
3. Finansal Yönetim
4. E-Dönüşüm
5. İnsan Kaynakları
6. Lojistik — envanter, depo, MRP, satınalma, satış, sevkiyat, fatura kontrol
7. Proje ve Üretim Yönetimi

---

## B. ERP modülleri (Canias referansı)

| Grup | Modül | Kod | İlk sürüm için |
|------|-------|-----|----------------|
| Ortak | Temel Veriler | BAS | Evet (çekirdek) |
| Ortak | Ürün Ağaçları | BOM | Evet (üretim için) |
| Ortak | Rotalar | ROU | Kısmi (basit rota) |
| Lojistik | Envanter Yönetimi | INV | Evet (stok motoru) |
| Lojistik | Depo Yönetimi | WMS | Basit depo tanımı |
| Lojistik | Transfer Siparişi | TRO | Hayır (sonra) |
| Lojistik | Satınalma | PUR | Evet |
| Lojistik | Fatura Kontrol | VER | Kısmi (basit fatura) |
| Lojistik | Satış Yönetimi | SAL | Evet |
| Lojistik | Sevkiyat | SHM | Basit sevk (ithalat sevkiyatı değil) |
| Üretim | Üretim Planlama ve Kontrol | PRD | Evet (basit) |
| Finans | Genel Muhasebe / Finans | ACC/FIN | Hayır (v1 sonrası) |
| Destek | E-Fatura / E-İrsaliye | — | Hayır (v1 sonrası) |

---

## C. İş süreçleri (dokümandan çıkan çekirdek)

### Organizasyon
Firma / şirket → Tesis / iş yeri → Depo / stok yeri → Malzeme & cari ana verileri

### Satınalma (PUR + INV + VER)
Satınalma isteği → (teklif/anlaşma) → Satınalma siparişi → Onay → Mal girişi / stok hareketi → Fatura kontrol → Muhasebe

### Satış
Satış siparişi → (rezervasyon) → İrsaliye / sevk → Stok çıkışı → Fatura

### Üretim (BOM + ROU + PRD + INV)
Ürün ağacı + rota → Üretim emri → Hammadde tüketim hareketi → Operasyon/üretim onayı → Mamul stok giriş hareketi

### Stok motoru (INV)
Stok miktarı belikten değil; satınalma girişi, satış çıkışı, üretim tüketimi/girişi, transfer, sayım farkı gibi hareketlerden oluşur.

---

## D. Tanımlar (ana veriler)

Canias BAS’tan çıkan zorunlu / önemli tanımlar:
- Firma / şirket
- Tesis / iş yeri
- Depo / stok yeri
- Malzeme (stok kartı): tip, ölçü birimi, tedarik tipi (üretim/satınalma), durum
- Müşteri / tedarikçi (cari)
- İş merkezi (üretim için)
- Destek tabloları / parametreler (belge tipi, malzeme tipi vb.)
- Ölçü birimleri ve birim çevrimleri

---

## E. Belgeler

| Belge | Kaynak modül | İlk sürüm |
|-------|--------------|-----------|
| Satınalma siparişi | PUR | Evet |
| Mal kabul / depo girişi | INV/PUR | Evet |
| Satış siparişi | SAL | Evet |
| Sevk / irsaliye | SAL/INV | Evet |
| Fatura (satış) | SAL | Evet |
| Fatura kontrol (alış) | VER | Basit |
| Üretim emri | PRD | Evet |
| Üretim onayı / giriş | PRD | Evet |
| Ürün ağacı | BOM | Evet |
| Rota | ROU | Basit |
| Transfer emri | TRO | Hayır |
| Satınalma isteği / teklif | PUR | Hayır (sonra) |

---

## F. Stok hareketleri

Canias INV’ye göre hareket kaynakları:
- Satınalma siparişine bağlı giriş / iade
- Satış irsaliyesi / iade çıkışı
- Üretim emri hammadde tüketimi ve mamul girişi
- Depolar arası transfer
- Sayım / düzeltme
- Kalite, konsinye, fason vb. özel stok türleri (ilk sürümde yok)

Kritik kural (doküman + proje prensibi):
> Stok değişikliği için kayıt belgesi zorunluluğu vardır. Kullanıcı stok miktarını doğrudan düzenlememelidir.

---

## G. Cari hareketleri

Dokümanda cari hareketler muhasebe / finans entegrasyonu üzerinden anlatılır:
- Müşteri/tedarikçi ana verisi BAS’ta
- Ödeme ve banka bilgileri muhasebe bağlantısı için
- Fatura kontrol → Genel Muhasebe aktarımı

**Dokümanda açıkça belirtilmiyor:** bağımsız bir “cari hareket fişi” ekranının alan listesi.

**Sistem tasarımı açısından öneri:** İlk sürümde cari kart + belge tutarları yeterli; borç/alacak cari hareket motoru fatura sonrası aşamada eklensin.

---

## H. Üretim süreçleri

BOM:
- Mamul için hammadde / yarı mamul reçetesi
- Çok seviyeli ağaç, alternatifler, varyant (ileri seviye)

ROU:
- Operasyon sırası, iş merkezi, kaynak
- Bileşenlerin operasyona atanması

PRD:
- Üretim emri (miktar, BOM, rota kopyası)
- Eksik malzeme analizi (ileri)
- Üretim onayı → otomatik tüketim + mamul stok girişi

---

## I. Satın alma

Canias PUR akışı zengin: istek, teklif, anlaşma, ihale, fason, konsinye.

İlk sürüm için çekirdek:
1. Satınalma siparişi (tedarikçi cari)
2. Onay durumu
3. Depo / mal girişi
4. Stok hareketi
5. (İsteğe bağlı) basit alış faturası eşlemesi

---

## J. Satış

Canias satış tarafı: sipariş → irsaliye → fatura; rezervasyon ve stok entegrasyonu.

İlk sürüm için çekirdek:
1. Satış siparişi
2. Sevk (sipariş satırından kalan miktar takibi)
3. Depo çıkış stok hareketi
4. İrsaliye
5. Fatura (irsaliye / sipariş ilişkili)

---

## K. Fatura / irsaliye

- Satış irsaliyesi stok çıkışı ile ilişkili
- Satış faturası irsaliyeden veya siparişten türetilebilir
- Alış tarafında VER: sipariş fiyatı + mal giriş miktarı ile fatura kontrolü
- E-Fatura / E-İrsaliye Canias’ta ayrı e-dönüşüm modülleri; ilk sürüm dışı

---

## L. Kullanıcı / yetki

Canias BAS: merkezi yetkilendirme, kullanıcı/grup bazlı stok ve belge kısıtları.

Gemini geçmişindeki `kisiler` tablosu personel/kullanıcı proto tipidir (`ad`, `soyad`, `rol`).

İlk sürüm önerisi:
- Kullanıcı girişi ( basitleştirilmiş )
- Rol alanı (Admin / Kullanıcı)
- Gelişmiş menü/depo/firma yetkisi sonra

---

## M. Eksik veya belirsiz noktalar

Dokümanda açıkça belirtilmeyen / belirsiz kalanlar:

1. Kesin tablo/alan şeması yok (Canias katalog dokümanı).
2. Belge numaralandırma kuralları (seri/sıra) detaylandırılmamış.
3. KDV / vergi hesaplama alanları ürün kitabı seviyesinde yok.
4. Para birimi ve kur yönetimi ilk sürüm için netleştirilmedi.
5. Sipariş onay seviyeleri (tek onay mı, çok kademeli mi?) net değil.
6. Üretimde otomatik tüketimin zamanı (operasyon onayında mı, tek üretim girişinde mi?) netleştirilmeli.
7. Gemini geçmişinde “sipariş” hem alınan hem verilen için tek tablo; satın alma / satış ayrımı mimari karar gerektirir.
8. Mevcut kodda depo ve stok hareketi yok; bakiye doğrudan yönetilmiyor.
9. `db.js` içinde veritabanı şifresi kaynak koda gömülü — güvenlik riski (ortam değişkenine taşınmalı).

---

## Mevcut kod durumu (Gemini geçmişi ile uyumlu)

Repoda şu an var:
- Express API: `/firmalar`, `/is-yerleri`, `/stoklar`, `/cariler`, `/faturalar`, `/kisiler`, `/siparisler`
- PostgreSQL (`pg` Client)
- Master-detail örnekleri (stok, cari, fatura, sipariş)

Henüz yok / zayıf:
- Depo
- Stok hareket motoru
- Belge zinciri (sipariş → sevk → irsaliye → fatura)
- Üretim (BOM, rota, iş emri)
- Auth / JWT
- Frontend
- Migration sistemi
- Testler
- Docker
)
