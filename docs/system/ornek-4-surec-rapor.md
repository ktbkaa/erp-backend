# ADGIDA + EGEPACK — 4 Örnek Süreç Raporu

Oluşturma: 21.11.2026 16:06:57 (Europe/Istanbul)

## Nasıl izlenir?

- Üst bardan firma seçin: ADGIDA veya EGEPACK.
- Listelerde proje / açıklama filtresine ADGIDA-MAN, ADGIDA-MRP, EGEPACK-MAN veya EGEPACK-MRP yazın.
- Satış → Siparişler, Satınalma → Siparişler, Üretim → İş Emirleri, Planlama → MRP Sonuçları / Bağımsız İhtiyaç.
- Sevkiyat / İrsaliye / Fatura ekranlarında aynı etiketle belge numaralarını arayın.

## Özet tablo

| Etiket | Firma | MRP | Mamul | Sipariş | SA / PO | İş emri | Sevk / İrsaliye / Fatura |
|--------|-------|-----|-------|---------|---------|---------|--------------------------|
| **ADGIDA-MAN** | ADGIDA | Hayır | GIDA-MM-01 × 80 | B00175 | P00135 | E00277 | SE00116 / IR00126 / FA00080 |
| **ADGIDA-MRP** | ADGIDA | Evet | GIDA-MM-02 × 60 | B00176 | P00136 | E00280, E00278, E00279 | SE00117 / IR00127 / FA00081 |
| **EGEPACK-MAN** | EGEPACK | Hayır | AMB-MM-01 × 500 | B00177 | P00137 | E00281 | SE00118 / IR00128 / FA00082 |
| **EGEPACK-MRP** | EGEPACK | Evet | AMB-MM-02 × 200 | B00178 | P00138 | E00283, E00282 | SE00119 / IR00129 / FA00083 |

## ADGIDA-MAN — Elma suyu — manuel planlama

- Firma / iş yeri: **ADGIDA** / `IY-GIDA-FAB1`
- MRP: **kullanılmadı**
- Mamul: `GIDA-MM-01` × 80
- Satış teklifi: `ST00053`
- Satış siparişi: `B00175`
- SA talep: `L00067`
- SA sipariş: `P00135`
- Mal kabul: `R00117`
- Alış fatura: `AF00093`
- İş emri: `E00277`
- Sevk: `SE00116`
- İrsaliye: `IR00126`
- Satış fatura: `FA00080`
- Ekranlar: satis-teklifleri, satis-siparisleri, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, giris-kontrolleri, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri, depo-bakiye

## ADGIDA-MRP — Kuru kayısı — MRP planlama

- Firma / iş yeri: **ADGIDA** / `IY-GIDA-FAB2`
- MRP: **kullanıldı**
- Mamul: `GIDA-MM-02` × 60
- Satış siparişi: `B00176`
- Bağımsız ihtiyaç: `BI00043`
- MRP çalışması: `MR00050` (net satır: 4)
- SA talep: `L00068`
- SA sipariş: `P00136`
- Mal kabul: `R00118`
- Alış fatura: `AF00094`
- İş emirleri: `E00280`, `E00278`, `E00279`
- Sevk: `SE00117`
- İrsaliye: `IR00127`
- Satış fatura: `FA00081`
- Ekranlar: satis-siparisleri, mrp-bagimsiz-ihtiyac, mrp-sonuclari, mrp-calismalari, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri

## EGEPACK-MAN — Doy-Pack poşet — manuel planlama

- Firma / iş yeri: **EGEPACK** / `IY-AMB-FAB1`
- MRP: **kullanılmadı**
- Mamul: `AMB-MM-01` × 500
- Satış teklifi: `ST00054`
- Satış siparişi: `B00177`
- SA talep: `L00069`
- SA sipariş: `P00137`
- Mal kabul: `R00119`
- Alış fatura: `AF00095`
- İş emri: `E00281`
- Sevk: `SE00118`
- İrsaliye: `IR00128`
- Satış fatura: `FA00082`
- Ekranlar: satis-teklifleri, satis-siparisleri, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, giris-kontrolleri, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri, depo-bakiye

## EGEPACK-MRP — Shrink film — MRP planlama

- Firma / iş yeri: **EGEPACK** / `IY-AMB-FAB1`
- MRP: **kullanıldı**
- Mamul: `AMB-MM-02` × 200
- Satış siparişi: `B00178`
- Bağımsız ihtiyaç: `BI00044`
- MRP çalışması: `MR00051` (net satır: 2)
- SA talep: `L00070`
- SA sipariş: `P00138`
- Mal kabul: `R00120`
- Alış fatura: `AF00096`
- İş emirleri: `E00283`, `E00282`
- Sevk: `SE00119`
- İrsaliye: `IR00129`
- Satış fatura: `FA00083`
- Ekranlar: satis-siparisleri, mrp-bagimsiz-ihtiyac, mrp-sonuclari, mrp-calismalari, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri

## Zaman çizelgesi (özet)

- 21.11.2026 16:06:58 —   SO: B00175
- 21.11.2026 16:06:58 —   ✓ ADGIDA-MAN tamam
- 21.11.2026 16:06:58 —   SO: B00176
- 21.11.2026 16:06:58 —   MRP: MR00050 satır=14
- 21.11.2026 16:06:58 —   ✓ ADGIDA-MRP tamam
- 21.11.2026 16:06:58 —   SO: B00177
- 21.11.2026 16:06:58 —   ✓ EGEPACK-MAN tamam
- 21.11.2026 16:06:58 —   SO: B00178
- 21.11.2026 16:06:58 —   MRP: MR00051 satır=5
- 21.11.2026 16:06:58 —   ✓ EGEPACK-MRP tamam
