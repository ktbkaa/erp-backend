# Canlı Deploy Runbook'u

**Kapsam:** KTB ERP (`erp-backend`) canlı ortamına kurulum, sürüm çıkma (deploy), doğrulama ve
uygulama seviyesinde geri dönüş (rollback). Veritabanı yedeği / geri yükleme için:
[`YEDEKLEME_GERI_DONUS_RUNBOOK.md`](YEDEKLEME_GERI_DONUS_RUNBOOK.md). Ortamlar, loglama, sağlık uçları:
[`ORTAMLAR_VE_IZLEME.md`](ORTAMLAR_VE_IZLEME.md).

## 1. Akış özeti

```text
PR → GitHub Actions CI (Postgres 16: npm ci → migrate ×2 → seed → test → /ready → yedek+tatbikat → audit; Docker build + compose smoke)
   → main'e merge → CI yeşil → Render autoDeployTrigger: checksPass
   → Docker build → preDeployCommand: node scripts/predeploy.js
        (bekleyen migration varsa: şifreli yedek → offsite S3 → migrate; yedek başarısızsa deploy DURUR)
   → yeni instance /ready = 200 olunca trafik geçer (sıfır kesinti) → eski instance SIGTERM (5 sn drenaj, zarif kapanış)
```

Migration artık uygulama açılışında **çalışmaz** (`Dockerfile` CMD = `node index.js`); her ortamda
deploy ön adımı olarak `scripts/predeploy.js` koşar.

## 2. Önkoşullar (ilk kurulumda bir kez)

| # | Karar / kimlik bilgisi | Nerede |
|---|------------------------|--------|
| 1 | Barındırma: **Render (önerilen, `render.yaml`)** veya kendi sunucunuz (**docker compose**) | — |
| 2 | Render workspace'i ücretli plan (web `1c-2g`, Postgres `1c-4g`, cron `0.5c-512mb`) | Render faturalama |
| 3 | Offsite bucket — Render'dan **bağımsız** hesap (Cloudflare R2 / AWS S3 / B2). Yalnız bu bucket'a yazma+okuma+listeleme+silme yetkili ayrı erişim anahtarı | Bucket sağlayıcısı |
| 4 | Bucket'ta versiyonlama veya object lock (fidye yazılımına karşı) + lifecycle (ör. 35 gün) | Bucket sağlayıcısı |
| 5 | `BACKUP_ENCRYPTION_PASSPHRASE` (≥16 karakter, `openssl rand -base64 32`) — parola yöneticisinde, en az 2 kişi erişebilir | Parola kasası |
| 6 | Hata bildirimi için Slack/Teams webhook (`BACKUP_NOTIFY_WEBHOOK_URL`) | Opsiyonel |
| 7 | Alan adı + DNS (Render custom domain veya compose `ERP_DOMAIN`) | DNS sağlayıcısı |
| 8 | GitHub → Settings → Branches: `main` korumalı, "Require status checks: CI / Test, CI / Docker" | GitHub |
| 9 | GitHub → Environments → `production` secret'ları (tatbikat iş akışı için; bkz. YEDEKLEME runbook §6) | GitHub |

> Gerçek bulut kimlik bilgileri bu repoda **yoktur**; yukarıdaki değerler kullanıcı tarafından
> Render paneline / GitHub secret'larına girilmelidir.

## 3. İlk kurulum — Render

1. Render → **New → Blueprint** → bu repo → `render.yaml` (Blueprint path varsayılan).
2. Oluşacak kaynaklar: `ktb-erp-db` (Postgres 16, yalnız iç ağ), `ktb-erp` (web, Docker),
   `ktb-erp-db-backup` (cron, her gün 00:30 UTC = 03:30 TR), `ktb-erp-backup` (env grubu).
3. **Env grubu `ktb-erp-backup`**: `DOLDURUN…` yer tutucularını gerçek değerlerle değiştirin
   (`BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_ACCESS_KEY_ID`,
   `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_ENCRYPTION_PASSPHRASE`). Yer tutucu bırakılırsa
   yedek script'i bilinçli olarak hata verir (yanlış parolayla şifreleme yapılmaz).
4. İlk deploy temiz DB'ye 001…N migration'larını uygular (temiz DB'de yedek atlanır).
5. **Doğrulama:**
   - `https://<servis>.onrender.com/health` → `{"status":"ok"}`
   - `https://<servis>.onrender.com/ready` → `{"status":"hazir", "checks":{"migration":{"bekleyen":0}}}`
   - Render → `ktb-erp-db-backup` → **Trigger Run** → log sonunda `{"ok":true,…,"offsite":{"mode":"s3"…}}`
   - Bucket'ta `prod/erp-ktb_erp-<UTC>.dump.enc` + `.manifest.json` görünmeli.
   - GitHub → Actions → **DB geri yükleme tatbikatı** → Run workflow → yeşil.
6. Render → `ktb-erp-db` → Recovery: PITR'ın açık olduğunu ve saklama süresini not edin.
7. İlk kullanıcı/parola ve firma kurulumu (demo veri yok: `AUTO_HEAL=0`). **Not:** migration
   `082`/`083` demo firma ve GIDA örnek verisini yine de oluşturur — bu ayrı bir P0 maddesidir
   (canli-gecis-eksikleri.md V-01); canlı kurulumdan önce temizlik prosedürü uygulanmalıdır.

## 4. İlk kurulum — kendi sunucunuz (docker compose)

```bash
git clone … /opt/ktb-erp && cd /opt/ktb-erp
cp .env.example .env
# .env: POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 32), ERP_DOMAIN, ACME_EMAIL,
#       BACKUP_OFFSITE=s3 + BACKUP_S3_* + BACKUP_ENCRYPTION_PASSPHRASE
docker compose up -d --build                      # postgres → migrate (predeploy) → app
docker compose --profile proxy up -d              # Caddy: 80/443, otomatik Let's Encrypt
docker compose ps                                 # app: healthy
curl -fsS http://127.0.0.1:3000/ready
docker compose run --rm backup                    # ilk yedek + offsite
docker compose run --rm restore-drill             # ilk tatbikat
sudo cp scripts/ops/erp-backup.cron /etc/cron.d/ktb-erp   # günlük yedek + haftalık tatbikat
```

Postgres portu yalnız `127.0.0.1:5433`'e açılır; uygulama varsayılan olarak `127.0.0.1:3000`'de
dinler ve dışarıya Caddy üzerinden HTTPS ile açılır. Sunucu güvenlik duvarında yalnız 22/80/443.

## 5. Rutin deploy (sürüm çıkma)

1. PR açılır → CI yeşil (test, migration ×2, yedek+tatbikat, Docker smoke).
2. **Migration içeren PR'larda** ek kontrol: migration geri alınabilir mi? (`db/rollbacks/` veya
   ileri-düzeltme planı PR açıklamasında). Yıkıcı değişiklik (DROP/RENAME) varsa bakım penceresi planlayın.
3. Merge → Render otomatik deploy (CI yeşilse). Kendi sunucunuzda:
   ```bash
   cd /opt/ktb-erp && git pull --ff-only
   APP_VERSION=$(git rev-parse --short HEAD) docker compose up -d --build
   ```
   (`migrate` servisi `predeploy.js` çalıştırır; bekleyen migration varsa önce yedek alır.)
4. **Deploy sonrası 10 dk kontrol listesi:**
   - `/ready` 200, `checks.migration.bekleyen = 0`, `commit` beklenen SHA.
   - Render Logs / `docker compose logs app`: `"level":"error"` satırı artışı yok;
     `"msg":"http"` satırlarında `status>=500` yok.
   - Giriş yap → ana ekran → bir liste + bir kayıt aç (duman testi).
   - Migration içeren deploy'da predeploy logunda `offsite s3 yüklendi` satırı.

## 6. Uygulama geri dönüşü (rollback)

| Durum | Aksiyon |
|-------|---------|
| Yeni sürüm hatalı, **migration yok** | Render → ktb-erp → Events → önceki başarılı deploy → **Rollback**. Compose: `git checkout <önceki-sha> && docker compose up -d --build` |
| Yeni sürüm hatalı, migration **geriye uyumlu** (yalnız ekleme) | Aynı: kodu geri al; şema yerinde kalabilir |
| Migration **uyumsuz** / veri bozuldu | Kodu geri al **+** DB geri dönüşü: YEDEKLEME runbook §5 (predeploy'un aldığı migration-öncesi yedek veya PITR) |
| predeploy "YEDEK BAŞARISIZ" ile durdu | Deploy olmadı, eski sürüm çalışıyor. Offsite kimlik bilgilerini düzelt → yeniden deploy. Acil durumda bilinçli olarak `PREDEPLOY_BACKUP_REQUIRED=0` (yalnız o deploy için) |
| predeploy "MIGRATION BAŞARISIZ" | Migration tek işlem (transaction) içinde; başarısız dosya geri alınır, eski sürüm çalışmaya devam eder. Hata logunu inceleyin, düzeltip yeniden deploy |

Render rollback'i yalnız kodu geri alır; **veritabanını geri almaz**.

## 7. Bakım modu

Render: `maintenanceMode.enabled: true` (ücretli web) veya panelden. Compose: `docker compose stop app`
(Caddy 502 döner) — uzun bakımda Caddyfile'a statik bakım sayfası ekleyin.

## 8. İlgili dosyalar

`render.yaml`, `render.demo.yaml` (yalnız demo), `Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`,
`scripts/predeploy.js`, `.github/workflows/ci.yml`, `.github/workflows/db-backup.yml`,
`.github/workflows/db-restore-drill.yml`, `scripts/ops/`.
