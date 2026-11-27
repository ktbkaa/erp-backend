# Finans/Muhasebe uygulama planı

Son güncelleme: 2026-10-23 (Europe/Istanbul) — oturum: çekirdek + test + doküman teslimi.

## Mevcut durum (keşif özeti)

| Bileşen | Durum |
|---------|--------|
| `muhasebe_hesaplari` | Genişletildi (ülke, sınıf, kontrol, mutabakat) + TR seed |
| `muhasebe_belgeleri` + kalemler | Motor ile: denge, kesinleştir, ters, dönem |
| `faturadanMuhasebe` | KDV satırları + mükerrer koruma + kurallar |
| `mizan` / yevmiye / bilanço / gelir | API + UI ekranları |
| `tahsilat_odemeler` | Cari hareket (mevcut) |
| Banka/kasa kart + nakit hareket | 041 + `/finans-nakit` |
| Ülke/dönem/vergi kodu | 041 + API/UI |
| Sabit kıymet / bütçe / e-Defter gönderim | Yok / stub |

## Sıra

### Faz 1 — Araştırma ✅
- `docs/finance-accounting/*` araştırma + kaynak doğrulama (HGB, BMF, NL; AZ/GİB beklemede)

### Faz 2 — Çekirdek ✅ (bu dalga)
1. Migration `041_finans_cok_ulke_cekirdek.sql` — uygulandı
2. `muhasebeMotorService` — denge, dönem, ters, idempotent
3. Ülke paket seed (TR altküme, AZ/DE/NL iskelet)
4. API: dönem, vergi, raporlar, nakit, ülke
5. UI: Finans menü genişlemesi (hesap, fiş, dönem, vergi, banka/kasa, raporlar)
6. Fatura muhasebeleştirme güçlendirme
7. Otomatik testler — **8/8 geçti**
8. Kullanım kılavuzu + teslimat durumu

### Faz 3 — Operasyonel (sonraki)
- Banka ekstresi içe aktarma + mutabakat
- Çek/senet portföyü
- Stok maliyet muhasebesi derinleştirme
- Büyük defter (kebir) ayrı ekran
- Tahsilat/ödeme → nakit hareket tek akış

### Faz 4 — Ülke paketleri
- AZ/DE/NL COA ve vergi kodlarının resmi kaynakla genişletilmesi
- e-belge sağlayıcı arayüzleri (gönderim yoksa stub kalır)
- GİB MSUT/TDHP tam liste teyidi

### Faz 5 — İleri
- Sabit kıymet amortisman motoru
- Bütçe/gerçekleşen
- Kur değerleme dönem sonu işi
- Dönem sonu kontrol listesi UI
- Nakit akış / yaşlandırma raporları

### Faz 6 — Test / dokümantasyon (sürekli)
- Eşzamanlılık, çok şirket izolasyon, döviz e2e
- Regresyon (`npm test`)
- Kullanıcı kılavuzu güncelleme

## Riskler
- GİB/AZ sayfa erişimi kesintili → oranlar yapılandırmada, gönderim stub.
- Mevcut Onayli fişlerde “onay kaldır” vardı; motor bunu kapatıp ters kayıt zorunlu kılar (eski kayıtlar korunur).
- Bilanço/gelir özet rapor; yasal format şablonları Faz 5.
