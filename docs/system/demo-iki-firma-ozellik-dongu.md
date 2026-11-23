# İki Firma Özellik Döngüsü

Oluşturulma: 23.11.2026 07:11:25 (Europe/Istanbul)

## DEMO

| Özellik | Detay |
|---|---|
| CRM Aday | AD00004 |
| CRM Fırsat | FS00004 |
| CRM Faaliyet | — |
| CRM Görev | — |
| Satış Teklifi | ST00004 |
| Satış Siparişi | B00007 |
| Stok Rezervasyon | B00007 |
| RFQ / Teklif İstek | QI00004 |
| SA Teklif | QF00004 |
| SA Anlaşma | QA00002 |
| SA Talep | L00011 |
| SA Sipariş | P00008 |
| Mal Kabul | R00008 |
| Transfer Emri | TE00007 |
| Sayım Belgesi | SB00004 |
| Sevk Emri | SE00007 |
| İrsaliye | IR00004 |
| Fatura | — |
| Tahsilat/Ödeme | — |
| Döviz Kuru | USD/TRY |
| Muhasebe Belgesi | — |
| Fiyat Listesi | — |

Belgeler: ```{"crm_aday":"AD00004","crm_firsat":"FS00004","satis_teklif":"ST00004","satis_siparis":"B00007","rfq":"QI00004","sa_talep":"L00011","sa_siparis":"P00008","mal_kabul":"R00008","transfer":"TE00007","sayim":"SB00004","sevk":"SE00007","irsaliye":"IR00004"}```

## GIDA

| Özellik | Detay |
|---|---|
| Master veri | stok+BOM+rota+4 depo |
| Lot/Parti | SUT-086120 |
| KK Kontrol Planı | STD-GKK |
| KK Stok-Plan Bağı | — |
| SA Talep | L00012 |
| SA Sipariş | P00009 |
| Mal Kabul (GKK depoya) | R00009 |
| GKK Emri | QE00006 |
| GKK Onay | — |
| KK Uygunsuzluk | — |
| Stok Açılış Hareketi | — |
| MRP Bağımsız İhtiyaç | BI00004 |
| MRP Çalışması | MR00004 net=2 |
| MRP → SA Talep | — |
| Üretim Emri | E00005 |
| Üretim Operasyonları | 1 adım |
| Transfer (soğuk zincir) | — |
| Satış Siparişi | B00008 |
| Sevk Emri | — |
| Fatura | FA00008 |
| Fiyat Listesi | — |
| Tedarikçi Değerlendirme | — |

Belgeler: ```{"parti":"SUT-086120","sa_siparis":"P00009","mal_kabul":"R00009","gkk":"QE00006","mrp_bi":"BI00004","mrp":"MR00004","uretim_emri":"E00005","satis_siparis":"B00008","fatura":"FA00008"}```

