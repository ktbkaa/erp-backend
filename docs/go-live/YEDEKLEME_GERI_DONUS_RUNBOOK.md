# Yedekleme, Geri Yükleme ve Geri Dönüş (DR) Runbook'u

**Hedefler (öneri — işletmeyle onaylanmalı):** RPO ≤ 24 saat (offsite) / dakikalar (Render PITR) ·
RTO ≤ 1 saat · offsite kopya Render'dan bağımsız hesapta · haftalık otomatik tatbikat.

## 1. Katmanlar

| Katman | Ne | Sıklık | Nerede tanımlı |
|--------|----|--------|----------------|
| L1 | Yönetilen Postgres yedeği + **PITR** (Render ücretli plan) | Sürekli | Render panel (`render.yaml` → `ktb-erp-db`) |
| L2 | **Şifreli mantıksal yedek** (pg_dump custom, AES-256-GCM) → **offsite** S3 uyumlu bucket | Günlük 03:30 TR | `render.yaml` → `ktb-erp-db-backup` cron · alternatif: `.github/workflows/db-backup.yml` · self-host: `scripts/ops/erp-backup.cron` |
| L3 | **Migration öncesi yedek** | Her şema değiştiren deploy | `scripts/predeploy.js` (Render `preDeployCommand`, compose `migrate`) |
| L4 | **Geri yükleme tatbikatı** (en yeni offsite yedek → boş DB → birebir doğrulama) | Haftalık + CI'da her PR | `.github/workflows/db-restore-drill.yml`, `ci.yml` |

L1 tek başına yeterli değildir: aynı sağlayıcı/hesap kaybı, yanlış silinen servis veya hesabın ele
geçirilmesi durumunda L2 (ayrı hesap) tek kurtarma yoludur.

## 2. Script'ler

| Komut | İş |
|-------|----|
| `npm run db:backup` | Yedek. `--plain` ek düz SQL, `--no-offsite`, `--url <postgres-url>`, `--out <dizin>` |
| `npm run db:restore -- <kaynak> --target-url <url> [--create] [--drop-existing]` | Geri yükleme (varsayılan olarak uygulama DB'sine **yazmaz**) |
| `npm run db:drill` | Tatbikat: geçici DB'ye yükle → doğrula → sil. `--source s3:latest`, `--fresh`, `--with-migrate`, `--keep` |
| `npm run predeploy` | Bekleyen migration varsa yedek → migrate |

Kaynak biçimleri: dosya yolu · `local:latest` · `s3:latest` · `s3:<anahtar>`.

**Yedek ne içerir?** `erp-<db>-<UTC>.dump[.enc]` + `erp-<db>-<UTC>.manifest.json`:
SHA-256 (şifreli ve düz), pg_dump sürümü, kaynak DB, **aynı anlık görüntüde** (pg_export_snapshot)
sayılmış tüm tablo satır sayıları, `schema_migrations` sayısı/son dosyası, git commit.
Bağlantı önceliği: `--url` → `BACKUP_DATABASE_URL` → `DATABASE_URL` → `DB_*`. Parola argv'ye
yazılmaz (PG* env). pg_dump sürümü sunucudan eskiyse yedek baştan reddedilir.

**Offsite (`BACKUP_OFFSITE`):**
- `s3` — bağımlılıksız SigV4 istemcisi: AWS S3, Cloudflare R2, Backblaze B2, Wasabi, MinIO.
  Tek PUT ≤ 5 GB (daha büyük DB'de `command` + `rclone`/`aws s3 cp`). `BACKUP_S3_RETENTION_DAYS`
  ile eski nesneler silinir; en yeni `BACKUP_S3_MIN_KEEP` (3) yedek her durumda korunur.
- `rsync` — `BACKUP_RSYNC_TARGET=user@host:/dizin/` (SSH anahtarı `BACKUP_RSYNC_SSH_KEY`).
- `command` — serbest komut; dosya `$BACKUP_FILE`.

Kimlik bilgileri **yalnız ortam değişkeninden** okunur (bkz. `.env.example` "Yedekleme").

## 3. Günlük kontrol (otomatik + 1 dk manuel)

- Webhook hata bildirimi gelmediyse sorun yok (`BACKUP_NOTIFY_WEBHOOK_URL`).
- Haftada bir: bucket'ta son 7 günün yedekleri; GitHub Actions'ta "DB geri yükleme tatbikatı" yeşil;
  artefakttaki `drill-*.json` → `ok: true`, `backup_age_hours` < 30, `rto_estimate_s`.

## 4. Senaryo → aksiyon

| Senaryo | Tercih edilen yol |
|---------|-------------------|
| Yanlışlıkla silinen/bozulan kayıtlar (son günler) | **PITR** ile olay anından hemen öncesine **yeni** DB oluştur → ilgili kayıtları karşılaştırıp taşı (canlıyı ezmeden) |
| Hatalı migration / toplu bozulma (deploy sonrası) | predeploy'un aldığı migration-öncesi yedek (`prod/erp-…-<deploy-zamanı>.dump.enc`) veya PITR → §5 |
| Render hesabı / DB tamamen kayıp | Yeni Postgres (başka sağlayıcı olabilir) → offsite `s3:latest` → §5 → `DATABASE_URL` değiştir |
| Fidye yazılımı / bucket silme | Bucket versiyonlama / object lock'tan önceki sürüm; bu yüzden §DEPLOY 2.4 zorunlu |

## 5. Geri yükleme prosedürü (offsite yedekten)

> Kural: önce **yeni** bir veritabanına yükle, doğrula, sonra uygulamayı ona çevir. Yerinde
> (canlının üstüne) yükleme yalnız son çare ve `--allow-source-overwrite --yes` ister.

1. **Olay kaydı:** saat (TR), etki, karar veren. Kullanıcılara bakım duyurusu.
2. **Yazmayı durdur:** Render → `ktb-erp` → Suspend (veya bakım modu); compose: `docker compose stop app`.
3. **Mevcut durumu yedekle** (bozuk olsa da adli inceleme için):
   `node scripts/db-backup.js --no-offsite --out ./backups/olay-<tarih>`
4. **Hedef DB'yi hazırla:**
   - Render: yeni Postgres instance (aynı major sürüm) veya PITR ile geri yüklenmiş yeni instance
     (PITR seçildiyse 6. adıma atla).
   - Compose: aynı sunucuda yeni DB adı (`--create`).
5. **Yükle + doğrula** (Docker imajında pg araçları hazır; yerelde `postgresql-client-16`):
   ```bash
   export BACKUP_S3_BUCKET=… BACKUP_S3_ACCESS_KEY_ID=… BACKUP_S3_SECRET_ACCESS_KEY=… \
          BACKUP_S3_ENDPOINT=… BACKUP_S3_REGION=… BACKUP_S3_PREFIX=prod/ BACKUP_ENCRYPTION_PASSPHRASE=…
   node scripts/db-restore.js s3:latest \
     --target-url "postgresql://user:pass@host:5432/ktb_erp_restore_<tarih>" --create
   ```
   Çıktıda `"ok":true`, `verify.problems: []`, `rows_expected == rows_actual` olmalı.
   Belirli bir yedek için `s3:prod/erp-ktb_erp-20261127T003000Z.dump.enc`.
6. **Şema güncelliği:** yedek eski sürümdense `DATABASE_URL=<yeni> node scripts/predeploy.js`
   (ya da kodu yedekle uyumlu commit'e geri al — DEPLOY runbook §6).
7. **Uygulamayı çevir:** Render → `ktb-erp` (+ `ktb-erp-db-backup`) → `DATABASE_URL` = yeni DB
   (blueprint `fromDatabase` kullanıyorsanız `render.yaml`'da `name`'i güncelleyin) → Resume.
   Compose: `.env`/`docker-compose.yml`'de `POSTGRES_DB` veya `DATABASE_URL` → `docker compose up -d`.
8. **Doğrula:** `/ready` 200 · giriş · son işlemler (fatura/irsaliye/stok) beklenen tarihe kadar mevcut ·
   `npm run qa:db` (DB bütünlük denetimi) opsiyonel.
9. **Sonrası:** yeni DB'den hemen tam yedek (`Trigger Run`), eski DB'yi en az 7 gün silmeyin,
   olay raporunu yazın (kayıp veri aralığı = yedek zamanı → olay anı).

## 6. Tatbikat (restore drill)

- **Otomatik:** `.github/workflows/db-restore-drill.yml` her pazartesi 06:00 TR: `s3:latest` →
  GitHub runner içindeki boş Postgres 16 → `--with-migrate` → manifest ile birebir karşılaştırma
  (tablo sayısı, her tablonun satır sayısı, `schema_migrations`, geçersiz index) + yedek yaşı ≤ 30 saat.
  Secret'lar (Environment `production`): `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`,
  `BACKUP_S3_SECRET_ACCESS_KEY`, `BACKUP_ENCRYPTION_PASSPHRASE` (+ opsiyonel `BACKUP_S3_ENDPOINT`,
  `BACKUP_S3_REGION`, `BACKUP_NOTIFY_WEBHOOK_URL`). Tanımlı değilse iş uyarıyla atlanır.
- **CI:** her PR'da `ci.yml` CI veritabanını şifreli yedekleyip tatbikattan geçirir (script regresyonu).
- **Manuel (çeyrekte bir, canlıya geçiş öncesi zorunlu):** §5'i staging'de baştan sona uygulayın,
  süreyi ölçün (gerçek RTO), sonucu bu dosyanın altına tarihli not olarak ekleyin.

Çıkış kodları: `0` başarılı · `2` doğrulama farkı · `1` çalışma hatası (indirme, şifre, bağlantı).

## 7. Güvenlik notları

- Yedek kullanıcısı için salt-okunur rol önerilir: `CREATE ROLE erp_backup LOGIN PASSWORD '…'; GRANT pg_read_all_data TO erp_backup;` → `BACKUP_DATABASE_URL`.
- Bucket anahtarı yalnız o bucket'a yetkili olmalı; mümkünse silme yetkisi olmayan anahtar + lifecycle ile saklama.
- `BACKUP_ENCRYPTION_PASSPHRASE` değişirse eski yedekler eski parolayla açılır — eski parolayı saklama süresi boyunca tutun.
- `.env`, SMTP/LDAP şifreleri yedeğe dahil **değildir** (DB içindeki `system_parameters` hariç); secret'ları ayrı kasada tutun.

## 8. Eski doküman

`docs/21_YEDEKLEME_GERI_YUKLEME.md` manuel `pg_dump`/`pg_restore` komutlarını içerir; bu runbook onun yerini alır.
