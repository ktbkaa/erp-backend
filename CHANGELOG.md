# Changelog

## 0.3.0 — Satınalma + üretim döngüsü

- Ürün ağacı, rota, iş merkezi
- Satınalma talebi → sipariş → mal kabul (stok hareketi)
- Üretim emri + üretim girişi (tüketim + mamul giriş hareketleri)
- Depo bakiyesi API
- `npm run demo:cycle` uçtan uca senaryo
- Operasyon konsolu UI (`http://localhost:3000/`)

## 0.2.1 — Depo modülü

- `depolar.varsayilan` kolonu
- Depo eklerken iş yeri varlık kontrolü
- İş yerindeki ilk depo otomatik Ana Depo
- `GET /depolar/:id`

## 0.2.0 — Altyapı (A1)

- `.env` ile veritabanı yapılandırması
- `pg.Pool` + güvenli transaction yardımcısı
- SQL migration sistemi (`npm run migrate`)
- Depo, ölçü birimi, stok hareket iskeleti, belge numarası
- Sipariş satırına `stok_id`, siparişe `durum`
- Stok tipi / tedarik tipi
- `/health`, `/depolar`, `/olcu-birimleri`, `/stok-hareketleri`
- Mevcut route’larda validation ve hata yanıtlarının toparlanması

## 0.1.0 — Prototip iskelet

- Firma, iş yeri, stok, cari, fatura, kişi, sipariş CRUD API’leri (Gemini dönemi)
