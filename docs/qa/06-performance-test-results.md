# Performans Test Sonuçları

**Tarih:** 2026-11-05 Europe/Istanbul

## Ölçülen (API smoke)
- 129 endpoint GET: hepsi 2xx (timeout yok)
- Tek tek ms ölçümleri `docs/qa/api-smoke-results.json` içinde

## Yapılmayan (bilinçli)
- Binlerce cari/stok yük seed’i
- Rapor büyük veri seti
- Eşzamanlı kullanıcı / deadlock
- N+1 profili (EXPLAIN)

## Hüküm
Smoke seviyesinde yavaş endpoint alarmı yok. Yoğun kullanım dayanıklılığı **kanıtlanmadı** → puan 3/5.
