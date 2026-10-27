#!/usr/bin/env bash
set -u
export HOSTORA_TRAIN_RUN='chatbot-v5'
export HOSTORA_TRAIN_UNIT='hostora-chatbot-v5-finetune.service'
exec bash "$(dirname "$0")/dual-finetune-status.sh"
