import json
from pathlib import Path

from build_studio_v3_dataset import build_all
from evaluate_candidate import studio_copy_scores
from train_lora import load_config


def _rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]


def test_studio_copy_uses_real_runtime_shape_and_unseen_business_holdout(tmp_path):
    manifest = build_all(tmp_path)
    assert manifest.counts == {"studio_v3_train": 384, "studio_v3_holdout": 24}
    train, holdout = _rows(tmp_path / "studio_v3_train.jsonl"), _rows(tmp_path / "studio_v3_holdout.jsonl")
    train_brands = {json.loads(row["prompt"][-1]["content"])["brand"] for row in train}
    holdout_brands = {json.loads(row["prompt"][-1]["content"])["brand"] for row in holdout}
    assert train_brands.isdisjoint(holdout_brands)
    assert all(all(studio_copy_scores(row, row["completion"][0]["content"]).values()) for row in train + holdout)


def test_studio_evaluator_rejects_generic_and_unstructured_output():
    row = _rows(Path(__file__).resolve().parents[1] / "data/studio_v3_holdout.jsonl")[0]
    target = json.loads(row["completion"][0]["content"])
    assert studio_copy_scores(row, json.dumps(target, ensure_ascii=False))["schema_valid"]
    target["headline"] = "Giải pháp đẳng cấp số một cho mọi người"
    assert not studio_copy_scores(row, json.dumps(target, ensure_ascii=False))["no_generic_hype"]
    assert not studio_copy_scores(row, "Xin chào")["schema_valid"]


def test_studio_candidate_isolated_from_serving_model():
    config = load_config(Path(__file__).resolve().parents[1] / "configs/studio-v3.json")
    assert config["name"] == "studio-v3"
    assert config["ollama_model"] == "hostora-studio:4b-q8-v3"
    assert config["output_dir"] == "output-studio-v3"
