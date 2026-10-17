# Ticari ERP Standart — Gap Analizi ve Aşama Planı

Tarih: 2026-10-17 · Dal: `cursor/erp-ticari-standart-4f63`  
Kaynaklar: kod (migrations 001–028, `public/app.js` 77 ekran), `docs/01–26`, Canias/Uyumsoft/CRM CSV’ler, MRP kılavuzu.

## Erişilebilir / erişilemeyen kaynaklar

| Kaynak | Durum |
|--------|--------|
| `docs/*.md`, `*.csv` | Okundu |
| `16_*.docx`, `17_*.docx`, günlük rapor docx | Binary; metin çıkarıldı veya CSV ile eşlendi |
| Canias/Odoo YouTube videoları | Önceki oturum analizleri + mevcut model; bu oturumda yeniden stream edilmedi |
| Harici eğitim PDF arşivleri (repo dışı) | **Erişilemedi** — analiz edilmiş gibi gösterilmedi |

**Not:** `17_DALGA_A_*` CSV’sindeki birçok `YAPILMADI` satırı migrations `018–028` ile kapanmıştır; güncel durum kod envanterine göre düzeltilmiştir.

## Modül durumu (özet)

| Alan | Durum | Not |
|------|--------|-----|
| Platform (auth, yetki, audit, numaratör, çok firma) | Kısmi | JWT var; `AUTH_ZORUNLU` varsayılan Hayır; alan seviyesi audit yok |
| Ana veriler (ülke/il/ilçe, PB, UOM, kategori) | Kısmi | Ödeme/teslimat koşulu, dil, banka, kur tabloları eksikti → Aşama 1 |
| Cari | Kısmi | Zengin kart; e-Uyum/VKN servis yok |
| Malzeme | Kısmi | Varyant/konfigüratör yok |
| CRM / Satış zinciri | Kısmi–güçlü | Kampanya/anket yok; e-fatura gönderim yok |
| Satınalma | Kısmi–güçlü | RFQ→PO→mal kabul→fatura var |
| Stok | Kısmi | Ad-hoc transfer/sayım var; **emir belgeleri** Aşama 1 |
| Üretim + MRP | Kısmi | CRP/OEE/varyant BOM yok |
| Kalite | Kısmi | GKK/ÇKK + CAPA; derin proses KK UI sınırlı |
| Finans | Kısmi | COA/fiş/mizan; dönem kapama/portföy yok |
| İK | Eksik | — |
| Bakım | Eksik | — |
| Raporlama | Kısmi | Kokpit + mizan; BI yok |

## Öncelik matrisi (güncel)

Önceki skorlar (16_CANIAS) korundu; **Yeni** sütunu ticari ürün standardına göre 1–5.

| Kod | Madde | Eski skor | Yeni | Durum | Aşama |
|-----|-------|-----------|------|--------|-------|
| MDM-OK | Ödeme / teslimat koşulu tanımı | P15 kısmi | **5** | Aşama 1 | 1 |
| MDM-DIL | Dil tanımı master | — | **4** | Aşama 1 | 1 |
| MDM-BNK | Banka tanımı master | — | **4** | Aşama 1 | 1 |
| MDM-KUR | Döviz kurları | — | **5** | Aşama 1 | 1 |
| INV-TRO | Transfer emri (onay→çift hareket) | P08 | **5** | Aşama 1 | 1 |
| INV-SAY | Sayım belgesi (onay→düzeltme) | P09 | **5** | Aşama 1 | 1 |
| PLT-AUTH | AUTH_ZORUNLU + ACL enforce | P20 | **5** | Kısmi (param+doküman); soft enforce devam | 2 |
| PLT-FIRMA | Detay GET firma izolasyonu | P14 | **5** | Kısmi | 2 |
| INV-ATP | ATP zorunlu blok | P11 | **4** | Aşama 1 parametre | 1 |
| FIN-GL | Belge→muhasebe sertleştirme | P16 | **4** | Sonraki | 2 |
| PLT-AUD | Alan seviyesi audit | P21 | **4** | Sonraki | 2 |
| HR-* | İK modülü | — | **3** | Planlı | 3 |
| MNT-* | Bakım modülü | — | **3** | Planlı | 3 |
| CAP | Kapasite / CRP | P23 | **2** | Bilinçli erteleme | 4 |
| GIB | e-Fatura GİB | P19 | **2** | Dış bağımlılık | 4 |

## Aşama 1 kapsamı (bu PR)

1. Referans tablolar: ödeme koşulları, teslimat koşulları, diller, bankalar, döviz kurları  
2. Belge alanlarında lookup (serbest metin yerine kod)  
3. Transfer emri + Sayım belgesi (CRUD + Onay → stok hareketi)  
4. `ATP_ZORUNLU` parametresi ile satış siparişinde kullanılabilir stok kontrolü  
5. Soft-delete (pasifleştirme) tanım kayıtlarında  
6. Testler + bu rapor

## Aşama 2+ (sıradaki)

- AUTH varsayılanı prod profili; tüm yazma route’larında ekran/depo yetkisi  
- Firma scope detay GET tamamı  
- Fatura→muhasebe / cari mutabakat sertleştirme  
- Seri izlenebilirlik UI, PDF çıktı, SMTP prod  
- İK ve Bakım iskeleti  
- Kapasite, GİB, varyant BOM

## Bağımlılık sırası

```
Ana veriler (koşul/dil/banka/kur)
    → Belge alan lookup’ları
        → Transfer emri / Sayım belgesi
            → ATP
                → Auth/ACL sertleştirme
                    → FIN köprüsü / İK / Bakım
```
