import json
from pathlib import Path

import pytest

from build_dual_datasets import build_all, validate_rows


def test_dual_builder_creates_large_isolated_versioned_splits(tmp_path):
    manifest = build_all(tmp_path)

    assert manifest.counts["chatbot_v3_train"] >= 180
    assert manifest.counts["chatbot_v3_holdout"] >= 40
    assert manifest.counts["studio_v1_train"] >= 150
    assert manifest.counts["studio_v1_holdout"] >= 40
    assert set(manifest.files) == set(manifest.counts)
    assert all(len(digest) == 64 for digest in manifest.files.values())

    train = _read(tmp_path / "chatbot_v3_train.jsonl")
    holdout = _read(tmp_path / "chatbot_v3_holdout.jsonl")
    assert {row["case_id"] for row in train}.isdisjoint(
        {row["case_id"] for row in holdout}
    )

    studio = _read(tmp_path / "studio_v1_train.jsonl")
    assert {row["task"] for row in studio} == {"design_plan", "code_package"}
    assert len({row["metadata"]["industry"] for row in studio}) >= 8
    assert len({row["metadata"]["style"] for row in studio}) == 4


def test_dataset_validation_rejects_duplicate_questions_and_unsafe_completion():
    base = {
        "case_id": "case-a",
        "task": "chat",
        "source_ids": ["hostora"],
        "prompt": [{"role": "user", "content": "Tôi nên bắt đầu thế nào?"}],
        "completion": [{"role": "assistant", "content": "Hãy bắt đầu từ nhu cầu."}],
        "metadata": {"split": "train"},
    }
    duplicate = {**base, "case_id": "case-b"}
    with pytest.raises(ValueError, match="duplicate"):
        validate_rows([base, duplicate])

    unsafe = json.loads(json.dumps(base))
    unsafe["completion"][0]["content"] = "Gọi 090 123 4567 để mua gói 99.000đ."
    with pytest.raises(ValueError):
        validate_rows([unsafe])


def _read(path: Path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]
