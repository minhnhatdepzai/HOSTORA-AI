"""Versioned, privacy-safe contracts shared by HOSTORA training jobs."""

from dataclasses import asdict, dataclass, field
import hashlib
from pathlib import Path
import re
from typing import Literal


EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE = re.compile(r"(?<!\d)(?:\+?84|0)(?:[\s.()-]*\d){8,10}(?!\d)")
DYNAMIC_FACT = re.compile(
    r"\b\d[\d.,]*\s*(?:đ|vnd|đồng|%|gb|tb|v?cpu|core|tháng|năm)\b",
    re.I,
)


@dataclass(frozen=True)
class DatasetManifest:
    version: str
    created_at: str
    files: dict[str, str]
    counts: dict[str, int]

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class TrainingStatus:
    run_id: str
    state: Literal["queued", "running", "completed", "failed", "interrupted"]
    stage: str
    started_at: str
    updated_at: str
    pid: int
    stages: dict[str, dict] = field(default_factory=dict)
    error: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_safe_training_text(text: str) -> None:
    """Reject PII and live commercial facts from optimizer targets."""
    if EMAIL.search(text):
        raise ValueError("training text contains an email address")
    if PHONE.search(text):
        raise ValueError("training text contains a phone number")
    if DYNAMIC_FACT.search(text):
        raise ValueError("training text contains a dynamic commercial fact")
