#!/bin/sh
set -eu

if [ "${HOSTORA_BUILD_RAG_INDEX:-1}" = "1" ]; then
  echo "HOSTORA: checking local RAG index..."
  if ! node scripts/index-rag.mjs; then
    echo "HOSTORA: embedding unavailable; server will use lexical RAG fallback." >&2
  fi
fi

exec node server.js
