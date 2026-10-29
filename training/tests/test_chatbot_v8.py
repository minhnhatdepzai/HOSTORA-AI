import json
from pathlib import Path

from build_chatbot_v8_dataset import build_all


def test_v8_dataset_expands_v7_with_private_source_and_memory_cases(tmp_path: Path):
    manifest = build_all(tmp_path)
    assert manifest.version == "chatbot-v8"
    assert manifest.counts["chatbot_v8_train"] >= 730
    assert manifest.counts["chatbot_v8_holdout"] >= 150
    rows = [
        json.loads(line)
        for line in (tmp_path / "chatbot_v8_train.jsonl").read_text().splitlines()
    ]
    private = [row for row in rows if row["metadata"].get("private_source")]
    assert len(private) >= 50
    assert any("[U1]" in row["completion"][0]["content"] for row in private)
    assert all("Grounding Rule" not in row["completion"][0]["content"] for row in rows)
