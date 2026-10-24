"""BF16 LoRA SFT for the in-app HOSTORA chatbot; never trains catalog facts."""

import hashlib
import json
import os
from pathlib import Path

import unsloth  # noqa: F401 - patch before torch/transformers/TRL
import torch
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTConfig, SFTTrainer

ROOT = Path(__file__).resolve().parent
OUT = ROOT / os.environ.get("HOSTORA_TRAIN_OUTPUT", "output-chatbot")
MODEL = "unsloth/Qwen3.5-4B"
MAX_LENGTH = 1024

if not torch.cuda.is_available():
    raise RuntimeError("CUDA GPU is required")
if not (ROOT / "data/chatbot_train.jsonl").exists():
    raise RuntimeError("Run build_chat_dataset.py first")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL,
    max_seq_length=MAX_LENGTH,
    load_in_4bit=False,
    load_in_16bit=True,
    full_finetuning=False,
)
model = FastLanguageModel.get_peft_model(
    model,
    r=8,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=8,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
    max_seq_length=MAX_LENGTH,
)
dataset = load_dataset(
    "json", data_files=str(ROOT / "data/chatbot_train.jsonl"), split="train"
)
trainer = SFTTrainer(
    model=model,
    processing_class=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        max_length=MAX_LENGTH,
        completion_only_loss=True,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=1e-4,
        warmup_steps=4,
        logging_steps=5,
        save_strategy="epoch",
        save_total_limit=2,
        output_dir=str(OUT),
        optim="adamw_torch",
        seed=3407,
        dataset_num_proc=1,
        report_to="none",
    ),
)
result = trainer.train()
adapter = OUT / "adapter"
model.save_pretrained(adapter)
tokenizer.save_pretrained(adapter)
weights = adapter / "adapter_model.safetensors"
manifest = {
    "base_model": MODEL,
    "train_rows": len(dataset),
    "steps": result.global_step,
    "training_loss": result.training_loss,
    "adapter_sha256": hashlib.sha256(weights.read_bytes()).hexdigest(),
    "max_vram_gb": round(torch.cuda.max_memory_reserved() / 1024**3, 2),
    "train_source_sha256": hashlib.sha256(
        (ROOT / "data/chatbot_train.jsonl").read_bytes()
    ).hexdigest(),
    "status": "trained_not_evaluated",
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(json.dumps(manifest, indent=2))
