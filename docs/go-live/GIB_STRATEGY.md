# GİB / e-Belge Stratejisi (Go-live)

**Tarih:** 19 Kasım 2026 (Europe/Istanbul)  
**Karar (v1):** Canlı GİB gönderimi **kapsam dışı / harici entegratör**. Sistem kuyruk + simülasyon + durum alanlarını tutar; sahte “Gönderildi” canlı ACK olmadan yazılmaz.

## Kurallar

| Parametre | Anlam |
|-----------|--------|
| `GIB_CANLI=Hayir` (varsayılan) | Yalnızca `simulate=true` ile `Gonderildi` (SIM-* / GIB-SIM-*) |
| `GIB_CANLI=Evet` + `provider_code` yok | Canlı istek → `Hata` |
| `GIB_CANLI=Evet` + `provider_code` dolu | Canlı adapter henüz yok → `Kuyrukta` + `live-pending` (sahte Gonderildi yok) |

## v1 müşteri sözleşmesi

1. e-Fatura / e-İrsaliye / e-Defter **entegratör veya GİB portal** üzerinden işletilir.
2. KTB ERP belgeyi hazırlar, UUID/ETTN alanlarını saklar, kuyruklar.
3. Entegratör ACK geldikten sonra durum manuel veya API ile güncellenir.

## Sonraki faz

- Uyumsoft / Logo / özel SOAP-REST adapter
- İmza / mali mühür
- e-Defter berat paketleri

Dosya: `src/services/eBelgeAdapterService.js`, `routes/e_belge.js`, migration `091`.
