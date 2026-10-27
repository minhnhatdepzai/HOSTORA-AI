"""Unattended, resumable orchestration for HOSTORA dual fine-tuning.

This module never promotes a candidate or edits runtime environment files.  It
only builds, trains, exports, imports and evaluates versioned candidate models.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
from typing import Callable
from urllib.parse import urlparse

from contracts import TrainingStatus
from status import write_status
from train_lora import load_config


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
DEFAULT_RUN_DIR = ROOT / "runs" / "dual-v1"
CONFIGS = {
    "chatbot": ROOT / "configs" / "chatbot-v3.json",
    "studio": ROOT / "configs" / "studio-v1.json",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class Stage:
    name: str
    action: Callable[[], None]


class Pipeline:
    """Run named stages sequentially with atomic status and append-only logs."""

    def __init__(self, run_dir: Path, stages: list[Stage], resume: bool = False):
        self.run_dir = Path(run_dir)
        self.stages = stages
        self.resume = resume
        self.status_path = self.run_dir / "status.json"
        self.log_path = self.run_dir / "train.log"
        self._status: dict = {}

    def _log(self, message: str) -> None:
        self.run_dir.mkdir(parents=True, exist_ok=True)
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(f"[{utc_now()}] {message}\n")

    def _persist(self) -> None:
        payload = TrainingStatus(
            run_id=self._status["run_id"],
            state=self._status["state"],
            stage=self._status["stage"],
            started_at=self._status["started_at"],
            updated_at=self._status["updated_at"],
            pid=self._status["pid"],
            stages=self._status["stages"],
            error=self._status.get("error"),
        )
        write_status(self.status_path, payload)

    def _load_or_initialize(self) -> None:
        self.run_dir.mkdir(parents=True, exist_ok=True)
        if self.resume and self.status_path.exists():
            self._status = json.loads(self.status_path.read_text(encoding="utf-8"))
            self._status["pid"] = os.getpid()
            self._status["updated_at"] = utc_now()
            self._status["error"] = None
            self._log("Resuming pipeline; completed stages will be skipped.")
            return
        if self.status_path.exists() and not self.resume:
            previous = json.loads(self.status_path.read_text(encoding="utf-8"))
            if previous.get("state") in {"running", "completed"}:
                raise RuntimeError(
                    "run already exists; inspect status or pass --resume after an interruption"
                )
        now = utc_now()
        self._status = {
            "run_id": self.run_dir.name,
            "state": "queued",
            "stage": "queued",
            "started_at": now,
            "updated_at": now,
            "pid": os.getpid(),
            "stages": {},
            "error": None,
        }

    def _finish_abnormally(self, state: str, stage: str, error: BaseException) -> None:
        now = utc_now()
        entry = self._status["stages"].setdefault(stage, {})
        entry.update({"state": state, "finished_at": now, "error": str(error)})
        self._status.update(
            {
                "state": state,
                "stage": stage,
                "updated_at": now,
                "error": str(error),
            }
        )
        self._persist()
        self._log(f"{state.upper()} {stage}: {error}")

    def run(self) -> None:
        self._load_or_initialize()
        self._status.update(
            {"state": "running", "stage": "starting", "updated_at": utc_now()}
        )
        self._persist()
        self._log(f"Pipeline started with PID {os.getpid()}.")

        for stage in self.stages:
            previous = self._status["stages"].get(stage.name, {})
            if self.resume and previous.get("state") == "completed":
                self._log(f"SKIP {stage.name}: already completed.")
                continue

            started_at = utc_now()
            self._status["stages"][stage.name] = {
                "state": "running",
                "started_at": started_at,
            }
            self._status.update(
                {
                    "state": "running",
                    "stage": stage.name,
                    "updated_at": started_at,
                    "error": None,
                }
            )
            self._persist()
            self._log(f"START {stage.name}")
            try:
                stage.action()
            except KeyboardInterrupt as error:
                self._finish_abnormally("interrupted", stage.name, error)
                raise
            except BaseException as error:
                self._finish_abnormally("failed", stage.name, error)
                raise

            finished_at = utc_now()
            self._status["stages"][stage.name].update(
                {"state": "completed", "finished_at": finished_at}
            )
            self._status["updated_at"] = finished_at
            self._persist()
            self._log(f"DONE {stage.name}")

        finished_at = utc_now()
        self._status.update(
            {
                "state": "completed",
                "stage": "completed",
                "updated_at": finished_at,
                "error": None,
            }
        )
        self._persist()
        self._log("Pipeline completed. Candidates were not promoted.")


class CommandRunner:
    def __init__(self, log_path: Path):
        self.log_path = log_path

    def run(self, command: list[str], *, env: dict[str, str] | None = None) -> None:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        rendered = " ".join(command)
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(f"[{utc_now()}] COMMAND {rendered}\n")
            handle.flush()
            completed = subprocess.run(
                command,
                cwd=PROJECT_ROOT,
                env=env,
                stdout=handle,
                stderr=subprocess.STDOUT,
                text=True,
                check=False,
            )
        if completed.returncode != 0:
            raise RuntimeError(
                f"command exited {completed.returncode}: {command[0]}"
            )

    def capture(self, command: list[str]) -> str:
        completed = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                f"command exited {completed.returncode}: {command[0]}\n{completed.stdout}"
            )
        return completed.stdout


def _require_loopback_ollama() -> str:
    base_url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in {
        "127.0.0.1",
        "localhost",
        "::1",
    }:
        raise RuntimeError("OLLAMA_BASE_URL must be loopback-only")
    return base_url.rstrip("/")


def _candidate_config(kind: str, configs: dict[str, Path] = CONFIGS) -> dict:
    return load_config(configs[kind])


def build_real_stages(
    run_dir: Path,
    configs: dict[str, Path] | None = None,
    dataset_builder: Path | None = None,
) -> list[Stage]:
    configs = configs or CONFIGS
    dataset_builder = dataset_builder or (ROOT / "build_dual_datasets.py")
    runner = CommandRunner(run_dir / "train.log")
    python = sys.executable
    ollama_candidates = [
        shutil.which("ollama"),
        str(Path.home() / ".local" / "ollama" / "bin" / "ollama"),
        "/usr/local/bin/ollama",
    ]
    ollama = next(
        (candidate for candidate in ollama_candidates if candidate and Path(candidate).is_file()),
        "/usr/local/bin/ollama",
    )

    def preflight() -> None:
        _require_loopback_ollama()
        if not Path(ollama).exists():
            raise RuntimeError("ollama CLI is missing")
        if shutil.disk_usage(PROJECT_ROOT).free < 40 * 1024**3:
            raise RuntimeError("at least 40 GiB free disk is required")
        for config_path in configs.values():
            config = load_config(config_path)
            for key in ("train_file", "holdout_file"):
                if not (ROOT / config[key]).exists():
                    raise RuntimeError(f"missing dataset: {config[key]}")
        runner.run(
            [
                python,
                "-c",
                (
                    "import unsloth, torch; "
                    "assert torch.cuda.is_available(), 'CUDA unavailable'; "
                    "print(torch.cuda.get_device_name(0)); "
                    "print(round(torch.cuda.get_device_properties(0).total_memory/1024**3, 2))"
                ),
            ]
        )
        runner.capture([ollama, "list"])

    def dataset() -> None:
        runner.run([python, str(dataset_builder)])

    def baseline_snapshot() -> None:
        snapshot = {
            "captured_at": utc_now(),
            "chatbot_runtime_model": os.environ.get("OLLAMA_CHATBOT_MODEL"),
            "studio_runtime_model": os.environ.get("OLLAMA_STUDIO_MODEL"),
            "ollama_models": runner.capture([ollama, "list"]),
            "note": "Inventory snapshot only; candidate evaluation is separate and no promotion is automatic.",
        }
        (run_dir / "baseline.json").write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def unload_hostora_models() -> None:
        output = runner.capture([ollama, "ps"])
        names = []
        for line in output.splitlines()[1:]:
            if not line.strip():
                continue
            name = line.split()[0]
            if name.startswith("hostora-") or name.startswith(
                "qwen3-embedding:"
            ):
                names.append(name)
        for name in names:
            runner.run([ollama, "stop", name])

    def train(kind: str) -> Callable[[], None]:
        def action() -> None:
            env = os.environ.copy()
            if (ROOT / _candidate_config(kind, configs)["output_dir"]).exists():
                env["HOSTORA_TRAIN_RESUME"] = "1"
            runner.run(
                [python, str(ROOT / "train_lora.py"), "--config", str(configs[kind])],
                env=env,
            )

        return action

    def export(kind: str) -> Callable[[], None]:
        return lambda: runner.run(
            [python, str(ROOT / "export_lora.py"), "--config", str(configs[kind])]
        )

    def import_candidate(kind: str) -> Callable[[], None]:
        config = _candidate_config(kind, configs)
        modelfile = ROOT / f"Modelfile.{config['name']}"
        return lambda: runner.run(
            [ollama, "create", config["ollama_model"], "-f", str(modelfile)]
        )

    def evaluate(kind: str) -> Callable[[], None]:
        return lambda: runner.run(
            [python, str(ROOT / "evaluate_candidate.py"), "--config", str(configs[kind])]
        )

    def unload_candidate(kind: str) -> Callable[[], None]:
        model = _candidate_config(kind, configs)["ollama_model"]
        return lambda: runner.run([ollama, "stop", model])

    def final_summary() -> None:
        summary = {
            "completed_at": utc_now(),
            "automatic_promotion": False,
            "candidates": {},
        }
        for kind in configs:
            config = _candidate_config(kind, configs)
            output = ROOT / config["output_dir"]
            summary["candidates"][kind] = {
                "model": config["ollama_model"],
                "manifest": json.loads((output / "manifest.json").read_text()),
                "evaluation": str(output / "evaluation.json"),
                "promotion": "candidate_only",
            }
        (run_dir / "summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    common = [
        Stage("preflight", preflight),
        Stage("dataset", dataset),
        Stage("baseline_snapshot", baseline_snapshot),
        Stage("unload_hostora_models", unload_hostora_models),
    ]
    model_stages: list[Stage] = []
    for kind in configs:
        model_stages.extend(
            [
                Stage(f"{kind}_train", train(kind)),
                Stage(f"{kind}_export", export(kind)),
                Stage(f"{kind}_import", import_candidate(kind)),
                Stage(f"{kind}_eval", evaluate(kind)),
                Stage(f"{kind}_unload", unload_candidate(kind)),
            ]
        )
    return [*common, *model_stages, Stage("final_summary", final_summary)]


def build_stub_stages(run_dir: Path) -> list[Stage]:
    names = [
        "preflight",
        "dataset",
        "baseline_snapshot",
        "unload_hostora_models",
        "chatbot_train",
        "chatbot_export",
        "chatbot_import",
        "chatbot_eval",
        "chatbot_unload",
        "studio_train",
        "studio_export",
        "studio_import",
        "studio_eval",
        "studio_unload",
        "final_summary",
    ]

    def record(name: str) -> Callable[[], None]:
        return lambda: (run_dir / f"stub-{name}.ok").write_text("ok\n")

    return [Stage(name, record(name)) for name in names]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", type=Path, default=DEFAULT_RUN_DIR)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--stub", action="store_true")
    parser.add_argument("--chatbot-config", type=Path, default=CONFIGS["chatbot"])
    parser.add_argument("--studio-config", type=Path, default=CONFIGS["studio"])
    parser.add_argument("--chatbot-only", action="store_true")
    parser.add_argument(
        "--dataset-builder", type=Path, default=ROOT / "build_dual_datasets.py"
    )
    args = parser.parse_args()
    run_dir = args.run_dir.resolve()

    if run_dir == Path("/") or ROOT not in run_dir.parents:
        raise RuntimeError("run directory must be inside training/")

    def interrupt(_signum: int, _frame: object) -> None:
        raise KeyboardInterrupt("received termination signal")

    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    configs = {"chatbot": args.chatbot_config.resolve()}
    if not args.chatbot_only:
        configs["studio"] = args.studio_config.resolve()
    stages = (
        build_stub_stages(run_dir)
        if args.stub
        else build_real_stages(run_dir, configs, args.dataset_builder.resolve())
    )
    Pipeline(run_dir, stages, resume=args.resume).run()


if __name__ == "__main__":
    main()
