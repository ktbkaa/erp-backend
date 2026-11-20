# Yetki ve Onay

## Ekran yetkileri

Fason ekranları Üretim menü grubunda; mevcut `modulYetkiliMi` / ekran yetki matrisi ile kontrol edilir. Soft auth: `X-Kullanici-Kodu`, `X-Firma-Id`.

## Onaya tabi olabilecek işlemler

| İşlem | Tetik |
|-------|-------|
| Fason siparişi oluşturma | `order_approval_required` |
| Fiyat değişikliği | `price_approval_limit` |
| Malzeme sevki | Yetki + isteğe onay route |
| Tolerans üzeri fire | Parametre max scrap |
| Fazla teslimat | `allow_over_receipt` / tolerans |
| KK ret sonrası karar | Kalite / onay |
| Hizmet faturası | Mevcut fatura onay |
| Sipariş iptali | Yetki + durum kontrolü |

## Kurallar

Şirket, kullanıcı grubu, departman, tutar, miktar, fasoncu, işlem türü — mevcut Onay Yönetimi route tanımlarıyla bağlanır (`route_id` alanları migration’da hazır).

## Denetim

İşlem logları / audit alanları (created_at, updated_at, kullanıcı header). Onay geçmişi onay modülünde saklanır.
