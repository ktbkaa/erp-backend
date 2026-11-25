# KTB ERP — Ekran Kullanım Kılavuzu

## 1. Kabuk

- **Sol menü:** Modül → bölüm → ekran. ☰ ile daraltılır.
- **Firma seçici:** Üst bar; tüm listeler seçili firmaya göre filtrelenir.
- **Arama:** ≥3 karakter; sonuçtan ekrana gidilir.
- **Belge sekmeleri:** Açılan liste/formlar üstte sekme olur; × ile kapanır. Kaydırma çubuğu sekmelerin **altında**dır (üst üste binmez).

## 2. Liste ekranı

1. Yeşil başlık şeridi  
2. Aksiyonlar: **Yeni / İncele / Düzelt / Kopyala / Sil**  
3. Filtre alanı (Eşit, Eşit değil, Arasında, İçerir) → Uygula / Temizle  
4. Tablo  

**Depo Bakiye** gibi özet ekranlarda yalnızca İncele anlamlıdır.

## 3. Form

- **Master** (üst) sabit; **detay sekmeleri** (kalem, adres, rota, malzeme…).  
- Kod alanları numaratörden gelir (yeni kayıtta).  
- **İncele:** salt okunur. **Düzelt:** kod hariç düzenlenebilir. **Kopyala:** yeni kod, ad boş.  
- Kaydet sonrası liste yenilenir; bağlam toolbar ile bağlı belgelere geçilir.

## 4. Modül bazlı kısa kullanım

### Ana Veri
Firma → iş yeri → depo zinciri önce kurulur. Numaratör ve kategori tanımları belge/kod üretimini besler.

### Cari / Stok
- Cari: müşteri/tedarikçi; kategoriler ve adres.  
- Stok: ölçü, vergi, depo varsayılanı, planlama (emniyet/min/max).  
- Stok hareketi: giriş/çıkış/transfer/sayım/fire.  
- Depo bakiye: stok×depo bakiyesi.

### Satınalma
Talep → teklif isteği → teklif → **sipariş** → **mal kabul** → (GKK) → alış irsaliye/fatura.

### Satış
Teklif → **sipariş** → sevk emri → **irsaliye** → **fatura** → tahsilat.  
Siparişten iş emri / MRP bağlantısı açılabilir.

### Üretim
1. **Ürün ağacı (BOM)** tanımla; gerekirse **patlatma** ile ihtiyaç gör.  
2. **Rota** + iş merkezleri.  
3. **Üretim emri:** malzemelerde planlanan / tüketilen / kalan; rotada **aktarılan**.  
4. **Operasyonel üretim girişi:** önizleme ile malzeme + yan ürün; miktar bildir.  
5. **Fason:** sipariş → sevk → tüketim → teslim (parametre/fiyat tanımlı).

### Kalite
- **GKK:** mal kabul sonrası giriş kalite emri (onay/red).  
- **ÇKK:** sevk öncesi çıkış kalite. Lot’lu stokta lot seçimi zorunlu olabilir.  
- Uygunsuzluk → CAPA; cihaz → kalibrasyon.

### MRP
Bağımsız ihtiyaç veya siparişlerden **MRP Konsol** çalıştır → sonuçlar → SA talep / üretim önerisi.

### CRM / Proje / İK / Onay / Finans
- CRM: aday → fırsat → faaliyet.  
- Proje: proje → iş → ekip.  
- İK: personel, org, bordro çalışmaları, iş ilanları.  
- Onay: rota/kural tanımı; **Onaylarım** ile bekleyenler.  
- Finans: kasa/banka, tahsilat-ödeme, fatura kontrolleri.

## 5. Ekran envanteri

Tam liste: `evidence/screens-inventory.json` (modül, `techId`, endpoint).  
Görüntülü tanıtım: `KTB_ERP_Sistem_Kilavuz_Sinama.pdf` içindeki “Ekran tanıtımı” sayfaları.
