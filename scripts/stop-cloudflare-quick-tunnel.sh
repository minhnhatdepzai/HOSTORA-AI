#!/usr/bin/env bash
set -euo pipefail
pkill -f 'cloudflared tunnel --no-autoupdate --url' 2>/dev/null || true
echo 'Đã dừng Cloudflare Quick Tunnel.'
