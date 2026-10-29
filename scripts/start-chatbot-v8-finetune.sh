#!/usr/bin/env bash
set -euo pipefail

project_root='/home/admin123/Downloads/NoInternet '
python_bin="$project_root/training/.venv/bin/python"
runner="$project_root/training/run_dual_finetune.py"
builder="$project_root/training/build_chatbot_v8_dataset.py"
config="$project_root/training/configs/chatbot-v8.json"
run_dir="$project_root/training/runs/chatbot-v8"
status_file="$run_dir/status.json"
unit='hostora-chatbot-v8-finetune.service'

for other_unit in hostora-dual-finetune.service hostora-deep-finetune.service hostora-chatbot-v5-finetune.service hostora-chatbot-v6-finetune.service hostora-chatbot-v7-finetune.service hostora-studio-v3-finetune.service; do
  if systemctl --user is-active --quiet "$other_unit"; then
    echo "$other_unit đang dùng GPU; chưa khởi động đợt mới." >&2
    exit 1
  fi
done
if systemctl --user is-active --quiet "$unit"; then
  echo "$unit đang chạy."
  exit 0
fi

"$python_bin" "$builder" >/dev/null
"$python_bin" "$project_root/training/train_lora.py" --config "$config" --dry-run >/dev/null
resume_args=()
if [[ -f "$status_file" ]]; then
  state="$("$python_bin" -c 'import json,sys; print(json.load(open(sys.argv[1]))["state"])' "$status_file")"
  case "$state" in
    failed|interrupted) resume_args+=(--resume) ;;
    completed) echo 'Đợt chatbot-v8 đã hoàn tất; không ghi đè kết quả.' >&2; exit 1 ;;
    running) echo 'Trạng thái đang chạy nhưng dịch vụ không hoạt động; cần kiểm tra.' >&2; exit 1 ;;
  esac
fi

systemd-run --user --unit="$unit" --collect --property=Restart=no \
  --property="WorkingDirectory=/home/admin123/Downloads" \
  --setenv=CUDA_VISIBLE_DEVICES=0 \
  --setenv=TOKENIZERS_PARALLELISM=true \
  --setenv=PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True \
  "$python_bin" "$runner" --run-dir "$run_dir" --dataset-builder "$builder" \
  --chatbot-config "$config" --chatbot-only "${resume_args[@]}"

for _attempt in 1 2 3 4 5; do
  if systemctl --user is-active --quiet "$unit"; then
    echo "Đã khởi động $unit (PID $(systemctl --user show "$unit" --property=MainPID --value))."
    exit 0
  fi
  sleep 1
done
echo "$unit không giữ được trạng thái hoạt động; xem nhật ký dịch vụ." >&2
exit 1
