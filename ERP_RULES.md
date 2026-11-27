# ERP İş Kuralları (Onaylanmış Çekirdek)

Bu dosya projenin iş kuralı kaynağıdır. Çelişki olursa: kullanıcı onayı > bu dosya > Canias dokümanı > genel ERP pratikleri.

## Organizasyon

1. Her iş yeri bir firmaya bağlıdır.
2. Her depo bir iş yerine bağlıdır.
3. Stok ve cari işlemleri iş yeri (ve gerektiğinde depo) bağlamında yapılır.
4. Mimari çoklu firmaya kapalı olmamalıdır; ilk kullanım tek firma ile olabilir.

## Stok

1. Stok bakiyesi kullanıcı tarafından doğrudan değiştirilmez.
2. Her miktar değişimi bir stok hareketi belgesinden doğar (`stok_hareketleri`).
3. Hareket tipleri (ilk sürüm): `SATINALMA_GIRIS`, `SATIS_CIKIS`, `URETIM_TUKETIM`, `URETIM_GIRIS` (+ sonra sayım/transfer).
4. Negatif stok varsayılan olarak engellenir (açıkça değiştirilmedikçe).
5. Stok kartında `stok_tipi` ve `tedarik_tipi` tutulur.
6. Ölçü birimleri `olcu_birimleri` üzerinden yönetilir (serbest metin tercih edilmez).

## Depo

1. Her depo bir iş yerine bağlıdır.
2. Stok giriş/çıkış işlemleri depo bağlamında yapılır.

## Belgeler

1. Belgeler birbirinden kopuk CRUD kayıtları değildir.
2. Satınalma: Sipariş → Onay → Mal kabul → Stok hareketi.
3. Satış: Sipariş → Sevk → Stok çıkışı → İrsaliye → Fatura.
4. Üretim: Ürün ağacı (+ rota) → İş emri → Tüketim hareketleri + Mamul giriş hareketi.
5. Kaynak belgeden türeyen satırlarda miktar izlenir; fazla karşılama engellenir.
6. Belge numaraları kontrollü üretilir (manuel çakışmaya açık bırakılmaz).

## Cari

1. Cari kart müşteri, tedarikçi veya her ikisi olabilir.
2. Satınalma siparişi tedarikçi (veya her ikisi) cari ister.
3. Satış siparişi müşteri (veya her ikisi) cari ister.

## Üretim

1. İş emri, ürün ağacından bileşenleri kopyalar (sonradan ağaç değişse emir satırları korunur).
2. Üretim girişi yapıldığında mamul hedef depoya stok girişi oluşur.
3. Aynı işlemde (veya bağlı adımda) reçete bileşenleri için tüketim hareketleri oluşur.

## Yetki

1. İlk sürüm: giriş yapmış kullanıcı + basit rol.
2. Firma / iş yeri / depo / menü yetkileri sonraki sürümlerde eklenir; veri modeli buna engel olmamalıdır.

## Dokümanda yoksa

Dokümanda olmayan kural uydurulmaz. Öneri ayrıca yazılır ve kullanıcı onayı ile `ERP_RULES.md` dosyasına eklenir.
|
