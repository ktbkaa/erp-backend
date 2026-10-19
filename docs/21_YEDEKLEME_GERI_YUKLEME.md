# Yedekleme ve Geri Yükleme Runbook

## Yedek alma (PostgreSQL)

```bash
# .env içindeki DB_* değerlerini kullanın
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --file="backup-$(date +%Y%m%d-%H%M).dump"
```

## Geri yükleme

```bash
# Dikkat: hedef veritabanını boşaltır
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists "backup-YYYYMMDD-HHMM.dump"
```

## Migration sırası

1. Yedekten sonra uygulama kodunu ilgili commit'e alın.
2. `npm run migrate` — `db/migrations` dosyaları `schema_migrations` ile sırayla uygulanır.
3. `GET /health` ile DB bağlantısını doğrulayın.

## Notlar

- `.env` ve SMTP şifreleri yedeğe **dahil edilmez**; ayrı secret store'da tutun.
- `belge_numaralari` tablosu legacy'dir; numaralandırma `kod_serileri` üzerinden çalışır.
- Prod'da günlük `pg_dump` + haftalık offsite kopya önerilir.
