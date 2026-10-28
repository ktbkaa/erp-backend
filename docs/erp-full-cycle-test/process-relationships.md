# Süreç İlişki Haritası — GIDA TEST-SUT

```
Malzeme (TEST-SUT-*) 
  → BOM (A…) → Rota (O…) → İş Merkezi (GIDA-IM1/MC-SUT-01)
  → Fiyat listesi → Cari (müşteri/tedarikçi)

Satış teklifi → Satış siparişi
  ├─→ MRP run → SA talep → SA sipariş → Mal kabul
  │     → Giriş Depo → Giriş Kontrol → GKK → Hammadde
  │     → Alış fatura → Muhasebe fişi
  └─→ Üretim emri (plan/doğrudan)
        → Op tüketim (HMD) → Op çıktı (CKK) → CKK onay → Mamul/YM
        → Sevk → İrsaliye (stok çıkış) → Satış fatura → Muhasebe fişi
```

Belge kimlikleri: `evidence/gida-tam-dongu-ozet.json` (MAN/MRP).
