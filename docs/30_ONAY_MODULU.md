# Onay Yönetimi — Modül Dokümanı

**PDF (ekran görüntülü):** [`ONAY_MODULU_Kullanim_Dokumani.pdf`](./ONAY_MODULU_Kullanim_Dokumani.pdf)

Canias tarzı onay menüsünden sadeleştirilerek KTB ERP’ye uyarlanmıştır. Odak **tanım ekranlarıdır**.

---

## 1. Amaç

Belge onaylarının:

1. **Kim** tarafından (rol + kişi + firma/iş yeri),
2. **Hangi koşullarda** (ekran, tutar, yön, hareket),
3. **Hangi sırayla** (rota adımları)

verileceğini tek modülden yönetmek.

---

## 2. Menü yapısı

| Bölüm | Ekran | Açıklama |
|--------|--------|----------|
| Onay | **Onaylarım** | Rolüme / yetki devrine düşen bekleyenler · Onayla / Reddet |
| Onay | **Onay İzleme** | Tüm kayıtlar + adım geçmişi |
| Onay | **Yetki Devri** | Süreyle vekâlet |
| Sabit Tanımlar | **Onay Rolü** | Kişi · rol adı · firma · iş yeri |
| Sabit Tanımlar | **Onay Kuralı** | Ekran · mesaj · koşullar (VE) |
| Sabit Tanımlar | **Onay Rotası** | Adım sırası · bildirimler |
| Sabit Tanımlar | **Mesaj Şablonu** | Bildirim metinleri |
| Sabit Tanımlar | **Durum** | BEKLIYOR, ONAYLANDI, REDDEDILDI… |

---

## 3. Tanım ekranları (detay)

### 3.1 Onay Rolü

Her satır = bir kişinin, belirli firma/iş yerinde taşıdığı onay rolü.

| Alan | Açıklama |
|------|----------|
| Kişi | Kullanıcı lookup |
| Onay rol adı | Örn. `Satınalma Müdürü` — rotada aynı ad yazılır |
| Firma | Lookup |
| İş yeri | Lookup |

Üye grid’i yoktur; kayıt zaten atamadır. Aynı rol adı birden fazla kişiye verilebilir.

### 3.2 Onay Kuralı

Hangi ekranda onayın devreye gireceği ve koşullar. **VE mantığı** — işaretlenen/doldurulanların tümü sağlanmalı.

| Alan | Açıklama |
|------|----------|
| Öncelik sırası | Aynı ekranda birden fazla kural |
| Kural adı / kodu | Tanımlayıcı |
| Firma / İş yeri | Kapsam (boş = tümü) |
| Ekran | `/onay-ekranlari` kataloğundan seçim |
| Mesaj şablonu | Onay Mesaj Şablonu lookup |
| Belge yönü | Hepsi / Alış / Satış |
| Min / Max tutar | Boş = sınır yok |
| Belge durumları | Virgüllü; boş = tümü |
| Otomatik onay | Koşul sağlanınca rota atlanır |
| Onaylanınca aktif et | Belge ilerletme niyeti |
| Hareket kodları | Alt grid — satır satır seçim; boş = tümü |

Ham SQL ve «alan adı + işlem + serbest metin» grid’i **yoktur**.

### 3.3 Onay Rotası

Tanımların nasıl çalışacağını gösterir: kural/ekran bağları + adımlar.

**Başlık:** rota adı, sürüm, ekran, bağlı kural, firma/iş yeri, ilk/red/ek mesaj şablonları, iptal rol adı, ekleri mail ile gönder.

**Adım satırları:**

| Alan | Açıklama |
|------|----------|
| Adım no | 10, 20, 30… |
| Adım açıklaması | Görünen ad |
| Onay rol adı | Rol ekranındaki adla birebir |
| Mail / SMS | Bildirim |
| Değer değiştirebilir | Onaycı düzeltme hakkı |
| Min. tutar | Bu adım için eşik |
| Geri gönder adım no | Düzeltmede dönüş |
| Zorunlu | Atlanamaz |

### 3.4 Mesaj şablonu

Olay (Bekleme / Onay / Red…), konu, gövde. Yer tutucular: `{{belge_no}}`, `{{modul}}`, `{{tutar}}`, `{{onayci}}`, `{{gerekce}}`.

---

## 4. Önerilen kurulum sırası

1. Mesaj şablonları  
2. Onay rolleri (kişiler)  
3. Onay kuralı (ekran + koşullar)  
4. Onay rotası (kuralı bağla, adımları yaz)  
5. Test belgesi → Onaylarım’da doğrula  

---

## 5. API özeti

| Endpoint | Rol |
|----------|-----|
| `GET/POST/PUT /onay-rolleri` | Rol atamaları |
| `GET/POST/PUT /onay-kurallari` | Kurallar (+ `hareketler`) |
| `GET /onay-ekranlari` | Seçilebilir ekran kataloğu |
| `GET/POST/PUT /onay-rotalari` | Rota (+ `adimlar`) |
| `GET/POST/PUT /onay-mesaj-sablonlari` | Şablonlar |
| `GET /onay-kayitlari?benim=true` | Onaylarım |
| `POST /onay-kayitlari/baslat` | Süreç başlat |
| `POST /onay-kayitlari/:id/onayla\|reddet\|iptal` | İşlem (kapı kaydında belgeye sonuç uygulanır) |
| `GET /onay-belge-turleri` | Onaylanabilir belge türleri |
| `GET /onay-bekleyenler` · `POST /onay-bekleyenler/toplu-onayla\|toplu-reddet` | Genel gelen kutusu + toplu işlem |
| `GET /onay-izi` | Onay izi |

Motor: `src/services/onayService.js`  
Migration: `036_onay_modulu.sql`, `037_onay_tanim_sadelestirme.sql`, `100_approval_gate_infra.sql` (genel onay kapısı)

---

## 6. Genel onay kapısı (belgeyi onaya bağlama)

Onay hiçbir belgeye sabit kodlanmaz. Varsayılan **kapalıdır**: belge türüne bağlı aktif kural yoksa belge eskisi gibi akar. Seed/migration hiçbir kuralı belge türüne bağlamaz.

**Parçalar**

| Parça | Yer | Açıklama |
|-------|-----|----------|
| Belge türü kaydı | `approval_document_types` · ekran **Onaylanabilir Belge Türleri** · `GET /onay-belge-turleri` | "Bu belge türü onaya bağlanabilir" kaydı: tablo/kolon eşlemesi, onay bekleyen değerler (`pending_values`), onaylanınca değerler (`approved_values`), ret/iptal sonuçları (`outcomes`, ör. `TASLAK`, `IPTAL`) ve varsayılanlar. Değerlerde `$now`, `$user_id`, `$user_code` belirteçleri kullanılabilir. |
| Kural | `approval_rules.document_type_code`, `reject_outcome`, `cancel_outcome` · **Onay Kuralları** ekranı | "Belge türü (onay kapısı)" seçilen kural belgeyi onaya takar. Ret/iptal sonucu kural bazında seçilir (boş = belge türü varsayılanı). Mevcut koşullar (firma, iş yeri, tutar, yön, belge durumları, otomatik onay) aynen geçerli. |
| Rota | **Onay Rotaları** | Kurala bağlı rota + adımlar (rol adı). Kapı kuralı için rota yoksa gönderim `ONAY_ROTA_YOK` ile reddedilir. |
| Gelen kutusu | **Onay Bekleyenler** · `GET /onay-bekleyenler` | Tüm belge türlerinde kullanıcının rolüne (yönetici: tümü) düşen bekleyenler. |
| Toplu işlem | `POST /onay-bekleyenler/toplu-onayla` · `toplu-reddet` `{ ids, notes }` | Kayıt bazında bağımsız transaction; `basarili` / `hatali` döner. Ekranda kolon filtresiyle listelenenler toplu onaylanır/reddedilir. |
| Onay izi | `approval_audit_log` · **Onay İzi** · `GET /onay-izi?document_type_code=&document_id=` | `GONDERILDI`, `ADIM_ONAYLANDI`, `ONAYLANDI`, `REDDEDILDI`, `IPTAL`, `OTOMATIK_ONAY` (+ belge türlerinin yazdığı `DOGRUDAN_ONAY`). |
| Servis | `src/services/onayKapisiService.js` | `submitForApproval`, `assertNotPending`, `assertManualStatusChange`, `applyRecordOutcome`, `logAudit`. |

**Akış:** belge "Onayla"/aktifleştirme anında `submitForApproval` çağırır → kural yoksa `{ gated: false }`, belge eski akışına devam eder → kural varsa belge `pending_values` ile onay bekleyen duruma alınır ve onay kaydı açılır → son adım onaylanınca `approved_values`, ret/iptalde kuralın sonucu (`TASLAK` / `IPTAL`) belgeye yazılır. Onay beklerken aşağı akış işlemleri (`assertNotPending`) ve elle durum değişikliği (`assertManualStatusChange`) engellenir.

**Bağlı belge türleri**

| Kod | Belge | Kural açıkken |
|-----|-------|---------------|
| `SATINALMA_SIPARIS` | Satınalma siparişi | Taslak → Onayla → `OnayBekliyor` → onay → `Onayli`. Onay beklerken mal kabul ve elle durum değişikliği engelli. |
| `DEPO_TRANSFER` | Depo transfer emri | Taslak → Onayla → `OnayBekliyor` (stok hareketi yok) → onay → `Onayli` → tekrar Onayla → stok hareketi + `Tamamlandi`. |

**Yeni belge türü eklemek:** `approval_document_types`'a satır (migration) + belgenin aktifleştirme ucunda `submitForApproval` çağrısı + gerekiyorsa aşağı akış ucunda `assertNotPending`. Belge tablosunun durum kısıtı onay bekleyen değeri kabul etmelidir.

**Örnek kurulum (depo transferi):** Onay Rolleri'nde rolü kişiye ver → Onay Kuralları'nda "Belge türü = Depo transfer emri", ret sonucu seç → Onay Rotaları'nda kuralı bağla, adımları yaz → Transfer emrinde "Onayla" → Onay Bekleyenler.

---

## 7. Dokümanı yeniden üretmek

```bash
npm run migrate
node scripts/capture-onay-dokuman-ekranlari.js
node scripts/build-onay-dokuman-pdf.js
```

Çıktı: `docs/ONAY_MODULU_Kullanim_Dokumani.pdf`

---

## 8. Sonraki tur

1. Diğer belge türlerini (satınalma talebi, fatura, muhasebe belgesi…) kayda + `submitForApproval` bağlantısına almak  
2. Mail/SMS gerçek gönderimi  
3. Hareket kodu için chip / çoklu seçim UI  
4. Rota adımında rol adını lookup ile seçtirmek  
