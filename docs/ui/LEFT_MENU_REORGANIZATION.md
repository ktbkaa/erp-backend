# Sol Menü Yeniden Organizasyonu

Tarih: 2026-11-12 (Europe/Istanbul)  
Dal: `cursor/erp-sol-menu-org-4f63`  
Kaynak: `public/app.js` → `MODULES` + `KTB_MENU_LAYOUT` + `applyKtbMenuLayout()`

## Özet

Mevcut 14 ana modül / ~160 ekran envanteri çıkarıldı. Ekran tanımları (id, endpoint, form alanları) **korunarak** yalnızca menü hiyerarşisi `KTB_MENU_LAYOUT` ile yeniden kuruldu. Hedef mimaride olup sistemde olmayan ekranlar menüye eklenmedi.

Word referans görselleri bu ortamda ayrı bir menü screenshot paketi olarak gelmedi; envanter canlı `MODULES` kaynağından ve mevcut uygulama menüsünden alındı.

---

## 1. Eski menü yapısı (özet)

| Modül id | Başlık | Ekran ≈ |
|----------|--------|---------|
| fixed-tanimlar | Sabit Tanımlar | 15 (ölçü, ülke, kur, belge tipi…) |
| sistem | Sistem | 9 |
| ana-veri | Ana Veri | 3 (firma, iş yeri, depo) |
| stok | Stok | 13 |
| cari | Cari | 3 |
| uretim | Üretim | 17 |
| satinalma | Satınalma | 8 |
| crm | CRM | 9 |
| proje | Proje Yönetimi | 22 |
| satis | Satış | 5 |
| kalite | Kalite | 7 |
| onay | Onay Yönetimi | 9 |
| finans | Finans | 18 |
| insan-kaynaklari | İnsan Kaynakları | 22 |

**Sorunlar:** Sabit tanımlar ile sistem/ana veri dağınık; cari ayrı; üretim altında “Depo”; satınalma/kalite girişimleri karışık; raporlar finans içinde; modül adları kısa/tutarsız.

---

## 2. Yeni menü yapısı

Sıra (sol menü):

1. CRM  
2. Satış Yönetimi  
3. Satınalma Yönetimi  
4. Stok ve Depo Yönetimi  
5. Üretim Yönetimi  
6. Kalite Yönetimi  
7. Proje Yönetimi  
8. Finans ve Muhasebe  
9. İnsan Kaynakları  
10. Onay Yönetimi  
11. Raporlama ve Analiz  
12. Sistem Yönetimi  

Her modülde işlem grupları (seviye 2) + ekranlar (seviye 3). Modül içi ana veri **Tanımlamalar**; ülke/kur/ölçü vb. **Sistem Yönetimi → Ortak Tanımlamalar**.

---

## 3. Eşleştirme tablosu (eski → yeni)

| Eski yer | Ekran id | Yeni yer |
|----------|----------|----------|
| CRM / Pipeline | crm-firsatlar, crm-adaylar, crm-kontaklar | CRM → Fırsatlar |
| CRM / Faaliyet | crm-faaliyet* , crm-gorevler, crm-ajanda | CRM → Faaliyetler |
| CRM / Tanımlar | crm-firsat-asamalari, crm-faaliyet-tipleri | CRM → Tanımlamalar |
| Satış / Sipariş | satis-teklifleri, satis-siparisleri | Satış → Teklifler / Siparişler |
| Satış / Sevk | sevk-emirleri | Satış → Sevkiyat |
| Satış / Belge | irsaliye-yonetimi, fatura-yonetimi | Satış → Satış Belgeleri |
| Satınalma | talepler, teklifler, sipariş, mal kabul | Satınalma Yönetimi (aynı gruplar, yeniden adlandırıldı) |
| Stok | kart, hareket, transfer, sayım, rezervasyon, lot/seri, MRP | Stok ve Depo Yönetimi |
| Üretim / Depo | stok-depo | Stok → Stok Hareketleri |
| Üretim | BOM, rota, iş emri, plan, giriş, kolay onay, iş merkezi | Üretim Yönetimi |
| Ana Veri / warehouses | warehouses | Stok → Tanımlamalar |
| Ana Veri / companies, is-yerleri | companies, is-yerleri | Sistem → Şirket Yönetimi |
| Cari | cari-kartlari, cari-ekstre, tahsilat-odemeler | Finans → Cari Finans |
| Sabit Tanımlar | ülke, kur, ölçü, belge tipi… | Sistem → Ortak Tanımlamalar |
| Finans / Raporlar (bir kısmı) | mizan, yevmiye… | Finans → Finans Raporları |
| Finans / kokpit | kokpit | Raporlama → Yönetim Dashboard |
| Kalite | GKK/CKK, uygunsuzluk, CAPA, tanımlar | Kalite Yönetimi |
| Onay | onaylarım, izleme, yetki, sabit tanımlar | Onay Yönetimi |
| İK | özlük…bordro… | İnsan Kaynakları (+ Tanımlamalar) |
| Proje | projeler, agile, bütçe, risk, tanımlar | Proje Yönetimi |

---

## 4. Taşınan ekranlar (öne çıkanlar)

- `stok-depo`: Üretim → Stok ve Depo  
- `warehouses`: Ana Veri → Stok Tanımlamalar  
- `companies`, `is-yerleri`: Ana Veri → Sistem / Şirket Yönetimi  
- `cari-*`: Cari modülü kaldırıldı → Finans / Cari Finans  
- Tüm `fixed-tanimlar` ekranları → Sistem / Ortak Tanımlamalar (veya Parametreler)  
- `kokpit` (+ proje dashboard kopya menü girişi) → Raporlama  

---

## 5. Yeniden isimlendirilen modül başlıkları

| Eski başlık | Yeni başlık |
|-------------|-------------|
| Satış | Satış Yönetimi |
| Satınalma | Satınalma Yönetimi |
| Stok | Stok ve Depo Yönetimi |
| Üretim | Üretim Yönetimi |
| Kalite | Kalite Yönetimi |
| Finans | Finans ve Muhasebe |
| Sistem (+ Sabit Tanımlar + Ana Veri) | Sistem Yönetimi |
| *(yeni)* | Raporlama ve Analiz |

Ekran `title` alanları bilinçli olarak değiştirilmedi (form başlıkları korunur). Menü grup başlıkları yeni hiyerarşiye göre.

---

## 6. Menüde karşılığı bulunmayan / önerilen ama yok

Hedef mimaride olup **sistemde ekranı olmadığı için eklenmeyenler**:

| Modül | Önerilen ama yok |
|-------|------------------|
| CRM | Kampanyalar, Müşteri Görüşmeleri (ayrı), CRM Raporları |
| Satış | İade İşlemleri, Satış Raporları, Satış Tanımlamaları |
| Satınalma | İade, Tedarikçi Performansı, Satınalma Raporları |
| Stok | Stok Raporları (ayrı) |
| Üretim | Üretim Raporları, Kapasite Planlama |
| Kalite | Üretim Kalite Kontrol (ayrı), Kalite Emirleri (genel), Kalite Raporları |
| Finans | Tahsilat/Ödeme (ayrı ekran; şu an cari hareket), Çek/Senet |
| İK | İK Raporları |
| Onay | Onay Süreçleri (ayrı işlem ekranı; tanımlar var) |
| Raporlama | Satış/SA/Stok/Üretim/İK/Proje analiz ekranları |
| Sistem | Roller ve Yetkiler (ayrı), Menü Yetkilendirme, İş Akışı, Dosya, Entegrasyon |

---

## 7. Teknik değişiklikler

1. `KTB_MENU_LAYOUT` — hedef hiyerarşi (yalnız mevcut screen id).  
2. `applyKtbMenuLayout()` — `MODULES` ekran nesnelerini layout’a göre yeniden gruplar.  
3. `MODULE_PERM_ALIASES` + `modulYetkiliMi` — eski `module_permissions` id’leri (`fixed-tanimlar`, `cari`, `ana-veri`…) yeni modüllere map.  
4. `MOD_ICONS` / `MODULE_TITLE_EN` — yeni 12 modül.  
5. `ALL_SCREENS` — aynı ekranın birden fazla menüde görünmesi için id bazlı tekilleştirme (birincil modül = layout sırası).  
6. Route / backend / DB **değiştirilmedi**.

---

## 8. Test sonuçları

| Test | Sonuç |
|------|-------|
| 12 ana modül sidebar’da | PASS |
| Orphan ekran = 0 | PASS |
| Missing layout id = 0 | PASS |
| Her modülün ilk ekranı `openScreen` | PASS (12/12) |
| Örnek: crm-firsatlar, kolay-is-emri-onayi, stok-karti, kokpit, onaylarim | PASS |
| Menü daraltma (sidebar-collapsed) | PASS (görsel) |
| Yetki: `module_permissions` alias | Kodda; ADMIN `*` ile doğrulandı |

Kanıt görselleri: `/opt/cursor/artifacts/menu_reorg_*.png`

---

## 9. Bilinen sorunlar / notlar

- Aynı ekran iki menüde listelenebilir (`prj-dashboard` Proje + Raporlama); `ALL_SCREENS` birincil modülü Proje kabul eder.  
- Personel / sınırlı `module_permissions` ile tüm yeni id’ler için alan testi yapılmadı (alias ile geriye uyum var).  
- Favori / hash URL’ler screen id’ye bağlı olduğu için kırılmaz.  
- “Diğer Ekranlar” grubu artık boş (orphan kalmadı).  
- Word menü screenshot paketi bu koşuda doğrulanamadı; canlı envanter esas alındı.
