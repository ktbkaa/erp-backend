# TCMB Döviz Kuru Entegrasyonu

## Kısa cevap

Evet — döviz kurlarını elle tek tek girmek zorunda değilsiniz. TCMB’nin **ücretsiz, API anahtarsız** günlük XML bülteninden (`today.xml`) kurlar çekilir ve yalnızca **sizin tanımladığınız para birimleri** için `exchange_rates` tablosuna yazılır.

Manuel kur girişi hâlâ mümkün (özel / banka / efektif dışı senaryolar). Günlük resmi gösterge kuru için doğru kaynak TCMB’dir.

## TCMB ne sunuyor?

| Özellik | Değer |
| --- | --- |
| Adres (bugün / son bülten) | `https://www.tcmb.gov.tr/kurlar/today.xml` |
| Arşiv | `https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml` |
| Ücret | Ücretsiz |
| API anahtarı | Yok (günlük XML) |
| Güncelleme | İş günlerinde günde bir (hafta sonu / tatilde son iş günü bülteni kalır) |
| Alanlar | ForexBuying / ForexSelling, BanknoteBuying / BanknoteSelling, Unit |

> EVDS ayrı bir servistir ve anahtar ister. Bu entegrasyon **günlük kur XML** kullanır; EVDS değildir.

## Sistemde nasıl çalışıyor?

```
┌─────────────────┐     GET today.xml      ┌──────────────────┐
│  TCMB sunucusu  │ ─────────────────────► │  erp-backend     │
└─────────────────┘                        │  tcmbKurService  │
                                           └────────┬─────────┘
                                                    │ yalnızca currencies
                                                    │ tablosundaki kodlar
                                                    ▼
                                           ┌──────────────────┐
                                           │ exchange_rates   │
                                           │ source = 'TCMB'  │
                                           └──────────────────┘
```

1. XML okunur, her `Currency` için kod / birim / alış-satış parse edilir.
2. `Unit` > 1 ise (ör. JPY) kur `değer / Unit` olarak saklanır (1 birim fiyatı).
3. `currencies` tablosunda **aktif** ve hedef PB’den farklı olan kodlarla eşleşenler upsert edilir.
4. `ON CONFLICT (rate_date, source_pb, target_pb)` ile aynı gün tekrar çekmek üzerine yazar; `source` alanı `TCMB` olur.
5. Tanımınızda olmayan TCMB para birimleri **atlanır** (raporda `skipped_currencies`).

Hedef para birimi varsayılanı **TRY** (TCMB bülteni TRY karşılığıdır).

## Kullanıcı olarak ne yapmalısınız?

### A) Toplu çekim (önerilen)

1. **Para Birimi Tanımı** ekranında kullanacağınız kodları açın (USD, EUR, GBP…).
2. **Döviz Kurları** listesinde **TCMB’den Çek** butonuna tıklayın.
3. Liste yenilenir; `Kur kaynağı = TCMB` satırları gelir.

### B) Tek satır formda

1. Döviz Kurları → **Yeni**.
2. Kaynak PB / Hedef PB seçin.
3. **Kur kaynağı** alanını **TCMB** yapın.
4. Alış / satış / efektif alanlar TCMB XML’den otomatik dolar (bağlantı sistem parametresinden gelir).
5. Kaydedin.

### C) Otomatik (günde bir) — evet, TCMB kayıtları güncellenir

Sunucu ayaktayken **saatlik kontrol** çalışır. `TCMB_KUR_AUTO=true` (varsayılan) ise:

1. `today.xml` okunur, bülten tarihi alınır.
2. O gün için henüz `source=TCMB` kaydı yoksa çekilir ve yazılır.
3. Aynı bülten günü tekrar çekilmez (çift kayıt yok).
4. Ertesi iş günü yeni bülten gelince yeni satırlar oluşur (önceki günler arşivde kalır).

Hafta sonu / tatilde `today.xml` son iş gününü verdiği için o güne yazılmış kayıt varsa atlanır.

**Manuel** satırlar otomatik üzerine yazılmaz; yalnızca `source=TCMB` upsert edilir (aynı gün + aynı PB çifti).

### Belge ekranlarında kur tipi

Satış / satınalma vb. belgede:

| Para birimi | Kur tipi | Kur alanı |
| --- | --- | --- |
| TRY | kilitli | `1`, disabled |
| USD/EUR… | Alış / Satış / Efektif alış / Efektif satış / Serbest | tip seçimine göre DB’den dolar; Serbest’te elle girilir |

Kur tipi değerleri: `TCMB-ALIS`, `TCMB-SATIS`, `EFKT-ALIS`, `EFKT-SATIS`, `Serbest`.

## Sistem parametreleri

| Kod | Anlamı | Varsayılan |
| --- | --- | --- |
| `TCMB_KUR_URL` | Çekilecek XML adresi (kaynak bağlantısı) | `https://www.tcmb.gov.tr/kurlar/today.xml` |
| `TCMB_KUR_AUTO` | Otomatik günlük senkron | `true` |
| `TCMB_KUR_HEDEF_PB` | Hedef PB (bilgi / genişleme) | `TRY` |

**Kaynak bağlantısını değiştirmek:** Sistem Parametreleri → `TCMB_KUR_URL` değerini güncelleyin. Buton ve otomatik senkron bu adresi kullanır. Geçmiş gün için arşiv URL’si veya API’de `tarih` parametresi kullanılabilir.

## API uçları

| Method | Path | Açıklama |
| --- | --- | --- |
| `POST` | `/doviz-kurlari/tcmb-cek` | Toplu çek + DB yaz (`tarih`, `url`, `target_pb` opsiyonel) |
| `GET` | `/doviz-kurlari/tcmb-onizleme?source_pb=USD&target_pb=TRY` | Tek çift önizleme (yazmaz) |
| `GET` | `/doviz-kurlari/tcmb-durum` | URL, auto flag, son TCMB günleri |
| `GET` | `/doviz-kurlari/cevir?...` | Belge formlarında kur çevirisi (mevcut) |

Örnek:

```bash
curl -X POST http://localhost:3000/doviz-kurlari/tcmb-cek \
  -H 'Content-Type: application/json' \
  -d '{"target_pb":"TRY"}'
```

## Kod haritası

| Dosya | Rol |
| --- | --- |
| `src/services/tcmbKurService.js` | XML çekme, parse, upsert, günlük zamanlayıcı |
| `routes/exchange_rates.js` | `/tcmb-cek`, `/tcmb-onizleme`, `/tcmb-durum` |
| `db/migrations/058_tcmb_kur_params.sql` | Sistem parametreleri |
| `index.js` | `startTcmbScheduler` |
| `public/app.js` | **TCMB’den Çek** butonu + formda kaynak=TCMB doldurma |
| `docs/31_TCMB_DOVIZ_KURU.md` | Bu doküman |

## Tasarım kararları

1. **Self-lookup yok:** Para birimi tanım ekranı kodu manueldir; kur ekranı bu tanımları okur.
2. **Kaynak alanı:** `Manuel` | `TCMB` — TCMB seçince değerler XML’den gelir; bağlantı parametrede tutulur (her satıra uzun URL yazılmaz).
3. **Günde bir:** TCMB zaten günde bir günceller; sık poll etmeye gerek yok. Saatlik kontrol + “bugün/bülten günü kayıt var mı?” yeterli.
4. **Manuel override:** Aynı gün manuel kayıt açabilirsiniz; TCMB tekrar çekilirse `source=TCMB` ile üzerine yazar — bilinçli tercih.

## Sınırlar / dikkat

- Resmi tatil ve hafta sonunda yeni bülten olmayabilir; `bulletin_no` / `rate_date` alanlarına bakın.
- TCMB’de olup sizde tanımlı olmayan kodlar sessizce atlanır — önce Para Birimi Tanımı’na ekleyin.
- **Sizde var, TCMB’de yok** (ör. MXN): formda Kur kaynağı=TCMB seçilirse sistem uyarır ve **Manuel**’e düşer; alış/satışı elle girersiniz. Toplu **TCMB’den Çek** bu kodları zaten atlar.
- TCMB bültenindeki başlıca kodlar (örnek): USD, EUR, GBP, CHF, JPY, AUD, CAD, SAR, … — tam liste `today.xml` içindedir; MXN yoktur.
- Ağ çıkışı yoksa (firewall) `TCMB_KUR_URL` erişilemez; sunucunun `tcmb.gov.tr`’ye HTTP GET yapabilmesi gerekir.
- Bu kurlar **gösterge** niteliğindedir; banka satış/alış politikanız farklıysa Manuel veya efektif alanları kullanın.

## Döviz Kurları alan bilgi butonları (i)

Alış / satış / efektif alış / efektif satış / kur kaynağı alanlarının **sağ üstünde** küçük **i** butonu vardır. Tıklanınca manuel tanımda neye göre doldurmanız gerektiği (kaydi vs nakit, alış vs satış bakış açısı) açıklanır.

## “TCMB kuru yok” ekranda ne olur?

Örnek: Kaynak PB = **MXN**, Kur kaynağı = **TCMB**.

1. Sistem TCMB XML’de MXN arar → yok.
2. Toast: `MXN TCMB bülteninde yok. Kur kaynağı Manuel’e alındı — alış/satışı elle girin.`
3. **Kur kaynağı** otomatik **Manuel** olur.
4. Alış / satış alanlarını kendiniz doldurup kaydedersiniz.

Bu beklenen davranıştır: TCMB yayınlamadığı paritelerde resmi otomatik kur yoktur; manuel (veya banka) kuru kullanılır.

## Doğrulama checklist

- [ ] `npm run migrate` → 058 uygulandı
- [ ] Para birimlerinde USD/EUR (veya ihtiyaç duyulanlar) var
- [ ] Döviz Kurları → **TCMB’den Çek** → satırlar `Kur kaynağı=TCMB`
- [ ] Belge formunda PB seçince `/doviz-kurlari/cevir` güncel satışı getiriyor
- [ ] Sistem Parametreleri’nde `TCMB_KUR_URL` görünüyor
