# Belge Alan Zenginleştirme (021)

Gerçek ERP ekranlarındaki işlem tabloları (sipariş, fatura, irsaliye, stok hareket…) yalnızca kod/tarih/tutar ile yetinmez; ticari, lojistik ve finans alanları bir arada tutulur. Bu migration, açık yayınlanmış şema/dokümanlardan türetilen alanları ekler.

## Kaynaklar

| Sistem | Referans | Kullanılan fikirler |
|--------|----------|---------------------|
| **Dolibarr** | [llx_commande](https://wiki.dolibarr.org/index.php/Table_llx_commande), [llx_commandedet](https://wiki.dolibarr.org/index.php/Table_llx_commandedet), [llx_facture](https://wiki.dolibarr.org/index.php/Table_llx_facture), [llx_facturedet](https://wiki.dolibarr.org/index.php/Table_llx_facturedet), [llx_stock_mouvement](https://wiki.dolibarr.org/index.php/Table_llx_stock_mouvement) | Müşteri sipariş no (`ref_client`), HT/TTC/KDV, iskonto, ödeme koşulu/şekli, teslim tarihi, not public/internal, satır description, maliyet (`buy_price_ht`), origin referansı |
| **ERPNext** | [Sales Order](https://docs.frappe.io/erpnext/sales-order) | Firma/depo, fiyat listesi, satır teslim tarihi, rezervasyon, kısmi sevk/fatura miktarları |
| **Sage** | Sales order field docs | Satır fatura durumu, progress/invoiced qty, allocation |
| **D365** | InventTrans | Fiziksel/mali tarih, maliyet, belge bağlantısı, envanter boyutları (parti/seri/raf) |

## Eklenen ana gruplar

1. **Ticari:** müşteri/tedarikçi belge no, proje, fiyat listesi, kur, iskonto, ara toplam, KDV, genel toplam, ödeme şekli/koşulu  
2. **Lojistik:** teslim/sevk tarihi, depo, adres (il/ilçe/ülke), taşıyıcı, parti/seri/raf, ağırlık/hacim  
3. **Yaşam döngüsü:** oluşturan/onaylayan kullanıcı, onay/kapanış tarihi, faturalandı / sevk tamamlandı bayrakları, ödeme durumu  
4. **Satır:** satır açıklama, net fiyat, HT/TTC, maliyet, ürün tipi, bekleyen miktar  

UI listeleri bu kolonları gösterir; API `SELECT *` / body alanları kabul eder (`src/utils/belgeAlanlari.js`).
