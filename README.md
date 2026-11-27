# ERP Backend

Gerçek işletme süreçlerine uygun, adım adım büyüyen ERP çekirdeği.

## Bu sürüm (v0.3.2)

- Kod sistemi: `M00001`, `H00001`, `T00001`… (`docs/08_KOD_SISTEMI.md`)
- Detaylı cari kart (müşteri / tedarikçi)
- Ürün ağacı + rota operasyonları + satınalma/üretim döngüsü
- Konsol: `http://localhost:3000/` · Demo: `npm run demo:cycle`
- Ekran tanıtım / kullanım / fonksiyonlar: `docs/09_EKRANLAR_TANITIM_KULLANIM.md`

## Hızlı başlangıç (Windows / VS Code)

### 1) Bağımlılıklar

Terminalde proje klasöründe:

```bash
npm install
```

### 2) Şifre dosyası

1. `.env.example` dosyasını kopyala
2. Adını `.env` yap
3. İçindeki `DB_PASSWORD` değerini kendi PostgreSQL şifrenle değiştir

PowerShell örneği:

```powershell
Copy-Item .env.example .env
```

Sonra `.env` dosyasını açıp şifreyi yaz, kaydet.

### 3) Veritabanı şemasını güncelle

```bash
npm run migrate
```

Bu komut tablolarını **silmez**; eksik tabloları/kolonları ekler.

Haftalık yerel senkron (kod + migrate + yedek): `docs/ops/HAFTALIK_YEREL_SENKRON.md`  
Yedek: `npm run db:backup` → `backups/`

### 4) Demo döngüsünü bir kez çalıştır

```bash
npm run demo:cycle
```

### 5) Sunucuyu çalıştır

```bash
npm start
```

- Health: `http://localhost:3000/health`
- Konsol: `http://localhost:3000/`

## API özeti

| Yol | Açıklama |
|-----|----------|
| `GET /health` | Sistem + DB kontrol |
| `/firmalar` | Firma |
| `/is-yerleri` | İş yeri |
| `/depolar` | Depo (yeni) |
| `/olcu-birimleri` | Ölçü birimi (yeni) |
| `/stoklar` | Stok kartı |
| `/stok-hareketleri` | Stok hareket listesi (şimdilik salt okunur) |
| `/cariler` | Cari |
| `/siparisler` | Sipariş |
| `/faturalar` | Fatura |
| `/kisiler` | Kişi / kullanıcı proto |

## PostgreSQL MCP

Cursor / VS Code için: `docs/MCP_SETUP.md`

## Dokümanlar

- `ERP_RULES.md` — iş kuralları
- `ARCHITECTURE.md` — mimari
- `DATABASE.md` — veritabanı
- `PROJECT_RULES.md` — çalışma kuralları
- `docs/` — analiz ve kurulum

## Güvenlik notu

Eski `db.js` içinde şifre düz metin vardı. Artık `.env` kullan.  
Eski şifre Git geçmişinde kaldıysa ileride şifreyi değiştirmen önerilir (veriler sahte olsa bile iyi alışkanlık).

## Canlı (production) güvenlik ayarları

“Canlı” = `NODE_ENV=production` **veya** `NODE_ENV` boşken PaaS algılanması (`RENDER`, `DYNO`, `RAILWAY_ENVIRONMENT`, `FLY_APP_NAME`, `K_SERVICE`). Yerelde `NODE_ENV=development` verirseniz platform algısı devre dışı kalır.

| Değişken | Canlı varsayılan | Yerel varsayılan | Açıklama |
|----------|------------------|------------------|----------|
| `JWT_SECRET` | **zorunlu** | dev fallback | Eksik veya örnek değerse sunucu açılmaz; <32 karakter uyarı verir. `openssl rand -base64 48` |
| `ALLOWED_ORIGINS` | boş = yalnız aynı origin | boş = her origin yansıtılır | Virgüllü liste: `https://erp.firma.com,https://panel.firma.com`. `*` tümüne izin verir (önerilmez) |
| `ENABLE_SQL_CONSOLE` | `0` (kapalı → 404) | `1` | Açıkken yalnız süper admin, canlıda **her zaman salt-okunur**; `/connection/test|use` canlıda kapalı |
| `SQL_CONSOLE_READONLY` | (her zaman salt-okunur) | `0` | Yerelde `1` ile DML engellenir |
| `SQL_CONSOLE_ALLOW_EXTERNAL_DB` | (her zaman kapalı) | `1` | Yerelde harici DB’ye bağlanmayı kapatmak için `0` |
| `SQL_CONSOLE_STATEMENT_TIMEOUT_MS` | `15000` | `15000` | Konsol sorgu zaman aşımı |
| `ENABLE_SYSTEM_UPDATE_APPLY` | `0` (403) | `1` | `/sistem-guncelleme/uygula`; açıkken yalnız süper admin |
| `SUPER_ADMIN_USERS` | boş | boş | Virgüllü kullanıcı kodu listesi. Boşsa `group_code=ADMIN` (yerelde ek olarak `ADMIN`/`owner`). Canlıda JWT şart; `module_permissions ['*']` süper admin **sayılmaz** |
| `TRUST_PROXY` | `1` | kapalı | Rate limit / audit IP’si için ters vekil hop sayısı |
| `AUTH_LOGIN_RATE_MAX` / `AUTH_LOGIN_RATE_WINDOW_MS` | `10` / `900000` | aynı | `/auth/login` IP başına **başarısız** deneme sınırı |
| `AUTH_REFRESH_RATE_MAX` / `AUTH_REFRESH_RATE_WINDOW_MS` | `60` / `900000` | aynı | `/auth/refresh` IP başına istek sınırı |
| `AUTH_RATE_LIMIT_DISABLED` | (yok sayılır) | `0` | Yalnız yerel yük testleri için `1` |
| `JSON_BODY_LIMIT` / `LARGE_JSON_BODY_LIMIT` | `1mb` / `5mb` | aynı | Büyük limit: `/users`, `/kullanicilar` (profil resmi), `/banka-mutabakat` (CSV) |
| `CSP_MODE` | `enforce` | `enforce` | `report-only` veya `off` (geçici sorun gidermek için) |
| `CSP_UPGRADE_INSECURE` / `HSTS` | `0` / `1` | `0` / – | HTTPS arkasında `CSP_UPGRADE_INSECURE=1` önerilir; HTTP-only kurulumda `HSTS=0` |
| `DB_SSL_REJECT_UNAUTHORIZED` | `1` | `0` | Açıkça verilirse URL’deki `sslmode` yok sayılır. Kendinden imzalı sertifika için `DB_SSL_CA` tercih edin |
| `DB_SSL_CA` | – | – | PEM içeriği (`\n` kaçışlı olabilir) veya PEM dosya yolu |
| `SMTP_HOST/PORT/USER/PASS/FROM/SECURE` | env önce | env önce | Env boşsa `system_parameters` (geri uyumlu) okunur |
| `LDAP_BIND_PASSWORD` (ve diğer `LDAP_*`) | env önce | env önce | Aynı geri uyumlu sıra |
| `SECRETS_FROM_ENV_ONLY` | `0` | `0` | `1` iken sırlar (`*_PASS`, `*_PASSWORD`, `*SECRET*`, `*TOKEN*`, `*API_KEY*`) DB’den okunmaz ve DB’ye yazılamaz |
| `DEMO_PASS` / `QA_USER` / `QA_PASS` / `QA_ADMIN_PASS` | **zorunlu** (script) | yerel demo varsayılanı | Demo / QA script’leri parolayı yalnız `scripts/lib/demoCredentials.js` üzerinden alır |

Diğer davranışlar:

- `GET /sistem-parametreleri` sır kodlu parametrelerin değerini `********` olarak döner; maske geri gönderilirse mevcut değer korunur.
- Canlı açılışta `system_parameters` içinde düz metin sır varsa (değer yazılmadan) uyarı loglanır.
- `audit_logs`: başarısız giriş (`LOGIN_FAILED`), `REFRESH_FAILED`, `AUTH_FAILED`, `FORBIDDEN`, `RATE_LIMITED`, başarısız yazma (`POST_FAILED` vb.) ve başarılı `LOGIN` kayıtları; `status_code`, `ip_address`, `user_agent` (migration `130`). Kritik tablolarda (fatura, kullanıcı, grup, sistem parametresi, yevmiye, hesap planı, stok hareketi, tahsilat/ödeme, cari hareket, satış/satınalma siparişi, irsaliye) `PUT/PATCH/DELETE /:id` için DB’deki gerçek eski→yeni alan farkı yazılır.

### Sırları `system_parameters`’tan env’e taşıma

1. Sistem Parametreleri ekranında `SMTP_PASS`, `LDAP_BIND_PASSWORD` vb. değerlerini not edin (yalnız DB erişimi olan yönetici; API artık maskeli döner).
2. Değerleri PaaS env / secret manager’a aynı adla girin, yeniden başlatın (env DB’nin önüne geçer).
3. Parametre değerlerini boşaltın: `UPDATE system_parameters SET value = NULL WHERE parameter_code IN ('SMTP_PASS','LDAP_BIND_PASSWORD');`
4. `SECRETS_FROM_ENV_ONLY=1` ile DB fallback’ini kapatın.
