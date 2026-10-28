# Türkiye İK / İş Mevzuatı Araştırması

**Kapsam:** ERP İK modülü tasarımı (özlük, süre, izin, bordro, çıkış)  
**Ülke:** TR  
**Araştırma tarihi:** 2026-10-28 (Europe/Istanbul)  
**Uygulama durumu:** Parametre seti `TR-2025` seed; oranlar dönemsel doğrulanmalı

## Birincil kaynaklar

| Konu | Kaynak | URL / referans | Geçerlilik notu |
|------|--------|----------------|-----------------|
| İş Kanunu | 4857 sayılı Kanun | https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5 | Çalışma süreleri, izin, fesih |
| Yıllık izin | Yıllık Ücretli İzin Yönetmeliği | mevzuat.gov.tr | Hak ediş / kullanım |
| SGK | 5510 sayılı Kanun | mevzuat.gov.tr | Prim, işe giriş/çıkış |
| Asgari ücret | CSGB | https://csgb.gov.tr (2025 asgari ücret duyurusu) | 2025 brüt 26.005,50 TL (seed) |
| Gelir vergisi | GİB / VUK tarifesi | https://www.gib.gov.tr | 2025 ücret tarifesi dilimleri |
| Damga | Damga Vergisi Kanunu | mevzuat.gov.tr | Ücret pusulası binde 7,59 |
| Hafta tatili / UBGT | 2429 / ilgili düzenlemeler | mevzuat.gov.tr | Resmî tatil takvimi |
| KVKK | 6698 sayılı Kanun | https://www.kvkk.gov.tr | Özlük / özel nitelikli veri |

## Özet kurallar (uygulama için)

### Çalışma süreleri (4857)

- Genel bakış: haftalık azami çalışma süresi kanunda düzenlenir; ara dinlenmesi ayrıca.
- Fazla çalışma / fazla sürelerle çalışma: onay, ücret çarpanı ve yıllık sınırlar politika + mevzuat ile.
- **ERP:** Planlanan / gerçekleşen / bordroya yansıyacak süre ayrılır; otomatik ödeme varsayılmaz.

### Yıllık izin (md. 53 asgari)

| Kıdem | Asgari gün |
|-------|------------|
| 1–5 yıl (dahil) | 14 |
| 5+ – 15 yıl | 20 |
| 15+ yıl | 26 |
| 18 yaş altı / 50+ | en az 20 |
| Yeraltı | +4 |

Hak ediş işe giriş yıldönümüne bağlıdır. `annualLeaveEntitlementDays` bu asgari tabloyu uygular.

### Bordro bileşenleri (işçi)

- SGK işçi %14, işsizlik işçi %1 (seed; tavan/matrah dönemsel).
- GV: kümülatif matrah + dilim; asgari ücret GV/damga istisnaları parametre.
- Damga: brüt × oran − istisna.

### Kıdem / ihbar

- Kıdem: koşullu (süre, fesih türü, tavan).
- İhbar: 4857 md.17 süreleri.
- **ERP:** Uygunluk bayrakları + ön tutar; İK uzmanı onayı olmadan kesin sonuç sayılmaz.

## Doğrulanması gerekenler (her dönem)

1. Asgari ücret ve istisna tutarları (Ocak / Temmuz güncellemeleri).
2. SGK tavanı ve işveren indirimi koşulları.
3. GV dilim eşikleri.
4. Resmî tatil takvimi (dini bayram kaymaları).
5. Kıdem tazminatı tavanı.

## Bilinçli sınırlar

- Bu belge hukuki mütalaa değildir.
- İnternet “bordro hesaplama” örneklerinden formül kopyalanmamıştır; oranlar resmî duyuru / GİB–CSGB referanslı seed’dir.
- 2026+ parametre seti ayrı `effective_from` ile eklenecektir.
