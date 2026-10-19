FROM node:22-bookworm-slim

WORKDIR /app

# Native deps for pg optional; keep image small
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Şema güncelle, sonra sunucu
CMD ["sh", "-c", "node db/migrate.js && node index.js"]
