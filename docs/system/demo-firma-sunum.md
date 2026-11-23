# Demo Firma A.Ş. — Sistem Sunum Dokümanı

**Oluşturulma:** 23.11.2026 08:40 (Europe/Istanbul)  
**Firma:** Demo Firma A.Ş. (`DEMO`)  
**Amaç:** Tüm ekranların dolu veri ile gösterimi; süreç sonrası kaynak belgelerin listede **Kapalı** kalması; sağ tık → **Kaynağına git**.

---

## 1. Bu sunumda düzeltilen davranışlar

### 1.1 Dönüşen belgeler silinmez — durum Kapalı
Satış teklifi → sipariş, satınalma teklifi → sipariş, SA talep → sipariş, sevk → irsaliye, irsaliye → fatura dönüşümlerinde kaynak kayıt **listede kalır**, durum **`Kapalı`** olur.

Örnek (canlı):
| Belge | No | Durum |
|---|---|---|
| Satış teklifi | ST00005 | Kapalı (B00010 siparişe dönüştü) |
| SA teklif | QF00005 | Kapalı (P00010 siparişe dönüştü) |

### 1.2 Sağ tık → Kaynağına git
Sipariş (ve diğer belge listeleri) satırında sağ tık menüsü:
- `teklif_id` / `kaynak_belge_tipi` + `kaynak_belge_id` / `siparis_id` / `firsat_id` … alanlarından kaynağı çözer
- Hedef ekranı açar ve ilgili kaydı seçer

### 1.3 Firma filtresi
`X-Firma-Id` ile listeler `firma_id` veya iş yeri üzerinden DEMO kayıtlarını gösterir (eski boş `firma_id` kayıtları backfill edildi).

---

## 2. Modül özeti (DEMO doldurulmuş)

| Modül | Ekranlar (örnek kayıt) |
|---|---|
| CRM | Aday AD00005, Fırsat FS00005, Kontak, Faaliyet, Plan, Görev |
| Satış | Teklif ST00005 (Kapalı), Sipariş B00010, Sevk, İrsaliye IR00005, Fatura FA00009, Tahsilat |
| Satınalma | RFQ QI00005, Teklif QF00005 (Kapalı), Anlaşma QA00003, Talep, Sipariş P00010, Mal kabul R00010, Alış fatura |
| Stok | Bakiye, Hareket, Transfer, Sayım, Parti DEMO-LOT-*, Seri, İkame |
| Kalite | GKK + **ÇKK QE00007**, Uygunsuzluk, CAPA, Plan, Stok-plan, Ret neden |
| Üretim | BOM, Rota, Plan, Emir E00006, Giriş |
| MRP | BI, Çalışma MR00005, Sonuçlar |
| Finans | Fiyat listesi, Döviz EUR/TRY, Muhasebe mahsup |

---

## 3. Ekran görüntüleri

Görseller: `/opt/cursor/artifacts/sunum-ekranlar/`  
Firma filtresi: **DEMO — Demo Firma A.Ş.** / iş yeri IY-001.

### 3.1 CRM Pipeline

![Adaylar](/opt/cursor/artifacts/sunum-ekranlar/crm-adaylar.png)

![Fırsatlar](/opt/cursor/artifacts/sunum-ekranlar/crm-firsatlar.png)

![Faaliyetler](/opt/cursor/artifacts/sunum-ekranlar/crm-faaliyetler.png)

### 3.2 Satış süreci

**Satış Teklifleri** — `ST00005` durumu **Kapalı** (siparişe dönüştü, listede duruyor):

![Satış Teklifleri](/opt/cursor/artifacts/sunum-ekranlar/satis-teklifleri.png)

**Satış Siparişleri** + sağ tık **Teklife git**:

![Satış Siparişleri](/opt/cursor/artifacts/sunum-ekranlar/satis-siparisleri.png)

![Sağ tık — Teklife git](/opt/cursor/artifacts/sunum-ekranlar/siparis-sag-tik.png)

![Sevk](/opt/cursor/artifacts/sunum-ekranlar/sevk-emirleri.png)

![İrsaliye](/opt/cursor/artifacts/sunum-ekranlar/irsaliyeler.png)

![Satış Fatura](/opt/cursor/artifacts/sunum-ekranlar/satis-faturalari.png)

![Tahsilat](/opt/cursor/artifacts/sunum-ekranlar/tahsilat-odemeler.png)

### 3.3 Satınalma süreci

![SA Teklifler (Kapalı dahil)](/opt/cursor/artifacts/sunum-ekranlar/satin-alma-teklifleri.png)

![SA Anlaşmalar](/opt/cursor/artifacts/sunum-ekranlar/satin-alma-anlasmalari.png)

![SA Siparişler](/opt/cursor/artifacts/sunum-ekranlar/satin-alma-siparisleri.png)

![Mal Kabul](/opt/cursor/artifacts/sunum-ekranlar/mal-kabuller.png)

### 3.4 Kalite

![GKK](/opt/cursor/artifacts/sunum-ekranlar/kk-emirleri-gkk.png)

![ÇKK](/opt/cursor/artifacts/sunum-ekranlar/kk-emirleri-ckk.png)

![Uygunsuzluk](/opt/cursor/artifacts/sunum-ekranlar/kk-uygunsuzluklar.png)

### 3.5 Üretim & MRP & Stok

![Üretim Emirleri](/opt/cursor/artifacts/sunum-ekranlar/uretim-emirleri.png)

![Ürün Ağacı](/opt/cursor/artifacts/sunum-ekranlar/urun-agaci.png)

![MRP](/opt/cursor/artifacts/sunum-ekranlar/mrp-calisma.png)

![Depo Bakiye](/opt/cursor/artifacts/sunum-ekranlar/depo-bakiye.png)

![Transfer](/opt/cursor/artifacts/sunum-ekranlar/transfer-emirleri.png)

### 3.6 Finans

![Fiyat Listeleri](/opt/cursor/artifacts/sunum-ekranlar/fiyat-listeleri.png)

![Muhasebe](/opt/cursor/artifacts/sunum-ekranlar/muhasebe-belgeleri.png)

---

## 4. Çalıştırma

```bash
# Veri doldur
node scripts/demo-firma-sunum-doldur.js

# İki firma özellik döngüsü (önceki)
node scripts/demo-iki-firma-ozellik-dongu.js
```

Giriş: `kagantalha.b` / `Demo123!` — firma: **Demo Firma A.Ş.**

---

## 5. Teknik değişiklikler (özet)

| Dosya | Değişiklik |
|---|---|
| `routes/satis_teklifleri.js` | Dönüşüm → `Kapali`; firma_id yazma; liste firma/is_yeri |
| `routes/satin_alma_teklifleri.js` | Dönüşüm → `Kapali` |
| `routes/satin_alma_siparisleri.js` | Talep dönüşüm → `Kapali` |
| `routes/irsaliyeler.js` | Sevk/irsaliye kaynak → `Kapali` |
| `routes/crm_firsatlar.js` | firma_id kayıt + liste |
| `routes/_belgeCrud.js` | Liste firma/is_yeri |
| `public/app.js` | Genel sağ tık «Kaynağına git» |
| `scripts/demo-firma-sunum-doldur.js` | DEMO tüm ekran seed |

---

*Bu doküman sunum için hazırlanmıştır; ekran görüntüleri eklendikçe bölüm 3 güncellenir.*
