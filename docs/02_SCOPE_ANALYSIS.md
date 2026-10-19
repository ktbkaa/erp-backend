# Aşama 2 — ERP Kapsam Analizi

Kullanıcı isteği (master prompt temel kapsam) ile Canias / Gemini kaynaklarının karşılaştırması.

| Alan | Kullanıcının İsteği | Dokümanda Durum | Eksik mi? | İlk Sürümde Gerekli mi? |
|------|---------------------|-----------------|-----------|-------------------------|
| Firma Tanımı | Evet | Canias BAS: Firma/şirket; mevcut kodda `firmalar` | Hayır | Evet |
| İş Yeri Tanımı | Evet | Canias BAS: Tesis; mevcut kodda `is_yerleri` | Hayır | Evet |
| Depo Tanımı | Doğrudan listede yok ama süreçlerde zorunlu | Canias BAS/INV/WMS: Depo/stok yeri | Evet (kodda yok) | **Evet** |
| Kullanıcı Tanımı | Evet | Canias yetki; Gemini `kisiler` | Kısmi (auth yok) | Evet (basit) |
| Stok Kartı | Evet | Canias malzeme temel verisi; kodda `stoklar` | Kısmi (tip/tedarik tipi yok) | Evet |
| Stok / İş Yeri Bağlantısı | Evet | Canias malzeme-tesis/depo ilişkisi | Evet | Evet |
| Cari Kart | Evet | Canias müşteri/tedarikçi; kodda `cariler` | Kısmi | Evet |
| Cari / İş Yeri Bağlantısı | Evet | Adres/ilgili kişi yapısı var; iş yeri bağı net değil | Evet | Evet |
| Ölçü Birimi | Listede yok | Canias BAS kritik | Evet (şimdilik stokta string) | Evet (basit tablo veya kontrollü alan) |
| Ürün Ağacı | Evet | Canias BOM | Evet (kodda yok) | Evet |
| Üretim Rotası | Evet | Canias ROU | Evet | Evet (basit) |
| İş Merkezi | Listede yok | Rota için Canias’ta zorunlu yakın | Evet | Evet (basit) |
| Üretim İş Emri | Evet | Canias PRD | Evet | Evet |
| Üretim Girişi | Evet + otomatik stok | PRD onay → envanter | Evet | Evet |
| Satınalma Siparişi | Evet | PUR; kodda genel `siparisler` | Ayrım eksik | Evet |
| Satınalma Onayı | Evet | PUR onay mekanizması | Evet | Evet |
| Depo Giriş (mal kabul) | Evet | INV + PUR mal girişi | Evet | Evet |
| Satış Siparişi | Evet | SAL; kodda genel sipariş | Ayrım eksik | Evet |
| Siparişten Sevk | Evet | SAL + rezervasyon/irsaliye | Evet | Evet |
| Depo Sevk / Çıkış | Evet | INV stok çıkışı | Evet | Evet |
| İrsaliye | Evet | SAL/INV irsaliye | Evet | Evet |
| Fatura | Evet | Kodda `faturalar` var; belge zinciri yok | İlişki eksik | Evet |
| Stok Hareket Motoru | Master prompt zorunlu | INV merkez | Evet | **Evet** |
| Belge İlişkileri / kalan miktar | Master prompt zorunlu | Canias belge tarihçesi / referans | Evet | **Evet** |
| Finans / Muhasebe | Gemini’de aday | Canias FIN/ACC geniş | Evet | Hayır (v1.x sonrası) |
| MRP / Kapasite / OEE | Yok | Canias’ta var | — | Hayır |
| E-Fatura / E-İrsaliye | Yok | E-Dönüşüm grubu | — | Hayır |
| Parti / Seri | Yok | INV’de var | — | Hayır |
| Transfer emri | Yok | TRO | — | Hayır |
| Gelişmiş yetki (menü/depo) | Mimari açık kapı | BAS yetki | Evet | Hayır (sonra) |

## Zorunlu ek tanımlar (eklemeden önce gerekçe)

### 1) Depo
- **Nedir?** İş yerinin altında malzeme bulundurma noktası.
- **Neden gerekli?** Mal kabul, sevk, üretim giriş/çıkış depo olmadan anlamsız.
- **Hangi süreç?** Satınalma girişi, satış çıkışı, üretim.
- **İlk sürümde zorunlu mu?** Evet.

### 2) Stok hareketi
- **Nedir?** Stok miktarını değiştiren belgelenmiş kayıt.
- **Neden gerekli?** Bakiye hareketlerden hesaplanmalı.
- **Hangi süreç?** Tüm giriş/çıkışlar.
- **İlk sürümde zorunlu mu?** Evet.

### 3) Ölçü birimi
- **Nedir?** Adet, kg, mt vb.
- **Neden gerekli?** Stok ve belge satırlarında tutarlılık.
- **Hangi süreç?** Stok, sipariş, üretim.
- **İlk sürümde zorunlu mu?** Evet (başta basit lookup yeterli).

### 4) İş merkezi
- **Nedir?** Operasyonun yapıldığı yer/kaynak.
- **Neden gerekli?** Rota satırı boş kalmasın.
- **Hangi süreç?** Üretim rotası / iş emri.
- **İlk sürümde zorunlu mu?** Evet (tek varsayılan iş merkezi ile başlanabilir).

### 5) Belge tipi / numara serisi
- **Nedir?** SAS, SSS, IRS, FAT gibi belge kimliği.
- **Neden gerekli?** İzlenebilir numaralandırma.
- **Hangi süreç?** Tüm belgeler.
- **İlk sürümde zorunlu mu?** Evet (basit sayaç).

### 6) Vergi / KDV / para birimi
- **Nedir?** Fatura hesap bileşenleri.
- **Neden gerekli?** Gerçek fatura için.
- **Hangi süreç?** Fatura.
- **İlk sürümde zorunlu mu?** Kısmi — tek para birimi (TRY) ve sabit KDV oranı ile başlanabilir; tam vergi motoru sonra.
)
