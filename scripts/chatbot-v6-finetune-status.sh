#!/usr/bin/env bash
set -u
export HOSTORA_TRAIN_RUN='chatbot-v6'
export HOSTORA_TRAIN_UNIT='hostora-chatbot-v6-finetune.service'
exec bash "$(dirname "$0")/dual-finetune-status.sh"
