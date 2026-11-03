#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if [[ ! -f .env.docker ]]; then
  umask 077
  if command -v openssl >/dev/null 2>&1; then
    session_secret="$(openssl rand -hex 32)"
  else
    session_secret="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  fi
  {
    echo "HOSTORA_PORT=3000"
    echo "HOSTORA_OLLAMA_PORT=11434"
    echo "HOSTORA_MAILPIT_PORT=8025"
    echo "HOSTORA_PUBLIC_BASE_URL=http://127.0.0.1:3000"
    echo "HOSTORA_ADMIN_SESSION_SECRET=$session_secret"
    echo "HOSTORA_CHAT_MODEL=qwen3.5:9b-q8_0"
    echo "HOSTORA_CHATBOT_MODEL=qwen3.5:9b-q8_0"
    echo "HOSTORA_EMBED_MODEL=qwen3-embedding:4b"
    echo "HOSTORA_CONTEXT_LENGTH=16384"
    echo "HOSTORA_TIMEOUT_MS=90000"
    echo "HOSTORA_MAX_AI_CONCURRENCY=1"
    echo "HOSTORA_BUILD_RAG_INDEX=1"
  } > .env.docker
  echo "Đã tạo .env.docker với secret local ngẫu nhiên."
fi

compose_args=(docker compose)
compose_args+=(--env-file .env.docker)
if [[ "${1:-}" == "--gpu" ]]; then
  compose_args+=(-f compose.yaml -f compose.gpu.yaml)
fi

"${compose_args[@]}" up --build -d
"${compose_args[@]}" ps
echo "HOSTORA: http://127.0.0.1:${HOSTORA_PORT:-3000}"
echo "Email quản trị local: http://127.0.0.1:${HOSTORA_MAILPIT_PORT:-8025}"
echo "Lần đầu có thể lâu vì Ollama phải tải model và tạo RAG index."
