# Kod Sistemi

Tüm ana veri ve belge kodları aynı kuralı kullanır:

**1 sessiz harf + 5 rakam** → `M00001`, `H00001`, `T00001`

Üretim: `src/utils/kodUretici.js` + tablo `kod_serileri`

## Ana veri önekleri

| Önek | Seri | Kullanım |
|------|------|----------|
| F | FIRMA | Firma |
| I | ISYERI | İş yeri |
| D | DEPO | Depo |
| M | MUSTERI | Müşteri cari |
| T | TEDARIKCI | Tedarikçi cari |
| C | CARI_HERIKISI | Hem müşteri hem tedarikçi |
| H | HAMMADDE | Hammadde stok |
| Y | YARIMAMUL | Yarı mamul stok |
| U | MAMUL | Mamul / ürün stok |
| S | TICARI | Ticari stok |
| K | KISI | Kişi |

## Belge önekleri

| Önek | Seri | Belge |
|------|------|-------|
| L | SATINALMA_TALEP | Satınalma talebi |
| P | SATINALMA_SIPARIS | Satınalma siparişi |
| R | MAL_KABUL | Mal kabul |
| E | URETIM_EMRI | Üretim emri |
| G | URETIM_GIRIS | Üretim girişi |
| V | STOK_HAREKET | Stok hareketi |
| B | SATIS_SIPARIS | Satış siparişi (sonraki) |

## Cari kuralları

- Satınalma siparişi → yalnızca `Tedarikci` veya `HerIkisi`
- Satış siparişi → yalnızca `Musteri` veya `HerIkisi` (satış modülünde)

Kod verilmezse sistem otomatik üretir.
