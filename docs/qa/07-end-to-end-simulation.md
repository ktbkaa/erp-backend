# Uçtan Uca Simülasyon — GIDA (Anadolu Süt)

**Tarih:** 2026-11-05 (Europe/Istanbul)  
**Firma:** GIDA / Anadolu Süt ve Süt Ürünleri A.Ş. (id=9)  
**Etiketler:** `TEST-SUT-BASE`, `TEST-SUT-MAN`, `TEST-SUT-MRP`  
**Kanıt özeti:** `docs/erp-full-cycle-test/evidence/gida-tam-dongu-ozet.json`

## Kurulum
1. `node scripts/qa/ensure-gida-org.js` — org + depolar  
2. `owner` kullanıcısı (SA onay rolleri)  
3. `npm run demo:gida-dongu`

## TEST-SUT-MAN (MRP’siz) — sonuç

| Adım | Belge | Sonuç |
|---|---|---|
| Teklif | ST00003 | OK |
| Satış siparişi | B00010 | OK |
| SA talep | L00002 | OK |
| SA sipariş + onay | P00020 / NK00001 | OK |
| Mal kabul | R00019 | OK |
| Üretim emri | E00009 | OK |
| Sevk | SE00008 | OK |
| İrsaliye onay | IR00009 Onayli | OK |
| Alış fatura | AF00001 | OK |
| Satış fatura | FA00009 → MB00001 | OK (GL seed sonrası muhasebeleştirildi) |

## TEST-SUT-MRP — sonuç

| Adım | Belge | Sonuç |
|---|---|---|
| Satış siparişi | B00011 | OK |
| Bağımsız ihtiyaç | BI00003 | OK |
| MRP çalıştırma | MR00006 | OK (6 satır) |
| MRP→SA talep | — | FAIL (net satınalma önerisi yok) |
| MRP→UE | E00010 (yedek) | Kısmi |
| İrsaliye onay | IR00010 | FAIL (yetersiz bakiye) |
| Satış fatura | — | Atlandı |

## İş süreci kapsamı (bu tur)
- MAN yolu: ~95% (muhasebe dahil)  
- MRP yolu: ~50%  
- CRM fırsat→teklif ayrı UI turu: kısmi (demo script CRM adımları içerir)  
- İK / bordro bu turda: kapsam dışı (ayrı sprint)

## Sonuç hükmü
Temel ticari döngü (talep→sipariş→mal kabul→üretim→sevkiyat→fatura→GL) **GIDA MAN etiketinde çalışıyor**.  
MRP’den otomatik talep üretimi ve rol matrisi tamamlanmadan “ticari hazır” denemez.
