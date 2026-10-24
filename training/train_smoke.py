"""One-step BF16 LoRA smoke run for HOSTORA. Not a quality-training run."""

from pathlib import Path

import unsloth  # noqa: F401 - must patch libraries before TRL/Transformers imports
import torch
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTConfig, SFTTrainer

ROOT = Path(__file__).resolve().parent
MODEL = "unsloth/Qwen3.5-4B"
MAX_SEQ_LENGTH = 1024

if not torch.cuda.is_available():
    raise RuntimeError("CUDA is required for this smoke run")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=False,
    load_in_16bit=True,
    full_finetuning=False,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=8,
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
    lora_alpha=8,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
    max_seq_length=MAX_SEQ_LENGTH,
)

dataset = load_dataset(
    "json",
    data_files=str(ROOT / "dataset.sample.jsonl"),
    split="train",
)


def format_example(row):
    messages = [
        {
            "role": "system",
            "content": "Bạn là chuyên gia hosting Việt Nam. Không bịa giá và luôn nêu giới hạn của ước lượng.",
        },
        {
            "role": "user",
            "content": f"{row['instruction']}\n\nBối cảnh: {row['input']}",
        },
        {"role": "assistant", "content": row["output"]},
    ]
    return {
        "text": tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )
    }


dataset = dataset.map(format_example)
output_dir = ROOT / "output-smoke"
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        max_seq_length=MAX_SEQ_LENGTH,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=1,
        max_steps=1,
        learning_rate=2e-4,
        logging_steps=1,
        output_dir=str(output_dir),
        optim="adamw_torch",
        seed=3407,
        dataset_num_proc=1,
        report_to="none",
    ),
)

result = trainer.train()
model.save_pretrained(output_dir / "adapter")
tokenizer.save_pretrained(output_dir / "adapter")
print(
    {
        "status": "smoke-complete",
        "model": MODEL,
        "steps": result.global_step,
        "training_loss": result.training_loss,
        "max_vram_gb": round(torch.cuda.max_memory_reserved() / 1024**3, 2),
        "artifact": str(output_dir / "adapter"),
    }
)
