"""Reload saved adapter, merge and export local Q8 GGUF for Ollama."""

import hashlib
import json
import os
from pathlib import Path

import unsloth  # noqa: F401
from unsloth import FastLanguageModel

ROOT = Path(__file__).resolve().parent
OUT = ROOT / os.environ.get("HOSTORA_TRAIN_OUTPUT", "output-chatbot")
ADAPTER = OUT / "adapter"
if not (ADAPTER / "adapter_model.safetensors").exists():
    raise RuntimeError("Train adapter before export")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=str(ADAPTER),
    max_seq_length=16384,
    load_in_4bit=False,
    load_in_16bit=True,
)
target = OUT / "gguf"
if not list((OUT / "gguf_gguf").glob("*.Q8_0.gguf")):
    model.save_pretrained_gguf(str(target), tokenizer, quantization_method="q8_0")
files = [
    path for path in (OUT / "gguf_gguf").glob("*.gguf")
    if "mmproj" not in path.name
]
if len(files) != 1:
    raise RuntimeError("Expected exactly one GGUF: " + str(files))
gguf = files[0]
digest = hashlib.sha256()
with gguf.open("rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(chunk)
manifest_path = OUT / "manifest.json"
manifest = json.loads(manifest_path.read_text())
manifest.update({
    "reload_test": "adapter_loaded",
    "gguf_path": str(gguf),
    "gguf_bytes": gguf.stat().st_size,
    "gguf_sha256": digest.hexdigest(),
})
manifest_path.write_text(json.dumps(manifest, indent=2))
print(json.dumps(manifest, indent=2))
