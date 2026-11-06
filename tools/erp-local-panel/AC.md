# ERP Yerel Panel — sizin yapacaklarınız (3 adım)

Bu proje **ayrı** bir uygulama: Windows bilgisayarınızda çalışır, ERP klasörünüze bağlanır, haftalık `git pull → npm install → migrate → yedek` yapar.

## 1) Zip’i açın (güncel sürüm)

Eski klasörü silin veya üzerine yazın. Güncel zip: `erp-local-panel.zip`  
(örnek: `C:\Users\...\Documents\erp-local-panel`).

> Not: İlk sürümde Windows PowerShell Türkçe karakter hatası vardı; güncel scriptler düzeltilmiştir.

## 2) `KUR.bat` dosyasına çift tıklayın

Script şunları yapar:

- Node.js yoksa kurmayı dener  
- Panel bağımlılıklarını yükler  
- ERP klasörünü bulur (bulamazsa yolu sorar)  
- Pazar 17:00 haftalık görevi kaydeder  
- Windows açılınca paneli başlatır  
- Tarayıcıda `http://127.0.0.1:3920` açar  

## 3) Panelde “Tam senkron”a basın (ilk sefer)

Sonra her Pazar 17:00 otomatik çalışır. Panel her zaman açık olmak zorunda değil — haftalık görev paneli kapalıyken de CLI ile senkron çalıştırır.

---

### Gerekli olanlar (zaten varsa dokunmayın)

| Ne | Not |
|----|-----|
| ERP klasörü (git + `migrate` script) | `erp-backend` doğru branch |
| PostgreSQL + `.env` | ERP klasöründeki `.env` |
| Node.js 18+ | Yoksa kurulum dener |
| pg_dump (opsiyonel) | Yoksa yedek için pgAdmin Backup |

### Sorun olursa

- Panel açılmıyor → Masaüstündeki **ERP Yerel Panel** kısayolu  
- Yedek hata → PostgreSQL Command Line Tools veya panelde `pg_dump` yolu  
- Yanlış ERP → Panel → Ayarlar → ERP klasörü → Kaydet  

Kaldırma: `scripts\uninstall-windows.ps1`
