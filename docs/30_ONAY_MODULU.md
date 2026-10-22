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
| `POST /onay-kayitlari/:id/onayla\|reddet\|iptal` | İşlem |

Motor: `src/services/onayService.js`  
Migration: `036_onay_modulu.sql`, `037_onay_tanim_sadelestirme.sql`

---

## 6. Dokümanı yeniden üretmek

```bash
npm run migrate
node scripts/capture-onay-dokuman-ekranlari.js
node scripts/build-onay-dokuman-pdf.js
```

Çıktı: `docs/ONAY_MODULU_Kullanim_Dokumani.pdf`

---

## 7. Sonraki tur

1. Belge «Onayla» butonlarını `baslatOnay` ile bağlamak  
2. Mail/SMS gerçek gönderimi  
3. Hareket kodu için chip / çoklu seçim UI  
4. Rota adımında rol adını lookup ile seçtirmek  
