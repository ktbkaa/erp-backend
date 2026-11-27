#!/usr/bin/env bash
# Sunucu crontab'ı için yedek / tatbikat sarmalayıcısı (çakışma kilidi + log + çıkış kodu).
#
#   scripts/ops/backup-cron.sh backup         # db-backup.js (BACKUP_OFFSITE ayarına göre offsite)
#   scripts/ops/backup-cron.sh drill          # db-restore-drill.js (en yeni yerel yedek)
#   scripts/ops/backup-cron.sh drill-offsite  # db-restore-drill.js --source s3:latest
#
# Ortam: ERP_DIR (repo kökü, varsayılan: bu script'in iki üstü), ERP_ENV_FILE (varsayılan: $ERP_DIR/.env),
#        ERP_LOG_DIR (varsayılan: /var/log/ktb-erp), ERP_USE_DOCKER=1 → docker compose run ile çalıştır.
set -euo pipefail

ERP_DIR="${ERP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
ERP_ENV_FILE="${ERP_ENV_FILE:-$ERP_DIR/.env}"
ERP_LOG_DIR="${ERP_LOG_DIR:-/var/log/ktb-erp}"
JOB="${1:-backup}"

mkdir -p "$ERP_LOG_DIR"
LOG="$ERP_LOG_DIR/$JOB-$(date -u +%Y%m%d).log"
exec >>"$LOG" 2>&1
echo "=== $(date -u +%FT%TZ) $JOB başlıyor ==="

cd "$ERP_DIR"
if [ -f "$ERP_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ERP_ENV_FILE"
  set +a
fi

case "$JOB" in
  backup) NODE_CMD=(node scripts/db-backup.js); SERVICE=backup ;;
  drill) NODE_CMD=(node scripts/db-restore-drill.js); SERVICE=restore-drill ;;
  drill-offsite) NODE_CMD=(node scripts/db-restore-drill.js --source s3:latest); SERVICE=restore-drill ;;
  *) echo "bilinmeyen iş: $JOB"; exit 64 ;;
esac

LOCK="/tmp/ktb-erp-$JOB.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "başka bir $JOB çalışıyor, çıkılıyor"
  exit 75
fi

set +e
if [ "${ERP_USE_DOCKER:-0}" = "1" ]; then
  docker compose run --rm "$SERVICE" "${NODE_CMD[@]}"
else
  "${NODE_CMD[@]}"
fi
rc=$?
set -e
echo "=== $(date -u +%FT%TZ) $JOB bitti (exit $rc) ==="
exit $rc
