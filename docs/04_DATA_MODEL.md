# Aşama 4 — Veri Modeli (SQL öncesi entity taslağı)

Bu liste henüz migration değildir. Onay sonrası şemaya dönüştürülecektir.

## Organizasyon ve güvenlik

| Entity | Açıklama |
|--------|----------|
| Company | Firma |
| Workplace | İş yeri (Company FK) |
| Warehouse | Depo (Workplace FK) |
| User | Kullanıcı / kişi |
| Role | Rol (basit; sonra genişler) |

## Ana veriler

| Entity | Açıklama |
|--------|----------|
| UnitOfMeasure | Ölçü birimi |
| StockCard | Stok / malzeme kartı |
| StockWorkplace | Stok–iş yeri bağlantısı |
| StockWarehouse | Stok–depo kullanılabilirlik (gerekirse) |
| CurrentAccount | Cari (müşteri/tedarikçi/her ikisi) |
| CurrentAccountWorkplace | Cari–iş yeri bağlantısı |
| WorkCenter | İş merkezi |

## Stok motoru

| Entity | Açıklama |
|--------|----------|
| StockMovement | Hareket başlığı (tip, belge ref, depo, tarih) |
| StockMovementLine | Hareket satırı (stok, miktar, yön) |

Bakiye: hareketlerden hesaplanır (veya ileride materialized bakiye tablosu).

## Üretim

| Entity | Açıklama |
|--------|----------|
| ProductTree | Ürün ağacı başlığı (mamul stok) |
| ProductTreeLine | Bileşen satırları |
| Route | Rota başlığı |
| RouteOperation | Operasyon satırları (iş merkezi, sıra) |
| ProductionOrder | İş emri |
| ProductionOrderComponent | Emir bileşenleri (BOM kopyası) |
| ProductionReceipt | Üretim girişi / onay |
| ProductionConsumption | Tüketim kaydı (hareket ile bağlı) |

## Satın alma

| Entity | Açıklama |
|--------|----------|
| PurchaseOrder | Satınalma siparişi |
| PurchaseOrderLine | Satır (sipariş / girilen / kalan miktar) |
| GoodsReceipt | Depo giriş belgesi |
| GoodsReceiptLine | Giriş satırı (PO satırına FK) |

## Satış / sevkiyat / fatura

| Entity | Açıklama |
|--------|----------|
| SalesOrder | Satış siparişi |
| SalesOrderLine | Satır (sipariş / sevk / kalan) |
| Shipment | Sevk |
| ShipmentLine | Sevk satırı (SO satırına FK) |
| DeliveryNote | İrsaliye |
| DeliveryNoteLine | İrsaliye satırı |
| Invoice | Fatura |
| InvoiceLine | Fatura satırı |

## Belge ilişkisi ilkeleri

1. Her türeyen belge kaynak belge/satır FK’si taşır.
2. Satırda `ordered_qty`, `fulfilled_qty`, `remaining_qty` (veya hesaplanan kalan) izlenir.
3. Stok etkileyen her işlem `StockMovement` üretir.
4. Metin kopyaları (stok adı vb.) rapor kolaylığı için saklanabilir; ilişki yine FK ile kurulur.

## Mevcut tablolara not

Bugünkü `siparisler` hem alış hem satış gibi kullanılıyor. Öneri:
- Ayrı `purchase_orders` / `sales_orders` tabloları **veya**
- Tek `orders` + zorunlu `order_side` (PURCHASE/SALES) + süreç alanları.

**Sistem tasarımı açısından öneri:** Ayrı tablolar daha temiz belge zinciri ve yetki sağlar. Mevcut `siparisler` verisi migration ile taşınabilir.
)
