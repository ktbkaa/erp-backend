# Fason Maliyet Kuralları

## Bileşenler

| Bileşen | Kaynak |
|---------|--------|
| Hammadde | BOM tüketimi + emanet tüketim |
| İç işçilik / iş merkezi | Mevcut WO maliyet |
| **Fason hizmet** | Sipariş birim fiyat × kabul/gerçekleşen miktar |
| Nakliye / ek | Manuel cost entry |
| Fire / kalite | Fire miktarı × malzeme maliyeti; ret maliyeti |

## Tahmini vs gerçekleşen

| Tür | Ne zaman |
|-----|----------|
| Tahmini | Sipariş / rota fiyatı × planlanan miktar |
| Gerçekleşen | Teslim/kabul miktarı × sipariş birim fiyatı; fatura tutarı ile uzlaştırma |

Sipariş satırındaki birim fiyat kilitlenir; tarife değişikliği eski siparişi değiştirmez.

## Çoklu fason op

Bir WO’da birden fazla fason operasyon → her biri ayrı sipariş/satır ve ayrı `subcontract_cost_entries` ile izlenir.

## Motor

Yeni bağımsız maliyet motoru **yok**. Mevcut WO maliyet yaklaşımlarına fason satırları eklenir (`fasonService` maliyet fonksiyonları).
