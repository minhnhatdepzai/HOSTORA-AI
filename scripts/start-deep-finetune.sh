#!/usr/bin/env bash
set -euo pipefail

project_root='/home/admin123/Downloads/NoInternet '
service_workdir='/home/admin123/Downloads'
python_bin="$project_root/training/.venv/bin/python"
runner="$project_root/training/run_dual_finetune.py"
run_dir="$project_root/training/runs/deep-v2"
status_file="$run_dir/status.json"
unit='hostora-deep-finetune.service'

if systemctl --user is-active --quiet hostora-dual-finetune.service; then
  echo 'dual-v1 vẫn đang dùng GPU; hãy đợi pipeline đó hoàn tất.' >&2
  exit 1
fi
if systemctl --user is-active --quiet "$unit"; then
  echo "$unit đang chạy. Xem: pnpm ai:train:deep:status"
  exit 0
fi

resume_args=()
if [[ -f "$status_file" ]]; then
  state="$($python_bin -c 'import json,sys; print(json.load(open(sys.argv[1]))["state"])' "$status_file")"
  case "$state" in
    failed|interrupted) resume_args+=(--resume) ;;
    completed)
      echo 'Run deep-v2 đã hoàn tất; không ghi đè artifact.' >&2
      exit 1
      ;;
    running)
      echo 'Status deep-v2 vẫn running nhưng service không active; cần kiểm tra trước khi resume.' >&2
      exit 1
      ;;
  esac
fi

systemd-run --user \
  --unit="$unit" \
  --collect \
  --property=Restart=no \
  --property="WorkingDirectory=$service_workdir" \
  "$python_bin" "$runner" \
  --run-dir "$run_dir" \
  --dataset-builder "$project_root/training/build_deep_datasets.py" \
  --chatbot-config "$project_root/training/configs/chatbot-v4.json" \
  --studio-config "$project_root/training/configs/studio-v2.json" \
  "${resume_args[@]}"

for _attempt in 1 2 3 4 5; do
  if systemctl --user is-active --quiet "$unit"; then
    main_pid="$(systemctl --user show "$unit" --property=MainPID --value)"
    echo "Đã khởi động $unit (PID $main_pid)."
    echo 'Theo dõi: pnpm ai:train:deep:status'
    exit 0
  fi
  sleep 1
done

echo "$unit không giữ được trạng thái active; xem journalctl --user -u $unit -n 100." >&2
exit 1
