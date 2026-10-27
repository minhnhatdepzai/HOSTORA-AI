import json

from build_chatbot_v5_dataset import FORBIDDEN, build_all
from evaluate_candidate import chat_scores
from train_lora import load_config


def _read(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]


def test_v5_dataset_is_plain_language_large_and_split(tmp_path):
    manifest = build_all(tmp_path)
    assert manifest.version == "chatbot-v5"
    assert manifest.counts["chatbot_v5_train"] >= 500
    assert manifest.counts["chatbot_v5_holdout"] >= 120

    train = _read(tmp_path / "chatbot_v5_train.jsonl")
    holdout = _read(tmp_path / "chatbot_v5_holdout.jsonl")
    train_prompts = {row["prompt"][-1]["content"].casefold() for row in train}
    holdout_prompts = {row["prompt"][-1]["content"].casefold() for row in holdout}
    assert train_prompts.isdisjoint(holdout_prompts)
    assert all(not FORBIDDEN.search(row["completion"][0]["content"]) for row in train + holdout)


def test_v5_config_uses_gpu_filling_batch_without_automatic_promotion():
    config = load_config(
        __import__("pathlib").Path(__file__).resolve().parents[1]
        / "configs/chatbot-v5.json"
    )
    assert config["per_device_train_batch_size"] == 3
    assert config["max_length"] == 2048
    assert config["ollama_model"].endswith("v5")


def test_plain_language_evaluator_rejects_internal_words_and_wrong_route():
    row = {
        "prompt": [{"role": "user", "content": "Tôi chưa có trang web."}],
        "metadata": {"expected_route": "no_website"},
    }
    bad = chat_scores(row, "Backend sẽ chọn gói cho bạn.")
    assert bad["plain_language"] is False
    assert bad["correct_route"] is False

    good = chat_scores(
        row,
        "Hãy mở Xưởng tạo trang web, tạo một bản xem trước rồi gửi lại để mình tư vấn bước tiếp theo.",
    )
    assert all(good.values())
