# KTB ERP Design System

Tarih: 15 Kasım 2026 (Europe/Istanbul)

## Amaç

Kurumsal ERP için **sade, okunabilir, uzun süreli kullanıma uygun** bir görsel dil.  
İki görünüm katmanı vardır; renk temaları her ikisinde de çalışır.

## Katmanlar

| Katman | Seçici | Dosya |
|--------|--------|-------|
| Renk teması | `html[data-theme]` | `public/styles.css` |
| Parlaklık | `html[data-appearance]` | `public/styles.css` |
| Görünüm | `html[data-view]` | classic → `styles.css`; modern → `styles-modern.css` |

## Tokenler

Merkezi değişkenler (`:root` + modern override):

| Token | Rol |
|-------|-----|
| `--primary` / `--accent` | Ana vurgu (tema) |
| `--primary-hover` | Hover |
| `--primary-soft` | Soft arka plan |
| `--background` / `--page` | Sayfa zemini |
| `--surface` | Kart / panel |
| `--surface-secondary` | İkincil yüzey |
| `--border` / `--line` | Ayırıcı |
| `--text-primary` / `--ink` | Ana metin |
| `--text-secondary` / `--muted` | İkincil metin |
| `--success` / `--warning` / `--danger` | Durum |

## İlkeler (Görünüm 1)

1. **Daha az kart, daha fazla düzen** — bölümler boşluk + başlık + hafif çizgi ile.
2. **Dengeli yoğunluk** — ERP veri yoğunluğunu koru; gereksiz büyütme yok.
3. **İşlevsel renk** — tema yalnızca buton değil; aktif menü, sekme, focus, seçili satır.

## Anlamlı alan renkleri (korunur)

- **Lookup (sarı ton):** başka tablodan seçim
- **Zorunlu (kırmızı işaret/çizgi):** zorunlu alan
- Modern görünümde bu anlamlar yumuşatılmış tonlarla devam eder (`--lookup-bg`, `--required-mark`).
