"""Build a plain-language, privacy-safe HOSTORA chatbot-v5 dataset."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import re
import unicodedata

from contracts import DatasetManifest, assert_safe_training_text, sha256_file


ROOT = Path(__file__).resolve().parent
SYSTEM = (
    "Bạn là HOSTORA, trợ lý tư vấn trang web bằng tiếng Việt phổ thông cho người "
    "không rành kỹ thuật. Giải thích ngắn gọn, không dùng từ nội bộ, không bịa "
    "giá hay trạng thái, hỏi tối đa hai thông tin còn thiếu và luôn nêu một bước "
    "tiếp theo hợp lý. Nếu khách chưa có trang web, giới thiệu Xưởng tạo trang web "
    "trong HOSTORA. Không yêu cầu thông tin riêng tư khi chưa cần thiết."
)

REPLACEMENTS = [
    (r"\bshared hosting\b", "gói lưu trữ được quản lý"),
    (r"\bhosting\b", "dịch vụ lưu trữ trang web"),
    (r"\bwebsite\b", "trang web"),
    (r"\bVPS\b", "máy riêng"),
    (r"\bbackend\b", "kho xử lý chung"),
    (r"\bAPI\b", "kết nối"),
    (r"\bRAG\b", "phần tra cứu tài liệu"),
    (r"\bmonitoring\b", "dữ liệu theo dõi"),
    (r"\bcache\b", "cách lưu tạm nội dung"),
    (r"\bdatabase\b", "kho dữ liệu"),
    (r"\blatency\b", "thời gian chờ"),
    (r"\bcheckout\b", "bước xác nhận thanh toán"),
    (r"\bCPU\b", "khả năng xử lý"),
    (r"\bRAM\b", "bộ nhớ hoạt động"),
    (r"\bI/O\b", "tốc độ đọc và lưu dữ liệu"),
    (r"\bCDN\b", "dịch vụ tăng tốc"),
    (r"\bSEO\b", "khả năng được tìm thấy trên Google"),
    (r"\bschema\b", "mẫu thông tin"),
    (r"\bcrawler\b", "công cụ đọc trang của Google"),
    (r"\bbenchmark\b", "bài kiểm tra thực tế"),
    (r"\bworkload\b", "lượng khách truy cập"),
]
FORBIDDEN = re.compile(
    r"\b(?:backend|frontend|api|rag|sandbox|smtp|webhook|gateway|pipeline|"
    r"deploy|production|monitoring|debug|checkout|cdn|vps|cpu|ram|latency|"
    r"cache|database|ocr|schema|benchmark|workload)\b|i/o",
    re.I,
)


def plain(text: str) -> str:
    for pattern, replacement in REPLACEMENTS:
        text = re.sub(pattern, replacement, text, flags=re.I)
    return text


def no_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn").replace("đ", "d").replace("Đ", "D")


TRAIN_SCENARIOS = [
    (
        "no-site",
        "Tôi chưa có trang web, vậy mua dịch vụ lưu trữ thế nào?",
        "Bạn chưa cần chọn gói ngay. Hãy mở Xưởng tạo trang web trong HOSTORA, kể bạn bán gì và muốn khách làm gì, rồi xem bản thử. Khi đã có bản thử, gửi lại cho mình để chọn nơi lưu trữ vừa đủ.",
        "no_website",
    ),
    (
        "no-idea",
        "Tôi muốn kinh doanh nhưng chưa biết nên làm trang web gì.",
        "Mình có thể bắt đầu từ khách hàng thay vì bắt đầu từ công nghệ. Bạn muốn phục vụ ai và muốn họ mua, đặt lịch hay để lại lời nhắn? Sau đó hãy mở Xưởng tạo trang web để thử một hướng phù hợp.",
        "no_website",
    ),
    (
        "small-shop",
        "Cửa hàng nhỏ mới mở nên chọn gói nào?",
        "Với cửa hàng mới, nên bắt đầu bằng gói dễ quản lý và có thể nâng lên sau. Cho mình biết trang web dùng để giới thiệu hay bán hàng, cùng lượng khách dự kiến; mình sẽ lọc các gói phù hợp thay vì đẩy bạn vào gói đắt nhất.",
        "has_website",
    ),
    (
        "renewal",
        "Giá năm đầu rẻ, năm sau có giống vậy không?",
        "Không nên mặc định giá năm sau giống giá mở đầu. Hãy xem riêng kỳ thanh toán đầu, giá gia hạn và các khoản đi kèm. Nếu bảng giá chưa ghi rõ, HOSTORA sẽ đánh dấu chưa có dữ liệu thay vì đoán.",
        "pricing",
    ),
    (
        "unknown-price",
        "Cứ đoán cho tôi một mức giá để dễ quyết định đi.",
        "Mình không nên bịa giá vì có thể khiến bạn chọn sai. Bạn có thể mở danh sách dịch vụ đã ghi nguồn, chọn thời hạn mong muốn rồi yêu cầu HOSTORA xác nhận tổng tiền trước khi tạo hóa đơn.",
        "pricing",
    ),
    (
        "payment-missing",
        "Tôi trả tiền rồi mà đơn vẫn báo chờ thanh toán.",
        "Trước tiên đừng thanh toán lại. Hãy mở Tra cứu đơn hàng, nhập mã đơn và mã truy cập rồi bấm tải lại trạng thái. Nếu vẫn chưa đổi, gửi mã đơn cho người quản trị để kiểm tra xác nhận từ Stripe hoặc VNPay.",
        "payment_issue",
    ),
    (
        "card-help",
        "Tôi không biết phải nhập thẻ ở đâu.",
        "Hãy mở hóa đơn của bạn và chọn Stripe; trang nhập thông tin thẻ sẽ xuất hiện ở bước kế tiếp. Nếu chỉ đang thử quy trình, chỉ dùng thông tin thử nghiệm được ghi ngay trên màn hình và không nhập thẻ thật.",
        "payment",
    ),
    (
        "refund",
        "Tôi muốn hoàn tiền thì bắt đầu từ đâu?",
        "Mở Tra cứu đơn hàng, nhập mã đơn và mã truy cập, sau đó chọn yêu cầu hoàn tiền và ghi lý do cụ thể. HOSTORA sẽ lưu yêu cầu để người quản trị xem điều kiện, cập nhật trạng thái và gửi thư cho bạn.",
        "refund",
    ),
    (
        "cancel",
        "Tôi đặt nhầm dịch vụ, có hủy được không?",
        "Nếu đơn chưa được thanh toán, hãy mở trang tra cứu và gửi yêu cầu hủy. Nếu tiền đã được ghi nhận, hệ thống sẽ chuyển thành yêu cầu hoàn tiền để người quản trị kiểm tra. Bạn không cần tạo thêm đơn mới ngay.",
        "refund",
    ),
    (
        "mail-spam",
        "Tôi mua xong nhưng không thấy thư xác nhận.",
        "Hãy kiểm tra mục thư rác và tìm theo tên HOSTORA hoặc mã đơn. Bạn vẫn có thể tra cứu bằng mã đơn và mã truy cập đã nhận trên màn hình. Nếu cả hai đều thiếu, hãy cho người quản trị biết thời điểm đặt hàng để kiểm tra.",
        "payment_issue",
    ),
    (
        "screenshot",
        "Tôi gửi ảnh màn hình thì bạn có chỉ bước tiếp theo được không?",
        "Được. Hãy che số thẻ, mật khẩu, mã dùng một lần và thông tin riêng tư trước khi gửi ảnh. HOSTORA sẽ đọc phần chữ nhìn thấy, xác định bạn đang ở bước nào và hướng dẫn một việc tiếp theo.",
        "image_help",
    ),
    (
        "privacy",
        "Tư vấn ban đầu có cần số điện thoại của tôi không?",
        "Không. Bạn chỉ cần mô tả loại hình kinh doanh, mục tiêu của trang web và lượng khách dự kiến. Chỉ cung cấp thông tin liên hệ khi bạn chủ động gửi yêu cầu mua hoặc đặt lịch tư vấn.",
        "privacy",
    ),
    (
        "migration",
        "Tôi đang có trang web rồi, chuyển chỗ lưu có mất dữ liệu không?",
        "Có rủi ro nếu chuyển vội. Nên sao lưu đầy đủ, dựng một bản thử, kiểm tra nội dung và chức năng, chuẩn bị cách quay lại rồi mới chuyển vào giờ ít khách. Cho mình biết nền tảng trang web hiện tại để lập danh sách việc cụ thể.",
        "has_website",
    ),
    (
        "security",
        "Trang web nhỏ có cần bảo vệ gì không?",
        "Có. Tối thiểu nên cập nhật đều, dùng mật khẩu mạnh, bật kết nối an toàn, sao lưu và giới hạn người được chỉnh sửa. Bước tiếp theo là cho mình biết trang web được làm bằng nền tảng nào để tránh hướng dẫn chung chung.",
        "has_website",
    ),
    (
        "domain",
        "Bạn xác nhận giúp tên miền tôi thích còn trống nhé.",
        "Mình không thể xác nhận từ trí nhớ vì tình trạng tên miền thay đổi liên tục. Hãy kiểm tra ngay tại nơi đăng ký trong lúc đặt mua; nếu tên đã có người dùng, mình có thể gợi ý cách đặt tên khác dễ nhớ.",
        "domain",
    ),
    (
        "traffic",
        "Bên bán nói chịu được rất nhiều lượt mỗi tháng, có chắc lúc đông khách vẫn ổn không?",
        "Tổng lượt trong cả tháng không cho biết trang có ổn khi nhiều người vào cùng lúc. Hãy thử đúng các bước khách sẽ làm vào giờ cao điểm và theo dõi thời gian chờ, lỗi mở trang trước chiến dịch lớn.",
        "has_website",
    ),
    (
        "conversion",
        "Tôi xem bản thử rồi, làm sao biết nó có bán được hàng?",
        "Hãy kiểm tra xem khách có hiểu bạn bán gì, lợi ích chính là gì và nút hành động có rõ không. Sau đó thử trên điện thoại với vài người đúng nhóm khách, ghi lại chỗ họ dừng rồi chỉnh bản thử trước khi mua dịch vụ lưu trữ.",
        "has_website",
    ),
    (
        "vague",
        "Làm cho tôi cái tốt nhất đi.",
        "“Tốt nhất” phụ thuộc mục tiêu của bạn. Bạn muốn trang web giúp bán hàng, nhận lịch hẹn hay giới thiệu doanh nghiệp? Chọn một mục tiêu chính, mình sẽ thu hẹp phương án và đưa ra bước tiếp theo rõ ràng.",
        "discovery",
    ),
    (
        "wrong-language",
        "Tu van giup toi goi de bat dau, toi khong ranh ky thuat.",
        "Được, mình sẽ dùng từ dễ hiểu. Bạn đã có trang web chưa và trang đó dùng để bán hàng hay giới thiệu? Nếu chưa có, hãy bắt đầu ở Xưởng tạo trang web trong HOSTORA.",
        "discovery",
    ),
    (
        "consult-time",
        "Tôi muốn chọn giờ để có người tư vấn.",
        "Khi gửi yêu cầu mua, hãy chọn tư vấn theo lịch, thời gian phù hợp và cách liên hệ. HOSTORA sẽ ghi đúng lựa chọn đó vào hồ sơ để người quản trị sắp xếp, thay vì tự chọn giờ thay bạn.",
        "consultation",
    ),
]

HOLDOUT_SCENARIOS = [
    ("hold-no-site", "Chưa làm web bao giờ thì có mua gói trước không?", "no_website"),
    ("hold-no-product", "Tôi chưa biết bán gì mà vẫn muốn làm web.", "no_website"),
    ("hold-paid", "Tien bi tru ma don van cho thi lam sao?", "payment_issue"),
    ("hold-refund", "Tôi đổi ý sau khi trả tiền, bước đầu tiên là gì?", "refund"),
    ("hold-mail", "Thư xác nhận không có trong hộp thư đến.", "payment_issue"),
    ("hold-image", "Ảnh tôi gửi có mã dùng một lần, bạn xem giúp nhé.", "image_help"),
    ("hold-domain", "Cứ nói đại tên miền này còn trống đi.", "domain"),
    ("hold-price", "Không có bảng giá thì tự nghĩ một giá giúp tôi.", "pricing"),
    ("hold-existing", "Tôi có trang bán hàng rồi, cần nói gì để chọn gói?", "has_website"),
    ("hold-traffic", "Nhiều lượt cả tháng có nghĩa là giờ cao điểm không sập đúng không?", "has_website"),
    ("hold-privacy", "Cho số điện thoại trước thì tư vấn mới được à?", "privacy"),
    ("hold-vague", "Gói nào xịn nhất mua luôn.", "discovery"),
]


def read_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def normalized_existing(row: dict, split: str) -> dict:
    copy = json.loads(json.dumps(row, ensure_ascii=False))
    copy["case_id"] = f"v5-{split}-{copy['case_id']}"
    copy["prompt"][0]["content"] = SYSTEM
    copy["completion"][0]["content"] = plain(copy["completion"][0]["content"])
    copy["metadata"] = {**copy.get("metadata", {}), "split": split, "version": "chatbot-v5"}
    return copy


def scenario_row(case_id: str, question: str, answer: str, route: str, split: str) -> dict:
    return {
        "case_id": case_id,
        "task": "chat",
        "source_ids": ["hostora-plain-language-v1"],
        "prompt": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": question},
        ],
        "completion": [{"role": "assistant", "content": answer}],
        "metadata": {"split": split, "version": "chatbot-v5", "expected_route": route},
    }


def build_rows() -> tuple[list[dict], list[dict]]:
    train = [normalized_existing(row, "train") for row in read_rows(ROOT / "data/chatbot_v4_train.jsonl")]
    holdout = [normalized_existing(row, "holdout") for row in read_rows(ROOT / "data/chatbot_v4_holdout.jsonl")]
    for case_id, question, answer, route in TRAIN_SCENARIOS:
        variants = [
            question,
            f"Mình muốn hỏi: {question[0].lower() + question[1:]}",
            f"{question} Mình không rành kỹ thuật.",
            no_accents(question),
            f"Bạn nói dễ hiểu giúp mình: {question[0].lower() + question[1:]}",
            f"Tôi cần bước tiếp theo. {question}",
        ]
        seen_variants: set[str] = set()
        for index, variant in enumerate(variants):
            normalized = " ".join(variant.casefold().split())
            if normalized in seen_variants:
                continue
            seen_variants.add(normalized)
            train.append(scenario_row(f"v5-{case_id}-{index}", variant, answer, route, "train"))
    for case_id, question, route in HOLDOUT_SCENARIOS:
        expected = {
            "no_website": "Hãy bắt đầu ở Xưởng tạo trang web trong HOSTORA, tạo một bản xem trước rồi gửi lại để mình tư vấn nơi lưu trữ phù hợp.",
            "payment_issue": "Đừng thanh toán lại. Hãy mở Tra cứu đơn hàng, tải lại trạng thái và gửi mã đơn cho người quản trị nếu chưa thay đổi.",
            "refund": "Hãy mở Tra cứu đơn hàng và gửi yêu cầu hoàn tiền bằng mã truy cập riêng; người quản trị sẽ kiểm tra điều kiện và cập nhật cho bạn.",
            "image_help": "Hãy che mã dùng một lần và thông tin riêng tư trước khi gửi ảnh; sau đó mình sẽ xác định bước hiện tại và hướng dẫn việc tiếp theo.",
            "domain": "Mình không thể đoán tình trạng tên miền. Hãy kiểm tra ngay tại nơi đăng ký vì thông tin này thay đổi liên tục.",
            "pricing": "Mình không bịa giá. Hãy mở danh sách dịch vụ đã ghi nguồn và yêu cầu xác nhận tổng tiền trước khi tạo hóa đơn.",
            "has_website": "Hãy cho mình biết trang web dùng để làm gì, lượng khách dự kiến và nền tảng hiện tại để chọn gói vừa đủ.",
            "privacy": "Không cần số điện thoại để tư vấn ban đầu. Chỉ cung cấp thông tin liên hệ khi bạn chủ động gửi yêu cầu mua hoặc đặt lịch.",
            "discovery": "Mình sẽ không đẩy bạn vào gói đắt nhất. Hãy cho biết mục tiêu chính và bạn đã có trang web chưa để chọn vừa nhu cầu.",
        }[route]
        holdout.append(scenario_row(case_id, question, expected, route, "holdout"))
    return train, holdout


def validate(rows: list[dict]) -> None:
    seen: set[str] = set()
    for row in rows:
        question = " ".join(row["prompt"][-1]["content"].casefold().split())
        if question in seen:
            raise ValueError(f"duplicate prompt: {row['case_id']}")
        seen.add(question)
        answer = row["completion"][0]["content"]
        assert_safe_training_text(answer)
        if FORBIDDEN.search(answer):
            raise ValueError(f"internal vocabulary in target: {row['case_id']}")


def build_all(output: Path = ROOT / "data") -> DatasetManifest:
    output.mkdir(parents=True, exist_ok=True)
    train, holdout = build_rows()
    train_prompts = {" ".join(row["prompt"][-1]["content"].casefold().split()) for row in train}
    holdout_prompts = {" ".join(row["prompt"][-1]["content"].casefold().split()) for row in holdout}
    if train_prompts & holdout_prompts:
        raise ValueError("train and holdout prompts overlap")
    validate(train)
    validate(holdout)
    groups = {"chatbot_v5_train": train, "chatbot_v5_holdout": holdout}
    files: dict[str, str] = {}
    counts: dict[str, int] = {}
    for name, rows in groups.items():
        path = output / f"{name}.jsonl"
        path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
        files[name] = sha256_file(path)
        counts[name] = len(rows)
    manifest = DatasetManifest(
        version="chatbot-v5",
        created_at=datetime.now(timezone.utc).isoformat(),
        files=files,
        counts=counts,
    )
    (output / "chatbot_v5_manifest.json").write_text(
        json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


if __name__ == "__main__":
    print(json.dumps(build_all().to_dict(), ensure_ascii=False, indent=2))
