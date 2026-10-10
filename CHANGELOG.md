# Changelog

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
