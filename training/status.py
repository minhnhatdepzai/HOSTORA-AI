"""Atomic status persistence for unattended training."""

import json
from pathlib import Path

from contracts import TrainingStatus


def write_status(path: Path, status: TrainingStatus) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(
        json.dumps(status.to_dict(), ensure_ascii=False, indent=2) + "\n"
    )
    temporary.replace(path)
