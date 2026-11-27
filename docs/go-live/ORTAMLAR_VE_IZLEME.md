# Ortamlar, Sağlık Uçları, Loglama ve Süreç Yönetimi

## 1. Ortam ayrımı

| Ortam | Amaç | Veritabanı | Önemli ayarlar |
|-------|------|------------|----------------|
| **development** | Yerel geliştirme | `.env` → `DB_*` (yerel Postgres) | `LOG_FORMAT=pretty` (varsayılan), demo onarımı açık olabilir |
| **test** | Otomatik test (CI / `npm run test:isolated`) | **İzole**, adında `test`/`ci` geçen DB (CI servis konteyneri veya `docker-compose.test.yml` → `postgres-test`, tmpfs) | `NODE_ENV=test`, `ERP_AUTH_SOFT=1`, `TCMB_SCHEDULER=off`; fixture: `scripts/ci/seed-test-db.js` |
| **staging** (önerilir) | UAT, tatbikat, migration provası | Ayrı Render Postgres veya compose; canlı yedeğinden yüklenmiş kopya | Production ile aynı ayarlar, ayrı `JWT_SECRET`, ayrı bucket öneki (`staging/`) |
| **production** | Canlı | Render Postgres (`render.yaml`) / compose `postgres` | `NODE_ENV=production`, `AUTO_HEAL=0`, `ERP_AUTH_REQUIRED=true`, `LOG_FORMAT=json`, `TRUST_PROXY=1` |

**Açılış denetimi (`src/infra/lifecycle.js`):** `NODE_ENV=production` iken `JWT_SECRET` yoksa veya
`ERP_AUTH_SOFT=1` ise süreç **açılmaz** (exit 1); `AUTO_HEAL≠0` ve kısa `JWT_SECRET` uyarı üretir.
DB bağlantı bilgisi hiç yoksa her ortamda açılış reddedilir.

**İzole test:** testler artık geliştiricinin `.env` DB'sine dokunmadan koşabilir:

```bash
npm run test:isolated -- --docker --fresh   # docker-compose.test.yml (127.0.0.1:55432, tmpfs) → migrate → seed → test
TEST_DATABASE_URL=postgresql://…/erp_test npm run test:isolated   # mevcut bir test sunucusu
```

`scripts/ci/run-tests.js` testleri TAP ile koşturur ve yalnız `scripts/ci/known-test-failures.json`
listesinde **olmayan** hatalarda kırmızı döner (AGENTS.md'deki bilinen eski hatalar). `--strict`
bilinenleri de kırar. Listeye kayıt eklemek kullanıcı onayı gerektirir.

## 2. Sağlık uçları

| Uç | Tür | DB'ye gider mi | Kullanım |
|----|-----|----------------|----------|
| `GET /health` | Liveness | Hayır | Docker `HEALTHCHECK`, süreç ayakta mı. Kapanışta 503 |
| `GET /ready` | Readiness | Evet (`SELECT 1`, 2 sn zaman aşımı) | Render `healthCheckPath`, Caddy `health_uri`, deploy sonrası kontrol |

`/ready` yanıtı: `checks.veritabani` (durum, ms), `checks.migration` (toplam / bekleyen / ilk bekleyen),
`checks.pool` (toplam / boşta / bekleyen istemci), `version`, `commit` (Render `RENDER_GIT_COMMIT`).
Bekleyen migration varsa veya kapanış başladıysa **503** (`READY_REQUIRE_MIGRATIONS=0` ile kapatılabilir).
Production'da hata detayı (`err.message`) yanıta konmaz, yalnız loga yazılır. Her iki uç da kimlik
doğrulama, firma bağlamı ve audit middleware'inden **önce** bağlanır.

Harici izleme önerisi: UptimeRobot / Better Stack ile `/ready` 1 dk aralık, 2 ardışık hata → alarm.

## 3. Loglama

Bağımlılıksız logger: `src/infra/logger.js`.

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `LOG_FORMAT` | production'da `json`, diğerlerinde `pretty` | Tek satır JSON: `time, level, service, msg, …` |
| `LOG_LEVEL` | `info` | `debug` · `info` · `warn` · `error` · `silent` |
| `LOG_HTTP` | `1` | Erişim logu: `req_id, method, path (sorgu dizesi hariç), status, duration_ms, ip, user, firma_id, bytes` |
| `LOG_HTTP_SKIP_STATIC` | `1` | Statik dosyalar, `/`, `/health`, `/ready` loglanmaz |
| `LOG_CONSOLE_BRIDGE` | json'da `1` | Koddaki mevcut `console.log/error` çağrıları da JSON satırına çevrilir (`source:"console"`) |

Her isteğe `X-Request-Id` atanır (gelen geçerli başlık korunur; Caddy üretir) ve yanıtta döner —
kullanıcı hata bildirirken bu kimlikle log aranır. 5xx → `error`, 4xx → `warn` seviyesinde.

Toplama: Render Logs (+ Log Streams ile Better Stack/Datadog/Papertrail), compose'da `json-file`
sürücüsü 20 MB × 10 dosya döndürmeli (`docker compose logs app`).

## 4. Süreç yönetimi

- **PID 1:** Docker imajında `tini` → sinyaller `node`'a iletilir (eski `sh -c` zinciri kaldırıldı).
- **Zarif kapanış:** `SIGTERM`/`SIGINT` → `/health` ve `/ready` 503 → `SHUTDOWN_DRAIN_MS` (prod 5 sn)
  bekleme → HTTP sunucusu yeni bağlantı almaz, açık istekler biter → `pool.end()` → exit 0.
  `SHUTDOWN_TIMEOUT_MS` (15 sn) aşılırsa exit 1. Render `maxShutdownDelaySeconds: 45`.
- **Yakalanmamış hatalar:** `unhandledRejection` loglanır; `uncaughtException` loglanır ve süreç
  exit 1 ile sonlanır → yeniden başlatma süreç yöneticisinde: Render (otomatik), compose
  `restart: unless-stopped`, çıplak sunucuda systemd (`Restart=always`).
- **Ters vekil:** `TRUST_PROXY=1` → `req.ip` gerçek istemci IP'si (audit/log). HTTPS sonlandırma
  Render'da yerleşik; compose'da `deploy/Caddyfile` (otomatik Let's Encrypt, HSTS).
- **Tek instance kısıtı:** TCMB kur zamanlayıcısı süreç içinde çalışır; birden fazla instance'ta
  yalnız birinde `TCMB_SCHEDULER` açık kalmalı (diğerlerinde `off`).

### systemd örneği (Docker'sız kurulum)

```ini
# /etc/systemd/system/ktb-erp.service
[Unit]
Description=KTB ERP
After=network-online.target postgresql.service

[Service]
User=erp
WorkingDirectory=/opt/ktb-erp
EnvironmentFile=/opt/ktb-erp/.env
ExecStartPre=/usr/bin/node scripts/predeploy.js
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

## 5. CI/CD

`.github/workflows/ci.yml` (push `main`, her PR):
- **Test:** Postgres 16 servis → `npm ci` → `npm run migrate` (temiz DB) → ikinci migrate (idempotent) →
  `seed-test-db.js` → `run-tests.js` → uygulama açılışı + `/health` + `/ready` + SIGTERM ile zarif kapanış →
  şifreli yedek + `db-restore-drill.js --with-migrate` → `npm audit --omit=dev --audit-level=high`.
- **Docker:** imaj build (GHA cache) → `docker compose up --wait` (postgres → migrate → app healthy) →
  `/ready` → compose `backup` + `restore-drill` → down.

Render `autoDeployTrigger: checksPass` ile yalnız yeşil CI sonrası deploy eder. `main` dal korumasında
bu iki kontrolü zorunlu yapın.
