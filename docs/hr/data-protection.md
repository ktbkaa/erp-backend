# İK Veri Koruma (KVKK odaklı)

## İlkeler

1. **Veri minimizasyonu:** Medeni hâl, kan grubu zorunlu değildir; yalnızca hukuki/meşru amaç varsa kullanılır.
2. **Rol bazlı erişim:** Maaş/bordro ve hassas belgeler kısıtlı roller.
3. **Amaç bağları:** Sağlık raporları / kimlik — `confidentiality` alanı (`Normal` / hassas).
4. **Loglarda açık kimlik yok:** T.C. kimlik / IBAN loglara yazılmaz.
5. **Dosya:** DB’de içerik değil `storage_key` + metadata.
6. **Pasif personel:** Geçmiş bordro/puantaj/onay silinmez.

## Alan sınıflandırması

| Alan grubu | Örnek | Erişim |
|------------|-------|--------|
| Kimlik | national_id | İK özlük |
| İletişim | email, phone, adres | İK / yönetici (sınırlı) |
| Özel nitelikli | blood_type, sağlık belgesi | Özel yetki |
| Ücret | gross_amount, bordro satırı | Bordro / finans İK |
| Denetim | employment_history | İK / denetim |

## Teknik önlemler (mevcut)

- Firma izolasyonu: `X-Firma-Id` / `company_id`
- Soft delete / `employment_status=Ayrildi`
- Bordro satırları run’a bağlı; kesinleştirme sonrası değiştirilmez
- Belge tablosu: `hr_employee_documents` (storage_key)

## Saklama / silme

- Operasyonel saklama politikası şirket prosedürüne bağlıdır.
- Toplu dışa aktarma için yetki kontrolü sonraki sertleştirme maddesidir.
- KVKK başvurusu (erişim/silme) süreçleri iş prosedürü + teknik maskeleme ile yönetilir.

## Ülke notu

DE/NL için GDPR; AZ için yerel KİV kuralları — `country-adaptation.md` ile birlikte ele alınır. TR varsayılanında KVKK referans alınır.
