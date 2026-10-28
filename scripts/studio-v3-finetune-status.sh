#!/usr/bin/env bash
set -u
export HOSTORA_TRAIN_RUN='studio-v3'
export HOSTORA_TRAIN_UNIT='hostora-studio-v3-finetune.service'
exec bash "$(dirname "$0")/dual-finetune-status.sh"
