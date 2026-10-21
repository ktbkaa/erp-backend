# Onay Yönetimi (v2 tanımlar)

Referans menü sadeleştirilerek KTB’ye uyarlandı. Tanımlar odaklı.

## Tanım ekranları

| Ekran | Alanlar |
|-------|---------|
| **Onay Rolü** | Kişi · Rol adı · Firma · İş yeri (lookup) |
| **Onay Kuralı** | Öncelik · Firma/İşyeri · Ekran · Mesaj şablonu · Yön / tutar / durum · Oto. onay · Hareket kodları (seçmeli satır) |
| **Onay Rotası** | Ekran + bağlı kural · mesaj şablonları · adımlar (rol adı, mail/SMS, tutar, geri gönder) |
| **Onay Mesaj Şablonu** | Olay · konu · gövde |
| **Onay Durum** | BEKLIYOR / ONAYLANDI / … |

Kural koşulları VE mantığıyla çalışır; ham SQL / serbest alan adı yazımı yok — seçim ve işaret kutuları.

## İşlem

Onaylarım · Onay İzleme · Yetki Devri

## API

- `/onay-rolleri` `/onay-kurallari` `/onay-rotalari` `/onay-ekranlari` `/onay-mesaj-sablonlari`
- `/onay-kayitlari` · `baslat` / `onayla` / `reddet`

Motor: `src/services/onayService.js`

## Sonraki tur

1. Belge Onayla → `baslatOnay`
2. Mail/SMS gönderimi
3. Hareket kodu çoklu seçimi için chip UI (şimdilik satır grid)
