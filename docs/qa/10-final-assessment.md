# Final Kalite Değerlendirmesi (GIDA + DOKUM turu)

**Tarih:** 2026-11-05 Europe/Istanbul  
**Standart:** `docs/qa/standards/KTB_ERP_QA_DEVELOPMENT_STANDARD.md`

## Puanlama (100)

| Kategori | Ağırlık | Puan | Gerekçe |
|---|---:|---:|---|
| Ekran ve fonksiyon | 15 | 12 | 132 smoke yeşil; derin CRUD örnekleme |
| İş kuralları | 15 | 13 | MAN+MRP iki sektörde; CKK→mamul boşluk |
| Veritabanı | 15 | 13 | Orphan yok; lot kaynaklı negatif risk (P2) |
| Entegrasyon | 15 | 13 | DOKUM MAN+MRP zinciri + fatura |
| Uçtan uca süreç | 15 | 14 | GIDA MAN + DOKUM MAN/MRP kanıtlı |
| Güvenlik | 10 | 7 | JWT + firma grant; soft-auth yerel; rol matrisi kısmi |
| Performans | 5 | 3 | Yük testi yok |
| UX | 5 | 3 | Spot + evidence |
| Test otomasyonu | 5 | 5 | qa:* + roles + sektör demoları |
| **Toplam** | **100** | **83** | |

## Ticari hazırlık
- P0/P1 açık: **yok**
- İki sektör (süt + döküm) temel döngü: **evet**
- **Karar:** Kontrollü **pilot** eşiğine yakın; BUG-008/009 kapanmadan tam ticari “hazır” deme.

## Kapsam
| Ölçüm | Tahmini |
|---|---|
| Ekran (GET smoke) | ~98% |
| Fonksiyon derin | ~30–40% |
| İş süreci GIDA MAN | ~95% |
| İş süreci DOKUM MAN/MRP | ~95–100% / ~95% |
| İK | ~0% |
