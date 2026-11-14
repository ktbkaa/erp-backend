# Bileşen Rehberi

Ortak kabuk sınıfları (klasik + modern):

| Alan | Seçiciler |
|------|-----------|
| Kabuk | `#appShell.app-shell`, `.sidebar`, `.workspace`, `.workspace-bar` |
| Menü | `.mod-group`, `.mod-title`, `.mod-item` |
| Sekmeler | `#tabBar.doc-tabs`, `.tab-item` / `.doc-tab` |
| Liste | `#viewScreen`, `.action-bar`, `.filter-pane`, `.list-pane`, `#dataTable` |
| Form | `#viewForm`, `.form-topbar`, `.erp-master-panel`, `.md-split`, `.detail-table` |

## Görünüm 1 kuralları

- Yeni ekran stilleri **yalnızca** `html[data-view="modern"] …` altında yazılır.
- Ekran başına kopya CSS yazma; ortak sınıfları genişlet.
- Kart içinde kart üretme; `box-shadow` varsayılan olarak kapalı/minimal.
- Butonlar: primary = tema rengi; secondary/ghost = border + soft hover.
- Tablolar: sticky header, hover/selected; satır yüksekliği kompakt ama okunur.

## Lookup / zorunlu

Anlam değişmez:

- Lookup alanları sarımsı zemin (`--lookup-bg`)
- Zorunlu: kırmızı işaret / sol çizgi (`--required-mark`)
