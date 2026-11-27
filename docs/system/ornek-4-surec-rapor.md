# ADGIDA + EGEPACK — 4 Örnek Süreç Raporu

Oluşturma: 20.11.2026 15:28:54 (Europe/Istanbul)

## Nasıl izlenir?

- Üst bardan firma seçin: ADGIDA veya EGEPACK.
- Listelerde proje / açıklama filtresine ADGIDA-MAN, ADGIDA-MRP, EGEPACK-MAN veya EGEPACK-MRP yazın.
- Satış → Siparişler, Satınalma → Siparişler, Üretim → İş Emirleri, Planlama → MRP Sonuçları / Bağımsız İhtiyaç.
- Sevkiyat / İrsaliye / Fatura ekranlarında aynı etiketle belge numaralarını arayın.

## Özet tablo

| Etiket | Firma | MRP | Mamul | Sipariş | SA / PO | İş emri | Sevk / İrsaliye / Fatura |
|--------|-------|-----|-------|---------|---------|---------|--------------------------|
| **ADGIDA-MAN** | ADGIDA | Hayır | GIDA-MM-01 × 80 | B00166 | P00128 | E00261 | SE00108 / IR00119 / FA00074 |
| **ADGIDA-MRP** | ADGIDA | Evet | GIDA-MM-02 × 60 | B00167 | P00129 | E00263, E00262 | SE00109 / IR00120 / FA00075 |
| **EGEPACK-MAN** | EGEPACK | Hayır | AMB-MM-01 × 500 | B00168 | P00130 | E00264 | SE00110 / IR00121 / FA00076 |
| **EGEPACK-MRP** | EGEPACK | Evet | AMB-MM-02 × 200 | B00169 | P00131 | E00266, E00265 | SE00111 / IR00122 / FA00077 |

## ADGIDA-MAN — Elma suyu — manuel planlama

- Firma / iş yeri: **ADGIDA** / `IY-GIDA-FAB1`
- MRP: **kullanılmadı**
- Mamul: `GIDA-MM-01` × 80
- Satış teklifi: `ST00050`
- Satış siparişi: `B00166`
- SA talep: `L00062`
- SA sipariş: `P00128`
- Mal kabul: `R00111`
- Alış fatura: `AF00089`
- İş emri: `E00261`
- Sevk: `SE00108`
- İrsaliye: `IR00119`
- Satış fatura: `FA00074`
- Ekranlar: satis-teklifleri, satis-siparisleri, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, giris-kontrolleri, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri, depo-bakiye

## ADGIDA-MRP — Kuru kayısı — MRP planlama

- Firma / iş yeri: **ADGIDA** / `IY-GIDA-FAB2`
- MRP: **kullanıldı**
- Mamul: `GIDA-MM-02` × 60
- Satış siparişi: `B00167`
- Bağımsız ihtiyaç: `BI00039`
- MRP çalışması: `MR00046` (net satır: 3)
- SA talep: `L00063`
- SA sipariş: `P00129`
- Mal kabul: `R00112`
- Alış fatura: `AF00090`
- İş emirleri: `E00263`, `E00262`
- Sevk: `SE00109`
- İrsaliye: `IR00120`
- Satış fatura: `FA00075`
- Ekranlar: satis-siparisleri, mrp-bagimsiz-ihtiyac, mrp-sonuclari, mrp-calismalari, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri

## EGEPACK-MAN — Doy-Pack poşet — manuel planlama

- Firma / iş yeri: **EGEPACK** / `IY-AMB-FAB1`
- MRP: **kullanılmadı**
- Mamul: `AMB-MM-01` × 500
- Satış teklifi: `ST00051`
- Satış siparişi: `B00168`
- SA talep: `L00064`
- SA sipariş: `P00130`
- Mal kabul: `R00113`
- Alış fatura: `AF00091`
- İş emri: `E00264`
- Sevk: `SE00110`
- İrsaliye: `IR00121`
- Satış fatura: `FA00076`
- Ekranlar: satis-teklifleri, satis-siparisleri, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, giris-kontrolleri, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri, depo-bakiye

## EGEPACK-MRP — Shrink film — MRP planlama

- Firma / iş yeri: **EGEPACK** / `IY-AMB-FAB1`
- MRP: **kullanıldı**
- Mamul: `AMB-MM-02` × 200
- Satış siparişi: `B00169`
- Bağımsız ihtiyaç: `BI00040`
- MRP çalışması: `MR00047` (net satır: 2)
- SA talep: `L00065`
- SA sipariş: `P00131`
- Mal kabul: `R00114`
- Alış fatura: `AF00092`
- İş emirleri: `E00266`, `E00265`
- Sevk: `SE00111`
- İrsaliye: `IR00122`
- Satış fatura: `FA00077`
- Ekranlar: satis-siparisleri, mrp-bagimsiz-ihtiyac, mrp-sonuclari, mrp-calismalari, satin-alma-talepleri, satin-alma-siparisleri, mal-kabuller, kk-emirleri, uretim-emirleri, sevk-emirleri, irsaliyeler, faturalar, stok-hareketleri

## Zaman çizelgesi (özet)

- 20.11.2026 15:28:54 —   SO: B00166
- 20.11.2026 15:28:54 —   ✓ ADGIDA-MAN tamam
- 20.11.2026 15:28:54 —   SO: B00167
- 20.11.2026 15:28:54 —   MRP: MR00046 satır=14
- 20.11.2026 15:28:54 —   ✓ ADGIDA-MRP tamam
- 20.11.2026 15:28:54 —   SO: B00168
- 20.11.2026 15:28:54 —   ✓ EGEPACK-MAN tamam
- 20.11.2026 15:28:54 —   SO: B00169
- 20.11.2026 15:28:54 —   MRP: MR00047 satır=5
- 20.11.2026 15:28:55 —   ✓ EGEPACK-MRP tamam
