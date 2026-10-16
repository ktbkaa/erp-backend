# CRM Modülü Entegrasyon Raporu

Tarih: 2026-10-16  
Kaynak: Uyumsoft WebERP CRM eğitim PDF’leri + Canias satış omurgası  
Dal: `cursor/erp-crm-modul-4f63`

## 1. Mevcut durum (öncesi)

- CRM tablosu/ekranı yoktu; önceki Uyumsoft dalgasında CRM bilinçli atlanmıştı.
- Mevcut omurga: `cariler`, `kisiler` (iç kullanıcı), `satis_teklifleri` → sipariş zinciri.
- Uyumsoft “Müşteriler” ekranı = projedeki **Cari Kartları** (Musteri); yeniden oluşturulmadı.

## 2. Doküman analizi → seçim

| Uyumsoft | Karar | Canias uyarlaması |
|---|---|---|
| Müşteri Adayları + Dönüştür | **Alındı** | `crm_adaylar` → cariye dönüşüm |
| Fırsatlar + ürünler + kapat | **Alındı** | `crm_firsatlar` + satırlar + aşama |
| Faaliyet / Faaliyet Planı | **Alındı** | `crm_faaliyetler`, `crm_faaliyet_planlari` |
| Kontak (yetkili) | **Alındı** | `crm_kontaklar` (cari veya aday) |
| Fırsat → Satış teklifi | **Alındı** | `teklife-donustur` + `satis_teklifleri.firsat_id` |
| Kampanya / Anket | **Atlandı** | Ağır; ilk dalgada değer/risk oranı düşük |
| Ajanda UI | **Atlandı** | Plan listesi yeterli |
| Görevler | **Eklendi** (dokümanda yok) | Profesyonel CRM olmazsa olmaz |

## 3. Veritabanı (`017_crm_modul.sql`)

**Parametre:** `crm_firsat_asamalari`, `crm_faaliyet_tipleri`  
**İşlem:** `crm_adaylar`, `crm_kontaklar`, `crm_firsatlar`, `crm_firsat_satirlari`, `crm_faaliyet_planlari`, `crm_faaliyetler`, `crm_gorevler`  
**Entegrasyon:** `satis_teklifleri.firsat_id`, `satis_teklifleri.aday_id`  
**Numaratör:** CRM_ADAY, CRM_FIRSAT, CRM_FAALIYET, CRM_PLAN, CRM_KONTAK, CRM_GOREV

## 4. Ekranlar (modül: CRM)

| Ekran | Endpoint | Öne çıkan işlev |
|---|---|---|
| Fırsat Aşamaları | `/crm-firsat-asamalari` | Tanım |
| Faaliyet Tipleri | `/crm-faaliyet-tipleri` | Tanım |
| Müşteri Adayları | `/crm-adaylar` | Cariye Dönüştür |
| Kontaklar | `/crm-kontaklar` | Cari/aday bağ |
| Fırsatlar | `/crm-firsatlar` | Ürün satırları, Teklife Dönüştür, Kapat API |
| Faaliyet Planları | `/crm-faaliyet-planlari` | Faaliyet Oluştur |
| Faaliyetler | `/crm-faaliyetler` | Gerçekleşen aktivite |
| Görevler | `/crm-gorevler` | Tamamla |

Satış Teklifleri ekranına `firsat_id` / `aday_id` alanları eklendi.

## 5. Modüller arası akış

```
Aday → (Dönüştür) → Cari (Musteri)
Aday/Cari → Fırsat (+ stok satırları)
Fırsat → Faaliyet Planı → Faaliyet
Fırsat → Satış Teklifi → (mevcut) Sipariş → Sevk → İrsaliye → Fatura
Fırsat/Aday/Cari → Görev
```

## 6. Varsayımlar

- CRM müşteri kartı = mevcut cari; ayrı CRM müşteri tablosu yok.
- Fırsat aşamaları sabit kodlu parametre tablosu (YENI…KAZANILDI/KAYBEDILDI).
- Adaylı fırsattan teklif için önce cari dönüşümü veya `cari_id` gerekir.
- `kisiler` = sorumlu/takip eden (iç kullanıcı); müşteri yetkilisi = `crm_kontaklar`.
- Kampanya / anket / ajanda takvim UI sonraki dalga.

## 7. Test sonuçları

| Senaryo | Sonuç |
|---|---|
| Migration 017 | OK |
| Aday + kontak + fırsat + satır | OK |
| Plan + faaliyet + görev | OK |
| Aday → cari dönüşüm (açık fırsat cariye bağlanır) | OK |
| Fırsat → satış teklifi (`firsat_kodu` bağlı) | OK |
| Fırsat kapat (Kazanildi) | OK |
| Görev tamamla | OK |
| UI listeleri (CRM menü + teklif fırsat kolonu) | OK |

## 8. Kalan eksikler

- Fırsat formunda “Kapat” için ayrı UI butonu (API + dialog hazır; birincil buton Teklife Dönüştür)
- Kampanya / anket
- Ajanda/takvim görünümü
- Yetkilendirme (rol bazlı CRM erişimi) — sistem genelinde henüz yok
- `kisiler` boşsa sorumlu lookup boş kalır (iç kullanıcı seed’i ortam bağımlı)
