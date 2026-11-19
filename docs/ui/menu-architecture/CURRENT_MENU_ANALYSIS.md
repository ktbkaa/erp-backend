# Mevcut Menü Analizi

## Özet

| Metrik | Değer |
|--------|-------|
| Eski modül sayısı | 14 (Sabit Tanımlar dahil) |
| Yeni modül sayısı | 13 |
| Toplam ekran (kod) | 168 |
| Menüde görünen ekran | 166 |
| Menü dışı (orphan, kodda duruyor) | 2 |
| Modül değişen ekran | 16 |
| Yeniden adlandırılan ekran | 34 |

## Tespit edilen sorunlar

1. **Sabit Tanımlar** ortak ana veri (ülke, para birimi, ölçü) ile sistem mesaj tanımlarını aynı düz listede tutuyordu.
2. **Ana Veri** yalnızca organizasyon (firma / iş yeri / depo) içeriyordu; ortak kartlar dağınık kalıyordu.
3. **Cari** doğru şekilde ayrı modüldü; finansal işlemler "Finans" başlığı altında toplanmıştı — süreç diline göre yeniden gruplandı.
4. **stok-depo** (Depo Stok Bağ) Üretim altında duruyordu; stok/depo operasyonuna aitti.
5. **MRP** Stok içinde "Planlama" ile karışıktı; ayrı "MRP Planlama" grubu daha doğru.
6. **Satış** teklif+sipariş tek başlıktaydı; irsaliye/fatura "Belge Yönetimi" genel adındaydı.
7. **Satınalma** talepler sipariş grubundaydı; teklif istekleri gizli/deprecated orphan.
8. **Kalite** yalnızca Emirler / Tanımlar ayrımı yapıyordu; giriş/çıkış/uygunsuzluk süreçleri ayrılmamıştı.
9. **İK** tanımlamaları tek "Tanımlar / Parametreler" kovasında birikmişti.
10. **Onay** konfigürasyonu "Sabit Tanımlar" adıyla operasyonel menüye karışıyordu.
11. **vergi-kodlari** ile **finans-vergi-kodlari** mükerrer aday (aynı işlev ailesi); menüde yalnızca finans-vergi-kodlari tutuldu.
12. Excel envanteri ile kod arasında sapmalar vardı; kod kaynak kabul edildi.

## Mimari kararlar (özet)

- **Cari korunur** — ortak ana veri + cari işlemler; Satış/Satınalma'ya taşınmaz.
- **Sabit Tanımlar kaldırılır** — ortak tanımlar → Ana Veri; mesaj tanımları → Sistem.
- **MRP tek yerde** — Stok > MRP Planlama (çoğaltılmaz).
- **Üç seviye** — Modül → İşlem grubu → Ekran.
