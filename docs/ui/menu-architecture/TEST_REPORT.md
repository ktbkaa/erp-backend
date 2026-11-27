# Test Raporu

Tarih (UTC): 2026-11-19T08:12:54.236Z

Sonuç: **BAŞARILI** — 16/16 geçti

| Test | Sonuç | Detay |
|---|---|---|
| MODULES parses | PASS | 13 modules |
| Sabit Tanımlar kaldırıldı | PASS |  |
| Cari modülü korundu | PASS |  |
| En fazla 3 seviye (modül/section/screen) | PASS |  |
| Menüde mükerrer screenId yok | PASS | ok |
| Tüm mapped ekranlar kodda var | PASS |  |
| TechId korunmuş | PASS |  |
| Endpoint korunmuş | PASS |  |
| Ana Veri ortak tanımları içeriyor | PASS |  |
| Mesaj tanımları Sistem altında | PASS |  |
| stok-depo Stok altında | PASS |  |
| MRP yalnızca Stok altında | PASS |  |
| Orphan ekranlar menü section dışında | PASS |  |
| Orphan ekranlar kodda duruyor | PASS |  |
| fixed-tanimlar yetki alias kodda | PASS |  |
| Örnek ekran endpoint erişimi | PASS | cari-kartlari:200, stok-karti:200, olcu-birimleri:200, mrp-calisma:200, irsaliye-yonetimi:200 |

## Kabul kriterleri eşlemesi

1. Excel/kod envanteri karşılaştırıldı → docs CURRENT + SCREEN_MAPPING
2. Mevcut ekranlar yeni menüde konumlandı → TARGET + CSV/XLSX
3. Menü dışı ekranlar değerlendirildi → MISSING_AND_DUPLICATE_SCREENS
4. Mükerrerler tespit edildi (silinmedi)
5. Endpoint smoke (mümkün olduğunca)
6. Ekran/tech ID korundu → bu test
7. fixed-tanimlar yetki alias
8. Modüller arası ID/endpoint bozulmadı
9. Üç seviye kontrolü
10. Terminoloji docs

## Giderilemeyen sorun yok

## UI doğrulama (Puppeteer)

- Soft oturum (`owner`) ile sidebar genişletildi.
- `Sabit Tanımlar` yok; `Ana Veri` ortak tanımları gösteriyor.
- `Alış İrsaliyeleri`, `Satış İrsaliyeleri`, `Mesaj Tanımları`, `Depo Stok Bağları`, MRP grubu doğrulandı.
- Finans altında mükerrer `Diğer / Vergi Kodları` sızıntısı giderildi (`vergi-kodlari` hidden).
- Kanıt: `/opt/cursor/artifacts/menu-sidebar-full.png`, `menu-ana-veri.png`, `menu-sistem.png`, `menu-finans.png`.
