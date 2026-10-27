import json
from pathlib import Path

import pytest

from train_lora import load_config, validate_output_target


ROOT = Path(__file__).resolve().parents[1]


def test_dual_configs_use_distinct_models_outputs_and_holdouts():
    chatbot = load_config(ROOT / "configs/chatbot-v3.json")
    studio = load_config(ROOT / "configs/studio-v1.json")

    assert chatbot["ollama_model"] == "hostora-chatbot:4b-q8-v3"
    assert studio["ollama_model"] == "hostora-studio:4b-q8-v1"
    assert chatbot["output_dir"] != studio["output_dir"]
    assert chatbot["holdout_file"] != studio["holdout_file"]
    assert 2 <= chatbot["epochs"] <= 8
    assert 2 <= studio["epochs"] <= 8


def test_completed_output_is_not_overwritten_without_resume(tmp_path, monkeypatch):
    output = tmp_path / "candidate"
    output.mkdir()
    (output / "manifest.json").write_text(json.dumps({"status": "trained"}))
    monkeypatch.delenv("HOSTORA_TRAIN_RESUME", raising=False)

    with pytest.raises(FileExistsError):
        validate_output_target(output)


def test_resume_explicitly_allows_existing_output(tmp_path, monkeypatch):
    output = tmp_path / "candidate"
    output.mkdir()
    monkeypatch.setenv("HOSTORA_TRAIN_RESUME", "1")
    validate_output_target(output)


def test_deep_configs_are_distinct_candidates_with_larger_context():
    chatbot = load_config(ROOT / "configs/chatbot-v4.json")
    studio = load_config(ROOT / "configs/studio-v2.json")

    assert chatbot["ollama_model"] == "hostora-chatbot:4b-q8-v4"
    assert studio["ollama_model"] == "hostora-studio:4b-q8-v2"
    assert chatbot["output_dir"] == "output-chatbot-v4"
    assert studio["output_dir"] == "output-studio-v2"
    assert studio["max_length"] >= chatbot["max_length"]
    assert studio["lora_rank"] >= chatbot["lora_rank"]
