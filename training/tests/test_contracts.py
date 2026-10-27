import hashlib
import json

import pytest

from contracts import DatasetManifest, TrainingStatus, assert_safe_training_text, sha256_file
from status import write_status


def test_manifest_and_status_are_serializable_with_stable_field_names(tmp_path):
    manifest = DatasetManifest(
        version="dual-v1",
        created_at="2026-10-26T00:00:00Z",
        files={"chatbot_train": "abc123"},
        counts={"chatbot_train": 180},
    )
    status = TrainingStatus(
        run_id="dual-v1",
        state="running",
        stage="chatbot_train",
        started_at="2026-10-26T00:00:00Z",
        updated_at="2026-10-26T00:01:00Z",
        pid=42,
    )

    assert manifest.to_dict() == {
        "version": "dual-v1",
        "created_at": "2026-10-26T00:00:00Z",
        "files": {"chatbot_train": "abc123"},
        "counts": {"chatbot_train": 180},
    }
    assert status.to_dict()["stage"] == "chatbot_train"
    assert status.to_dict()["pid"] == 42

    target = tmp_path / "status.json"
    write_status(target, status)
    assert json.loads(target.read_text())["state"] == "running"
    assert not (tmp_path / "status.json.tmp").exists()


def test_sha256_file_hashes_the_file_bytes(tmp_path):
    target = tmp_path / "sample.txt"
    target.write_bytes(b"hostora")
    assert sha256_file(target) == hashlib.sha256(b"hostora").hexdigest()


@pytest.mark.parametrize(
    "unsafe",
    [
        "Liên hệ hello@example.com để được hỗ trợ.",
        "Gọi số 090 123 4567 để mua ngay.",
        "Gói này chỉ 99.000đ/tháng.",
        "Bạn nhận 20 GB dung lượng và giảm 30%.",
    ],
)
def test_training_text_rejects_pii_and_dynamic_commercial_facts(unsafe):
    with pytest.raises(ValueError):
        assert_safe_training_text(unsafe)


def test_training_text_allows_behavioral_guidance_without_live_facts():
    assert_safe_training_text(
        "Hãy hỏi nhu cầu trước, giải thích giới hạn và chỉ dùng giá trong context runtime."
    )
