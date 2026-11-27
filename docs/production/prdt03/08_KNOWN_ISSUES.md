# PRDT03 — Bilinen Eksikler / Sınırlar

## Canias video

- `hguM2VVtOrE` bu ortamda indirilemedi / izlenemedi (YouTube bot doğrulaması).
- Kolon/toolbar birebir Canias kopyası **iddia edilmez**; KTB mevcut form standardı + onay kuyruğu ihtiyacına göre tasarlandı.
- Video veya altyazı sağlanırsa alan envanteri güncellenmelidir.

## İş kuralları bilerek uygulanmayanlar

- **Stok yeterliliği** onayda zorunlu değil (mevcut KTB onayında yoktu; eklenmedi).
- **Onay geri alma / revoke** endpoint’i yok — üretim veya stok hareketi sonrası geçmişi silerek taslağa dönüş yok.
- Ayrı `Onaylandi` status’ü yok; onay = `is_approved` + `status=Acik`.
- Manuel oluşturulan `Acik` emirler (`is_approved=false`) geriye uyum için hâlâ `baslat` edilebilir (yalnızca Taslak/OnayBekliyor kilitli).

## UI

- Form varsayılan olarak yeni tarayıcı sekmesinde açılır (`openFormInNewBrowserTab`); liste sekmesinde in-place açılmaz (mevcut kabuk davranışı).
- Toplu onay onay diyaloğu `window.confirm` kullanır; sonuç bildirimi `toast` / Bilgi modal’ı.
- Detayda malzeme grid’i ayrı sekme olarak eklenmedi; operasyon satırları `detailKey=operasyonlar` ile gelir. Malzeme için `GET /uretim-emirleri/:id` tam kaydı kullanılır (Üretim Emirleri ekranı).
- `approved_by_user_code` JWT veya `X-Kullanici-Kodu` olmadan boş kalır.

## Yetki

- Ekran `kolay-is-emri-onayi` için ayrı ince yetki biti yok; menü erişimi + mevcut üretim API kimliği.
- Frontend buton gizleme tek başına güvenlik değildir; onay backend’de readiness + firma scope ile korunur.

## Performans

- `onay-adaylari` her aday için `getQcOrder` çağırır (LIMIT 500). Yoğun kuyrukta SQL join’e optimize edilebilir.

## Test artıkları

- GIDA firmasında `description` PRDT03* test emirleri kalmış olabilir (onaylı/iptal/opsüz). İstenirse soft-delete veya manuel temizlik.
