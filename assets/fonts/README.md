# PDF fontları

`src/services/belgePdfService.js` PDF'lere bu TrueType fontları gömer (alt küme, Identity-H + ToUnicode), böylece Türkçe karakterler (ğ ü ş ı İ ö ç) her görüntüleyicide doğru çıkar ve metin kopyalanabilir.

| Dosya | Kaynak | SHA-256 |
|-------|--------|---------|
| `NotoSans-Regular.ttf` | Noto Sans (Debian `fonts-noto-core` 20201225-2) | `89c3c497f618fdaa0b2d1e98fef93582f28c71debd2c4a8cdf41f190ced2909d` |
| `NotoSans-Bold.ttf` | Noto Sans (Debian `fonts-noto-core` 20201225-2) | `e83493c945848ecd4a9ad0f6d19164541a0d3e23a9c952304a00a46e00272ac5` |

Lisans: SIL Open Font License 1.1 (`OFL.txt`). Copyright 2015-2020 Google LLC / The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic). Fontlar değiştirilmeden yeniden dağıtılır.
