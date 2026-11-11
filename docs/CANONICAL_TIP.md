# KTB ERP — Tek canlı hat (canonical tip)

Bu depoda **tek geliştirme hattı** vardır. Paralel stack / fork / ayrı ağaç açılmaz.

## Canlı tip

- Branch: `cursor/erp-eksik-ozellik-geri-4f63` (PR #89 ve altındaki fırsat/cari stack’in tepesi)
- Bu tip, görünen ERP sisteminin canlısıdır.
- Her yeni geliştirme, düzeltme veya port **bu tipin üzerine** konur.

## Paralel stack politikası

`sistem-saglik` sonrası açılmış paralel hatlar (liste-scroll, mesaj-zorunlu, local-panel, modul-tanıtım, QA, login-yetki, stok-rezervasyon, …) **wholesale merge edilmez**.

- Tipte **zaten olan** özellik → paralel kopya **çöp** sayılır; yeniden port edilmez.
- Tipte **olmayan unique** özellik → cherry-port ile bu tip’e alınır.
- Migration / ekran çakışmasında **tip kazanır**.

Eski açık PR’lar tarihsel referanstır; yeni iş onlara bağlanmaz.

## Bundan sonra

1. Yeni branch’i her zaman bu canlı tip’ten aç.
2. PR base = canlı tip (veya onun hemen üstündeki tek hat).
3. Aynı ekranı ikinci bir stack’te yeniden yazma.
