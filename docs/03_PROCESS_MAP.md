# Aşama 3 — ERP Süreç Haritası

## Organizasyon

```text
Firma
  ↓
İş Yeri
  ↓
Depo
  ↓
Stok Kartı  ↔  Stok / İş Yeri / Depo bağlantısı
Cari Kart   ↔  Cari / İş Yeri bağlantısı
Kullanıcı   ↔  (ileride) Rol / Yetki
```

## Ana veri hazırlığı

```text
Ölçü Birimi
  ↓
Stok Kartı (malzeme tipi, tedarik tipi)
  ↓
(Üretim malzemesi ise)
Ürün Ağacı + Rota (+ İş Merkezi)
```

## Satın alma akışı (ilk sürüm)

```text
Satın Alma Siparişi (taslak)
  ↓
Sipariş Onayı
  ↓
Depo Giriş / Mal Kabul  (sipariş satırına bağlı, kalan miktar)
  ↓
Stok Hareketi (giriş)
  ↓
(opsiyonel sonraki aşama) Alış Faturası / Fatura Kontrol
```

## Satış akışı (ilk sürüm)

```text
Satış Siparişi
  ↓
Sevk (sipariş satırından; fazla sevk engeli)
  ↓
Depo Çıkışı = Stok Hareketi (çıkış)
  ↓
İrsaliye  (sevk ile ilişkili)
  ↓
Fatura    (irsaliye / sevk satırlarıyla ilişkili)
```

## Üretim akışı (ilk sürüm)

```text
Ürün Ağacı + Rota
  ↓
Üretim İş Emri  (BOM/rota kopyası, planlanan miktar)
  ↓
Üretim Girişi / Onay
  ├─→ Hammadde tüketim stok hareketleri
  └─→ Mamul giriş stok hareketi (hedef depo)
```

## Stok motoru (merkez)

```text
                    ┌──────────────────┐
 Satınalma girişi → │                  │
 Satış çıkışı     → │  Stok Hareketi   │ → Depo + Stok bakiyesi
 Üretim tüketim   → │  (tek kaynak)    │
 Üretim mamul     → │                  │
 (sonra) Transfer → └──────────────────┘
```

## Uçtan uca hedef zincir

```text
Firma → İş Yeri → Kullanıcı
  → Stok / Depo → Cari
  → Satın Alma → Stok Girişi
  → Üretim → Mamul Stok
  → Satış → Sevk → Depo Çıkışı → İrsaliye → Fatura
```
)
