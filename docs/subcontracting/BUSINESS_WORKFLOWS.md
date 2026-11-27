# Fason İş Akışları

## A. Fason operasyon (rota üzerinden)

1. Ürün ağacı ve rota tanımla; boyama vb. satırda **Fason operasyon** işaretle, fasoncu/fiyat/lead gir.
2. İş emri oluştur → operasyonlar kopyalanır (`is_subcontract` aktarılır).
3. Fason siparişi oluştur (manuel veya `/fason/is-emri/:id/siparis-olustur`).
4. Gerekirse onay (parametre `order_approval_required`).
5. **Sevk:** şirket deposundan FasonEmanet’e transfer (tüketim değil).
6. **Emanet kontrol:** fasoncuda bekleyen miktar (gerçek stok motoru).
7. **Giriş kalite kontrol (GKK) — firma seçimli altyapı:**
   - `qc_on_receipt=true` (varsayılan): fasoncudan gelen ürün teslimatta GKK emri açılır; stok **Kalitede** bekler, hemen üretime/`accepted_qty` yazılmaz.
   - `block_production_until_qc=true`: KK onayı olmadan operasyon `KaliteKontrolBekliyor`; `produced_quantity` yalnız kabul kadar artar.
   - `require_qc_before_consume=true` (sıkı sıra): açık GKK varken emanet **tüketimi engellenir** (5→GKK→6).
   - Firma kapatırsa (`qc_on_receipt=false` / `create_qc:false`): teslimat doğrudan kullanılabilir + kabul.
8. **Tüketim bildirimi:** emanet↓ + üretim tüketimi; fire ayrı miktar (otomatik silme yok).
9. **Teslimat:** kısmi mümkün; fazla teslim parametre/tolerans olmadan reddedilir. (GKK açıksa adım 7 ile birlikte çalışır.)
10. Kabul edilen miktar op’a yansır; sonraki iç operasyon başlatılabilir.
11. Alış faturası ile hizmet bedeli; maliyet satırları güncellenir.

## B. Komple fason üretim

1. Cariyi fasoncu yap; ürün + fiyat tarife.
2. Sipariş `order_mode=Komple` ile oluştur (isteğe WO bağlantılı).
3. Malzeme sevki → emanet stok.
4. Kısmi tüketim + kısmi teslimatlar (ör. 400 + 600).
5. KK → stok kullanılabilirlik.
6. Fatura + maliyet.

## C. İstisnalar

| Durum | Davranış |
|-------|----------|
| Siparişten fazla sevk | Kontrol / red veya onay (iş kuralı) |
| Fazla teslimat | `allow_over_receipt` false ise engel |
| Tolerans üzeri fire | Onay / kayıt; stok silinmez |
| KK ret | İade / yeniden işleme / hurda seçenekleri |
| GKK beklerken üretim | `block_production_until_qc` → op `KaliteKontrolBekliyor` |
| GKK beklerken tüketim | `require_qc_before_consume` → `FASON_GKK_BEKLIYOR` |
| Sipariş iptali | Açık hareket yoksa veya ters kayıt |
| Mükerrer teslim/fatura | Id / miktar kalan kontrolü |
| Fasoncu değişimi | Yeni sipariş veya revizyon; emanet partner’e bağlı |

## Kritik ayrımlar

| İşlem | Ayrı kavramlar |
|-------|----------------|
| Malzeme sevki | Depodan çıkış ≠ tüketim |
| Teslimat | Teslim alınan ≠ KK geçen |
| Üretim | Fason hizmeti ≠ iç üretim gerçekleşmesi |
| Finans | Sipariş ≠ alış faturası |
| Maliyet | Tahmini ≠ gerçekleşen |
| Fire | Bildirim ≠ otomatik stok silme |
