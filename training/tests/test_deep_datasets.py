import json
from collections import Counter

from build_deep_datasets import build_all


def _read(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line]


def test_deep_builder_adds_diverse_web_projects_and_isolated_holdout(tmp_path):
    manifest = build_all(tmp_path)

    assert manifest.version == "deep-v2"
    assert manifest.counts["chatbot_v4_train"] >= 400
    assert manifest.counts["chatbot_v4_holdout"] >= 90
    assert manifest.counts["studio_v2_train"] >= 800
    assert manifest.counts["studio_v2_holdout"] >= 180

    train = _read(tmp_path / "studio_v2_train.jsonl")
    holdout = _read(tmp_path / "studio_v2_holdout.jsonl")
    assert len({row["metadata"]["industry"] for row in train}) >= 20
    assert len({row["metadata"]["direction"] for row in train}) >= 8
    assert {row["metadata"]["project_family"] for row in train}.isdisjoint(
        {row["metadata"]["project_family"] for row in holdout}
    )

    design_rows = [row for row in train if row["task"] == "design_plan"]
    layouts = Counter(
        json.loads(row["completion"][0]["content"])["visualPlan"]["layoutFamily"]
        for row in design_rows
    )
    assert set(layouts) == {
        "editorial_split",
        "cinematic_story",
        "product_gallery",
        "service_journey",
    }
    assert min(layouts.values()) >= 150
    assert sum(row["task"] == "code_package" for row in train) >= 120


def test_deep_builder_has_no_prompt_overlap_between_splits(tmp_path):
    build_all(tmp_path)
    groups = [
        _read(tmp_path / "chatbot_v4_train.jsonl"),
        _read(tmp_path / "chatbot_v4_holdout.jsonl"),
        _read(tmp_path / "studio_v2_train.jsonl"),
        _read(tmp_path / "studio_v2_holdout.jsonl"),
    ]
    prompts = []
    for rows in groups:
        prompts.extend(
            " ".join(row["prompt"][-1]["content"].casefold().split())
            for row in rows
        )
    assert len(prompts) == len(set(prompts))
