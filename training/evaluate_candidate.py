"""Direct Ollama holdout evaluation; never promotes a candidate."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import time
from urllib.request import Request, urlopen

from train_lora import load_config

ROOT = Path(__file__).resolve().parent
FORBIDDEN_CUSTOMER_TERMS = re.compile(
    r"\b(?:backend|frontend|api|rag|sandbox|smtp|webhook|gateway|provider|"
    r"fine[- ]?tuning|training|catalog|local[- ]first|ollama|qwen|schema|"
    r"pipeline|deploy|production|monitoring|debug|checkout|cdn|vps|cpu|ram|"
    r"latency|cache|database|ocr|benchmark|workload)\b|i/o",
    re.I,
)
COMMERCIAL_NUMBER = re.compile(r"\b\d[\d.,]*\s*(?:đ|vnd|đồng|%)\b", re.I)
GENERIC_HYPE = re.compile(r"đẳng cấp|tuyệt vời|đột phá|hàng đầu|số một|hoàn hảo|nâng tầm|không giới hạn", re.I)
STUDIO_FIELDS = {
    "headline", "subheadline", "ctaLabel", "aboutTitle", "aboutCopy",
    "features", "offerTitle", "offerCopy", "audienceTitle", "audienceCopy",
    "closingLine", "seoTitle", "seoDescription",
}
STUDIO_FORMAT = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        **{key: {"type": "string"} for key in STUDIO_FIELDS - {"features"}},
        "features": {
            "type": "array", "minItems": 3, "maxItems": 3,
            "items": {
                "type": "object", "additionalProperties": False,
                "properties": {"title": {"type": "string"}, "copy": {"type": "string"}},
                "required": ["title", "copy"],
            },
        },
    },
    "required": sorted(STUDIO_FIELDS),
}
NEXT_STEP = re.compile(
    r"\b(?:hãy|bạn có thể|bước tiếp theo|mở|gửi|cho mình biết|vui lòng|trước tiên|cần|nên|phải|kiểm tra|chọn|thử|xem)\b",
    re.I,
)


def chat(model: str, messages: list[dict], task: str = "chat") -> tuple[str, int]:
    started = time.monotonic()
    payload = {"model": model, "messages": messages, "stream": False, "think": False, "options": {"temperature": 0, "num_ctx": 16384, "num_predict": 1800}}
    if task == "studio_copy":
        payload["format"] = STUDIO_FORMAT
    request = Request(
        "http://127.0.0.1:11434/api/chat",
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=240) as response:
        payload = json.loads(response.read())
    return payload.get("message", {}).get("content", ""), round((time.monotonic() - started) * 1000)


def route_pass(answer: str, route: str | None) -> bool:
    if not route:
        return True
    patterns = {
        "no_website": r"xưởng tạo trang web|tạo (?:một )?bản (?:thử|xem trước)|/website-studio",
        "has_website": r"cho (?:mình|biết)|trang web|lượng khách|nền tảng",
        "payment_issue": r"đừng thanh toán lại|tra cứu đơn|mã đơn|tải lại trạng thái",
        "payment": r"hóa đơn|stripe|vnpay|thanh toán",
        "refund": r"tra cứu đơn|yêu cầu (?:hủy|hoàn tiền)|mã truy cập",
        "pricing": r"không (?:bịa|đoán)|xác nhận tổng tiền|giá gia hạn|ghi nguồn",
        "image_help": r"che .*thông tin|mã dùng một lần|gửi ảnh|bước tiếp theo",
        "privacy": r"không cần .*điện thoại|không .*thông tin liên hệ|chỉ cung cấp",
        "domain": r"không thể (?:đoán|xác nhận)|kiểm tra .*nơi đăng ký|thay đổi liên tục",
        "discovery": r"mục tiêu|đã có trang web|không .*gói đắt nhất",
        "consultation": r"chọn .*thời gian|đặt lịch|cách liên hệ",
        "hosting": r"gói|lưu trữ|lượng khách|nâng cấp|vận hành",
        "migration": r"sao lưu|chuyển|bản mới|quay lại",
        "backup": r"sao lưu|khôi phục|bản sao",
        "security": r"bảo vệ|mật khẩu|quyền|khôi phục|an toàn",
        "untrusted": r"dữ liệu tham khảo|không phải chỉ dẫn|thông tin đã xác minh",
    }
    return bool(re.search(patterns.get(route, r"."), answer, re.I))


def chat_scores(row: dict, answer: str) -> dict[str, bool]:
    prompt = row["prompt"][-1]["content"]
    prompt_numbers = set(COMMERCIAL_NUMBER.findall(prompt))
    answer_numbers = set(COMMERCIAL_NUMBER.findall(answer))
    return {
        "plain_language": not FORBIDDEN_CUSTOMER_TERMS.search(answer),
        "no_invented_commercial_number": answer_numbers.issubset(prompt_numbers),
        "has_next_step": bool(NEXT_STEP.search(answer)),
        "helpful_shape": 40 <= len(answer.strip()) <= 1_200 and answer.count("?") <= 2,
        "correct_route": route_pass(answer, row.get("metadata", {}).get("expected_route")),
    }


def studio_copy_scores(row: dict, answer: str) -> dict[str, bool]:
    prompt = row["prompt"][-1]["content"]
    try:
        value = json.loads(answer)
        source = json.loads(prompt)
    except json.JSONDecodeError:
        value, source = None, {}
    schema_valid = isinstance(value, dict) and set(value) == STUDIO_FIELDS
    if schema_valid:
        schema_valid = all(isinstance(value[key], str) for key in STUDIO_FIELDS - {"features"})
        schema_valid = schema_valid and isinstance(value["features"], list) and len(value["features"]) == 3
        schema_valid = schema_valid and all(
            isinstance(item, dict) and set(item) == {"title", "copy"}
            and isinstance(item["title"], str) and isinstance(item["copy"], str)
            for item in value["features"]
        )
    content = " ".join(value[key] for key in STUDIO_FIELDS - {"features"}) if schema_valid else answer
    if schema_valid:
        content += " " + " ".join(item["title"] + " " + item["copy"] for item in value["features"])
    prompt_numbers = set(COMMERCIAL_NUMBER.findall(prompt))
    answer_numbers = set(COMMERCIAL_NUMBER.findall(content))
    brand = str(source.get("brand", "")).strip().casefold()
    sections = [value[key].strip().casefold() for key in ("aboutCopy", "offerCopy", "audienceCopy")] if schema_valid else []
    return {
        "schema_valid": bool(schema_valid),
        "no_invented_commercial_number": answer_numbers.issubset(prompt_numbers),
        "no_generic_hype": not GENERIC_HYPE.search(content),
        "brand_grounded": bool(brand) and brand in content.casefold(),
        "distinct_sections": bool(sections) and len(set(sections)) == 3,
        "content_depth": bool(schema_valid) and sum(len(part) for part in sections) >= 220,
    }


def aggregate(items: list[dict]) -> dict:
    chat_items = [item for item in items if item["task"] == "chat" and not item["error"]]
    names = [
        "plain_language",
        "no_invented_commercial_number",
        "has_next_step",
        "helpful_shape",
        "correct_route",
    ]
    return {
        name: {
            "passed": sum(bool(item.get("scores", {}).get(name)) for item in chat_items),
            "total": len(chat_items),
            "rate": round(
                sum(bool(item.get("scores", {}).get(name)) for item in chat_items)
                / max(1, len(chat_items)),
                4,
            ),
        }
        for name in names
    }


def aggregate_studio(items: list[dict]) -> dict:
    studio_items = [item for item in items if item["task"] == "studio_copy" and not item["error"]]
    names = ["schema_valid", "no_invented_commercial_number", "no_generic_hype", "brand_grounded", "distinct_sections", "content_depth"]
    return {
        name: {
            "passed": sum(bool(item.get("scores", {}).get(name)) for item in studio_items),
            "total": len(studio_items),
            "rate": round(sum(bool(item.get("scores", {}).get(name)) for item in studio_items) / max(1, len(studio_items)), 4),
        }
        for name in names
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()
    config = load_config(args.config)
    output = ROOT / config["output_dir"]
    rows = [json.loads(line) for line in (ROOT / config["holdout_file"]).read_text().splitlines() if line]
    if args.limit:
        rows = rows[: args.limit]
    models = [config["ollama_model"], *config.get("comparison_models", [])]
    model_reports = {}
    for model in models:
        results = []
        for row in rows:
            try:
                answer, latency = chat(model, row["prompt"], row["task"])
                schema_valid = True
                if row["task"] in {"design_plan", "code_package", "studio_copy"}:
                    try:
                        parsed = json.loads(answer)
                        schema_valid = isinstance(parsed, dict)
                    except json.JSONDecodeError:
                        schema_valid = False
                scores = chat_scores(row, answer) if row["task"] == "chat" else studio_copy_scores(row, answer) if row["task"] == "studio_copy" else {}
                if row["task"] == "studio_copy":
                    schema_valid = scores["schema_valid"]
                results.append({"case_id": row["case_id"], "task": row["task"], "answer": answer, "latency_ms": latency, "schema_valid": schema_valid, "scores": scores, "error": None})
            except Exception as error:
                results.append({"case_id": row["case_id"], "task": row["task"], "answer": "", "latency_ms": None, "schema_valid": False, "scores": {}, "error": str(error)})
            print(json.dumps({"model": model, **{k: results[-1][k] for k in ("case_id", "schema_valid", "latency_ms", "error")}}, ensure_ascii=False), flush=True)
        ok = [item for item in results if not item["error"]]
        model_reports[model] = {
            "total": len(results),
            "http_ok": len(ok),
            "schema_valid": sum(bool(item["schema_valid"]) for item in results),
            "metrics": aggregate_studio(results) if any(row["task"] == "studio_copy" for row in rows) else aggregate(results),
            "new_scenarios": aggregate([item for item in results if item["case_id"].startswith("v6-")]),
            "items": results,
        }
    candidate = model_reports[config["ollama_model"]]
    metrics = candidate["metrics"]
    if any(row["task"] == "studio_copy" for row in rows):
        gates = {
            "all_requests_completed": candidate["http_ok"] == candidate["total"],
            "schema_valid": metrics["schema_valid"]["rate"] >= 0.95,
            "no_invented_commercial_number": metrics["no_invented_commercial_number"]["rate"] == 1,
            "no_generic_hype": metrics["no_generic_hype"]["rate"] >= 0.95,
            "brand_grounded": metrics["brand_grounded"]["rate"] >= 0.90,
            "distinct_sections": metrics["distinct_sections"]["rate"] >= 0.90,
            "content_depth": metrics["content_depth"]["rate"] >= 0.80,
        }
    else:
        gates = {
            "all_requests_completed": candidate["http_ok"] == candidate["total"],
            "plain_language": metrics.get("plain_language", {}).get("rate", 1) == 1,
            "no_invented_commercial_number": metrics.get("no_invented_commercial_number", {}).get("rate", 1) == 1,
            "has_next_step": metrics.get("has_next_step", {}).get("rate", 1) >= 0.85,
            "helpful_shape": metrics.get("helpful_shape", {}).get("rate", 1) >= 0.95,
            "correct_route": metrics.get("correct_route", {}).get("rate", 1) >= 0.90,
        }
    report = {
        "model": config["ollama_model"],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "dataset": config["holdout_file"],
        "models": model_reports,
        "gates": gates,
        "review_recommendation": "eligible_for_human_review" if all(gates.values()) else "keep_as_candidate",
        "promotion": "candidate_only",
    }
    (output / "evaluation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    (output / "promotion.json").write_text(json.dumps({"status": "candidate", "automatic_promotion": False, "gate_passed": all(gates.values()), "reason": "Offline checks and human review are required before runtime use."}, indent=2) + "\n")
    failed_requests = sum(report["total"] - report["http_ok"] for report in model_reports.values())
    if failed_requests:
        raise RuntimeError(f"evaluation failures: {failed_requests}")


if __name__ == "__main__":
    main()
