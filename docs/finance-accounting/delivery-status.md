# Finans/Muhasebe teslimat durumu

Dal: `cursor/erp-finans-muhasebe-4f63`  
Son güncelleme: 2026-10-23 (Europe/Istanbul)

## 1. Mimari özet

- **Ortak çekirdek:** `src/services/muhasebeMotorService.js` — denge, dönem kilidi, kesin fiş kilidi, ters kayıt, kaynak belge idempotency.
- **Entegrasyon:** `src/services/muhasebeEntegrasyonService.js` — fatura → fiş + KDV satırları + cari hareket.
- **Ülke paketleri:** `finans_ulke_paketleri` (TR/AZ/DE/NL); firma alanları `muhasebe_ulke_kodu`, `fonksiyonel_pb`, `hesap_plani_kodu`.
- **Vergi:** `finans_vergi_kodlari` + tarihli `finans_vergi_oranlari`.
- **Nakit:** `finans_banka_hesaplari`, `finans_kasa_hesaplari`, `finans_nakit_hareketleri`.
- **Dönem:** `mali_yillar` / `muhasebe_donemleri` kapat/yeniden aç.

## 2. Özellik matrisi

| Özellik | Durum | Not |
|---------|-------|-----|
| Ülke/şirket muhasebe yapılandırması | Tamamlandı | TR varsayılan |
| TDHP referans alt küme seed | Tamamlandı | Tam resmi liste müşavir onayıyla genişletilir |
| AZ/DE/NL COA iskelet | Kısmi | Seed hesaplar; resmi tam plan bekliyor |
| Çift taraflı fiş motoru | Tamamlandı | Test 1–6 |
| Fiş kesinleştir / ters kayıt | Tamamlandı | Onay kaldır kapalı |
| Dönem kapat / yeniden aç | Tamamlandı | |
| Fatura muhasebeleştirme + KDV | Tamamlandı | Idempotent |
| Hesap belirleme kuralları | Tamamlandı | Mevcut ekran + TR kuralları |
| Vergi kodları UI/API | Tamamlandı | Beyanname gönderim yok |
| Banka/kasa kart + nakit hareket | Tamamlandı | Ekstre import yok |
| Yevmiye / mizan / bilanço / gelir | Tamamlandı | Özet raporlar |
| Cari tahsilat/ödeme | Entegre | Mevcut modül + fiş bağlantısı |
| Büyük defter ekranı | Kısmi | Yevmiye + mizan üzerinden; ayrı kebir UI sonraki |
| Sabit kıymet amortisman | Bekliyor | Hesap seed var; motor yok |
| Bütçe/gerçekleşen | Bekliyor | |
| Banka mutabakat / çek-senet | Bekliyor | |
| e-Defter / e-qaimə / E-Rechnung gönderim | Stub | Arayüz notları + saklama; canlı API yok |
| Enflasyon düzeltmesi | Bekliyor | Araştırma notu |

## 3. Migration / dosyalar

### Migration
- `db/migrations/041_finans_cok_ulke_cekirdek.sql` — uygulandı (`npm run migrate`)

### Yeni
- `src/services/muhasebeMotorService.js`
- `routes/finans_ulke.js`, `muhasebe_donemleri.js`, `finans_raporlar.js`, `finans_nakit.js`, `finans_vergi_kodlari.js`
- `tests/finans_muhasebe_motor.test.js`
- `docs/finance-accounting/*`

### Değişen
- `index.js` — route mount
- `routes/muhasebe_belgeleri.js`, `muhasebe_hesaplari.js`
- `src/services/muhasebeEntegrasyonService.js`
- `public/app.js`, `public/index.html` (cache: `20261023finansCore`)

## 4. Test sonuçları

Komut: `node --test tests/finans_muhasebe_motor.test.js`  
Sonuç (2026-10-23): **8/8 geçti**

1. Dengeli fiş kesinleşir  
2. Dengesiz fiş reddedilir  
3. Ana hesapla kesinleştirme engellenir  
4. Mükerrer kaynak belge engellenir  
5. Ters kayıt + kilit  
6. Kapalı dönem engeli  
7. Ülke paket seed TR/AZ/DE/NL  
8. TR KDV20 oran = 20  

Kapsam dışı / sonraki testler: eşzamanlı muhasebeleştirme yarışı, çok şirket izolasyon stress, döviz kur farkı e2e, bilanço denge assert genişletmesi.

## 5. Entegrasyon durumu

| Modül | Bağlantı |
|-------|----------|
| Faturalar | `faturadanMuhasebe` |
| Cari | Fiş satırı `cari_id` + cari hareket |
| Tahsilat/ödeme | Mevcut ekran; nakit hareket opsiyonel fiş |
| Stok | Hesap seed / mutabakat tipi; otomatik stok maliyet fişi derin değil |
| Onay | Fiş durum makinesi Onayli/Taslak |
| Audit | Dönem kapat/aç + motor olayları (mevcut audit altyapısı) |

## 6. Ülke kuralları

- UI/API filtreleri `ulke_kodu` ile hesap/vergi/rapor ayırır.
- `GET /finans-ulke/aktif` firma paketini ve açıklama metnini döner.
- `PUT /finans-ulke/firma/:id` kalıcı ülke günceller (paket doğrulamalı).
- Kesin fiş ülkesi geriye dönük değişmez.

## 7. Eksik dış kurulum

- GİB e-Defter/e-Fatura sertifika ve API
- AZ taxes.gov.az e-qaimə şema (sayfa 504)
- DE E-Rechnung iletim kanalı / ileride Meldesystem
- NL BTW/ICP resmi gönderim kimlikleri
- Canlı banka API / ekstresi

## 8. Bilinen riskler

1. GİB kullanıcı linki (`…/teblig/10705`) istemci hatası — MSUT tam metin teyidi bekliyor.  
2. TDHP seed “referans alt küme”; yasal tam plan değil.  
3. AZ sayfa erişilemedi.  
4. Bilanço/gelir raporları sınıf özeti; yasal format şablonları sonraki faz.  
5. Eski “onay kaldır” akışı kaldırıldı → ters kayıt zorunlu (bilinçli kırılma).

## 9. Dokümanlar

| Dosya | İçerik |
|-------|--------|
| `country-research.md` | TR/AZ/DE/NL araştırma |
| `country-comparison.md` | Karşılaştırma tablosu |
| `accounting-glossary-tr.md` | Terimler |
| `accounting-rules-sources.md` | Kaynak + doğrulama |
| `implementation-plan.md` | Faz sırası |
| `user-guide-tr.md` | Kullanım kılavuzu |
| `delivery-status.md` | Bu dosya |
