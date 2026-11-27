# GİB / e-Belge Stratejisi (Go-live)

**Güncelleme:** 27 Kasım 2026 (Europe/Istanbul) — migration `160_ebelge_gib_entegrasyon`  
**Karar (v2):** KTB ERP, e-Fatura / e-Arşiv / e-İrsaliye belgesini **kendisi UBL-TR 1.2 standardında üretir ve doğrular**; GİB'e iletim **özel entegratör** (REST, yapılandırılabilir) veya **GİB portal** (manuel yükleme) üzerinden yapılır. Mali mühür / e-imza entegratör ya da portal tarafında atılır. Canlı gönderim yalnızca `GIB_CANLI=Evet` **ve** kimlik bilgileri eksiksizken açılır; aksi halde sandbox (mock / entegratör test ortamı) çalışır, sahte "Gönderildi" yazılmaz.

## Akış

```text
Fatura / İrsaliye ─► POST /e-belge/hazirla
   mapper (DB → UBL modeli, eksik veri → 422 EBELGE_VERI_EKSIK)
   GİB no (seri+yıl+9 hane, boşluksuz) + ETTN (UUID v4)
   UBL-TR XML + GİB zarfı (e-Arşiv hariç) ─► XSD (GİB paketi) + şematron kural portu ─► 422 EBELGE_XML_GECERSIZ
   kuyruk: Hazir
─► POST /e-belge/:id/kuyruga-al ─► Kuyrukta ─► POST /e-belge/kuyruk/isle (veya zamanlayıcı) / POST /:id/gonder
   kaynak değişti mi? (XML kaynağın bugünkü hâlinden aynı no/ETTN/zamanla yeniden üretilip karşılaştırılır)
                 └ farklı → Hata EBELGE_KAYNAK_DEGISTI (gönderilmez) → yeniden hazırla (aynı no/ETTN)
   adaptör.send ─► Gonderildi │ Tamamlandi │ ManuelBekliyor
                 └ hata: geçici → Hata + next_attempt_at (1, 5, 15, 60, 360 dk; EBELGE_MAX_DENEME)
                         kalıcı → Hata (retryable=false) → POST /:id/yeniden-dene (düzeltme sonrası)
   arşiv: UBL_XML, ZARF_XML, PDF, YANIT (sha256, retain_until; değiştirilemez)
─► POST /e-belge/:id/durum-sorgula ─► Tamamlandi ─► (TICARIFATURA) Kabul │ Red
─► POST /e-belge/:id/iptal (aşağıdaki kurallar)
```

Kaynak belgedeki `e_document_status`: Hazir → Kuyrukta (kuyrukta / portal yüklemesi bekleniyor) → Gonderildi / Red / Hata / Iptal. `Kuyrukta` ve `Gonderildi`, belge kilidinin (PR #168) e-belge kilit durumlarıyla aynıdır; eski kayıtlardaki `Bekliyor` değeri listede kalır. İrsaliye→fatura dönüşümü `Gonderildi` şartını korur.

## Mod kararı (`src/services/ebelge/config.js`)

| GIB_CANLI | Sağlayıcı (`EBELGE_SAGLAYICI` / firma ayarı) | Kimlik | Mod | Sonuç |
|-----------|-----------------------------------------------|--------|-----|-------|
| Hayir | MOCK (varsayılan) | — | `mock` | Yerel sahte sağlayıcı; kayıt `is_simulated=true`, PDF filigranı "SANDBOX — GEÇERSİZ" |
| Hayir | REST | `EBELGE_REST_TEST_*` tam | `test` | Entegratör test ortamı; `is_simulated=true` |
| Hayir | REST | test kimliği eksik | `mock` | Yerel mock |
| Hayir / Evet | GIB_PORTAL | (canlıda `EBELGE_PORTAL_KULLANICI`) | `test` / `live` | `ManuelBekliyor`; XML portala yüklenir, sonuç `POST /:id/manuel-durum` |
| Evet | REST | `EBELGE_REST_BASE_URL` (https) + kimlik tam | `live` | Gerçek gönderim, `is_simulated=false`, arşiv 10 yıl |
| Evet | herhangi | eksik | **engelli** | Gönderim yapılmaz: `Hata / EBELGE_CANLI_KIMLIK_EKSIK`, mock'a düşülmez |

Eski uyumluluk: `POST /:id/gonder {simulate:false}` + `GIB_CANLI=Hayir` → 409 `GIB_CANLI_KAPALI`; `{simulate:true}` + `GIB_CANLI=Evet` → 409.

Kimlik bilgileri **yalnız ortam değişkeninde** tutulur (`.env.example`), DB'ye ve API yanıtlarına yazılmaz. `GET /e-belge/durum/ozet` eksik **anahtar adlarını** listeler.

## Adaptör sözleşmesi (`src/services/ebelge/adapters/contract.js`)

```text
send({documentType, profileId, uuid, gibNumber, xml, envelopeXml, senderAlias, receiverAlias, sender, receiver})
  → {status: Gonderildi|Tamamlandi|ManuelBekliyor, providerRef, statusCode, statusMessage, raw}
queryStatus({documentType, uuid, providerRef, profileId}) → {status, statusCode, statusMessage, final}
cancel({documentType, uuid, providerRef, profileId, reason}) → {ok, statusCode, statusMessage}
checkUser({taxId, documentKind}) → {registered, aliases:[{alias, title, registeredAt}]}
Hata: AdapterError {code, retryable, httpStatus, raw}
```

REST adaptörü uç yollarını, kimlik doğrulamayı (`EBELGE_REST_AUTH`: token | basic | bearer | apikey) ve yanıt alan yollarını `EBELGE_REST_ENDPOINTS` JSON parametresiyle entegratör API'sine uyarlar. Örnek:

```json
{"token":"/api/oturum","send":"/api/belgeler","status":"/api/belgeler/{uuid}/durum",
 "cancel":"/api/belgeler/{uuid}/iptal","checkUser":"/api/mukellef/{taxId}?tur={documentKind}",
 "fields":{"token":"data.jwt","providerRef":"belgeId","statusCode":"sonuc.kod","statusMessage":"sonuc.aciklama"},
 "statusMap":{"ONAY":"Kabul"}}
```

GİB durum kodları (1000–1300, KABUL/RED) `gibStatusCodes.js` ile eşlenir; 5xx/429/408/ağ/zaman aşımı geçici, 4xx ve GİB red kodları kalıcıdır. Mükerrer ETTN (1163) önceki denemenin ulaştığı kabul edilip durum sorgusuyla netleştirilir.

## Belge kuralları (UBL-TR 1.2 / 1.2.1)

- Senaryo: alıcının e-Fatura etiketi (`invoices.mailbox_alias` veya `e_document_registered_users`) varsa TEMEL/TICARI, yoksa **e-Arşiv** (varsayılan `TICARIFATURA` senaryosu otomatik e-Arşiv'e döner, uyarı verilir). Test/canlı REST modunda etiketsiz alıcı için hazırlamada otomatik mükellef sorgusu yapılır. Etiketli alıcıya e-Arşiv düzenlenmez.
- Tip: iade → `IADE` / `TEVKIFATIADE` (TICARI → TEMEL'e çevrilir, iade edilen faturanın 16 haneli GİB no'su BillingReference'a), tevkifat satırı → `TEVKIFAT`, %0 KDV istisna kodu → `ISTISNA` / `IHRACKAYITLI` / `OZELMATRAH`, aksi `SATIS`. `invoice_category` SATIS dışında açık seçimse onu kullanır.
- KDV 0015, tevkifat `WithholdingTaxTotal` (601–627 kod + oran), istisna `TaxExemptionReasonCode` (satır/başlık `tax_exemption_code`; SATIS'ta %0 için varsayılan 351), ÖTV matraha dahil.
- Döviz: `PricingExchangeRate` zorunlu; tutar yazıyla para birimine göre.
- Gelen belgeler (Alış, Satış İadesi) gönderilmez (`GELEN_BELGE`).
- İrsaliye: plaka `34ABC123`, şoför ad+soyad+TCKN veya taşıyıcı VKN, teslim adresi posta kodu zorunlu; `paper_*` alanları doluysa `MATBUDAN`.

## Numara serisi ve ETTN

`e_document_series` (firma × EFATURA/EARSIV/EIRSALIYE × 3 karakter önek × yıl), satır kilidiyle boşluksuz artar; işlem geri alınırsa numara geri alınır. Önekler `e_document_settings` (varsayılan EFT / EAR / IRS). Gönderilmemiş belge iptal edilip yeniden hazırlanırsa **aynı** GİB no + ETTN kullanılır; gönderilmiş belgenin numarası asla tekrar kullanılmaz.

## İptal / iade

| Durum | Yol |
|-------|-----|
| Hazir / Kuyrukta / Hata (gönderilmemiş) | Yerel iptal (gerekçe zorunlu) |
| e-Arşiv gönderilmiş | Sağlayıcı `cancel` (GİB e-Arşiv iptal) |
| e-Fatura / e-İrsaliye gönderilmiş | Elektronik geri çekme yok: `iptal_yontemi` = `IADE_FATURASI` (`iade_fatura_id`), `PORTAL_IPTAL` (GİB portal iptal talebi no) veya `KEP_NOTER` (referans) |
| Red (alıcı reddi) | Referanssız kapatılır; düzeltilmiş belge yeniden hazırlanır (yeni no) |

İade faturası `POST /invoices/:id/iade` ile oluşturulur (AlisIade → giden IADE e-belgesi).

## Arşiv ve kayıt

- `e_document_archive`: UBL XML, zarf, PDF görüntü, entegratör yanıtları; `sha256`, `retain_until` (canlı: belge yılı + `EBELGE_ARSIV_YIL`, varsayılan 10; sandbox: aynı gün). UPDATE yasak, süresi dolmadan DELETE yasak (trigger).
- `e_document_events`: her hazırlama / gönderim / hata / durum / iptal olayı (değiştirilemez). Hata kayıtları: `success=false`, `error_code`.
- İndirme: `GET /e-belge/:id/xml`, `/zarf`, `/pdf`, `/arsiv`, `/arsiv/:arsivId/indir` (firma kapsamlı, `X-Content-SHA256`).

## PDF / QR / matbu

`GET /invoices/:id/pdf`, `GET /delivery_notes/:id/pdf` (`?sablon=standart|matbu`, `?indir=1`): pdfkit + gömülü Noto Sans (UTF-8, Türkçe), GİB görüntü XSLT'si ile aynı anahtarlı QR (vkntckn, avkntckn, senaryo, tip, tarih, no, ETTN, tutarlar), KDV/tevkifat/istisna dökümü, "Yalnız" tutar yazıyla, çok sayfa. e-belge kaydı yoksa "TASLAK — e-BELGE DEĞİL" filigranlı taslak. Matbu şablon önceden basılı forma yalnız değer basar; yerleşim `MATBU_SABLON_FATURA` / `MATBU_SABLON_IRSALIYE` JSON parametreleriyle (mm değil pt; `fields`, `lines.cols`, `lines.maxRows`, `totals`) özelleştirilir. Firma varsayılanı `e_document_settings.pdf_template`.

## Uç noktalar

| Uç | Açıklama |
|----|----------|
| `GET /e-belge`, `/e-belge/kuyruk` | Kuyruk listesi (`status`, `document_type`, `document_id`) |
| `GET /e-belge/durum/ozet` | Mod, eksik yapılandırma anahtarları, durum sayıları |
| `POST /e-belge/onizle` | Numara tüketmeden XML + doğrulama (`?format=xml`) |
| `POST /e-belge/hazirla` | `{document_type: Fatura|Irsaliye, document_id}` |
| `POST /e-belge/:id/kuyruga-al`, `/gonder`, `/durum-sorgula`, `/yeniden-dene` | Kuyruk / gönderim |
| `POST /e-belge/:id/iptal` | `{gerekce, iptal_yontemi?, iptal_referans?, iade_fatura_id?}` |
| `POST /e-belge/:id/manuel-durum` | GİB portal: `{durum, referans, mesaj}` |
| `POST /e-belge/kuyruk/isle` | Zamanı gelen kayıtları gönder + durum sorgula |
| `POST /e-belge/mukellef-sorgula`, `POST /e-belge/mukellef` | Kayıtlı kullanıcı sorgusu / manuel etiket |
| `GET /e-belge/:id`, `/olaylar`, `/arsiv`, `/xml`, `/zarf`, `/pdf` | Detay |

Zamanlayıcı: `EBELGE_KUYRUK_ARALIK_SN` > 0 ise sunucu içinde periyodik işler (SKIP LOCKED, çok süreçte güvenli).

## Doğrulama ve testler

- Şemalar: `schemas/ubl-tr/` (GİB UBLTR 1.2.1 paketi + zarf XSD + kod listesi + şematron; kaynak/sha256 README'de).
- `npm run test:ebelge`: XSD + kural doğrulaması (fatura varyantları, irsaliye, zarf, GİB resmi örnekleri), adaptör sözleşmesi (mock, sahte REST entegratör sunucusu, portal), mod kararı, PDF, DB uçtan uca akış.
- `npm run ebelge:ornek`: `docs/go-live/ebelge-ornekler/` örnek XML + PDF üretir (doğrulayarak).

## Kullanıcının sağlaması gerekenler (canlıya geçiş)

1. **Özel entegratör seçimi** ve sözleşme (GİB onaylı); entegratörün REST API dokümanı → `EBELGE_REST_ENDPOINTS` eşlemesi, `EBELGE_REST_AUTH`.
2. **Mali mühür** (tüzel kişi) veya e-imza (şahıs) ve entegratör üzerinde imzalama yetkisi; GİB e-Fatura / e-Arşiv / e-İrsaliye başvurusu ve kayıtlı kullanıcı etiketleri (`invoice_sender_alias`, `despatch_sender_alias`).
3. **Test portalı / entegratör test hesabı** kimlik bilgileri (`EBELGE_REST_TEST_*`) ve canlı kimlik bilgileri (`EBELGE_REST_*`, https adres) — yalnız ortam değişkeni olarak.
4. Firma e-belge ayarları (`e_document_settings`): adres (il/ilçe/posta kodu), seri önekleri (GİB'e bildirilen), IBAN, PDF şablonu; firma VKN / vergi dairesi / Mersis.
5. Matbu form kullanılacaksa form ölçüleri → `MATBU_SABLON_*` JSON.
6. Canlı geçiş günü `GIB_CANLI=Evet`; önce `GET /e-belge/durum/ozet` → `canli_eksikler` boş olmalı.

## Bilinen sınırlar

- XML imzasız üretilir (`ext:UBLExtensions` yer tutucu); imza entegratör/portal tarafında atılır. Doğrudan GİB (EF-VAP) bağlantısı kapsam dışı.
- Şematron kurallarının tamamı değil, sık hata veren çekirdeği XPath 1.0 ile uygulanır; nihai doğrulama entegratör/GİB'dedir.
- IHRACAT, KAMU, YOLCUBERABERFATURA, SGK, HKS, e-Müstahsil, e-SMM, e-Defter bu sürümde üretilmez (`SENARYO_DESTEK`).
- Gelen e-fatura alımı (inbox) ve uygulama yanıtı (KABUL/RED gönderme) yoktur.
