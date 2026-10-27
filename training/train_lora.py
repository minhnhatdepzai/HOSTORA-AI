"""Config-driven BF16 LoRA trainer for HOSTORA local candidates."""

import argparse
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_config(path: Path) -> dict:
    config = json.loads(path.read_text())
    required = {
        "name", "base_model", "train_file", "holdout_file", "output_dir",
        "ollama_model", "max_length", "lora_rank", "lora_alpha", "epochs",
        "learning_rate", "gradient_accumulation_steps", "seed",
    }
    missing = required - set(config)
    if missing:
        raise ValueError(f"missing config fields: {sorted(missing)}")
    if not 2 <= int(config["epochs"]) <= 8:
        raise ValueError("epochs must be between 2 and 8")
    batch_size = int(config.get("per_device_train_batch_size", 1))
    if not 1 <= batch_size <= 4:
        raise ValueError("per_device_train_batch_size must be between 1 and 4")
    return config


def validate_output_target(output: Path) -> None:
    if output.exists() and os.environ.get("HOSTORA_TRAIN_RESUME") != "1":
        if any(output.iterdir()):
            raise FileExistsError(
                f"refusing to overwrite {output}; set HOSTORA_TRAIN_RESUME=1"
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    config = load_config(args.config)
    train_file = ROOT / config["train_file"]
    holdout_file = ROOT / config["holdout_file"]
    output = ROOT / config["output_dir"]
    if not train_file.exists() or not holdout_file.exists():
        raise FileNotFoundError("build the dual datasets before training")
    if args.dry_run:
        print(json.dumps({"ok": True, "config": config, "train": str(train_file)}))
        return
    validate_output_target(output)

    import unsloth  # noqa: F401
    import torch
    from datasets import load_dataset
    from unsloth import FastLanguageModel
    from trl import SFTConfig, SFTTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is required")
    torch.set_float32_matmul_precision("high")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=config["base_model"],
        max_seq_length=config["max_length"],
        load_in_4bit=False,
        load_in_16bit=True,
        full_finetuning=False,
    )
    model = FastLanguageModel.get_peft_model(
        model,
        r=config["lora_rank"],
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        lora_alpha=config["lora_alpha"],
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=config["seed"],
        max_seq_length=config["max_length"],
    )
    dataset = load_dataset("json", data_files=str(train_file), split="train")
    trainer = SFTTrainer(
        model=model,
        processing_class=tokenizer,
        train_dataset=dataset,
        args=SFTConfig(
            max_length=config["max_length"],
            completion_only_loss=True,
            per_device_train_batch_size=int(
                config.get("per_device_train_batch_size", 1)
            ),
            gradient_accumulation_steps=config["gradient_accumulation_steps"],
            num_train_epochs=config["epochs"],
            learning_rate=config["learning_rate"],
            warmup_ratio=0.05,
            logging_steps=5,
            save_strategy="epoch",
            save_total_limit=2,
            output_dir=str(output),
            optim="adamw_torch",
            seed=config["seed"],
            dataset_num_proc=int(config.get("dataset_num_proc", 1)),
            dataloader_num_workers=int(config.get("dataloader_num_workers", 0)),
            bf16=torch.cuda.is_bf16_supported(),
            fp16=not torch.cuda.is_bf16_supported(),
            report_to="none",
        ),
    )
    checkpoints = sorted(output.glob("checkpoint-*"))
    should_resume = (
        os.environ.get("HOSTORA_TRAIN_RESUME") == "1" and bool(checkpoints)
    )
    result = trainer.train(resume_from_checkpoint=should_resume)
    adapter = output / "adapter"
    model.save_pretrained(adapter)
    tokenizer.save_pretrained(adapter)
    weights = adapter / "adapter_model.safetensors"
    manifest = {
        "name": config["name"],
        "base_model": config["base_model"],
        "ollama_model": config["ollama_model"],
        "train_rows": len(dataset),
        "epochs": config["epochs"],
        "steps": result.global_step,
        "training_loss": result.training_loss,
        "adapter_sha256": hashlib.sha256(weights.read_bytes()).hexdigest(),
        "max_vram_gb": round(torch.cuda.max_memory_reserved() / 1024**3, 2),
        "train_source_sha256": hashlib.sha256(train_file.read_bytes()).hexdigest(),
        "status": "trained_not_evaluated",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
