#!/usr/bin/env bash
# Geçici genel URL (ücretsiz Cloudflare quick tunnel)
# Kullanım: bash scripts/public-tunnel.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${CLOUDFLARED_BIN:-/tmp/cloudflared}"
PORT="${PORT:-3000}"
LOG="${TUNNEL_LOG:-/tmp/cloudflared.log}"

if [[ ! -x "$BIN" ]]; then
  echo "cloudflared indiriliyor…"
  curl -sL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" -o "$BIN"
  chmod +x "$BIN"
fi

# Sağlık kontrolü
if ! curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "Uyarı: http://127.0.0.1:${PORT}/health yanıt vermiyor. Önce npm start çalıştırın."
fi

echo "Tünel açılıyor (Ctrl+C ile kapat)…"
"$BIN" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate 2>&1 | tee "$LOG"
