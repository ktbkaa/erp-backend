# Modüller Arası Entegrasyon Test Sonuçları

**Tarih:** 2026-11-05 Europe/Istanbul  
**Kaynak:** GIDA `demo:gida-dongu` + API/DB doğrulama

| Bağlantı | Kanıt belge | Sonuç | Not |
|---|---|---|---|
| CRM/teklif → satış siparişi | ST00003 → B00010 | PASS | MAN |
| Satış → satınalma talep | B00010 → L00002 | PASS | |
| SA talep → SA sipariş | L00002 → P00020 | PASS | |
| SA sipariş → onay | P00020 → NK00001 | PASS | owner rolleri |
| SA sipariş → mal kabul | P00020 → R00019 | PASS | |
| Mal kabul → stok | R00019 | PASS | bakiye artışı |
| Üretim emri → mamul | E00009 | PASS | |
| Sevk → irsaliye | SE00008 → IR00009 | PASS | Onayli |
| Satış fatura → muhasebe | FA00009 → MB00001 | PASS | GL seed (`ensure-finance-seed`) sonrası |
| Alış fatura | AF00001 | PASS | oluşturuldu |
| MRP → SA talep | MR00006 | FAIL | net satınalma önerisi yok |
| MRP → UE | E00010 yedek | PARTIAL | otomatik değil |
| MRP sevkiyat → irsaliye onay | IR00010 | FAIL | yetersiz bakiye |

## Özet
- MAN zinciri: 10/10 kritik adım yeşil (muhasebe seed sonrası)
- MRP zinciri: 2/5 tam, 1 kısmi, 2 fail
