# Canias SAL / PUR / INV Eğitim Analizi (SALT01–PURT–INVT)

Kaynak: `/tmp/wetransfer/text/` eğitim OCR metinleri + ince dokümanlarda `/tmp/wetransfer/pages/<stem>/` ekran görselleri.  
Tarih: 2026-10-19. Dil: Türkçe, yoğun özet.

---

## Ortak mimari notu — SALT01 tek işlem

**SALT01 = Satış Belgeleri Yönetimi** tek uygulamadır. Teklif, sipariş, irsaliye ve fatura **ayrı tx değil**; aynı ekran + **Belge Tipi** ile ayrılır.

| Katman | Desen |
|--------|--------|
| Anahtar (create sonrası kilit) | Firma + İş Alanı + Belge Tipi + Belge No + Müşteri |
| Başlık | Cari varsayılanları (adres, dil, para, KDV anahtarı, satış bölümü); Teklif/Sipariş/İrsaliye/Fatura karakter bayrakları |
| Kalem | Malzeme/hizmet satırı: kalem no, tip, tesis, depo, miktar, birim(ler), fiyat, indirim/artırım, planlanan teslim & üretim tarihi |
| Referans zinciri | Kaynak belge seç → **Yeni** → (gerekirse Belge Tipi değiştir) → kalemler kopyalanır → Kaydet |
| Belge Statü | **Açık** (referans yok) → **Kısmen Açık** → **Kapalı** (tamamı referanslandı); soft-delete: **Silindi** |
| Kalem miktar izi | Sipariş / İrsaliyelenmiş / Faturalanmış / Açık / Rezerve / Gönderilmiş / İade |

Akış: **Teklif → (revizyon) → Sipariş → İrsaliye → Fatura** (veya siparişten doğrudan fatura / açık kalemlerden toplama).

---

## 1) `SALT01_-_Teklif_ve_Sipariş.txt`

### Amaç
SAL.101.T — satış belgesi omurgasını ve **teklif + normal sipariş** CRUD/referans/revizyon süreçlerini öğretmek. SALT01 başlık–kalem–sekme modeli tüm sonraki belge tiplerinin şablonudur.

### Kullanım akışı
1. SALT01 aç → **Yeni** → Firma / İş Alanı / Belge Tipi / Müşteri → Onay.  
2. Genel sekmede malzeme ekle (zoom / Insert / Hızlı Kalem / ürün seti / barkod / satır böl). Fiyat: önce fiyat politikası, yoksa BAST03 satış fiyatı.  
3. İsteğe bağlı: Koşullar, Mal/Fatura Alıcısı, Ödeme Planı; kalem **Detay**.  
4. **Kaydet**; listede Ara / Yazdır / Göster / Değiştir.  
5. **Tekliften teklif / tekliften sipariş / siparişten sipariş**: kaynak seç → Yeni → “Referans ile oluştur?” → Belge Tipi gerekirse değişir → Kaydet.  
6. **Revizyon**: Yeni + **Revizyon?** + Revizyon Tipi/Sebebi; ağaç görünüm SALT31.  
7. Silme = **Silindi** işaretle (fiziksel silme yok); geri alma = işareti kaldır.

### Alanlar / sekmeler
- **Başlık:** Firma, İş Alanı, Belge Tipi/No, Müşteri, isim/adres/telefon, dil, para, geçerlilik, kur tarihi/kur, satış bölümü; Silindi, Yazdırıldı, Durduruldu, Muhasebeleştir, Onay (Yok/Eksik/Tamam), Statü (Açık/Kısmen/Kapalı), Detay Statüsü; belge KDV; Brüt / İndirim / Alt Toplam / Belge KDV / Genel Toplam.  
- **Genel (kalem grid):** kalem no, tip, tesis, depo, malzeme+açıklama, miktar, birim, 2. birim, fiyat, indirim/artırım, teslim/üretim tarihi; **ATP Hesapla**.  
- **Fonksiyonlar:** Seçenekler, Kampanyalar, Teklif Hesapla, Termin, Rezervasyon, Proje, Malzeme Öneri (SALT10), Seri, Konteyner, Stok.  
- **Koşullar:** Nakliye / Finans / Müşteri / Satınalma blokları.  
- **Mal/Fatura Alıcısı:** sol mal alıcı, sağ fatura alıcı (adres, PK, vergi, dil, para…).  
- **Ödeme Planı:** ödeme koşulu (cari varsayılan, örn. Peşin 10 → taksit 11).  
- **Kalem Detay:** Genel (miktar/fiyat/KDV/tolerans/kısmi referans), Statü (referans + miktar izleri), Belge Takibi (proje, üretim planı, maliyet merkezi, müşteri sipariş no…), Komisyoncu, Notlar, Ek Belgeler.

### Bağlantılar
CRM (aday), BAS/BAST03, CAL (fiyat/kar), INV/MRP/PRD/BOM, FIN, PUR, VER, BPM, DOC, EDI/e-dönüşüm, CLB, IMP/EXP, BUD, AST, SRV, PRJ, BAS konfigüratör; SALT10, SALT31.

### UX mesajı
Tek shell; belge tipi = süreç adımı. Ana veri varsayılanları + zoom. Soft-delete + Statü/Onay bayrakları. Referans = tip değiştirip kalem taşıma. Göster = Kaydet pasif.

### KTB ERP öğrenimleri
- **Tek satış belgesi tx** (teklif/sipariş/irsaliye/fatura aynı form; tip alanı).  
- Header/line + soft-delete + Açık/Kısmi/Kapalı.  
- Kalemde sipariş→irsaliye→fatura miktar izi.  
- Referans oluşturma ve açık kalemlerden toplama.  
- Tolerans + otomatik kapama; mal/fatura alıcı ayrımı; ödeme planı cariden.

---

## 2) `SALT01_-_İrsaliye.txt`

### Amaç
Aynı SALT01 içinde **irsaliye** belge tipi: manuel, otomatik mal çıkışlı, siparişten/irsaliyeden referans; düzenleme/silme/liste/görüntüleme.

### Kullanım akışı
1. Yeni → Firma/İş Alanı/**İrsaliye tipi**/Müşteri → malzeme → Kaydet.  
2. **Otomatik mal çıkışlı:** miktar + Kaydet → sistem **stok hareketi mesajı** verir (INV entegrasyonu).  
3. Siparişten: sipariş seç → Yeni → Belge Tipi=irsaliye → kalemler gelir → Kaydet (kaynak sipariş kısmen/tam kapanır).  
4. İrsaliyeden irsaliye: miktar ayarlanabilir kısmi sevkiyat.  
5. Soft-delete / Ara filtreleri (Döküman Tipi, Malzeme, Satış Departmanı, Sorgula+).

### Alanlar / sekmeler
Teklif/sipariş ile aynı SALT01 sekmeleri; kritik fark: belge tipi irsaliye + otomatik çıkışta stok etkisi. Başlıkta İrsaliye karakteri; kalemde depo/tesis zorunlu pratik.

### Bağlantılar
SALT01 sipariş (referans); **INV** (manuel INVT01 çıkış veya otomatik çıkış); sonraki fatura; seri/parti/paketleme.

### UX mesajı
“İrsaliye” ayrı menü değil — tip seçimi. Otomatik çıkışta kayıt anında stok feedback’i. Kısmi sevk = referans + miktar + Statü Kısmen Açık.

### KTB ERP öğrenimleri
- Sevk = satış belgesi tipi; stok çıkış opsiyonel (manuel INV vs otomatik).  
- Sipariş→irsaliye zinciri ve kısmi miktar.  
- Soft-delete ve tip filtreli liste.

---

## 3) `SALT01_-_Fatura.txt`

### Amaç
SALT01 **fatura** tipi: doğrudan, irsaliyeden, siparişten, açık kalemlerden, ön ödemeli siparişten, faturadan fatura, **proforma**; CRUD.

### Kullanım akışı
1. Yeni → fatura tipi → kalem → Kaydet / yazdır.  
2. İrsaliye veya sipariş seç → Yeni → Belge Tipi=fatura → kalem aktarımı.  
3. **Açık Kalemler** sekmesi → Ara → seç → Kopyala → Genel’e düşer.  
4. Ön ödemeli: siparişten + **Ön Ödeme Yüzdesi** → miktar/tutar oranlanır.  
5. **Proforma:** bilgi amaçlı taslak; **Muhasebeleştir pasif**.  
6. Soft-delete; Göster’de Kaydet pasif.

### Alanlar / sekmeler
Aynı omurga + Açık Kalemler; başlıkta Muhasebeleştir; proformada muhasebe kapalı. Ödeme Planı / Mal-Fatura Alıcısı fatura için kritik.

### Bağlantılar
İrsaliye/sipariş (referans miktarları); **FIN** muhasebeleştirme; INV (irsaliye üzerinden stok zaten çıkmış olabilir); e-fatura/EDI bağlamı.

### UX mesajı
Faturalama yolları çeşitlenir ama shell aynı. Proforma = muhasebesiz önizleme. Açık kalemler = çok belgeden toplu fatura. Ön ödeme yüzdesi = miktar ölçekleme.

### KTB ERP öğrenimleri
- Fatura da aynı satış belgesi kaydı.  
- Zincir: sipariş→irsaliye→fatura **veya** sipariş→fatura.  
- Proforma vs mali fatura ayrımı.  
- Açık kalem toplama + ön ödeme oranı.

---

## 4) `PURT04_ve_PURT05.txt`

### Amaç
PUR.101.T — **PURT04 Satınalma İstekleri** ve **PURT05 Satınalma Siparişleri**; PUR+VER modül bağlamı (istek→sipariş; fatura VER’de).

### Kullanım akışı — PURT04
1. Yeni → Firma / Tesis / İstek Tipi + malzeme satırı; isteğe **Başlatılmış**.  
2. Kaydet → sistem **İstek No + İç Sipariş No** gösterir.  
3. Detay: Genel / Belge Takibi / Ek Belgeler.  
4. **PURT12** ile toplu/tekil **Başlat** (başlatılmadan sipariş/teklif/anlaşmaya dönüşmez).  
5. Toplu Değişiklik; soft-delete **Silinmiş**.

### Kullanım akışı — PURT05
1. Yeni → Firma / Sipariş Tipi / İş Alanı / Tedarikçi → Onay.  
2. Kalemler + sekmeler; Kaydet → **Başlatıldı** (imza yoksa otomatik).  
3. İsteklerden: **Ekleme → Satınalma İsteklerinden** (yalnız başlatılmış) → tip “Normal Sipariş” (IASPUR002) → kalemlerde İstek No.  
4. Normal sipariş: manuel malzeme + tedarikçi önerileri. Soft-delete.

### Alanlar / sekmeler
**PURT04 başlık/detay:** Firma, Tesis, İstek Tipi, İstek/Kalem No, Satınalma Departmanı (BAST03), Öncelik, Başlatılmış, Malzeme verisi var mı; Genel: Planlamacı, Sipariş Tipi, Kalem Tipi, Depo, miktar, sipariş miktarı, iş planı tarihleri; Belge Takibi; Ek Belgeler.

**PURT05 başlık statüleri:** İmza (Yok/Eksik/Tamam), Teslimat (Hiç/Kısmi/Kapalı), Fatura (Hiç/Kısmi/Kapalı), Bütçe Onayı; Başlatıldı; Teslimatı Kapalı; Fatura Doğrulamasına Kapalı; Yazdırılmış; Silinmiş.

**PURT05 sekmeler:** Kalemler, Genel, Tedarikçi, Koşullar (+ sipariş masrafları/dağıt), Faturayı Gönderen, Malı Gönderen, Açıklama (IASPUR004), İndirimler, Temel Para Birimi, Ödeme Planı, Yazdırma, Ek Belgeler.

**Kalem detay:** Genel, İndirim, Fiyat Listesi, Koşullar, Statüler (stoğa giren/iade + faturalanan), Belge Takibi, Termin, Gelişim, Nakliye, Parçalar (fason), Ek Belgeler, Maliyet Merkezi Dağıtımı.

### Bağlantılar
INV (mal girişi), VER (fatura), BUD, IMP; BAST02/03, BAST01 (IASPUR002/004); satış siparişi / iş emri (Belge Takibi).

### UX mesajı
İstek ≠ sipariş: **Başlat** kapısı. Siparişte paralel statü şeritleri (imza/teslimat/fatura). Tedarikçi–mal gönderen–fatura gönderen ayrımı. Masraf dağıt butonu.

### KTB ERP öğrenimleri
- PR→PO iki tx (PURT04/05); satıştaki tek-tx modelinden farklı.  
- Başlatılmadan dönüşüm yok.  
- Teslimat/Fatura Hiç–Kısmi–Kapalı + elle kapama bayrakları.  
- İstek No satırda izlenir; soft-delete.

---

## 5) `INVT01_-_VERT01.txt`

### Amaç
PUR eğitiminden **PO’ya bağlı stok girişi (INVT01)** + hizmet onayı (PURT44) + **VERT01 Fatura Kontrol** normal fatura yaşam döngüsü.

### Kullanım akışı — INVT01 giriş
1. INVT01 → Stok Hareket Seçimi: **Giriş + Satınalma siparişi** → Firma/Tesis/… + Belge Tipi/No → Onay.  
2. Satırlar gelir; **İrsaliye No zorunlu**; açıklama/taşıyıcı.  
3. Parti / seri / satır böl / konteyner / varyant / doküman / detay.  
4. Kaydet → satınalma stok giriş hareketi; PO Teslimat statüsü güncellenir.

### Kullanım akışı — VERT01
1. Yeni → Firma/İş Alanı/Fat.Tip (IASFIN010, örn. Yurt İçi)/Tedarikçi → Onay.  
2. **Kopyala** → Fatura Kalemleri Arama: stoklu PO için **Envantere Göre Arama**; hizmette işaret kapalı → Kontrol.  
3. Başlık: Kayıt/Belge/Kur tarihi, Muhasebe Anahtarı, harici Fatura No, Toplam/KDV; sipariş indirimleri; KDV kalemden vs toplam.  
4. Sekmeler: Genel, Ek Masraflar (+ dağıt), Ödeme/Banka, Ödeme Planı, Ek Belgeler; kalem detay.  
5. Kaydet; isteğe Muhasebeleştir / Muhasebe Belgesini Göster.  
6. Silme: **fiziksel silme**, yalnızca muhasebesiz; muhasebeli uyarı. Düzenleme muhasebesizde; miktar PO+stok üstünü aşamaz.

### Alanlar / sekmeler
INVT01: hareket yönü+belge bağlacı, kısayollar; satır araçları.  
VERT01: başlık tutar/kontrol alanları; Muhasebeleştir; Kopyala/Gelişim/İthalat B./Güncelle; liste filtreleri (firma, tip, muhasebe durumu, irsaliye no, tedarikçi, proje…); ağaç görünüm.

### Bağlantılar
PURT05 ↔ INVT01 ↔ VERT01 ↔ FIN; hizmette PURT44; IMP ithalat atama; BAST02 ödeme/banka.

### UX mesajı
Mal: önce stok girişi, fatura “envantere göre”. Hizmet: stoksuz onay (PURT44) sonra fatura. Faturada kağıt toplam vs sistem — tutarsızlıkta kayıt engeli. Soft-delete yok (VER’de hard delete + muhasebe kilidi).

### KTB ERP öğrenimleri
- 3-way: PO – mal girişi – fatura kontrol.  
- INVT01 belge-bağlı hareket motoru.  
- VERT01 ayrı tx; muhasebe kapısı.  
- Stoklu vs hizmet arama ayrımı.

---

## 6) `INVT01_-_İrsaliye_Çıkış.txt` (+ sayfa PNG)

### Amaç
INV.101.T §5.1 — satış **irsaliyesine bağlı stok çıkışı** (manuel/otomatik bağlam). Metin kısa; UI detayı ekran görsellerinden.

### Kullanım akışı (metin + PNG)
1. INVT01 → Firma/Tesis/Depo; Stok Hareket Seçimi: **Çıkış + İrsaliye**; Hareket Kodu örn. **101 – İrsaliye Çıkışı (Kullanılabilir Stok)**; Belge Tipi/No (örn. AS 00000529); tarihler; isteğe Paketleme? → Onay.  
2. Ekran “İrsaliye ile Malzeme Çıkışı”: satırlar (malzeme, depo, miktar, 2. birim); Konteyner/Parti/Seri/Varyant/Doküman/Detay/Sil.  
3. Kaydet → bilgi: **“Stok hareket belgesi … oluşturuldu!”** (örn. T INV 06 Info → 11 20 00000084).

Kapsam notu (eğitim): iade, konteyner, kiralama, nakliye/paketleme, konsinye transfer de “Satış Hareketleri” altında.

### Alanlar / sekmeler
Hareket Bilgileri: Firma, Tesis, Depo, Özel Stok Tipi, Hareket Kodu, Belge/Gönderim/Fiili Tarih.  
Seçim: Çıkış | İrsaliye. Diğer: Belge Tipi/No. Satır: stok kodu, malzeme, miktar, birimler, rezervasyon vb. bayraklar.

### Bağlantılar
SALT01 irsaliye (kaynak); stok hareket belgesi (çıktı); parti/seri/konteyner; SALT01’deki otomatik çıkışın manuel karşılığı.

### UX mesajı
Önce yön+belge bağlacı, sonra satır. Başarı = yeni stok hareket numarası. Kısayollar tekrarlayan hareketler için.

### KTB ERP öğrenimleri
- Satış irsaliyesi belgesi ≠ stok hareketi; INVT01 köprü.  
- Hareket kodu + kullanılabilir stok.  
- Otomatik (SALT01 kayıt) vs manuel (INVT01) aynı iş kuralı ailesi.

---

## 7) `INVT01_-_İş_Emri_Giriş.txt`

### Amaç
Üretim emrine bağlı **stok girişi** (mamul/yan ürün) ve otomatik emiş ile bileşen çıkışı; INV konsept özeti + §6.1.

### Kullanım akışı
1. INVT01 → **Giriş + İş Emri** (+ isteğe Proje) → belge tip/no → Onay.  
2. Kaydet: **Ürün/Yan Ürün** işaretli satır → stoğa giriş; **Otomatik Emiş** işaretli → stoktan çıkış.  
3. Sistem **Stok Hareket Belgesi** üretir. Araçlar: stok detay önizleme, konteyner, parti, seri, varyant, detay, sil.

### Alanlar / sekmeler
Hareket seçimi Giriş|İş Emri; Proje bayrağı; satırda Ürün / Yan Ürün / Otomatik Emiş.

### Bağlantılar
PRD iş emri, BOM (emiş), INV stok, kalite/parti, maliyet.

### UX mesajı
Tek kayıtta mamul giriş + bileşen tüketim (emiş). Satır bayrakları hangi tarafın hareket edeceğini belirler.

### KTB ERP öğrenimleri
- Üretim stok etkisi INVT01 + iş emri referansı.  
- Backflush = Otomatik Emiş.  
- Yan ürün ayrı giriş satırı.

---

## 8) `INVT01_-_İş_Emri_Çıkış.txt`

### Amaç
İş emrine / projeye bağlı **manuel hammadde çıkışı** (§6.2); konsept metni giriş dosyasıyla ortak.

### Kullanım akışı
1. INVT01 → **Çıkış + İş Emri/Proje** → Belge No; isteğe Operasyonel çıkış; Kısayollar → Onay.  
2. Yalnızca **stok tipi Yok olmayan** (çıkışa uygun) kalemler listelenir → Kaydet = manuel çıkış.  
3. Aynı satır araçları (parti/seri/konteyner/varyant…).

### Alanlar / sekmeler
Çıkış|İş Emri; Proje; Operasyonel çıkış; stok tipi filtresi.

### Bağlantılar
PRD (iş emri/operasyon), INV, proje; girişteki otomatik emişin manuel alternatifi.

### UX mesajı
Liste ön-filtrelenir (çıkarılamayan kalem gelmez). Operasyonel çıkış = operasyona bağlı tüketim.

### KTB ERP öğrenimleri
- Tüketim: otomatik emiş (giriş anı) **veya** ayrı çıkış tx.  
- Operasyon bazlı çıkış seçeneği.  
- Aynı INVT01 kabuğu; bağlaç değişir.

---

## 9) `INVT04.txt` (+ sayfa PNG)

### Amaç
**INVT04 Malzeme Stokları — Anlık Stok Raporu:** firma–tesis–depo–stok yeri kırılımında anlık miktar; hareket değil sorgu.

### Kullanım akışı
1. INVT04 → sekme **Arama** → filtreler (Malzeme zorunlu örnek BP0001; veya yalnız Depo).  
2. İsteğe **Sınıf arama** / Seçeneğe göre ara.  
3. **Rapor seçenekleri:** varyant, seri, MRP ihtiyaçları, konteyner.  
4. Grid’de anlık stok kolonları.

### Alanlar / sekmeler (PNG)
Sekmeler: Arama, Arama…, Kriter İşlemleri, Parti Detayı.  
Filtre: Firma, Tesis, Depo, St. Yeri, O. St. Tipi, Parti No, Malzeme Num./Açıklama, Para, Son Kul. Tarihi, Mlz. T./Grb., Statü, Sektör, Tedarik Tipi, Sınıf.  
Grid: Tesis, Depo, St Yeri, O. St. Tipi, Parti, Malzeme, Birim, **Toplam Stok**, **Kullanılabilir Stok**, Yolda Değer, Bloke Stok, Tahsis Stok.

### Bağlantılar
Tüm INVT01 hareketlerinin sonucu; MRP ihtiyaç görünümü; parti/seri/konteyner/varyant.

### UX mesajı
Anlık bakiyeler; Toplam ≠ Kullanılabilir (bloke/tahsis ayrımı). Rapor seçenekleri derinlik katmanı.

### KTB ERP öğrenimleri
- Stok miktarı hareketlerden; INVT04 salt okunur kesit.  
- Hiyerarşi: Firma→Tesis→Depo→Stok Yeri + özel stok tipi + parti.  
- Kullanılabilir / bloke / tahsis / yolda ayrımı satış-ATP ve rezervasyon için şart.

---

## Karşılaştırmalı özet (KTB ERP)

| Konu | Canias deseni | KTB çıkarımı |
|------|----------------|--------------|
| Satış belgeleri | **Tek tx SALT01**, tip ile ayrım | Tek satış belgesi formu; tip=teklif/sipariş/irsaliye/fatura |
| Satınalma | PURT04 istek + PURT05 sipariş + VERT01 fatura | PR/PO/fatura ayrı; istekte Başlat kapısı |
| Stok hareket | **INVT01** yön + belge bağlacı | Ortak hareket motoru; satış/PO/iş emri bağlaçları |
| Statü | Satış: Açık/Kısmi/Kapalı; PO: Teslimat+Fatura şeritleri | Kalem ve başlıkta kısmi tamamlama |
| Silme | SAL/PUR soft-delete; VER hard + muhasebe kilidi | Belge tipine göre silme politikası |
| Miktar izi | Sipariş/irsaliye/fatura / stok giren/faturalanan | Satırda dönüşüm miktarları |
| Rapor | INVT04 anlık, çok boyutlu | Toplam vs kullanılabilir stok |

---

## Kaynak dosya eşlemesi

| Dosya | Tx / konu |
|-------|-----------|
| SALT01_-_Teklif_ve_Sipariş.txt | SALT01 teklif+sipariş+omurga |
| SALT01_-_İrsaliye.txt | SALT01 irsaliye |
| SALT01_-_Fatura.txt | SALT01 fatura+proforma |
| PURT04_ve_PURT05.txt | PURT04 + PURT05 (+ PURT12) |
| INVT01_-_VERT01.txt | INVT01 PO girişi + VERT01 + PURT44 |
| INVT01_-_İrsaliye_Çıkış.txt | INVT01 irsaliye çıkışı |
| INVT01_-_İş_Emri_Giriş.txt | INVT01 iş emri girişi/emiş |
| INVT01_-_İş_Emri_Çıkış.txt | INVT01 iş emri çıkışı |
| INVT04.txt | INVT04 anlık stok |
