import json
from pathlib import Path

import pytest

from run_dual_finetune import Pipeline, Stage, build_real_stages


def test_pipeline_runs_stages_in_order_and_completes(tmp_path):
    seen = []
    pipeline = Pipeline(
        run_dir=tmp_path,
        stages=[
            Stage("dataset", lambda: seen.append("dataset")),
            Stage("chatbot_train", lambda: seen.append("chatbot_train")),
            Stage("studio_train", lambda: seen.append("studio_train")),
        ],
    )

    pipeline.run()

    assert seen == ["dataset", "chatbot_train", "studio_train"]
    status = json.loads((tmp_path / "status.json").read_text())
    assert status["state"] == "completed"
    assert list(status["stages"]) == seen


def test_pipeline_stops_on_failure_and_never_runs_later_stage(tmp_path):
    seen = []

    def fail():
        seen.append("train")
        raise RuntimeError("gpu failed")

    pipeline = Pipeline(
        run_dir=tmp_path,
        stages=[Stage("train", fail), Stage("promote", lambda: seen.append("promote"))],
    )
    with pytest.raises(RuntimeError, match="gpu failed"):
        pipeline.run()

    assert seen == ["train"]
    status = json.loads((tmp_path / "status.json").read_text())
    assert status["state"] == "failed"
    assert status["stage"] == "train"
    assert "gpu failed" in status["error"]


def test_resume_skips_completed_stages_but_not_failed_stage(tmp_path):
    (tmp_path / "status.json").write_text(
        json.dumps(
            {
                "run_id": "dual-v1",
                "state": "failed",
                "stage": "studio_train",
                "started_at": "2026-10-26T00:00:00Z",
                "updated_at": "2026-10-26T00:10:00Z",
                "pid": 1,
                "stages": {
                    "dataset": {"state": "completed"},
                    "chatbot_train": {"state": "completed"},
                    "studio_train": {"state": "failed"},
                },
                "error": "stopped",
            }
        )
    )
    seen = []
    Pipeline(
        run_dir=tmp_path,
        stages=[
            Stage("dataset", lambda: seen.append("dataset")),
            Stage("chatbot_train", lambda: seen.append("chatbot_train")),
            Stage("studio_train", lambda: seen.append("studio_train")),
        ],
        resume=True,
    ).run()
    assert seen == ["studio_train"]


def test_interrupt_is_persisted_honestly_and_log_is_append_only(tmp_path):
    log = tmp_path / "train.log"
    log.write_text("existing evidence\n")

    def interrupt():
        raise KeyboardInterrupt("operator stop")

    with pytest.raises(KeyboardInterrupt, match="operator stop"):
        Pipeline(tmp_path, [Stage("train", interrupt)]).run()

    status = json.loads((tmp_path / "status.json").read_text())
    assert status["state"] == "interrupted"
    assert status["stages"]["train"]["state"] == "interrupted"
    assert (tmp_path / "train.log").read_text().startswith("existing evidence\n")


def test_real_pipeline_has_no_promotion_stage(tmp_path):
    names = [stage.name for stage in build_real_stages(tmp_path)]
    assert "chatbot_eval" in names
    assert "studio_eval" in names
    assert not any("promot" in name for name in names)
