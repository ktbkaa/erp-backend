# Cari / Stok Kart — Referans Prompt Eşleştirme (Uyarlanmış)

Kaynak: `Cursor_Cari_Stok_Ekran_Entegrasyon_Promptu.docx`  
Uyarlama: KTB ERP mevcut mimarisi (`cursor/erp-crud-forms-4f63` temeli)

## Mimari özet

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express 5 + `pg.Pool` |
| DB | PostgreSQL + SQL migrations (`npm run migrate`) |
| UI | Statik `public/` konsol (menü, filtre, kart CRUD, alt sekme) |
| Çalıştırma | `npm start` → `http://localhost:3000/` |

## Mevcut → referans eşleştirme

| Özellik | Durum | Not |
|---------|-------|-----|
| Cari kod/ad/tür, iletişim, vergi, adres | **Mevcut — korunacak** | `cariler` + migration 007 |
| Cari detay satırları | **Mevcut ama sığ** | `cari_detaylari` → sevk/adres mantığına genişletilecek |
| Müşteri/tedarikçi kuralı | **Mevcut** | Satınalma yalnızca tedarikçi |
| Numaratör (M/T/C) | **Mevcut** | Yeni/Kopyala’da ilerler |
| Stok kod/ad/tip/tedarik/birim/fiyat | **Mevcut** | `stoklar` |
| Stok detay (boyut/ağırlık) | **Mevcut ama sığ** | Ölçü bilgilerine taşınacak |
| Stok bakiyesi hareketten | **Mevcut — korunacak** | Kartta bakiye elle değişmez |
| Cari banka / dil / sevk grid | **Eksik — eklenecek** | Alt tablolar |
| Stok birim tanımları / dönüşüm | **Eksik — eklenecek** | `stok_birim_tanimlari` + `olcu_birimleri` lookup |
| Lookup (sarı alan) | **Kısmen** | Tip select vardı; iş yeri/birim/firma lookup eklenecek |
| Zorunlu alan (kırmızı) | **Kısmen** | UI+API zorunluluk güçlendirilecek |
| e-Uyum, Kategoriler, Ek Alanlar, MRP, Barkod… | **Görüntüden doğrulanamadı** | Sekme iskeleti + “kapsam netleşecek”; sahte CRUD yok |
| VKN dış servis ara | **Yok** | Simüle edilmeyecek |
| Haritada göster / Adres no bul | **Yok** | Dış servis yok; şimdilik yok |

## Bu turda uygulanan kapsam

1. Cari ana kart alan genişletmesi + sekmeler: Cari Kart, Banka, Sevk, Genel, Dil (+ stub sekmeler)
2. Stok ana kart genişletmesi + sekmeler: Stok Kart, Ölçü Bilgileri, Birim Tanımları (+ stub sekmeler)
3. Lookup: iş yeri, firma, ölçü birimi
4. Zorunlu: cari kod/ad/tür, stok kod/ad (UI + API)
5. Doküman güncellemesi (`09` + bu dosya)

## Onay gerektiren / ertelelenen

- e-Fatura / e-Uyum entegrasyonu
- VKN/TCKN dış sorgu
- Muhasebe hesap / risk grubu ana verileri (tablolar yok)
- Stok Barkod, Alternatif, Matris, Tekstil vb. sekmelerin tam modeli
