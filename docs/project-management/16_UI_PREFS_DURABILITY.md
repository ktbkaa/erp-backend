# UI Ayarlar / Tema — Neden Kayboluyordu, Nasıl Kilitlendi?

**Tarih:** 8 Kasım 2026 (Europe/Istanbul)

## Kök neden

Ayarlar dişlisi, dil (TR/EN), tema seçici ve **koyu görünüm** (`data-appearance=dark`) ayrı feature dallarında (`cursor/erp-ayarlar-dil-tema-*`, sonra `liste-ekran-scroll`) geliştirildi. Yeni işler sıkça **eski base** üzerinden açıldığı için `public/index.html` + `app.js` + `styles.css` birleşiminde bu bloklar **silinmiş gibi** görünüyordu — kasıtlı kaldırma değil, **dal birleşmeme / overwrite**.

## Kalıcı kilit (bu dal)

1. Üç dosyaya yeniden gömüldü: dişli menü, Açık/Koyu, tema modal, `localStorage` (`ktb_ui_theme`, `ktb_ui_lang`, `ktb_ui_appearance`).
2. Regresyon testi: `tests/ui_prefs_theme.test.js` — bu üç dosyada işaretler yoksa CI/test kırılır.
3. Cache bust: `styles.css?v=20261108tema`, `app.js?v=20261108tema`.

## Geliştirici kuralı

`public/index.html` / `app.js` / `styles.css` birleştirirken:

- `settingsWrap`, `themeModal`, `applyUiTheme`, `html[data-appearance="dark"]` **silinmemeli**.
- Conflict’te “eski dosyayı al” demeyin; prefs bloğunu koruyun.
- `npm test` içinde `ui_prefs_theme` yeşil kalmalı.
