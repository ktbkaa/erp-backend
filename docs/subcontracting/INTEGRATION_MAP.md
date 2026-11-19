# Modüller Arası Entegrasyon Haritası

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Üretim WO  │────▶│ Fason Sipariş│────▶│  Satınalma  │
│  / Rota     │     │  /fason/*    │     │  Alış Fat.  │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       │            ┌──────▼───────┐            │
       │            │ Stok Motoru  │            │
       │            │ Sevk/Tük/İade│            │
       │            │ Emanet depo  │            │
       │            └──────┬───────┘            │
       │                   │                    │
       │            ┌──────▼───────┐     ┌──────▼──────┐
       └───────────▶│   Kalite GKK │────▶│  Maliyet    │
                    └──────────────┘     │  Muhasebe   │
                                         └─────────────┘
```

| Kaynak | Hedef | Mekanizma |
|--------|-------|-----------|
| Rota op | WO op | Kopyalama `is_subcontract` |
| WO op | Fason sipariş | API oluştur / is-emri siparis-olustur |
| Sipariş | Sevk | POST `.../sevk` → createStockMovement TRANSFER |
| Sevk | Emanet bakiye | warehouse FasonEmanet + partner_id |
| Sipariş | Tüketim | POST `.../tuketim` → emanet↓ + üretim tüketimi |
| Sipariş | Teslimat | POST `.../teslimat` → stok girişi |
| Teslimat | KK | POST `.../kalite` / qc_orders |
| Sipariş | Maliyet | `subcontract_cost_entries` |
| Sipariş | Fatura | Mevcut alış faturası + sipariş referansı |
| Partner | Lookup | `partners-fasoncu` |
| Onay | Sipariş | Parametre + onay modülü |
| MRP | Lead/kapasite | Partner alanları (öneri tipi sonraki faz) |
