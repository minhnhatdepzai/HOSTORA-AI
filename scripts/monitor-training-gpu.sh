#!/usr/bin/env bash
set -euo pipefail

train_unit="${1:-hostora-chatbot-v8-finetune.service}"
log_file="${2:-/home/admin123/Downloads/NoInternet /training/runs/chatbot-v8/gpu-monitor.csv}"
max_temp="${HOSTORA_TRAIN_MAX_GPU_TEMP_C:-84}"
mkdir -p "$(dirname "$log_file")"
if [[ ! -f "$log_file" ]]; then
  echo 'timestamp,utilization_pct,memory_used_mb,temperature_c,power_w' >"$log_file"
fi

hot_samples=0
while systemctl --user is-active --quiet "$train_unit"; do
  sample="$(nvidia-smi --query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw --format=csv,noheader,nounits | head -n 1)"
  IFS=',' read -r utilization memory temperature power <<<"$sample"
  utilization="${utilization// /}"
  memory="${memory// /}"
  temperature="${temperature// /}"
  power="${power// /}"
  echo "$(date --iso-8601=seconds),$utilization,$memory,$temperature,$power" >>"$log_file"
  if (( temperature >= max_temp )); then
    hot_samples=$((hot_samples + 1))
  else
    hot_samples=0
  fi
  if (( hot_samples >= 3 )); then
    echo "GPU remained at or above ${max_temp}C; stopping $train_unit." >&2
    systemctl --user stop "$train_unit"
    exit 2
  fi
  sleep 5
done
