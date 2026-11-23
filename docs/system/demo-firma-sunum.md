# Demo Firma A.Ş. — Sistem Sunum Dokümanı

**Oluşturulma:** 23.11.2026 09:42:40 (Europe/Istanbul)  
**Firma:** Demo Firma A.Ş. (`DEMO`)  
**Kodlama:** UTF-8  
**PDF (eksiksiz, görseller gömülü):** `/opt/cursor/artifacts/demo-firma-sunum.pdf`  
**HTML kaynak:** `/opt/cursor/artifacts/demo-firma-sunum.html`  
**Görseller:** `/opt/cursor/artifacts/sunum-ekranlar/` (24 PNG)

Giriş: `kagantalha.b` / `Demo123!` — Firma seçimi: **Demo Firma A.Ş.**

## 1. Sunumda düzeltilen davranışlar

### 1.1 Dönüşen belgeler silinmez — durum Kapalı
Satış teklifi → sipariş, satınalma teklifi → sipariş, SA talep → sipariş, sevk → irsaliye, irsaliye → fatura dönüşümlerinde kaynak kayıt listede kalır, durum **Kapalı** olur.

| Belge | No | Durum | Sonraki belge |
|-------|-----|-------|---------------|
| Satış teklifi | ST00005 | Kapalı | B00010 sipariş |
| SA teklif | QF00005 | Kapalı | P00010 sipariş |

### 1.2 Sağ tık → Kaynağına git
- Sipariş ve diğer belge listelerinde satıra sağ tık menüsü açılır.
- `teklif_id`, `kaynak_belge_tipi` + `kaynak_belge_id`, `siparis_id`, `firsat_id` alanlarından kaynak çözülür.
- Hedef ekran açılır ve ilgili kayıt seçilir (ör. «Teklife git»).

### 1.3 Firma filtresi
`X-Firma-Id` ile listeler `firma_id` veya iş yeri üzerinden DEMO kayıtlarını gösterir. Sunumda mutlaka **Demo Firma A.Ş.** seçili olmalıdır (GIDA seçiliyse DEMO kayıtları görünmez).

## 2. Modül özeti (DEMO doldurulmuş)

| Modül | Ekranlar / örnek kayıt |
|-------|------------------------|
| CRM | Aday AD00005, Fırsat FS00005, Kontak, Faaliyet, Plan, Görev |
| Satış | Teklif ST00005 (Kapalı), Sipariş B00010, Sevk, İrsaliye, Fatura, Tahsilat |
| Satınalma | RFQ, Teklif QF00005 (Kapalı), Anlaşma, Talep, Sipariş P00010, Mal kabul |
| Stok | Bakiye, Hareket, Transfer, Sayım, Parti, Seri, İkame |
| Kalite | GKK + ÇKK QE00007, Uygunsuzluk, CAPA, Plan, Stok-plan |
| Üretim | BOM, Rota, Plan, Emir, Giriş |
| MRP | Bağımsız ihtiyaç, Çalışma, Sonuçlar |
| Finans | Fiyat listesi, Döviz, Muhasebe mahsup |

## 3. Ekran görüntüleri (PDF içinde)

PDF’de gömülü 24 ekran görüntüsü:

**CRM:** crm-adaylar, crm-firsatlar, crm-faaliyetler  
**Satış:** satis-teklifleri, satis-siparisleri, siparis-sag-tik, sevk-emirleri, irsaliyeler, satis-faturalari, tahsilat-odemeler  
**Satınalma:** satin-alma-teklifleri, satin-alma-anlasmalari, satin-alma-siparisleri, mal-kabuller  
**Kalite:** kk-emirleri-gkk, kk-emirleri-ckk, kk-uygunsuzluklar  
**Üretim / MRP / Stok:** uretim-emirleri, urun-agaci, mrp-calisma, depo-bakiye, transfer-emirleri  
**Finans:** fiyat-listeleri, muhasebe-belgeleri

## 4. Çalıştırma

```bash
node scripts/demo-firma-sunum-doldur.js
node scripts/sunum-ekran-goruntuleri.js
node scripts/build-sunum-pdf.js
```

## 5. Teknik değişiklikler

| Dosya | Değişiklik |
|-------|------------|
| routes/satis_teklifleri.js | Dönüşüm → Kapali; firma_id; liste firma/is_yeri |
| routes/satin_alma_teklifleri.js | Dönüşüm → Kapali |
| routes/satin_alma_siparisleri.js | Talep dönüşüm → Kapali |
| routes/irsaliyeler.js | Sevk/irsaliye kaynak → Kapali |
| routes/crm_firsatlar.js | firma_id kayıt + liste |
| routes/_belgeCrud.js | Liste firma/is_yeri |
| public/app.js | Genel sağ tık «Kaynağına git» |
| scripts/demo-firma-sunum-doldur.js | DEMO tüm ekran seed |
| scripts/sunum-ekran-goruntuleri.js | Ekran görüntüsü otomasyonu |
| scripts/build-sunum-pdf.js | UTF-8 PDF üretimi |

Bu doküman sunum amaçlıdır. Kodlama: UTF-8. PDF Chrome headless ile üretilmiştir.
