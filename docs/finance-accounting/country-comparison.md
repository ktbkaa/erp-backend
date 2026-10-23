# Ülkeler arası karşılaştırma

Son güncelleme: 2026-10-23 (Europe/Istanbul).

| Konu | Türkiye | Azerbaycan | Almanya | Hollanda |
|------|---------|------------|---------|----------|
| Yerel PB | TRY | AZN | EUR | EUR |
| Hesap planı | TDHP (MSUT) — yapılandırılmış sınıflar | Yerel Hesablar Planı (ayrı paket) | SKR03/04 pratik (zorunlu tek plan değil) | Esnek COA (`NL_FLEX`) |
| Defter ilkesi | Çift taraflı, VUK + TDHP | Yerel mühasibat + standart seçimi | HGB §238 + GoB/GoBD | BW2 + Belastingdienst kayıt kuralları |
| KDV / satış vergisi | KDV (191/391) | ƏDV | USt / Vorsteuer | BTW |
| e-Fatura | e-Fatura/e-Arşiv (GİB) | e-qaimə-faktura (sayfa 504 — teyit bekliyor) | E-Rechnung 2025+ (EN 16931); PDF ≠ E-Rechnung | e-fatura / Peppol pratikleri |
| Saklama | VUK süreleri (ayrıntı teyit) | Yerel süreler (teyit) | GoBD / vergi süreleri | 7 yıl temel; 10 yıl gayrimenkul/OSS (doğrulandı) |
| Mali tablolar | Bilanço, gelir tablosu (TDHP eşleme) | Yerel format | HGB yıllık hesaplar | BW2 büyüklük sınıfları |
| Denetçi / zorunluluk eşiği | Bağımsız denetim / çerçeve seçimi (TFRS/BOBİ/KÜMİ) | İşletme büyüklüğüne göre | HGB büyüklük sınıfları | 2/3 kriter: >50 çalışan, €15M ciro, €7.5M bilanço |
| Bu ERP’de durum | Varsayılan paket + motor | Seed iskelet | Seed iskelet + E-Rechnung notu | Seed iskelet + saklama notu |

## Bilinçli ayrıştırmalar
- TR TDHP kodları DE/NL/AZ’ye kopyalanmaz.
- “Ülke seçimi” ≠ “vergi ülkesi”; uluslararası işlemde teslimat yeri / karşı taraf ayrı değerlendirilir.
- Resmî beyanname gönderimi dört ülkede de **entegrasyon stub**.
- HGB ticari muhasebe, vergi muhasebesi ve IFRS tek kurala indirgenmez.
- NL’de esnek hesap planı ile yasal raporlama eşlemesi ayrılır.
