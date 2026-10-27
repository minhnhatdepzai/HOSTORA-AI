#!/usr/bin/env bash
set -u

project_root='/home/admin123/Downloads/NoInternet '
python_bin="$project_root/training/.venv/bin/python"
run_name="${HOSTORA_TRAIN_RUN:-dual-v1}"
status_file="$project_root/training/runs/$run_name/status.json"
unit="${HOSTORA_TRAIN_UNIT:-hostora-dual-finetune.service}"

active_state="$(systemctl --user is-active "$unit" 2>/dev/null || true)"
echo "Service: ${active_state:-unknown}"
if [[ -f "$status_file" ]]; then
  "$python_bin" -m json.tool "$status_file"
else
  echo 'Chưa có status.json.'
fi
log_file="$project_root/training/runs/$run_name/train.log"
echo "Log: $log_file"

if command -v nvidia-smi >/dev/null 2>&1; then
  echo 'GPU hiện tại:'
  nvidia-smi \
    --query-gpu=name,memory.used,memory.free,utilization.gpu,power.draw,temperature.gpu \
    --format=csv,noheader
  echo 'Tiến trình GPU:'
  nvidia-smi \
    --query-compute-apps=pid,process_name,used_memory \
    --format=csv,noheader || true
  echo 'Mẫu tải GPU liên tục (5 giây):'
  nvidia-smi dmon -s pucm -d 1 -c 5
fi

if [[ -f "$log_file" ]]; then
  "$python_bin" - "$status_file" "$log_file" <<'PY'
import json
from pathlib import Path
import re
import sys

status = json.loads(Path(sys.argv[1]).read_text())
stage = status.get("stage", "unknown")
log = Path(sys.argv[2]).read_text(errors="replace")
current = log.rsplit(f"START {stage}", 1)[-1].replace("\r", "\n")
steps = re.findall(r"Total steps = ([0-9][0-9,]*)", current)
if steps:
    total = steps[-1].replace(",", "")
    progress = [
        line.strip()
        for line in current.splitlines()
        if re.search(rf"[0-9]+%\|.*[0-9]+/{re.escape(total)}(?:\D|$)", line)
    ]
    if progress:
        print(f"Optimizer {stage}: {progress[-1]}")
    else:
        print(f"Pha {stage}: đã chuẩn bị {total} step, đang compile batch đầu.")
elif "Tokenizing" in current:
    print(f"Pha {stage}: đang tokenize dữ liệu.")
elif "Loading weights" in current:
    print(f"Pha {stage}: đang tải model vào GPU.")
else:
    print(f"Pha {stage}: đang khởi tạo.")
PY
fi
