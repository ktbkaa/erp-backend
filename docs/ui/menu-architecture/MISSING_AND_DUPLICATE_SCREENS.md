# Eksik ve Mükerrer Ekranlar

## Menüde olmayan (kodda duran) ekranlar

| Ekran ID | Modül (saklama) | Durum | Not |
|---|---|---|---|
| `satin-alma-teklif-istekleri` | satinalma | hidden + deprecated | Ayrı RFQ süreci tamamlanana kadar menüye alınmadı |
| `vergi-kodlari` | finans | hidden + deprecated | Aynı endpoint `/finans-vergi-kodlari`; menüde yalnızca `finans-vergi-kodlari` |

## Mükerrer / paylaşımlı endpoint adayları

| Konu | Ekranlar | Sonuç |
|---|---|---|
| Vergi kodları | vergi-kodlari, finans-vergi-kodlari | Menüde tek kayıt (finans-vergi-kodlari); diğeri orphan |
| MRP çalışma/sonuç | mrp-calisma, mrp-sonuclar, mrp-hesap | Farklı UX; hepsi Stok > MRP Planlama |
| Üretim girişleri | uretim-girisleri, hizli-uretim-girisi | Farklı giriş deneyimleri; ikisi de Üretim Gerçekleşme |
| İrsaliye/fatura | irsaliye-yonetimi, fatura-yonetimi, tedarikci-irsaliyeleri | Satış vs alış süreçleri; ortak altyapı olabilir, menüde ayrı |

## Excel'de olup kodda gizli olanlar

- Satınalma Teklif İstekleri → kodda var, menü dışı (deprecated).
- Vergi Kodları (Sabit Tanımlar altında Excel kaydı) → finans-vergi-kodlari ile karşılandı.

## Henüz geliştirilmemiş öneriler (menüye eklenmedi)

Bu liste yalnızca ürün yol haritası önerisidir; menüye sahte ekran eklenmedi.

- Satınalma: aktif Teklif İstekleri (RFQ) akışı
- Satış: Satış iade irsaliyesi / iade faturası ayrı ekranları
- Satınalma: Alış iade belgeleri
- Kalite: Üretim içi KK emirleri (proses kontrol)
- Finans: Cari yaşlandırma raporu (cari ekstre yanında)
- Stok: Seri/lot izlenebilirlik raporu
