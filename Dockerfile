# KTB ERP — production imajı (uygulama + yedek/geri yükleme araçları)
#
#   docker build -t ktb-erp .
#   docker run --env-file .env -p 3000:3000 ktb-erp                  # uygulama
#   docker run --env-file .env ktb-erp node scripts/predeploy.js     # yedek (gerekirse) + migration
#   docker run --env-file .env ktb-erp node scripts/db-backup.js     # yedek (+ offsite)
#
# Migration uygulama açılışında ÇALIŞMAZ; deploy ön adımı (predeploy) olarak ayrıca koşturulur.
FROM node:22-bookworm-slim

# pg_dump sürümü sunucu sürümüyle aynı veya daha yeni olmalı (Render/Neon PG sürümünüze göre).
ARG PG_CLIENT_VERSION=16

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini rsync openssh-client \
  && install -d /usr/share/postgresql-common/pgdg \
  && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
     > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends "postgresql-client-${PG_CLIENT_VERSION}" \
  && apt-get purge -y curl && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --chown=node:node . .
RUN mkdir -p /app/backups && chown node:node /app/backups

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    LOG_FORMAT=json \
    BACKUP_DIR=/app/backups

USER node
EXPOSE 3000

# Liveness: DB'ye gitmez. Trafik kapısı için /ready kullanın (Render healthCheckPath).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini: PID 1 olarak sinyalleri (SIGTERM) node'a iletir, zombi süreçleri toplar.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
