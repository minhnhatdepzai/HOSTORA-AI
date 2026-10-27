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
NEXT_STEP = re.compile(
    r"\b(?:hãy|bạn có thể|bước tiếp theo|mở|gửi|cho mình biết|vui lòng|trước tiên)\b",
    re.I,
)


def chat(model: str, messages: list[dict]) -> tuple[str, int]:
    started = time.monotonic()
    request = Request(
        "http://127.0.0.1:11434/api/chat",
        data=json.dumps({"model": model, "messages": messages, "stream": False, "think": False, "options": {"temperature": 0, "num_ctx": 16384, "num_predict": 1800}}).encode(),
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
                answer, latency = chat(model, row["prompt"])
                schema_valid = True
                if row["task"] in {"design_plan", "code_package"}:
                    try:
                        parsed = json.loads(answer)
                        schema_valid = isinstance(parsed, dict)
                    except json.JSONDecodeError:
                        schema_valid = False
                scores = chat_scores(row, answer) if row["task"] == "chat" else {}
                results.append({"case_id": row["case_id"], "task": row["task"], "answer": answer, "latency_ms": latency, "schema_valid": schema_valid, "scores": scores, "error": None})
            except Exception as error:
                results.append({"case_id": row["case_id"], "task": row["task"], "answer": "", "latency_ms": None, "schema_valid": False, "scores": {}, "error": str(error)})
            print(json.dumps({"model": model, **{k: results[-1][k] for k in ("case_id", "schema_valid", "latency_ms", "error")}}, ensure_ascii=False), flush=True)
        ok = [item for item in results if not item["error"]]
        model_reports[model] = {
            "total": len(results),
            "http_ok": len(ok),
            "schema_valid": sum(bool(item["schema_valid"]) for item in results),
            "metrics": aggregate(results),
            "items": results,
        }
    candidate = model_reports[config["ollama_model"]]
    metrics = candidate["metrics"]
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
