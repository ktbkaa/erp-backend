# Görünüm Modları

## Görünüm 1 — Modern (`data-view="modern"`)

- Varsayılan.
- Stiller: `public/styles-modern.css` (yalnızca `html[data-view="modern"]`).
- Nötr çalışma alanı, düşük gölge, kompakt üst bar, net sekme/menü vurgusu.
- Liste/formlarda kart gölgesi azaltılır; hiyerarşi tipografi ve boşlukla kurulur.

## Görünüm 2 — Klasik (`data-view="classic"`)

- Mevcut `public/styles.css` davranışı.
- Modern CSS kuralları **uygulanmaz** → görsel/işlevsel kayıp yok.
- Eski kullanıcılar tek seçimle geri dönebilir.

## Kalıcılık

| Anahtar | Değerler | Varsayılan |
|---------|----------|------------|
| `localStorage.ktb_ui_view` | `modern` \| `classic` | `modern` |
| `ktb_ui_theme` | `blue`…`yellow` | `blue` |
| `ktb_ui_appearance` | `light` \| `dark` | `light` |

Görünüm değişince renk teması korunur; renk değişince görünüm korunur.

## Ayarlar UI

**Ayarlar → Tema ve Görünüm…**

1. Sekme **Renk Teması** — 6 çiçek teması  
2. Sekme **Görünüm** — Modern / Klasik önizleme kartları  

Menüdeki **Parlaklık** (Açık/Koyu) ayrı kalır.
