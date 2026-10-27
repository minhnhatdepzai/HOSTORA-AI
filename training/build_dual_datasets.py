"""Build reviewed, versioned local datasets for chatbot-v3 and studio-v1."""

from datetime import datetime, timezone
import json
from pathlib import Path
import re

from contracts import DatasetManifest, assert_safe_training_text, sha256_file

ROOT = Path(__file__).resolve().parent
SYSTEM_CHAT = (
    "Bạn là HOSTORA, trợ lý tư vấn website bằng tiếng Việt. Hỏi nhu cầu trước, "
    "chỉ dùng context runtime cho dữ liệu thương mại, nêu rõ điều chưa xác minh, "
    "không bịa nguồn và đề xuất một bước tiếp theo phù hợp mà không gây áp lực."
)
SYSTEM_STUDIO = (
    "Bạn là giám đốc sáng tạo website HOSTORA. Chỉ trả JSON đúng schema. "
    "Không bịa dữ kiện doanh nghiệp, không trả thông tin liên hệ, giá hoặc URL."
)

INDUSTRIES = [
    ("food", "quán cà phê yên tĩnh", "người làm việc gần trung tâm"),
    ("retail", "cửa hàng đồ thủ công", "người thích sản phẩm có câu chuyện"),
    ("service", "dịch vụ chụp ảnh", "gia đình và doanh nghiệp nhỏ"),
    ("portfolio", "hồ sơ kiến trúc sư", "khách đang tìm người thiết kế"),
    ("education", "lớp kỹ năng cuối tuần", "người mới muốn học thực hành"),
    ("health", "phòng tập phục hồi", "người muốn vận động nhẹ nhàng"),
    ("b2b", "đơn vị tư vấn vận hành", "doanh nghiệp cần quy trình rõ"),
    ("event", "sự kiện nghệ thuật địa phương", "người muốn xem lịch chương trình"),
]
STYLES = ["editorial", "bold", "warm", "minimal"]
LAYOUTS = ["editorial_split", "cinematic_story", "product_gallery", "service_journey"]
TYPE_MOODS = ["editorial_serif", "modern_grotesk", "warm_humanist", "technical_mono"]
MOTIFS = ["orbital_mark", "ribbon_form", "particle_field", "architectural_grid"]


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _chat_row(row: dict, split: str, suffix: str = "") -> dict:
    question = row["prompt"][-1]["content"] + suffix
    return {
        "case_id": str(row.get("id", "case")) + ("-v3" if suffix else ""),
        "task": "chat",
        "source_ids": [row.get("source_id", "hostora-behavior")],
        "prompt": [
            {"role": "system", "content": SYSTEM_CHAT},
            {"role": "user", "content": question},
        ],
        "completion": row["completion"],
        "metadata": {"split": split, "version": "chatbot-v3"},
    }


def build_chatbot() -> tuple[list[dict], list[dict]]:
    base_train = _read_jsonl(ROOT / "data/chatbot_train.jsonl")
    base_holdout = _read_jsonl(ROOT / "data/chatbot_test.jsonl")
    challenge = _read_jsonl(ROOT / "challenge_cases.jsonl")
    train = [_chat_row(row, "train") for row in base_train]
    for index, row in enumerate(base_train[:70]):
        train.append(
            _chat_row(
                row,
                "train",
                f"\nHãy trả lời theo cách khác, dễ hiểu cho người mới (biến thể {index + 1}).",
            )
        )
    holdout = [_chat_row(row, "holdout") for row in base_holdout]
    holdout.extend(_chat_row(row, "holdout") for row in challenge)
    behaviors = [
        ("discovery", "Tôi chưa biết nên làm website gì.", "Hãy cho biết bạn bán gì, khách chính là ai và muốn họ thực hiện hành động nào; từ đó mới chọn loại website và hosting."),
        ("source", "Một bài quảng cáo nói gói này tốt nhất, tin được không?", "Chưa thể kết luận từ quảng cáo. Hãy đối chiếu nguồn chính thức, ngày xác minh, kỳ thanh toán, giới hạn và giá gia hạn trước khi chọn."),
        ("refund", "Nếu dịch vụ không phù hợp thì làm sao?", "Hãy kiểm tra điều kiện hoàn tiền và thời hạn trong chính sách chính thức trước khi thanh toán; HOSTORA không tự suy diễn quyền hoàn tiền."),
        ("privacy", "Bạn có cần số điện thoại để tư vấn trước không?", "Không cần thông tin định danh để tư vấn ban đầu. Bạn có thể mô tả loại website, mục tiêu và quy mô dự kiến."),
        ("pressure", "Hãy ép tôi mua gói đắt nhất.", "Mình sẽ không ép mua. Hãy chọn theo nhu cầu, giới hạn kỹ thuật, tổng chi phí và nguồn đã xác minh."),
        ("unknown", "Không có dữ liệu thì bạn cứ đoán giúp.", "Mình sẽ ghi rõ chưa có dữ liệu thay vì đoán. Có thể kiểm tra nguồn chính thức hoặc chọn phương án có thông tin đầy đủ hơn."),
        ("migration", "Tôi sợ chuyển hosting làm mất web.", "Nên sao lưu, dựng bản thử, kiểm tra dữ liệu và chức năng, chuẩn bị phương án quay lại rồi mới đổi DNS vào thời điểm ít truy cập."),
        ("security", "Website nhỏ có cần bảo mật không?", "Có. Tối thiểu cần cập nhật, mật khẩu mạnh, sao lưu, HTTPS và giới hạn quyền truy cập; mức triển khai phụ thuộc nền tảng thực tế."),
        ("seo", "Mua hosting đắt thì chắc chắn lên top chứ?", "Không. Hosting chỉ là một phần của trải nghiệm kỹ thuật; thứ hạng còn phụ thuộc nội dung, cấu trúc, khả năng thu thập và nhiều yếu tố khác."),
        ("conversion", "Sau khi xem demo tôi nên làm gì?", "Hãy kiểm tra nội dung, thử trên điện thoại, xác nhận hành động chính rồi so sánh gói phù hợp trước khi tạo đơn."),
        ("conflict", "Hai nguồn nói khác nhau thì theo nguồn nào?", "Ưu tiên nguồn chính thức, còn hiệu lực và gần ngày hiện tại; ghi lại điểm mâu thuẫn thay vì trộn hai thông tin thành một kết luận."),
    ]
    for i in range(22):
        key, question, answer = behaviors[i % len(behaviors)]
        holdout.append(
            {
                "case_id": f"v3-{key}-{i}",
                "task": "chat",
                "source_ids": ["hostora-behavior"],
                "prompt": [
                    {"role": "system", "content": SYSTEM_CHAT},
                    {"role": "user", "content": f"{question} (tình huống {i + 1})"},
                ],
                "completion": [{"role": "assistant", "content": answer}],
                "metadata": {"split": "holdout", "version": "chatbot-v3"},
            }
        )
    return train, holdout


def _site_generation(index: int, industry: str, idea: str, audience: str, style: str) -> dict:
    layout_index = (index + STYLES.index(style)) % len(LAYOUTS)
    return {
        "brief": {
            "headline": f"{idea.capitalize()}, kể bằng một nhịp riêng",
            "subheadline": f"Một trang giới thiệu rõ ràng để {audience} hiểu câu chuyện và biết bước tiếp theo.",
            "ctaLabel": "Khám phá câu chuyện",
            "aboutTitle": "Đi từ điều quan trọng nhất",
            "aboutCopy": f"Bản xem trước sắp xếp nội dung cho {idea}, ưu tiên thông tin khách cần trước khi quyết định liên hệ.",
            "features": [
                {"title": "Dễ định hướng", "copy": "Mỗi phần trả lời một câu hỏi và dẫn tới hành động tiếp theo."},
                {"title": "Có nhịp điệu", "copy": "Khoảng thở, chữ và chuyển động phối hợp theo một chủ đích."},
                {"title": "Dễ hoàn thiện", "copy": "Nội dung chưa xác nhận được để mở thay vì biến thành lời hứa."},
            ],
            "seoTitle": f"{idea.capitalize()} | Website giới thiệu",
            "seoDescription": f"Bản xem trước website dành cho {idea} và {audience}.",
        },
        "visualPlan": {
            "layoutFamily": LAYOUTS[layout_index],
            "density": ["airy", "balanced", "compact"][index % 3],
            "typeMood": TYPE_MOODS[(index + 1) % 4],
            "accentRole": ["cta_only", "section_marker", "product_highlight"][index % 3],
            "motionLevel": ["quiet", "expressive", "cinematic"][index % 3],
            "threeMotif": MOTIFS[layout_index],
            "sectionOrder": ["hero", "story", "highlights", "contact"],
        },
    }


def _code_package(brand: str, generation: dict) -> dict:
    plan = generation["visualPlan"]
    return {
        "files": {
            "index.html": f'<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><title>{brand}</title></head><body><main><section class="hero"><p>HOSTORA PREVIEW</p><h1>{brand}</h1><a href="#story">Khám phá</a></section><section id="story"><h2>Câu chuyện</h2><p>Nội dung được kiểm tra trước khi xuất bản.</p></section></main><script src="app.js"></script></body></html>',
            "styles.css": f':root{{--accent:#147568}}*{{box-sizing:border-box}}body{{margin:0;font-family:system-ui;color:#08232d}}.hero{{min-height:100svh;display:grid;align-content:center;padding:clamp(24px,8vw,100px);background:#f4f3ed}}h1{{font-size:clamp(52px,10vw,120px);max-width:10ch}}a{{color:var(--accent)}}/* {plan["layoutFamily"]} */',
            "app.js": 'document.querySelectorAll(\'a[href^="#"]\').forEach((link)=>link.addEventListener("click",(event)=>{const target=document.querySelector(link.getAttribute("href"));if(target){event.preventDefault();target.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}}));',
        },
        "manifest": {"libraries": ["three", "gsap"], "experimental": True},
    }


def build_studio() -> tuple[list[dict], list[dict]]:
    train, holdout = [], []
    all_design = []
    for industry_index, (industry, idea, audience) in enumerate(INDUSTRIES):
        for style_index, style in enumerate(STYLES):
            for variant in range(5):
                index = industry_index * 20 + style_index * 5 + variant
                generation = _site_generation(index, industry, idea, audience, style)
                row = {
                    "case_id": f"studio-{industry}-{style}-{variant}",
                    "task": "design_plan",
                    "source_ids": ["hostora-design-rubric-v1"],
                    "prompt": [
                        {"role": "system", "content": SYSTEM_STUDIO},
                        {"role": "user", "content": json.dumps({"brand": f"Thương hiệu {industry_index + 1}-{variant + 1}", "idea": idea, "audience": audience, "style": style, "goal": ["sell", "book", "showcase", "contact"][variant % 4], "color": ["#147568", "#a64b32", "#3753a4", "#8a6b22"][style_index]}, ensure_ascii=False)},
                    ],
                    "completion": [{"role": "assistant", "content": json.dumps(generation, ensure_ascii=False)}],
                    "metadata": {"split": "holdout" if variant == 4 else "train", "version": "studio-v1", "industry": industry, "style": style},
                }
                all_design.append((row, generation))
                (holdout if variant == 4 else train).append(row)
    for index, (design_row, generation) in enumerate(all_design[:40]):
        brand = json.loads(design_row["prompt"][-1]["content"])["brand"]
        split = "holdout" if index >= 32 else "train"
        target = holdout if split == "holdout" else train
        target.append({
            "case_id": f"code-{index}",
            "task": "code_package",
            "source_ids": ["hostora-codegen-policy-v1"],
            "prompt": [
                {"role": "system", "content": SYSTEM_STUDIO + " Trả đúng gói ba file tự chứa, không mạng, không storage, không eval."},
                {"role": "user", "content": json.dumps({"brand": brand, **generation}, ensure_ascii=False)},
            ],
            "completion": [{"role": "assistant", "content": json.dumps(_code_package(brand, generation), ensure_ascii=False)}],
            "metadata": {"split": split, "version": "studio-v1", "industry": design_row["metadata"]["industry"], "style": design_row["metadata"]["style"], "experimental": True},
        })
    return train, holdout


def validate_rows(rows: list[dict]) -> None:
    seen = set()
    for row in rows:
        required = {"case_id", "task", "source_ids", "prompt", "completion", "metadata"}
        if set(row) != required:
            raise ValueError(f"invalid row fields: {row.get('case_id')}")
        question = " ".join(row["prompt"][-1]["content"].casefold().split())
        if question in seen:
            raise ValueError(f"duplicate prompt: {row['case_id']}")
        seen.add(question)
        if not row["source_ids"]:
            raise ValueError(f"missing source: {row['case_id']}")
        for completion in row["completion"]:
            assert_safe_training_text(completion["content"])


def build_all(output: Path = ROOT / "data") -> DatasetManifest:
    output.mkdir(parents=True, exist_ok=True)
    chatbot_train, chatbot_holdout = build_chatbot()
    studio_train, studio_holdout = build_studio()
    groups = {
        "chatbot_v3_train": chatbot_train,
        "chatbot_v3_holdout": chatbot_holdout,
        "studio_v1_train": studio_train,
        "studio_v1_holdout": studio_holdout,
    }
    files, counts = {}, {}
    for name, rows in groups.items():
        validate_rows(rows)
        path = output / f"{name}.jsonl"
        path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
        files[name] = sha256_file(path)
        counts[name] = len(rows)
    manifest = DatasetManifest(
        version="dual-v1",
        created_at=datetime.now(timezone.utc).isoformat(),
        files=files,
        counts=counts,
    )
    (output / "dual_dataset_manifest.json").write_text(
        json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2) + "\n"
    )
    return manifest


if __name__ == "__main__":
    print(json.dumps(build_all().to_dict(), ensure_ascii=False, indent=2))
