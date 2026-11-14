# UI Migration Report — Görünüm 1

Tarih: 15 Kasım 2026 (Europe/Istanbul)  
Dal: `cursor/erp-gorunum1-modern-4f63`

## Özet

Varsayılan arayüz **Görünüm 1 (Modern)** oldu.  
**Görünüm 2 (Klasik)** mevcut `styles.css` ile birebir korunur.

## Değiştirilen / eklenen

| Dosya | Değişiklik |
|-------|------------|
| `public/styles-modern.css` | **Yeni** — modern katman |
| `public/styles.css` | Design-system alias tokenler |
| `public/index.html` | `data-view` boot, modal sekmeleri, modern CSS link |
| `public/app.js` | `applyUiView`, `UI_VIEW_DEFS`, modal tab/view grid |
| `tests/ui_prefs_theme.test.js` | View + modern CSS kilitleri |
| `docs/ui/design-system/*` | Dokümantasyon |

## Korunan

- Tüm renk temaları (Sümbül…Ayçiçeği)
- Açık/koyu parlaklık
- Sol menü, sekmeler, filtre, CRUD, API, yetki, firma kapsamı
- Lookup sarı / zorunlu kırmızı anlamları
- Logo dosyası ve oranı (şekil bozulmaz)
- Klasik görünümde önceki gölge/kart dili

## Görünüm farkları

| | Modern | Klasik |
|--|--------|--------|
| Sayfa zemini | Nötr gri | Tema pastel tonları daha belirgin |
| Kart gölgesi | Minimal/yok | Mevcut soft shadow |
| Menü aktif | Soft + sol çizgi | Mevcut halka/arka plan |
| Üst bar | Daha alçak | Mevcut yükseklik |
| Form grupları | Üst başlık + ayırıcı | Mevcut kartlı dil |
| Logo filter | Sade | Tema hue-rotate (mevcut) |

## Tamamlanan ortak yüzeyler

Kabuk (menü, üst bar, sekmeler), liste/filtre/tablo, form topbar/sekme/alan, detay tablo, ayarlar modalı — **global CSS** ile tüm modüllere yansır (cari, stok, üretim, satış, satınalma, finans, CRM, kalite, İK, proje).

## Henüz ayrı “ekran özel” yenileme yapılmayanlar

- MRP konsol iç stilleri (kısmen kendi sınıfları)
- SQL konsol özel layout
- Baskı/PDF şablonları (arayüz dışı)

Bunlar işlevsel; modern kabuk stilleri yine de üst kabuğu etkiler.

## Test checklist

1. İlk yüklemede `data-view=modern` — **evet** (boot + default)
2. Klasik seçince modern CSS etkisiz — **evet** (selector scope)
3. 6 renk teması her iki görünümde — **evet** (`data-theme` bağımsız)
4. Yenilemede tercih — **evet** (`ktb_ui_view`)
5. Görünüm↔renk bağımsız — **evet**
6. `node --test tests/ui_prefs_theme.test.js` — çalıştırılacak

## Tercih saklama

Mevcut mimari `localStorage` kullanıyor (tema/dil/parlaklık ile aynı).  
Kullanıcı bazlı sunucu kaydı yok; oturum aynı tarayıcıda kalıcıdır.
