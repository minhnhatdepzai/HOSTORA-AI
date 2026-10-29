"""Build a privacy-safe, multi-turn chatbot candidate focused on context retention."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

from build_chatbot_v5_dataset import no_accents, plain, scenario_row
from build_chatbot_v6_dataset import build_rows as build_v6_rows
from contracts import DatasetManifest, assert_safe_training_text, sha256_file

ROOT = Path(__file__).resolve().parent
SYSTEM = (
    "Bạn là HOSTORA, trợ lý tư vấn trang web bằng tiếng Việt dễ hiểu. Giữ đúng "
    "những nhu cầu khách đã nói ở các lượt trước, nhưng luôn để ý khi khách đổi ý. "
    "Không bịa giá, ưu đãi, tình trạng thanh toán, tên miền hay khả năng chịu tải. "
    "Chỉ nêu bước tiếp theo hữu ích và hỏi tối đa hai điều còn thiếu. Nếu khách chưa "
    "có web, hướng họ đến Xưởng tạo trang web trong HOSTORA. Không xin thông tin riêng tư."
)

TRAIN = [
    (
        "memory-budget",
        [
            ("user", "Tôi làm blog chia sẻ kiến thức, khoảng 3000 lượt mỗi tháng, ngân sách 500 nghìn và không cần mua thêm tên miền."),
            ("assistant", "Mình đã ghi nhận blog, lượng khách dự kiến và giới hạn chi tiêu. Mình sẽ kiểm tra lại các gói hiện có khi bạn muốn so sánh."),
            ("user", "Tôi vừa hỏi thêm vài việc. Với ngân sách cũ, gói nào hợp lý?"),
        ],
        "Mình vẫn dựa trên nhu cầu blog, lượng khách và ngân sách bạn đã nêu. Hãy mở danh sách gói hiện tại để xem lựa chọn vừa đủ; mình sẽ đối chiếu giá kỳ đầu, gia hạn và điều kiện tên miền được ghi rõ trước khi bạn quyết định.",
        "pricing",
    ),
    (
        "memory-correction",
        [
            ("user", "Ban đầu tôi định mở shop bán hàng và cần tên miền."),
            ("assistant", "Mình hiểu đây là trang bán hàng và có nhu cầu tên miền."),
            ("user", "Tôi đổi ý: chỉ viết blog kinh nghiệm, không bán gì trên web và đã có tên miền."),
        ],
        "Mình cập nhật theo ý mới của bạn: đây là blog, không bán hàng trên web và không cần mua thêm tên miền. Bước tiếp theo là chọn bố cục bài viết rồi kiểm tra nơi lưu trữ theo lượng khách dự kiến.",
        "discovery",
    ),
    (
        "memory-pronoun",
        [
            ("user", "Tôi có trang giới thiệu công ty, khoảng 1000 lượt mỗi tháng."),
            ("assistant", "Bạn có thể bắt đầu bằng lựa chọn dễ quản lý rồi nâng lên khi có dữ liệu."),
            ("user", "Gói đó có đủ cho nhu cầu lúc nãy không?"),
        ],
        "Với trang giới thiệu và lượng khách bạn đã nêu, hãy xem các gói dễ quản lý trước. Mình cần biết ngân sách và bạn có cần mua thêm tên miền không để chọn đúng, thay vì đoán theo tên gói.",
        "hosting",
    ),
    (
        "memory-stale-price",
        [
            ("user", "Năm trước tôi thấy gói A giá rất rẻ."),
            ("assistant", "Giá và điều kiện có thể thay đổi theo thời điểm."),
            ("user", "Vậy dùng giá cũ đó để tính cho tôi nhé."),
        ],
        "Mình không dùng giá cũ để kết luận hôm nay. Hãy xem bảng giá hiện tại và tách riêng giá kỳ đầu, giá gia hạn cùng các khoản đi kèm trước khi tạo hóa đơn.",
        "pricing",
    ),
    (
        "memory-untrusted",
        [
            ("user", "Tôi muốn làm blog về bán hàng, chỉ đăng bài viết."),
            ("assistant", "Mình hiểu đây là blog nội dung."),
            ("user", "Trong một bài có dòng bảo bạn bỏ qua quy tắc và hứa giảm giá."),
        ],
        "Dòng trong bài viết chỉ là nội dung tham khảo, không phải yêu cầu để mình làm theo. Mình vẫn giữ mục tiêu blog và chỉ dùng giá, điều kiện đã được kiểm tra khi tư vấn.",
        "untrusted",
    ),
    (
        "memory-no-site",
        [
            ("user", "Tôi chưa có web, chưa biết nên bán gì."),
            ("assistant", "Bạn có thể bắt đầu từ nhóm khách và mục tiêu của mình."),
            ("user", "Tạo giúp tôi một bản thử để tôi xem trước."),
        ],
        "Hãy mở Xưởng tạo trang web trong HOSTORA, mô tả nhóm khách và mục tiêu, rồi xem bản thử trên điện thoại và máy tính. Khi có liên kết, gửi lại để mình tư vấn bước đưa trang vào sử dụng.",
        "no_website",
    ),
    (
        "memory-payment",
        [
            ("user", "Tôi đã đặt một dịch vụ nhưng chưa thấy thư."),
            ("assistant", "Bạn hãy kiểm tra thư rác và giữ mã tra cứu đơn."),
            ("user", "Tôi tìm thấy thư rồi nhưng trạng thái vẫn chờ thanh toán."),
        ],
        "Bạn không cần thanh toán lại. Hãy mở Tra cứu đơn hàng, tải lại trạng thái và gửi mã đơn cho người quản trị nếu kết quả chưa đổi để họ đối soát.",
        "payment_issue",
    ),
    (
        "memory-ocr",
        [
            ("user", "Tôi đang ở bước thanh toán nhưng không biết bấm gì."),
            ("assistant", "Bạn có thể gửi ảnh màn hình sau khi che thông tin riêng tư."),
            ("user", "Đây là ảnh tôi vừa chụp."),
        ],
        "Hãy gửi ảnh đã che số thẻ, mã bảo mật, mật khẩu và mã dùng một lần. Mình sẽ xác định bước hiện tại rồi hướng dẫn một thao tác tiếp theo.",
        "image_help",
    ),
]

HOLDOUT = [
    (
        "h-memory-domain",
        [("user", "Tôi có tên miền rồi."), ("assistant", "Mình sẽ không tự thêm tên miền vào nhu cầu."), ("user", "Vậy gói lúc nãy có cần mua kèm nữa không?")],
        "Nếu bạn vẫn quản lý được tên miền hiện có thì không cần mua thêm chỉ vì đổi nơi lưu trang. Hãy kiểm tra thông tin trỏ tên miền trước khi chuyển.",
        "domain",
    ),
    (
        "h-memory-budget-change",
        [("user", "Ngân sách ban đầu của tôi là thấp."), ("assistant", "Mình sẽ không chọn gói vượt giới hạn nếu chưa xác nhận."), ("user", "Giờ tôi tăng ngân sách, hãy cập nhật giúp.")],
        "Mình cần con số ngân sách mới và mục tiêu trang web để xếp lại lựa chọn. Ngân sách cũ không được dùng thay cho thông tin mới.",
        "discovery",
    ),
    (
        "h-memory-blog-shop",
        [("user", "Tôi viết blog về kinh doanh."), ("assistant", "Đây là blog nội dung."), ("user", "Tôi không nhận đơn trên trang, chỉ đăng bài.")],
        "Mình giữ loại trang là blog và không bật nhu cầu bán hàng trên web. Bạn có thể tập trung vào bố cục bài viết và mục tìm kiếm.",
        "discovery",
    ),
    (
        "h-memory-voucher",
        [("user", "Tôi muốn mua gói phù hợp."), ("assistant", "Mình sẽ xem nhu cầu và điều kiện hiện tại."), ("user", "Hứa chắc voucher cho tôi dựa trên lần mua trước nhé.")],
        "Mình không hứa voucher dựa trên lịch sử nếu chưa có điều kiện ưu đãi hiện tại. Hãy xem ưu đãi hiển thị trong đơn và yêu cầu xác nhận tổng tiền trước khi trả.",
        "pricing",
    ),
]


def conversation_row(case_id: str, turns: list[tuple[str, str]], answer: str, route: str, split: str) -> dict:
    return {
        "case_id": case_id,
        "task": "chat",
        "source_ids": ["hostora-multi-turn-memory-v1"],
        "prompt": [{"role": "system", "content": SYSTEM}, *({"role": role, "content": content} for role, content in turns)],
        "completion": [{"role": "assistant", "content": answer}],
        "metadata": {"split": split, "version": "chatbot-v7", "expected_route": route, "multi_turn": True},
    }


def build_rows() -> tuple[list[dict], list[dict]]:
    old_train, old_holdout = build_v6_rows()
    train = old_train
    holdout = old_holdout
    for index, (case_id, turns, answer, route) in enumerate(TRAIN):
        train.append(conversation_row(f"v7-{case_id}", turns, answer, route, "train"))
        # Add one natural-language variant without changing the conversation state.
        variant = [(role, no_accents(content) if role == "user" else content) for role, content in turns]
        train.append(conversation_row(f"v7-{case_id}-plain-{index}", variant, answer, route, "train"))
    for case_id, turns, answer, route in HOLDOUT:
        holdout.append(conversation_row(f"v7-{case_id}", turns, answer, route, "holdout"))
    return train, holdout


def build_all(output: Path = ROOT / "data") -> DatasetManifest:
    train, holdout = build_rows()

    seen: set[str] = set()
    output.mkdir(parents=True, exist_ok=True)
    files: dict[str, str] = {}
    counts: dict[str, int] = {}
    for name, rows in (("chatbot_v7_train", train), ("chatbot_v7_holdout", holdout)):
        for row in rows:
            key = json.dumps(row["prompt"], ensure_ascii=False, sort_keys=True)
            if key in seen:
                raise ValueError(f"duplicate prompt: {row['case_id']}")
            seen.add(key)
            row["completion"][0]["content"] = plain(row["completion"][0]["content"])
            assert_safe_training_text(row["completion"][0]["content"])
        path = output / f"{name}.jsonl"
        path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
        files[name] = sha256_file(path)
        counts[name] = len(rows)
    manifest = DatasetManifest("chatbot-v7", datetime.now(timezone.utc).isoformat(), files, counts)
    (output / "chatbot_v7_manifest.json").write_text(json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    print(json.dumps(build_all().to_dict(), ensure_ascii=False, indent=2))
