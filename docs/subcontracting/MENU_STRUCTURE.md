# Fason Menü ve Ekran Hiyerarşisi

## Karar

Ayrı bir ana “Fason” modülü **oluşturulmadı**. Süreç Üretim menüsü altında **Fason Operasyon** grubunda toplandı; cari/rota/WO mevcut ekranlarda genişletildi. Böylece aynı işlev farklı modüllerde tekrarlanmaz.

## Hiyerarşi

```
Üretim Yönetimi
└── Fason Operasyon
    ├── Fason Operasyon Takibi          (fason-operasyon-takip)
    ├── Fason Siparişleri               (fason-siparisleri)
    ├── Fason Operasyon Tanımları       (fason-operasyonlari)
    ├── Fason Fiyat Tarifeleri          (fason-fiyatlari)
    ├── Fason Parametreleri             (fason-parametreleri)
    ├── Fasona Malzeme Sevki            (fason-sevkiyatlar)
    ├── Fason Malzeme Tüketimi          (fason-tuketimler)
    ├── Fason Ürün Teslim Alma          (fason-teslimatlar)
    └── Fasoncu Emanet Stokları         (fason-emanet-stok)
```

## Mevcut ekran genişletmeleri (aynı screenId)

| Ekran | Eklenen |
|-------|---------|
| Cari Kart | Fasoncu checkbox + kapasite / lead / min qty / fiyat yöntemi / kalite skoru |
| Üretim Rotası / Operasyon | Fason operasyon, varsayılan fasoncu, fiyat, PB, lead |
| Üretim Emri | Fason emri, fasoncu lookup |
| Ürün Ağacı satır | Komp. tipi `Fason` (mevcut) |

## Lookup’lar

| Anahtar | Kaynak |
|---------|--------|
| `partners-fasoncu` | `/partners?is_subcontractor=true&is_active=true` |
| `fason-operasyonlari` | `/fason/operasyonlar` |
| `fason-siparisleri` | `/fason/siparisler` |

## Neden Satınalma / Stok altında ayrı kopyalar yok?

- Sevk ve emanet stok **gerçek stok hareketi** olduğu için Fason ekranlarından yönetilir; depo bakiyesi stok modülünde görünür.
- Hizmet faturası **mevcut alış faturası** ekranıyla bağlanır; ikinci fatura ekranı yok.
- Kalite **mevcut GKK** altyapısına teslimattan bağlanır.

## Raporlama

- `/fason/rapor/ozet` — sipariş / emanet özeti
- Detaylı maliyet / kalite performans raporları: maliyet satırları + mevcut rapor altyapısı üzerinden genişletilebilir
