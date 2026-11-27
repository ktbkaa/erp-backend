# ERP Yerel Panel — sizin yapacaklarınız (3 adım)

Bu proje **ayrı** bir uygulama: Windows bilgisayarınızda çalışır, ERP klasörünüze bağlanır, haftalık `git pull → npm install → migrate → yedek` yapar.

## 1) Zip’i açın / güncelleyin

`erp-local-panel.zip` dosyasını istediğiniz yere açın  
(örnek: `C:\Users\...\Documents\erp-local-panel`).

Zaten kuruluysa: yeni zip’i üstüne açın veya ERP deposundaki `tools/erp-local-panel` klasörünü kullanın, sonra:

```bat
cd panel-klasoru
npm install
```

Paneli yeniden başlatın (Masaüstü kısayolu).

## 2) `KUR.bat` dosyasına çift tıklayın (ilk kurulum)

Script şunları yapar:

- Node.js yoksa kurmayı dener  
- Panel bağımlılıklarını yükler  
- ERP klasörünü bulur (bulamazsa yolu sorar)  
- Pazar 17:00 haftalık görevi kaydeder  
- Windows açılınca paneli başlatır  
- Tarayıcıda `http://127.0.0.1:3920` açar  

## 3) Panelde “Tam senkron”a basın

`pg_dump` yoksa kırmızı uyarı görebilirsiniz — **yine de senkron tamamlanır**.  
Yedek `backups\erp-…-node.sql` olarak yazılır. İsterseniz Ayarlar → **pg_dump bul** veya yolu elle girin.

Sonra her Pazar 17:00 otomatik çalışır.

---

### Gerekli olanlar

| Ne | Not |
|----|-----|
| ERP klasörü (git + `migrate` script) | `erp-backend` doğru branch |
| PostgreSQL + `.env` | ERP klasöründeki `.env` |
| Node.js 18+ | Yoksa kurulum dener |
| pg_dump | Opsiyonel — yoksa Node SQL yedek |

### Sorun olursa

- Panel açılmıyor → Masaüstündeki **ERP Yerel Panel** kısayolu  
- Eski “pg_dump bulunamadı” hatası → paneli bu sürüme güncelleyin (`npm install` + restart)  
- Yanlış ERP → Panel → Ayarlar → ERP klasörü → Kaydet  

Kaldırma: `scripts\uninstall-windows.ps1`
