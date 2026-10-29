#!/usr/bin/env bash
set -euo pipefail
project_root='/home/admin123/Downloads/NoInternet '
status_file="$project_root/training/runs/chatbot-v7/status.json"
unit='hostora-chatbot-v7-finetune.service'
if systemctl --user is-active --quiet "$unit"; then
  echo "Service: active"
else
  echo "Service: inactive"
fi
if [[ -f "$status_file" ]]; then
  cat "$status_file"
else
  echo '{"state":"not_started"}'
fi
echo "Log: $project_root/training/runs/chatbot-v7/train.log"
if command -v nvidia-smi >/dev/null 2>&1; then
  echo 'GPU hiện tại:'
  nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,power.draw,temperature.gpu --format=csv,noheader,nounits
fi
