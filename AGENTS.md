# KTB ERP — Ajan / geliştirici kılavuzu

`main` tek doğru kaynaktır. Yeni işe `main`’den dal açın. Bu dosya Cursor Cloud Agent / Project ajanlarının sıfırdan devam edebilmesi içindir.

## Mimari

- **Modular monolith**: tek Express süreci (`index.js`), PostgreSQL, REST API, gömülü SPA (`public/`).
- Çok firma: isteklerde `X-Firma-Id` (ve oturum JWT). Veri firma kapsamında süzülür.
- Stok motoru merkezi: miktar değişimi yalnızca belge/hareket servislerinden; UI veya serbest SQL ile bakiye artırılmaz.
- İş kuralları kaynağı: `ERP_RULES.md` (çelişkide kullanıcı onayı > bu dosya).

## Klasör yapısı

```text
index.js          # Express giriş, route mount
db.js             # pg Pool (.env / DATABASE_URL)
db/migrations/    # Sıralı SQL (001…099+); schema_migrations ile izlenir
db/migrate.js     # npm run migrate
routes/           # HTTP uçları (çoğu CRUD / belge)
src/services/     # İş kuralları (stok, parti, fason, rezervasyon, …)
public/           # SPA: index.html, app.js, styles*.css
scripts/          # demo:*, qa:*, simülasyon, yardımcılar
tests/            # node:test birim/entegrasyon
tools/            # yerel panel vb.
docs/             # kılavuz, QA, sektör sim, PDF
```

## Kurulum

```bash
npm install
cp .env.example .env   # DB_PASSWORD ve gerekirse JWT_SECRET doldurun — gerçek şifre/token commit etmeyin
npm run migrate        # eksik migration’ları uygular; tabloları silmez
npm start              # varsayılan http://localhost:3000/
```

Sağlık: `GET /health`. Konsol: `/`.

### `.env` özeti

Şablon: `.env.example` (şifre/token yok). Yerel için `DB_*`; PaaS için `DATABASE_URL`.

**HOST / IPv6:** `HOST=0.0.0.0` yalnızca IPv4 dinler. `localhost` → `::1` çözümleyen ortamlarda `ERR_CONNECTION_REFUSED` olur. Çözüm: `http://127.0.0.1:PORT` veya `HOST` satırını kaldırmak. PaaS’ta `HOST=0.0.0.0` normaldir.

### DB + migration + demo

```bash
# Temiz DB doğrulama (örnek): boş veritabanı oluştur → DB_NAME=... npm run migrate
npm run migrate

# Metal Marvel orta-büyük simülasyon (çok firma / üretim / stok)
npm run demo:marvel

# Genel demo döngüsü
npm run demo:cycle
```

MARVEL stok bakiyesini toplu yükseltmek için (stok-depo bağını **önce** kontrol eder; yoksa `item_warehouses` ekler — bu script bilinçli seed yardımcısıdır, runtime API değildir):

```bash
node scripts/marvel-stok-10000.js
```

## Test komutları

| Komut | Anlam |
|-------|--------|
| `npm test` | Ekran sözleşmeleri + `tests/**/*.test.js` |
| `npm run qa:smoke` | API duman (sunucu ayakta olmalı) |
| `npm run qa:db` | DB bütünlük denetimi |
| `npm run qa:all` | QA paketi (seed + inventory + smoke + …) |
| `npm run test:ebelge` | e-Belge: UBL-TR XSD/kural doğrulama, adaptör sözleşmesi, PDF, DB akışı (`docs/go-live/GIB_STRATEGY.md`) |

**Bilinen (eski) 2 başarısız test:** `go-live invariants` / BUG-008 (`STOK_DEPO_YOK` — lot senaryosunda stok-depo bağı eksik kalabiliyor) ve `sim partial fix` içindeki UI `bom-level hideSave` assertion. Yeni regresyon eklemeyin; düzeltirken bu ikisini hedefleyin.

## Alan kuralları (kritik)

1. **Stok ↔ depo:** Stok kartı bir depoya `item_warehouses` ile tanımlı değilse o depoda **hiçbir** giriş/çıkış/transfer/üretim tüketimi yapılamaz (`STOK_DEPO_YOK`).
2. **Sistem `item_warehouses` satırını asla otomatik oluşturmaz.** Bağı kullanıcı (stok kartı Depolar sekmesi), seed veya bilinçli demo script’i kurar.
3. Negatif stok varsayılan engelli; bakiye yalnız hareket belgelerinden değişir.
4. Belge numaraları numaratörden; firma kapsamı kayıtlarda `company_id` ile damgalanır.
5. Parti: çıkışta lot kaynağı (FIFO / manuel); lotsuz çıkış kuralları `partiService` / üretim girişinde uygulanır.

## Arayüz kuralları

- Tek SPA kabuğu: sol menü, sekmeler, filtre + liste, form toolbar (Kaydet / İncele / Düzenle).
- Tarih alanları **gg/aa/yyyy**; üretimde tarih+saat birlikte.
- Kaydet sonrası İncele modu; liste `BroadcastChannel` ile yenilenir.
- Lookup: kolon altı filtre, noktalı halka, popup tablo.
- Kısa ekranda aksiyon çubuğu içerik boyunda; filtre paneli kaydırılabilir, listeyi ezmez.
- Bilgi bandı: sağ üst bilgi simgesi + hover; sürekli banner tercih edilmez.
- Tema / dil: Ayarlar (dişli); görünüm modern/klasik stilleri `styles*.css`.

## Açık bilinen konular

- Yarı mamullerin WIP deposundan düşmesi (tüketim deposu kuralı) — takip edilmeli.
- `HOST=0.0.0.0` + IPv6 `localhost` bağlantı reddi (yukarıda).
- `npm test`: 2 bilinen fail (go-live BUG-008 / bom-level UI).
- Eski özellik dalları remote’ta duruyor; **silinmedi** (aşağıda liste). Yeni iş `main` üzerinden.

## Eski / ölü dallar (silinmedi — yalnızca liste)

Remote’ta ~150 `cursor/*` dalı var; birleştirme kampanyası sonrası açık PR yok. Örnekler (tam liste: `git ls-remote --heads origin`):

- `cursor/erp-is-emri-form-dalga1-4f63` ve önceki yığın dalları
- `cursor/erp-kisa-ekran-liste-duzen-4f63` … `cursor/erp-infra-a1-4f63`
- Paralel yığın: `cursor/erp-mesaj-zorunlu-sorgu-4f63`, `cursor/erp-p2-derinlestirme-4f63`, …

İçerik `main`’e alındı veya üstü kapandı; yeni ajan bu dallardan değil **`main`**’den başlasın.

## Project’te yeni ajan — tek adım

Cursor Project’te yeni ajanı **`main`** branch’i ile başlatın (veya `main`’den `cursor/<konu>-4f63` dalı açın). `.env` ortamda yoksa `.env.example` → `.env` + `npm run migrate` yeterlidir.
