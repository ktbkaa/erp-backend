# API Smoke Sonuçları

Tarih: 2026-11-25T08:38:11.778Z

Health: 200 · Auth firma: 12 · Pass 127 / Fail 2 / Skip 3

## Başarısız

| Ekran | Endpoint | Status | Hata |
|---|---|---:|---|
| SQL Sorgu (`sql-sorgu`) | `/sql-console` | 404 | Endpoint bulunamadı. |
| Onaylarım (`onaylarim`) | `/onay-kayitlari?benim=true` | 401 | Onaylarım için kullanıcı gerekli. |

## Tümü

| Modül | Ekran | Status | ms | Satır |
|---|---|---:|---:|---:|
| fixed-tanimlar | Numaratör Tanımı | 200 | 4 | 115 |
| fixed-tanimlar | Ölçü Birimleri | 200 | 3 | 4 |
| fixed-tanimlar | Kategori Tanımı | 200 | 2 | 15 |
| fixed-tanimlar | Ülke Tanımı | 200 | 3 | 5 |
| fixed-tanimlar | Para Birimi Tanımı | 200 | 2 | 5 |
| fixed-tanimlar | Şehir / İl Tanımı | 200 | 3 | 32 |
| fixed-tanimlar | Ödeme Koşulu | 200 | 2 | 5 |
| fixed-tanimlar | Teslimat Koşulu | 200 | 1 | 8 |
| fixed-tanimlar | Dil Tanımı | 200 | 2 | 5 |
| fixed-tanimlar | Banka Tanımı | 200 | 2 | 7 |
| fixed-tanimlar | Döviz Kurları | 200 | 1 | 11 |
| fixed-tanimlar | Hareket Kodları | 200 | 2 | 22 |
| fixed-tanimlar | Belge Tipleri | 200 | 2 | 33 |
| fixed-tanimlar | Vergi Kodları | 200 | 2 | 9 |
| sistem | Kullanıcılar | 200 | 2 | 18 |
| sistem | Kullanıcı Grupları | 200 | 1 | 7 |
| sistem | Sistem Parametreleri | 200 | 3 | 42 |
| sistem | Audit Log | 200 | 3 | 100 |
| sistem | Tablo Bilgileri | 200 | 10 | — |
| sistem | SQL Sorgu | 404 | 2 | — |
| sistem | E-posta Gönderimleri | 200 | 1 | 8 |
| ana-veri | Firmalar | 200 | 1 | 1 |
| ana-veri | İş Yerleri | 200 | 1 | 1 |
| ana-veri | Depolar | 200 | 2 | 8 |
| stok | Stok Kartı | 200 | 18 | 13 |
| stok | Depo Bakiye | 200 | 3 | 3 |
| stok | Stok Hareketleri | 200 | 6 | 6 |
| stok | Transfer Emirleri | 200 | 3 | 1 |
| stok | Sayım Belgeleri | 200 | 1 | 0 |
| stok | Stok Partileri | 200 | 1 | 2 |
| stok | MRP Bağımsız İhtiyaç | 200 | 2 | 12 |
| stok | MRP Konsol | 200 | 1 | 13 |
| stok | MRP Anlık Hesap | 200 | 8 | 58 |
| stok | Stok Rezervasyonları | 200 | 2 | 5 |
| stok | Stok Serileri | 200 | 2 | 1 |
| stok | Stok İkame | 200 | 1 | 1 |
| cari | Cari Kartları | 200 | 5 | 5 |
| cari | Cari Ekstre | 200 | 2 | 8 |
| cari | Tahsilat / Ödeme | 200 | 2 | 0 |
| uretim | Ürün Ağacı | 200 | 6 | 2 |
| uretim | Ürün Ağacı Patlatma | 200 | 3 | 10 |
| uretim | Ürün Ağacı Seviye Listesi | 200 | 3 | 8 |
| uretim | Malzeme Değişikliği | 200 | 2 | 0 |
| uretim | Sınıf Tanımı | 200 | 1 | 3 |
| uretim | İş Merkezleri | 200 | 2 | 3 |
| uretim | İş İstasyonları | 200 | 2 | 0 |
| uretim | Rotalar | 200 | 7 | 2 |
| uretim | Üretim Emri Tipleri | 200 | 2 | 4 |
| uretim | Üretim Planları | 200 | 1 | 0 |
| uretim | Üretim Emirleri | 200 | 8 | 2 |
| uretim | Siparişten İş Emri | 200 | 3 | 7 |
| uretim | Depo Stok Bağ | 200 | 4 | 331 |
| uretim | Üretim Girişleri | 200 | 3 | 1 |
| satinalma | Satınalma Teklif İstekleri | 200 | 1 | 1 |
| satinalma | Satınalma Teklifleri | 200 | 1 | 1 |
| satinalma | Satınalma Anlaşmaları | 200 | 1 | 0 |
| satinalma | Satınalma Talepleri | 200 | 1 | 1 |
| satinalma | Satınalma Siparişleri | 200 | 3 | 3 |
| satinalma | Mal Kabuller | 200 | 3 | 1 |
| satinalma | Tedarikçi İrsaliyeleri | 200 | 1 | 0 |
| satinalma | Giriş Kontrolleri | 200 | 11 | 1 |
| crm | Fırsat Aşamaları | 200 | 2 | 6 |
| crm | Faaliyet Tipleri | 200 | 1 | 5 |
| crm | Müşteri Adayları | 200 | 2 | 1 |
| crm | Kontaklar | 200 | 2 | 0 |
| crm | Fırsatlar | 200 | 3 | 1 |
| crm | Faaliyet Planları | 200 | 3 | 0 |
| crm | Faaliyetler | 200 | 2 | 0 |
| crm | Görevler | 200 | 2 | 0 |
| crm | Ajanda | 200 | 2 | 0 |
| satis | Satış Teklifleri | 200 | 3 | 1 |
| satis | Satış Siparişleri | 200 | 2 | 1 |
| satis | Sevk Emirleri | 200 | 2 | 1 |
| satis | İrsaliye Yönetimi | 200 | 1 | 0 |
| satis | Fatura Yönetimi | 200 | 3 | 0 |
| kalite | Giriş Kalite Emirleri | 200 | 1 | 0 |
| kalite | Çıkış Kalite Emirleri | 200 | 4 | 1 |
| kalite | KK Uygunsuzluklar | 200 | 2 | 1 |
| kalite | CAPA | 200 | 2 | 0 |
| kalite | KK Kontrol Planları | 200 | 2 | 2 |
| kalite | KK Stok Plan Bağları | 200 | 2 | 3 |
| kalite | KK Ret Nedenleri | 200 | 2 | 5 |
| onay | Onay Modül Kullanımları | 200 | 1 | 0 |
| onay | Onaylarım | 401 | 3 | — |
| onay | Onay İzleme | 200 | 4 | 3 |
| onay | Onay Yetki Devri | 200 | 2 | 0 |
| onay | Onay Rolü | 200 | 2 | 4 |
| onay | Onay Kuralı | 200 | 6 | 6 |
| onay | Onay Rotası | 200 | 5 | 5 |
| onay | Onay Mesaj Şablonu | 200 | 1 | 3 |
| onay | Onay Durum Tanımı | 200 | 2 | 6 |
| finans | Hesap Planı | 200 | 2 | 51 |
| finans | Muhasebe Belgeleri | 200 | 2 | 0 |
| finans | Muhasebe Dönemleri | 200 | 2 | 12 |
| finans | Finans Ülke Paketleri | 200 | 1 | 4 |
| finans | Mali Yıllar | 200 | 1 | 1 |
| finans | Banka Hesapları | 200 | 1 | 0 |
| finans | Kasa Hesapları | 200 | 1 | 0 |
| finans | Nakit Hareketleri | 200 | 2 | 0 |
| finans | Mizan | 200 | 2 | 31 |
| finans | Yevmiye Defteri | 200 | 1 | 0 |
| finans | Bilanço (Özet) | 200 | 1 | 4 |
| finans | Gelir Tablosu | 200 | 2 | 1 |
| finans | Hesap Belirleme Kuralları | 200 | 2 | 5 |
| finans | Fiyat Listeleri | 200 | 2 | 1 |
| finans | Fatura Kontrolleri (3-way) | 200 | 3 | 0 |
| finans | Kokpit | 200 | 8 | 8 |
| insan-kaynaklari | Personel Kartları | 200 | 7 | 521 |
| insan-kaynaklari | Departmanlar | 200 | 2 | 16 |
| insan-kaynaklari | Pozisyonlar | 200 | 2 | 16 |
| insan-kaynaklari | Çalışma Takvimleri | 200 | 2 | 1 |
| insan-kaynaklari | Vardiyalar | 200 | 2 | 2 |
| insan-kaynaklari | Resmî Tatiller | 200 | 2 | 0 |
| insan-kaynaklari | İzin Talepleri | 200 | 2 | 0 |
| insan-kaynaklari | İzin Türleri | 200 | 1 | 0 |
| insan-kaynaklari | Vardiya Atamaları | 200 | 2 | 0 |
| insan-kaynaklari | Çıkış Nedenleri | 200 | 2 | 0 |
| insan-kaynaklari | İzin Bakiyeleri | 200 | 2 | 0 |
| insan-kaynaklari | Günlük Puantaj | 200 | 2 | 1 |
| insan-kaynaklari | Ücret Tanımları | 200 | 2 | 32 |
| insan-kaynaklari | Avanslar | 200 | 1 | 0 |
| insan-kaynaklari | Bordro Dönemleri | 200 | 2 | 1 |
| insan-kaynaklari | Bordro Çalışmaları | 200 | 2 | 1 |
| insan-kaynaklari | Bordro Parametreleri | 200 | 2 | 1 |
| insan-kaynaklari | İş İlanları | 200 | 2 | 1 |
| insan-kaynaklari | Adaylar | 200 | 1 | 1 |
| insan-kaynaklari | Onboarding Görevleri | 200 | 2 | 5 |
| insan-kaynaklari | Zimmetler | 200 | 2 | 0 |
| insan-kaynaklari | İşten Çıkış | 200 | 3 | 0 |
