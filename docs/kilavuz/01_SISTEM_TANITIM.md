# KTB ERP — Sistem Tanıtımı

**Tarih:** 2025-11-25 (Europe/Istanbul)  
**Uygulama:** `http://localhost:3000`  
**Çok firma:** üst bar firma seçici · isteklerde `X-Firma-Id`

## Ne işe yarar?

KTB ERP; ana veri, stok, satınalma, satış, üretim, kalite, MRP, finans, CRM, proje yönetimi, insan kaynakları ve onay süreçlerini **tek web kabuğunda** yöneten çok firmalı bir ERP’dir.

## Modüller (13)

| Modül | Örnek ekranlar |
|-------|----------------|
| Ana Veri | Firmalar, iş yerleri, depolar, ölçü, para, numaratör, kategori |
| Cari | Cari kartları, tahsilat/ödeme |
| Stok | Stok kartı, hareket, depo bakiye, MRP |
| Satınalma | Talep → teklif isteği → teklif → sipariş → mal kabul → alış irsaliye |
| Satış | Teklif → sipariş → sevk → irsaliye → fatura |
| Üretim | BOM, patlatma, rota, iş emri, üretim girişi, fason |
| Kalite | GKK / ÇKK, uygunsuzluk, CAPA, cihaz, kalibrasyon |
| Finans | Kasa/banka, fatura kontrolleri, raporlar |
| CRM | Aday, fırsat, faaliyet |
| Proje | Proje, iş, ekip |
| İK | Personel, org, bordro, işe alım |
| Onay | Rota, kural, onaylarım / izleme |
| Sistem | Kullanıcı, lisans, audit |

## Tipik uçtan uca akış

1. Cari + stok kartı  
2. Satış siparişi (veya bağımsız ihtiyaç)  
3. MRP → satınalma talebi ve/veya üretim emri  
4. SA sipariş → mal kabul → GKK  
5. Üretim girişi (malzeme tüketimi, aktarılan miktar, yan ürün) → ÇKK  
6. Sevk → irsaliye → fatura → tahsilat  

## Demo firmalar (bu ortam)

| Kod | Ad | Durum (sınama) |
|-----|-----|----------------|
| MARVEL | Metal Marvel Figür | Zengin sim verisi (üretim, İK, PRJ, kalite) |
| DEMO | Demo Firma | Ticari döngü dolu |
| GIDA | Gıda Demo | Üretim + BOM OK |
| XELEK | X Elektronik | Üretim verisi mevcut |
| TEKS / ELEK / DOKUM | — | Bu ortamda seed hata verdi; listeler boş |

## Teknik notlar

- Auth: `POST /auth/login` → Bearer token  
- Liste/form ekran sözleşmesi: `public/app.js` içindeki `MODULES` (~184 ekran)  
- Üretim emri: `consumed_quantity` / `remaining_quantity`, rota `transferred_quantity`  
- Üretim girişi önizleme: `GET /uretim-girisleri/onizleme?order_id=`
