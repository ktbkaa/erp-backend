# Mevcut Değil — Sprint Uygulama Planı

Kaynak: `ERP_Kapsam_Analizi_Eksik_Ozellikler_Matrisi` (REQ öncelik sırası).  
Baz: migrations **001–019**, header auth (`X-Kullanici-Kodu`), stok hareket motoru, fatura/satınalma zinciri.  
Kapsam: **çalışan kod** (migration + route/service + minimal UI). Saf doküman işi yok.

**Effort:** S ≤ ~0.5 gün · M ~1–2 gün · L ≥ 3 gün (tek agent/dev bağlamında teknik yoğunluk).

**Mevcut kısmi (matris YOK’tan sapma):** `019` → `modul_yetkileri` / `depo_yetkileri` JSON + login dönüşü + UI menü filtresi; `faturalar.mal_kabul_id`; ATP soft/sert (`ATP_SERT`); `kk_uygunsuzluklar.duzeltici_faaliyet` (CAPA değil).

---

## Sprint özeti (ship sırası)

| Batch | REQs | Ship hedefi |
|-------|------|-------------|
| **A — Güvenlik omurgası** | PLT-006, TEC-004, PLT-007, PLT-008, RPT-003 (çekirdek) | JWT + zorunlu auth + menü/depo assert + smoke tests |
| **B — Satış stok kilidi** | INV-004 (+ SAL-008 sertleştirme) | Rezervasyon motoru; irsaliyede tüketim |
| **C — PUR/FIN köprüsü** | PUR-007, FIN-004, FIN-005, FIN-006 | 3-way match + belge→fiş + cari ekstre + tahsilat/ödeme |
| **D — Satış tamamlayıcı** | SAL-007, SAL-009, SAL-010 | Fiyat listesi, iade belgeleri, HTML/PDF+QR |
| **E — Gözlem** | PLT-016, PLT-018, RPT-002 | Audit log + kokpit/dashboard API+ekran |
| **F — Stretch (sprint sonu / sonraki)** | MDM-015, INV-011, PUR-008, PRD-011/013/014, QLT-005, FIN-009, CRM-010, MDM-009 | MVP veya bilinçli defer |

Bağımlılık: **A → B → C**; D∥E A’dan sonra; F A+C sonrası.

---

## Batch A — Güvenlik omurgası

### REQ-PLT-006 JWT auth — **M**

| | |
|--|--|
| **Schema** | `020_jwt_auth.sql`: `kisiler.refresh_token_hash`, `kisiler.token_surum INT DEFAULT 1`; param `JWT_TTL_DK`, `AUTH_ZORUNLU=Evet` seed |
| **Create** | `src/middleware/auth.js` (Bearer doğrula → `req.kullanici`); `src/utils/jwt.js` |
| **Edit** | `routes/auth.js` → `POST /auth/login` JWT döner, `POST /auth/refresh`, `POST /auth/logout`; `src/utils/yetki.js` → header **veya** JWT; `index.js` global `requireAuth` (`AUTH_ZORUNLU`); `public/app.js` `Authorization: Bearer`; `package.json` + `jsonwebtoken` |
| **Endpoints** | `POST /auth/login` `{access_token, refresh_token, …}` · `POST /auth/refresh` · `GET /auth/me` · mevcut header geçiş: `AUTH_ZORUNLU=Hayir` iken |

### REQ-TEC-004 Automated tests — **M**

| | |
|--|--|
| **Schema** | Yok (test DB: mevcut migrate) |
| **Create** | `tests/helpers/app.js`, `tests/auth.test.js`, `tests/stok_rezervasyon.test.js`, `tests/fatura_3way.test.js`; `scripts/test-db-reset.js` |
| **Edit** | `package.json` → `"test": "node --test tests/**/*.test.js"` (+ `pg` fixtures) |
| **Ship** | Auth spoof engeli, rezervasyon ATP, 3-way match happy/fail — CI’da `migrate && test` |

### REQ-PLT-007 Menu screen ACL (partial → complete) — **S**

| | |
|--|--|
| **Schema** | `020` veya `021`: opsiyonel `grup_ekran_yetkileri(grup_id, ekran_kodu, izin)` — JSON yeterliyse kolon kalır |
| **Edit** | `src/utils/yetki.js` → `assertModul(req, 'stok'|'satis'|…)`; kritik route’lara gate; `public/app.js` ekran-seviye filtre (`ekran_yetkileri` veya MODULES.id ∩ grup) |
| **Endpoints** | `GET /auth/me` içinde `modul_yetkileri` + `ekranlar[]`; `PUT /kullanici-gruplari/:id` (zaten var) |

### REQ-PLT-008 Depo yetki — **M**

| | |
|--|--|
| **Schema** | `021_depo_yetki.sql`: `kullanici_depo(kullanici_id, depo_id, UNIQUE)` **veya** grup `depo_yetkileri` JSON’u enforce (019’da yazıldı, assert yok) |
| **Create** | `src/utils/depoYetki.js` → `assertDepoErisim(client, kullanici, depoId)` |
| **Edit** | `stokHareketService.js`, `routes/stok_hareketleri.js`, `mal_kabuller.js`, `irsaliyeler.js`, `stok_bakiyeleri.js` filtre; UI depo dropdown filtresi |
| **Endpoints** | `GET /depolar?yetkili=1`; bakiyeler depo-scoped |

### REQ-RPT-003 Row-level security (çekirdek) — **M** (A ile birlikte)

| | |
|--|--|
| **Schema** | Yok (uygulama katmanı RLS; PG RLS sonra) |
| **Edit** | Liste sorgularına `depo_id IN (…)`, `firma_id` / `is_yeri_id` (kullanıcı bağlamı); helper `scopeWhere(req)` |
| **Ship** | Stok bakiye + stok hareket + sipariş listelerinde scope; tam PG RLS → F |

---

## Batch B — Satış rezervasyonu

### REQ-INV-004 Satış rezervasyonu — **L**

| | |
|--|--|
| **Schema** | `022_satis_rezervasyon.sql`:<br>`stok_rezervasyonlari(id, rezervasyon_no, siparis_id, siparis_detay_id, stok_id, depo_id, parti_id, miktar, tuketilen_miktar, durum [Acik/Kismi/Kapali/Iptal], …)`<br>`siparis_detaylari.rezerve_miktar`; bakiye view/fonksiyon: `kullanilabilir = fiziksel - SUM(açık rezerv)` |
| **Create** | `src/services/rezervasyonService.js` (`rezerveEt`, `serbestBirak`, `tuket`) |
| **Edit** | `routes/siparisler.js` onay/`POST` → rezerve; `routes/irsaliyeler.js` stok çıkışında `tuket`; `atpKontrol` rezerv net; `stokHareketService.depoBakiyeListesi` + `rezerve` / `kullanilabilir` kolonları; UI sipariş/bakiye |
| **Endpoints** | `POST /siparisler/:id/rezerve` · `POST /siparisler/:id/rezervasyon-iptal` · `GET /stok-rezervasyonlari?siparis_id=` · `GET /stok-bakiyeleri` → `bakiye`, `rezerve`, `kullanilabilir` |

---

## Batch C — PUR / FIN

### REQ-PUR-007 3-way invoice match — **L**

Önkoşul: `faturalar.mal_kabul_id` (019) + SA sipariş satır fiyatı + mal kabul miktarı.

| | |
|--|--|
| **Schema** | `023_fatura_eslestirme.sql`: `fatura_eslestirme(id, fatura_id, mal_kabul_id, siparis_id, durum [Beklemede/Onayli/Farkli/Red], fiyat_fark, miktar_fark, tolerans_pct)`; param `FATURA_FIYAT_TOLERANS_PCT` |
| **Create** | `src/services/faturaEslesmeService.js`; `routes/fatura_kontrolleri.js` |
| **Edit** | `routes/faturalar.js` alış onayında match; `POST /faturalar/mal-kabulden` (PUR-006 kapatır); UI alış fatura + fark ekranı |
| **Endpoints** | `POST /faturalar/mal-kabulden` · `POST /faturalar/:id/eslestir` · `POST /faturalar/:id/eslestirme-onay` · `GET /fatura-kontrolleri?durum=` |

### REQ-FIN-004 Document → accounting — **L**

| | |
|--|--|
| **Schema** | `024_belge_muhasebe.sql`: `hesap_belirleme_kurallari(belge_tipi, cari_tipi?, stok_sinif?, borc_hesap_id, alacak_hesap_id)`; `muhasebe_belgeleri.kaynak_belge_tipi/id`; `faturalar.muhasebe_belge_id` |
| **Create** | `src/services/belgeMuhasebeService.js` |
| **Edit** | Fatura `Onayli` → öneri/otomatik fiş; `routes/muhasebe_belgeleri.js` kaynak ref |
| **Endpoints** | `POST /faturalar/:id/muhasebelestir` · `GET /hesap-belirleme-kurallari` CRUD |

### REQ-FIN-005 Cari borç/alacak — **M** (+ FIN-006 ile)

| | |
|--|--|
| **Schema** | `025_cari_hareket.sql`: `cari_hareketleri(id, cari_id, hareket_tarihi, borc, alacak, belge_tipi, belge_id, vade_tarihi, aciklama, bakiye_sonrasi?)` |
| **Create** | `src/services/cariHareketService.js`; `routes/cari_hareketleri.js` |
| **Edit** | Fatura onay → borç/alacak satırı; `routes/cariler.js` ekstre link |
| **Endpoints** | `GET /cari-hareketleri?cari_id=&baslangic=&bitis=` · `GET /cariler/:id/ekstre` |

### REQ-FIN-006 Tahsilat/ödeme — **M**

| | |
|--|--|
| **Schema** | `025` devam: `tahsilat_odemeler(id, belge_no, tur [Tahsilat/Odeme], cari_id, tutar, kasa_hesap_id?, banka_hesap_id?, tarih, durum)`; `tahsilat_odeme_satirlari(fatura_id, tutar)` (kapama) |
| **Create** | `routes/tahsilat_odemeler.js` |
| **Edit** | Onay → `cari_hareketleri` ters kayıt + opsiyonel muhasebe fişi |
| **Endpoints** | CRUD `/tahsilat-odemeler` · `POST /tahsilat-odemeler/:id/onayla` |

---

## Batch D — Satış tamamlayıcı

### REQ-SAL-007 Fiyat listesi — **M**

| | |
|--|--|
| **Schema** | `026_fiyat_listesi.sql`: `fiyat_listeleri`, `fiyat_listesi_satirlari(stok_id, min_miktar, birim_fiyat, iskonto_oran, baslangic, bitis)`; `cariler.fiyat_liste_id` |
| **Create** | `src/services/fiyatService.js`; `routes/fiyat_listeleri.js` |
| **Edit** | `satis_teklifleri` / `siparisler` satır fiyat önerisi |
| **Endpoints** | CRUD `/fiyat-listeleri` · `GET /fiyat-listeleri/fiyat?cari_id=&stok_id=&miktar=` |

### REQ-SAL-009 İade süreçleri — **L**

| | |
|--|--|
| **Schema** | `027_iade.sql`: `belge_tipleri` + `SATIS_IADE_IRSALIYE`, `SATIS_IADE_FATURA`, `ALIS_IADE`; irsaliye/fatura `iade_mi BOOLEAN`, `iade_kaynak_id`; hareket kodları IADE-GIR/CIK |
| **Edit** | `irsaliyeler.js` / `faturalar.js` iade oluştur + ters stok; satınalma iade → çıkış |
| **Endpoints** | `POST /irsaliyeler/:id/iade` · `POST /faturalar/:id/iade` · `POST /mal-kabuller/:id/iade` |

### REQ-SAL-010 PDF/QR output — **M**

| | |
|--|--|
| **Schema** | Yok (veya `belge_ciktilari` log) |
| **Create** | `src/services/belgePdfService.js` (HTML şablon → PDF: `puppeteer` **veya** sprint için `GET …/yazdir` HTML+print CSS); QR: `qrcode` paketi belge_no/ettn |
| **Edit** | `routes/irsaliyeler.js`, `faturalar.js`; UI “Yazdır” |
| **Endpoints** | `GET /irsaliyeler/:id/pdf` · `GET /faturalar/:id/pdf` · `GET /…/yazdir` (HTML fallback) |

---

## Batch E — Gözlem / kokpit

### REQ-PLT-016 Audit log — **M**

| | |
|--|--|
| **Schema** | `028_audit_log.sql`: `audit_log(id, at, kullanici_kodu, tablo, kayit_id, islem [INSERT/UPDATE/DELETE], eski JSONB, yeni JSONB, ip?)` |
| **Create** | `src/middleware/audit.js` / `src/utils/auditLog.js`; `routes/audit_log.js` (read-only) |
| **Edit** | Kritik yazma: sipariş, fatura, stok hareket, kullanıcı grubu |
| **Endpoints** | `GET /audit-log?tablo=&kayit_id=` |

### REQ-PLT-018 + REQ-RPT-002 Kokpit / Dashboard — **M** (tek ekran)

| | |
|--|--|
| **Schema** | Yok (agregasyon) |
| **Create** | `routes/kokpit.js`; UI ekran `kokpit` |
| **Endpoints** | `GET /kokpit/ozet` → `{ acik_satis_siparis, geciken_sevk, kritik_stok[], bekleyen_sa_onay, acik_kk, cari_risk_top, fatura_eslesme_bekleyen }` |

---

## Batch F — Stretch (MVP veya defer)

| REQ | Effort | Sprint MVP (ship) | Deferred |
|-----|--------|-------------------|----------|
| **MDM-015 Seri** | L | `stok_serileri` + hareket satır `seri_id[]` yalnızca `seri_takip=Evet` stoklarda | Tam izlenebilirlik UI |
| **INV-011 Değerleme** | L | Ortalama maliyet: `stok_maliyet(stok_id, birim_maliyet)` girişte güncelle | FIFO katmanı |
| **PUR-008 Tedarikçi değerlendirme** | S | `tedarikci_skorlari(cari_id, donem, gecikme, kalite, fiyat)` + `GET /cariler/:id/skor` | Otomatik KPI motoru |
| **PRD-011 Fiili maliyet** | L | WO kapanışta tüketim×ortalama maliyet → `uretim_emirleri.birim_maliyet` | İşçilik/genel gider |
| **PRD-013 Yan ürün** | M | `uretim_emri_yan_urunler` + girişte ek stok hareketi | Fire oran motoru |
| **PRD-014 Fason** | L | Emir tipi `Fason` + SA sipariş bağ + mal kabul | Tam PRDT40 |
| **QLT-005 CAPA** | M | `kk_capa` ← `kk_uygunsuzluklar`; durum Acik→Kapali | ISO tam workflow |
| **FIN-009 Mutabakat** | M | `cari_mutabakat` dönem bakiyesi vs ekstre PDF checklist | Banka MT940 |
| **CRM-010 Ajanda** | S | `GET /crm-ajanda?bas=&bit=` (faaliyet+görev birleşik) + basit haftalık UI | Full calendar |
| **MDM-009 İkame** | S | `stok_ikame(stok_id, ikame_stok_id, oncelik)` + BOM satırında öneri | Otomatik ikame tüketim |

F için önerilen sprint içi dilim (kalan kapasite): **CRM-010 S + MDM-009 S + QLT-005 M + PUR-008 S**; geri kalanı sonraki sprint.

---

## Migration / dosya numaralandırma (öneri)

```
020_jwt_auth.sql
021_depo_ekran_yetki.sql
022_satis_rezervasyon.sql
023_fatura_eslestirme.sql
024_belge_muhasebe.sql
025_cari_hareket_tahsilat.sql
026_fiyat_listesi.sql
027_iade_belgeleri.sql
028_audit_log.sql
029_stretch_seri_ikame_capa.sql   -- F dilimi seçilirse
```

Yeni route mount’ları `index.js`; yeni ekranlar `public/app.js` MODULES (+ ACL anahtarları).

---

## Endpoint haritası (batch sırası)

```
A  POST /auth/login|refresh|logout  GET /auth/me
   GET /depolar?yetkili=1
B  POST /siparisler/:id/rezerve|rezervasyon-iptal
   GET  /stok-rezervasyonlari  GET /stok-bakiyeleri (+rezerve)
C  POST /faturalar/mal-kabulden  POST /faturalar/:id/eslestir|eslestirme-onay|muhasebelestir
   GET  /fatura-kontrolleri  CRUD /hesap-belirleme-kurallari
   GET  /cari-hareketleri  GET /cariler/:id/ekstre
   CRUD /tahsilat-odemeler  POST /tahsilat-odemeler/:id/onayla
D  CRUD /fiyat-listeleri  GET /fiyat-listeleri/fiyat
   POST /irsaliyeler|faturalar|mal-kabuller/:id/iade
   GET  /irsaliyeler|faturalar/:id/pdf
E  GET  /audit-log  GET /kokpit/ozet
F  GET  /crm-ajanda  CRUD /stok-ikame  CRUD /kk-capa  GET /cariler/:id/skor
```

---

## Tablo özeti

| Tablo | Batch | REQ |
|-------|-------|-----|
| (alter) kisiler token alanları | A | PLT-006 |
| kullanici_depo / grup ekran | A | PLT-007/008 |
| stok_rezervasyonlari | B | INV-004 |
| fatura_eslestirme | C | PUR-007 |
| hesap_belirleme_kurallari | C | FIN-004 |
| cari_hareketleri | C | FIN-005 |
| tahsilat_odemeler(+satir) | C | FIN-006 |
| fiyat_listeleri(+satir) | D | SAL-007 |
| (belge_tipleri iade + flags) | D | SAL-009 |
| audit_log | E | PLT-016 |
| stok_serileri / stok_ikame / kk_capa / tedarikci_skorlari / cari_mutabakat | F | stretch |

---

## Per-REQ kartlar (öncelik sırası)

| # | REQ | Effort | Create | Edit | Schema |
|---|-----|--------|--------|------|--------|
| 1 | PLT-006 JWT | M | `middleware/auth.js`, `utils/jwt.js` | `auth.js`, `yetki.js`, `index.js`, `app.js`, `package.json` | 020 kisiler token |
| 2 | INV-004 Rezervasyon | L | `rezervasyonService.js`, route list | `siparisler.js`, `irsaliyeler.js`, `stokHareketService.js`, ATP | 022 `stok_rezervasyonlari` |
| 3 | TEC-004 Tests | M | `tests/*.test.js` | `package.json` | — |
| 4 | PLT-007 Menü ACL | S | (opsiyonel ekran tablosu) | `yetki.js`, route gates, `app.js` | 021 opsiyonel |
| 5 | PLT-008 Depo yetki | M | `depoYetki.js` | hareket/kabul/irsaliye/bakiye | 021 `kullanici_depo` |
| 6 | PUR-007 3-way | L | `faturaEslesmeService.js`, `fatura_kontrolleri.js` | `faturalar.js` | 023 |
| 7 | FIN-004 Belge→muh | L | `belgeMuhasebeService.js` | `faturalar.js`, `muhasebe_belgeleri.js` | 024 |
| 8 | FIN-005 Cari B/A | M | `cariHareketService.js`, `cari_hareketleri.js` | fatura onay | 025 |
| 9 | FIN-006 Tahsilat | M | `tahsilat_odemeler.js` | cari hareket + muh | 025 |
| 10 | SAL-007 Fiyat | M | `fiyatService.js`, `fiyat_listeleri.js` | teklif/sipariş | 026 |
| 11 | SAL-009 İade | L | — | irsaliye/fatura/mal_kabul + hareket kod | 027 |
| 12 | SAL-010 PDF/QR | M | `belgePdfService.js` | irsaliye/fatura routes, UI | — |
| 13 | PLT-016 Audit | M | `auditLog.js`, `audit_log.js` | kritik writers | 028 |
| 14 | PLT-018 Kokpit | M | `kokpit.js` + UI | `app.js` MODULES | — |
| 15 | RPT-002 Dashboard | M | (= PLT-018 aynı `/kokpit/ozet`) | | — |
| 16 | RPT-003 RLS | M | `scopeWhere` helper | list routes | app-level |
| 17 | MDM-015 Seri | L | `seriService.js`, `stok_serileri` route | hareket satır | 029 |
| 18 | INV-011 Değerleme | L | `maliyetService.js` | giriş hareketleri | `stok_maliyet` |
| 19 | PUR-008 Tedarikçi | S | skor tablo/route | cari UI | `tedarikci_skorlari` |
| 20 | PRD-011 Fiili mal. | L | maliyet kapanış | `uretim_emirleri.js` | alter WO |
| 21 | PRD-013 Yan ürün | M | yan ürün satır | WO giriş | `uretim_emri_yan_urunler` |
| 22 | PRD-014 Fason | L | fason bağ | emir tipi + SA | alter + bağ |
| 23 | QLT-005 CAPA | M | `kk_capa.js` | uygunsuzluk | `kk_capa` |
| 24 | FIN-009 Mutabakat | M | `cari_mutabakat.js` | ekstre | `cari_mutabakat` |
| 25 | CRM-010 Ajanda | S | `crm_ajanda.js` | UI hafta | — |
| 26 | MDM-009 İkame | S | `stok_ikame.js` | BOM UI öneri | `stok_ikame` |

---

## Sprint DoD (Batch A–E)

1. `npm run migrate` 020–028 sorunsuz.
2. `npm test` auth + rezervasyon + 3-way en az 1 happy / 1 fail.
3. `AUTH_ZORUNLU=Evet` iken spoof `X-Kullanici-Kodu` **401/403**.
4. Sipariş onay → rezerv ↑; irsaliye → rezerv ↓ + stok çıkış.
5. Alış fatura mal kabulden → eşleştirme durumu; onay → muhasebe fişi + cari hareket.
6. Kokpit widget’ları boş DB’de 200 + sıfır sayaç.
7. Matris güncellemesi: bu REQs → “Mevcut ve doğrulandı” / “Kısmen” kanıt linki (kod PR) — doküman ayrı PR, bu sprintte kod merge kanıtı yeterli.

**Bilerek dışarıda:** GİB e-fatura (FIN-010), kapasite (PRD-012), tam FIFO, banka mutabakat otomasyonu.
