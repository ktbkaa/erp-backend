# Görünüm Modları

## Görünüm 1 — Modern (`data-view="modern"`)

- Varsayılan.
- Stiller: `public/styles-modern.css` (yalnızca `html[data-view="modern"]`).
- Sade, düşük gölge, kompakt üst bar.

## Görünüm 2 — Klasik (`data-view="classic"`)

- Mevcut `public/styles.css` davranışı.
- Ek görünüm CSS’i uygulanmaz.

## Görünüm 3 — Metalik (`data-view="steel"`)

- Stiller: `public/styles-steel.css`.
- Sade klasik, metalik gri tonlar, düşük radius, inset kenar — hafif ve rahat.
- Animasyon/gölge süsü yok; uzun süreli kullanım için düşük görsel yük.

## Görünüm 4 — Kartlar (`data-view="cards"`)

- Stiller: `public/styles-cards.css`.
- Canlı kart/kutu düzeni, yuvarlak butonlar, sticky aksiyon şeridi.
- Mobil öncelikli yığın; pop-up / bağlam menüsü büyük dokunma alanları.
- Araç çubuğunda Excel/Word/PDF ile daha az sağ tık ihtiyacı.

## Kalıcılık

| Anahtar | Değerler | Varsayılan |
|---------|----------|------------|
| `localStorage.ktb_ui_view` | `modern` \| `classic` \| `steel` \| `cards` | `modern` |
| `ktb_ui_theme` | `blue`…`yellow` | `blue` |
| `ktb_ui_appearance` | `light` \| `dark` | `light` |

Görünüm değişince renk teması korunur; renk değişince görünüm korunur.

## Ayarlar UI

**Ayarlar → Tema ve Görünüm… → Görünüm** sekmesinde dört önizleme kartı.
