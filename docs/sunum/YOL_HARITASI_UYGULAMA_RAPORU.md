# Yol Haritası Uygulama Raporu

Tarih: 15 Kasım 2026 (Europe/Istanbul)  
Kaynak: Sistem Tanıtım Sunumu — sayfa 21 (Yol haritası)

## Öncelik değerlendirmesi

| # | Madde | Önem | Bu turda |
|---|--------|------|----------|
| 1 | Üretim parametreleri — tüm firmalar + tolerans doğrulama | Çok yüksek (üretim kontrolü demosu) | Yapıldı |
| 2 | Üretim girişi UX — kalan / max izin görünürlüğü | Çok yüksek (operatör eğitimi) | Yapıldı |
| 3 | Kapasite planlama / iş merkezi yükü | Yüksek (üretim hikâyesi) | İlk sürüm yapıldı |
| 4 | Fatura→muhasebe sertleştirme + cari mutabakat | Yüksek (ticari güven) | Mutabakat ekranı yapıldı |
| 5 | e-Belge operasyonel entegrasyon katmanı | Orta (müşteri sorusu; tam GİB uzun) | Kuyruk iskeleti yapıldı |
| 6 | Alan bazlı audit + üretim ACL | Orta (kurumsal güven) | İyileştirildi |
| 7 | Varyant / konfigüre ürün ağacı | Orta-düşük (ileri üretim) | Erteleme |
| 8 | İK / bakım derinleştirme | Düşük (İK zaten geniş; bakım yok) | Erteleme |
| 9 | Mobil / el terminali | Düşük (ayrı ürün yüzeyi) | Erteleme |

## Yapılanlar (özet)

1. **Üretim parametreleri**
   - Yeni firma oluşturunca otomatik güvenli parametre satırı
   - `GET /uretim-parametreleri/dogrula` — firma kapsam + fazla üretim senaryosu
   - `POST /uretim-parametreleri/eksikleri-tamamla`
   - Ekran: **Üretim Parametre Doğrulama**
2. **Üretim girişi UX**
   - Form banner: kalan / max izin / fazla üretim durumu
   - Operasyonel + hızlı giriş eğitim metinleri
3. **İş merkezi yükü**
   - Migration `087`: `daily_capacity_hours`, `efficiency_pct`
   - `GET /is-merkezi-yuku` + ekran **İş Merkezi Yükü**
4. **Cari mutabakat**
   - `GET /cari-mutabakat` — açık fatura ↔ cari hareket farkı
   - Ekran: **Cari Mutabakat** (muhasebesiz fatura sayısı dahil)
5. **e-Belge kuyruk**
   - Tablo `e_document_queue` + adaptör servisi (simülasyon)
   - `POST /e-belge/hazirla`, `/:id/kuyruga-al`, `/:id/gonder`
   - Ekran: **e-Belge Kuyruk**
6. **Audit + üretim ACL**
   - Audit middleware: istek alanları + PUT alan farkları (şifre redakte)
   - Üretim girişi: modül yetkisi + depo yetkisi + alan audit kaydı

## Bilinçli ertelenenler

- **Varyant BOM:** şema/UI geniş; etiket dışında motor yok
- **Bakım (CMMS):** modül iskeleti yok
- **Mobil el terminali:** ayrı istemci yüzeyi
- **Canlı GİB gönderimi:** sağlayıcı sözleşmesi / sertifika gerekir; kuyruk hazır

## Dosyalar

- `db/migrations/087_yol_haritasi_kapasite_ebolge.sql`
- `routes/work_center_load.js`, `routes/cari_mutabakat.js`, `routes/e_belge.js`
- `src/services/eBelgeAdapterService.js`, `src/services/auditService.js`
- `public/app.js`, `public/index.html`, ilgili route güncellemeleri
