"""Reload a HOSTORA LoRA adapter and export a hashed Q8 GGUF."""

import argparse
import json
from pathlib import Path

from contracts import sha256_file
from train_lora import load_config

ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    args = parser.parse_args()
    config = load_config(args.config)
    output = ROOT / config["output_dir"]
    adapter = output / "adapter"
    if not (adapter / "adapter_model.safetensors").exists():
        raise RuntimeError("adapter is missing")

    import unsloth  # noqa: F401
    from unsloth import FastLanguageModel

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(adapter),
        max_seq_length=16384,
        load_in_4bit=False,
        load_in_16bit=True,
    )
    target = output / "gguf"
    existing = list((output / "gguf_gguf").glob("*.Q8_0.gguf"))
    if not existing:
        model.save_pretrained_gguf(str(target), tokenizer, quantization_method="q8_0")
    files = [p for p in (output / "gguf_gguf").glob("*.Q8_0.gguf") if "mmproj" not in p.name]
    if len(files) != 1:
        raise RuntimeError(f"expected one Q8 GGUF, got {files}")
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest.update({
        "reload_test": "adapter_loaded",
        "gguf_path": str(files[0]),
        "gguf_bytes": files[0].stat().st_size,
        "gguf_sha256": sha256_file(files[0]),
    })
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
