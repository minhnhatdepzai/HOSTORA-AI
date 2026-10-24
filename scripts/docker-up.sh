#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

compose_args=(docker compose)
if [[ -f .env.docker ]]; then
  compose_args+=(--env-file .env.docker)
fi
if [[ "${1:-}" == "--gpu" ]]; then
  compose_args+=(-f compose.yaml -f compose.gpu.yaml)
fi

"${compose_args[@]}" up --build -d
"${compose_args[@]}" ps
echo "HOSTORA: http://127.0.0.1:${HOSTORA_PORT:-3000}"
echo "Lần đầu có thể lâu vì Ollama phải tải model và tạo RAG index."
