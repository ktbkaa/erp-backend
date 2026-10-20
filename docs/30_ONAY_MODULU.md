# Onay Yönetimi (v1)

Referans menü (Canias tarzı) sadeleştirilerek KTB ERP’ye uyarlandı.

## Menü

| Ekran | Ne işe yarar? |
|-------|----------------|
| **Onaylarım** | Rolüme / yetki devrine düşen bekleyen kayıtlar · Onayla / Reddet |
| **Onay İzleme** | Tüm onay kayıtları ve adım geçmişi |
| **Onay Yetki Devri** | Kullanıcı A → B, tarih aralığı, isteğe bağlı rol |
| **Onay Rol Tanımı** | Rol + üye (kişi veya kullanıcı grubu) |
| **Onay Rotası** | Rota + adım tasarımı (sıra, rol, min. tutar eşiği) — «Rota Tanım + Tasarım» birleşik |
| **Onay Mesaj Şablonu** | Bekleme / onay / red bildirim metinleri |
| **Onay Modül Kullanımı** | Hangi `ekran_id` hangi rotayı kullanır + min tutar / otomatik gönder |
| **Onay Durum Tanımı** | BEKLIYOR, ONAYLANDI, REDDEDILDI… |

**Bilerek alınmayan / katlanan başlıklar (sonraki turda açılabilir):**
- Ayrı «Onay Kuralı» → min tutar / otomatik gönder, modül kullanımında
- Ayrı «Onay Rotası Tasarım» → rota detay satırları
- Ayrı «Otomatik Onaya Gönderim Kuralı» → `otomatik_gonder` bayrağı
- Ayrı «Onay» işlem ekranı → Onaylarım + izleme yeterli

## API

- `GET/POST/PUT /onay-durumlari|rolleri|rotalari|mesaj-sablonlari|modul-kullanimlari|yetki-devirleri`
- `GET /onay-kayitlari` · `?benim=true` (Onaylarım)
- `POST /onay-kayitlari/baslat` — süreç başlat
- `POST /onay-kayitlari/:id/onayla|reddet|iptal`

Motor: `src/services/onayService.js`

## Sonraki tur

1. Belge «Onayla» butonlarını (SA talep vb.) `baslatOnay` + merkezi kayda bağlamak  
2. E-posta / bildirim şablonlarını gerçekten göndermek  
3. Paralel adım ve tutar eşiği UX iyileştirmesi  
4. Belge durumunu onay sonucuna kilitlemek (çift onay yolu kapatma)
