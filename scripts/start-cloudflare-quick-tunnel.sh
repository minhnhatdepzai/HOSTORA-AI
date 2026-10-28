#!/usr/bin/env bash
set -euo pipefail

HOSTORA_CLOUDFLARED_BIN="${CLOUDFLARED_BIN:-${HOME}/.local/bin/cloudflared}"
HOSTORA_TUNNEL_TARGET="${HOSTORA_TUNNEL_TARGET:-http://127.0.0.1:3000}"
HOSTORA_TUNNEL_LOG="${HOSTORA_TUNNEL_LOG:-${TMPDIR:-/tmp}/hostora-cloudflare-tunnel.log}"

if [[ ! -x "$HOSTORA_CLOUDFLARED_BIN" ]]; then
  echo "Không tìm thấy cloudflared tại $HOSTORA_CLOUDFLARED_BIN" >&2
  exit 1
fi

if ! curl -fsS --max-time 5 "$HOSTORA_TUNNEL_TARGET/api/health" >/dev/null; then
  echo "HOSTORA chưa trả lời tại $HOSTORA_TUNNEL_TARGET/api/health" >&2
  exit 1
fi

: > "$HOSTORA_TUNNEL_LOG"
echo "Cloudflare Quick Tunnel → $HOSTORA_TUNNEL_TARGET"
echo "Log: $HOSTORA_TUNNEL_LOG"
exec "$HOSTORA_CLOUDFLARED_BIN" tunnel --no-autoupdate --url "$HOSTORA_TUNNEL_TARGET" 2>&1 | tee -a "$HOSTORA_TUNNEL_LOG"
