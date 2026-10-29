import json
from pathlib import Path

from build_chatbot_v6_dataset import HOLDOUT_SCENARIOS, TRAIN_SCENARIOS, build_all
from evaluate_candidate import chat_scores
from train_lora import load_config


def test_v6_expands_scenarios_and_keeps_holdout_disjoint(tmp_path):
    manifest = build_all(tmp_path)
    train = [json.loads(line) for line in (tmp_path / "chatbot_v6_train.jsonl").read_text().splitlines()]
    holdout = [json.loads(line) for line in (tmp_path / "chatbot_v6_holdout.jsonl").read_text().splitlines()]
    assert manifest.counts == {"chatbot_v6_train": 655, "chatbot_v6_holdout": 142}
    assert len(TRAIN_SCENARIOS) >= 25 and len(HOLDOUT_SCENARIOS) >= 15
    assert {row["prompt"][-1]["content"].casefold() for row in train}.isdisjoint(
        row["prompt"][-1]["content"].casefold() for row in holdout
    )


def test_v6_candidate_is_separate_and_new_routes_are_measured():
    root = Path(__file__).resolve().parents[1]
    config = load_config(root / "configs/chatbot-v6.json")
    assert config["output_dir"] == "output-chatbot-v6"
    assert config["ollama_model"] != "hostora-chatbot:4b-q8-v5"
    row = {"prompt": [{"role": "user", "content": "Sao lưu có đủ không?"}], "metadata": {"expected_route": "backup"}}
    assert chat_scores(row, "Hãy thử khôi phục bản sao lưu trên bản riêng rồi kiểm tra lại trang.")["correct_route"]
