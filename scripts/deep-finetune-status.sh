#!/usr/bin/env bash
set -u
export HOSTORA_TRAIN_RUN='deep-v2'
export HOSTORA_TRAIN_UNIT='hostora-deep-finetune.service'
exec bash "$(dirname "$0")/dual-finetune-status.sh"
