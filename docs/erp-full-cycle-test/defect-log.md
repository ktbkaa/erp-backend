# Defect Log — GIDA TEST-SUT Tam Döngü

| ID | Bulgu | Etki | Çözüm | Durum |
|----|-------|------|-------|-------|
| D1 | Üretim çıktısı CKK deposuna yazılırken `item_warehouses` yok | Op tamamlanamıyor, mamul stok oluşmuyor, irsaliye yetersiz bakiye | `production_orders.js`: CKK/hedef için otomatik izin + `depoZorunluAtla` | Düzeltildi |
| D2 | CKK emirleri üretim sonrası otomatik onaylanmıyordu | Mamul depoya transfer yok | `demo-gida-tam-dongu.js` içinde `onaylaCkk` | Düzeltildi |
| D3 | Mal kabul sonrası GKK doğrudan oluşmuyordu (yeni kurgu) | Giriş kontrol atlanıyordu | `onaylaGkk` önce `/giris-kontrolleri/:id/onayla` çağırıyor | Düzeltildi / doğrulandı |
| D4 | BAST06 Maliyet Merkezi ekranı/tablosu yok | Canias adım 3 birebir yok | İş merkezi adına `MC-SUT-01` notu | Açık gap |
| D5 | SA siparişi onay rotası (`satin-alma-siparisleri`) yoktu; demo atlıyordu | Merkezi onay kaydı oluşmuyordu | Migration `051` + `OR-SA-SIPARIS`; PO `/onayla` `baslatOnay`; kolon fix `052`; demo adımları tamamlıyor | Düzeltildi |
| D6 | Temizlik sırasında bazı partner FK uyarıları | İlk koşuda gürültü | İkinci koşuda purge tamamlandı | İzlendi |
