"""Build the larger, project-isolated chatbot-v4 and studio-v2 datasets."""

from datetime import datetime, timezone
import json
from pathlib import Path

from build_dual_datasets import (
    LAYOUTS,
    MOTIFS,
    SYSTEM_CHAT,
    SYSTEM_STUDIO,
    TYPE_MOODS,
    build_chatbot,
    validate_rows,
)
from contracts import DatasetManifest, sha256_file


ROOT = Path(__file__).resolve().parent

INDUSTRIES = [
    ("coffee", "quán cà phê rang tại chỗ", "người thích cà phê nguyên bản", "đặt bàn", "mùi hương và nhịp chậm"),
    ("restaurant", "nhà hàng theo mùa", "nhóm bạn và gia đình", "xem thực đơn", "nguyên liệu và bàn ăn"),
    ("bakery", "xưởng bánh thủ công", "khách đặt bánh cho dịp đặc biệt", "gửi yêu cầu", "lớp bột và bàn tay"),
    ("fashion", "nhãn thời trang độc lập", "người mua có gu riêng", "xem bộ sưu tập", "chất liệu và chuyển động"),
    ("furniture", "xưởng nội thất gỗ", "chủ nhà và kiến trúc sư", "xem dự án", "thớ gỗ và kết cấu"),
    ("beauty", "studio chăm sóc cá nhân", "khách muốn trải nghiệm riêng tư", "đặt lịch", "ánh sáng mềm và chi tiết"),
    ("fitness", "phòng tập chuyển động", "người muốn tập bền vững", "chọn lớp", "nhịp thở và năng lượng"),
    ("architecture", "văn phòng kiến trúc", "chủ đầu tư cần đối tác thiết kế", "xem hồ sơ", "khối tích và khoảng trống"),
    ("photography", "nhiếp ảnh gia chân dung", "cá nhân và thương hiệu nhỏ", "xem câu chuyện", "khung hình và ánh nhìn"),
    ("music", "nghệ sĩ biểu diễn", "người nghe và đơn vị tổ chức", "nghe tác phẩm", "nhịp điệu và sân khấu"),
    ("education", "học viện kỹ năng thực hành", "người mới cần lộ trình rõ", "xem khóa học", "tiến bộ và minh chứng"),
    ("saas", "nền tảng vận hành nhóm", "doanh nghiệp đang giảm việc thủ công", "xem quy trình", "tín hiệu và hệ thống"),
    ("consulting", "đơn vị tư vấn tăng trưởng", "chủ doanh nghiệp cần quyết định rõ", "đặt buổi trao đổi", "luận điểm và bằng chứng"),
    ("legal", "văn phòng tư vấn pháp lý", "khách cần hiểu quy trình", "gửi tình huống", "tin cậy và minh bạch"),
    ("health", "trung tâm phục hồi vận động", "người cần vận động an toàn", "tìm hiểu dịch vụ", "bình tĩnh và nâng đỡ"),
    ("nonprofit", "tổ chức cộng đồng", "người muốn tham gia đóng góp", "xem tác động", "con người và thay đổi"),
    ("event", "liên hoan nghệ thuật địa phương", "khán giả tìm lịch và nghệ sĩ", "xem chương trình", "sân khấu và dòng người"),
    ("travel", "chuyến đi trải nghiệm bản địa", "người thích khám phá có chiều sâu", "xem hành trình", "bản đồ và ký ức"),
    ("realestate", "dự án không gian sống", "người mua cần thông tin rõ", "xem mặt bằng", "ánh sáng và tỷ lệ"),
    ("craft", "thương hiệu thủ công", "người trân trọng quy trình làm", "xem sản phẩm", "vật liệu và dấu tay"),
]

DIRECTIONS = [
    ("editorial", "biên tập như tạp chí", "editorial_serif", "airy"),
    ("bold", "tương phản lớn và trực diện", "modern_grotesk", "balanced"),
    ("warm", "ấm áp, gần gũi và giàu chất liệu", "warm_humanist", "balanced"),
    ("minimal", "tĩnh, chính xác và nhiều khoảng thở", "modern_grotesk", "airy"),
    ("luxury", "sang trọng tiết chế, không phô trương", "editorial_serif", "airy"),
    ("kinetic", "chuyển động có nhịp và giàu năng lượng", "modern_grotesk", "compact"),
    ("technical", "hệ thống, module và dữ liệu rõ", "technical_mono", "compact"),
    ("playful", "bất ngờ, vui nhưng vẫn dễ dùng", "warm_humanist", "balanced"),
]

CHAT_BEHAVIORS = [
    ("discovery", "Tôi chưa biết website nên phục vụ việc gì.", "Hãy bắt đầu bằng khách chính, vấn đề cần giải quyết và hành động quan trọng nhất; sau đó mới chọn dạng website và hạ tầng.", "hostora-discovery-v2"),
    ("conversion", "Tôi muốn website kéo khách nhưng không muốn ép mua.", "Hãy làm rõ giá trị, bằng chứng và bước tiếp theo ít ma sát. Chuyển đổi bền vững đến từ lựa chọn minh bạch, không phải tạo khan hiếm giả.", "hostora-conversion-v2"),
    ("hosting", "Tôi nên chọn shared, cloud hay VPS?", "Cần biết nền tảng, người vận hành, tải đồng thời, mức quan trọng của website và khả năng phục hồi. Không thể chọn chỉ từ lượt truy cập tháng.", "hosting-decision"),
    ("migration", "Tôi muốn chuyển máy chủ mà không làm gián đoạn website.", "Hãy sao lưu và thử phục hồi, dựng bản sao, kiểm tra chức năng, hạ TTL khi phù hợp, đổi DNS có kế hoạch và giữ đường quay lại.", "domain-basics"),
    ("backup", "Có backup là chắc chắn khôi phục được chứ?", "Chưa chắc. Cần biết tần suất, thời gian lưu, vị trí bản sao và phải thử restore định kỳ; backup chưa thử không phải bằng chứng phục hồi.", "ssl-cdn-backup"),
    ("security", "Website nhỏ có thể bỏ qua bảo mật không?", "Không. Tối thiểu cần cập nhật, HTTPS, quyền truy cập tối thiểu, mật khẩu mạnh, sao lưu và theo dõi lỗi; mức triển khai tùy rủi ro thực tế.", "ssl-cdn-backup"),
    ("performance", "Nâng hosting có chắc làm website nhanh không?", "Không chắc. Phải đo server response, ảnh, JavaScript, cache, database và lỗi trước; chỉ nâng hạ tầng khi bằng chứng cho thấy tài nguyên là nút thắt.", "performance-limits"),
    ("seo", "Làm SEO có bảo đảm đứng đầu không?", "Không có bảo đảm xếp hạng. Hãy ưu tiên nội dung hữu ích, cấu trúc crawl được, tín hiệu kỹ thuật đúng và đo kết quả theo thời gian.", "seo-fundamentals"),
    ("schema", "Có schema là chắc chắn được rich result chứ?", "Không. Dữ liệu có cấu trúc phải đúng loại, khớp nội dung hiển thị và qua kiểm tra; đủ điều kiện không đồng nghĩa chắc chắn được hiển thị.", "seo-structured-data"),
    ("accessibility", "Website đẹp có cần dùng được bằng bàn phím không?", "Có. Vẻ đẹp không thay thế khả năng sử dụng; điều khiển cần tên dễ hiểu, focus rõ, thứ tự hợp lý và chuyển động phải tôn trọng người dùng.", "wcag-interaction"),
    ("motion", "Tôi muốn hiệu ứng cinematic ở mọi chỗ.", "Nên dùng chuyển động để dẫn sự chú ý và kể chuyện, không cản đọc hay thao tác. Luôn có phương án reduced motion và giới hạn hiệu ứng nặng trên thiết bị yếu.", "motion-accessibility"),
    ("responsive", "Bản desktop đẹp là đủ chưa?", "Chưa. Cần kiểm tra nội dung, điều hướng, vùng chạm, ảnh và hiệu năng ở màn hình nhỏ; responsive là ưu tiên lại bố cục chứ không chỉ thu nhỏ.", "responsive-layout"),
    ("content", "AI có thể tự bịa thành tích cho website thuyết phục hơn không?", "Không. Thành tích, khách hàng và cam kết phải có nguồn từ doanh nghiệp; khi chưa xác nhận hãy dùng chỗ trống cần bổ sung thay vì bịa.", "hostora-content-policy"),
    ("pricing", "Giá quảng cáo có phải tổng chi phí không?", "Không nhất thiết. Cần tách kỳ đầu, thời hạn trả trước, thuế, add-on và gia hạn; nếu thiếu dữ liệu phải ghi chưa xác minh.", "pricing-snapshot"),
    ("domain", "Bạn đoán giúp tên miền còn trống được không?", "Không nên đoán availability. Cần kiểm tra tại nhà đăng ký hoặc nguồn tra cứu hợp lệ ngay trước khi đặt mua.", "domain-basics"),
    ("ecommerce", "Shop cần gì ngoài giao diện đẹp?", "Cần luồng sản phẩm, tìm kiếm, giỏ hàng, checkout, trạng thái đơn, chính sách rõ, dữ liệu tồn kho đúng và đo lỗi; giao diện chỉ là một lớp.", "seo-ecommerce-checklist"),
    ("local", "Website dịch vụ địa phương nên dẫn khách thế nào?", "Nêu khu vực phục vụ, dịch vụ, bằng chứng thật và một hành động chính như đặt lịch hoặc gửi nhu cầu; tránh nhồi nhiều CTA cạnh tranh.", "hostora-conversion-v2"),
    ("portfolio", "Portfolio nên đưa mọi dự án lên không?", "Nên chọn dự án đại diện, nêu bối cảnh, vai trò, quyết định và kết quả đã xác minh. Ít case có chiều sâu thường hữu ích hơn danh sách dài thiếu câu chuyện.", "hostora-design-rubric-v2"),
    ("rag", "Có nguồn trích dẫn là câu trả lời chắc chắn đúng chưa?", "Chưa. Cần kiểm tra từng claim có được đúng đoạn nguồn hỗ trợ, nguồn còn hiệu lực và câu trả lời có giải quyết đúng câu hỏi hay không.", "rag-quality"),
    ("unknown", "Không tìm thấy dữ liệu thì cứ suy luận cho nhanh.", "Mình sẽ tách điều biết, điều suy luận và điều chưa có dữ liệu; dữ kiện thương mại hoặc trạng thái hiện tại phải được kiểm tra thay vì đoán.", "hostora-grounding-policy"),
    ("refund", "Chính sách hoàn tiền bên nào cũng giống nhau phải không?", "Không. Phải xem điều kiện, thời hạn và ngoại lệ trong chính sách chính thức của đúng sản phẩm trước khi thanh toán.", "hostora-commerce-policy"),
    ("privacy", "Tư vấn ban đầu có cần thông tin cá nhân không?", "Không cần. Có thể bắt đầu từ loại hình, mục tiêu, nền tảng và quy mô; chỉ thu dữ liệu tối thiểu khi thật sự cần cho bước tiếp theo.", "hostora-privacy-policy"),
    ("email", "Email doanh nghiệp và hosting web có phải một thứ không?", "Không. Chúng có thể bán cùng gói nhưng là các dịch vụ khác nhau; cần kiểm tra hộp thư, dung lượng, chống spam, backup và quyền quản trị riêng.", "hostora-email-guide"),
    ("operations", "Ai sẽ cập nhật và theo dõi website sau khi bàn giao?", "Cần chỉ rõ chủ sở hữu nội dung, lịch cập nhật, backup, monitoring, xử lý sự cố và quyền truy cập; website không kết thúc ở ngày ra mắt.", "hostora-operations-guide"),
]


def _chat_row(key: str, question: str, answer: str, source: str, split: str, index: int) -> dict:
    return {
        "case_id": f"v4-{split}-{key}-{index}",
        "task": "chat",
        "source_ids": [source],
        "prompt": [
            {"role": "system", "content": SYSTEM_CHAT},
            {"role": "user", "content": f"{question} [tình huống v4 {split} {index}]"},
        ],
        "completion": [{"role": "assistant", "content": answer}],
        "metadata": {"split": split, "version": "chatbot-v4", "behavior": key},
    }


def build_chatbot_v4() -> tuple[list[dict], list[dict]]:
    train, holdout = build_chatbot()
    for row in train:
        row["metadata"]["version"] = "chatbot-v4"
    for row in holdout:
        row["metadata"]["version"] = "chatbot-v4"
    for key, question, answer, source in CHAT_BEHAVIORS:
        train.extend(
            _chat_row(key, question, answer, source, "train", index)
            for index in range(10)
        )
        holdout.extend(
            _chat_row(key, question, answer, source, "holdout", index)
            for index in range(10, 13)
        )
    return train, holdout


def _generation(industry_index: int, direction_index: int, variant: int, item: tuple, direction: tuple) -> dict:
    _, idea, audience, action, motif_text = item
    direction_name, direction_text, preferred_type, preferred_density = direction
    layout_index = (industry_index + direction_index + variant) % len(LAYOUTS)
    order_options = [
        ["hero", "story", "highlights", "contact"],
        ["hero", "highlights", "story", "contact"],
        ["hero", "story", "contact", "highlights"],
        ["hero", "highlights", "contact", "story"],
    ]
    return {
        "brief": {
            "headline": f"{idea.capitalize()}, hiện ra bằng {motif_text}",
            "subheadline": f"Một trải nghiệm {direction_text} để {audience} hiểu giá trị, tìm được điều cần và chủ động {action}.",
            "ctaLabel": action.capitalize(),
            "aboutTitle": f"Câu chuyện phía sau {idea}",
            "aboutCopy": f"Trang đi từ bối cảnh đến bằng chứng, giữ nhịp {direction_name} nhưng không hy sinh khả năng đọc và thao tác.",
            "features": [
                {"title": "Điểm khác biệt", "copy": f"Dùng {motif_text} như motif xuyên suốt thay vì lặp card vô nghĩa."},
                {"title": "Bằng chứng đúng chỗ", "copy": "Đưa quy trình, dự án hoặc kết quả đã xác minh gần quyết định của khách."},
                {"title": "Một bước tiếp theo", "copy": f"Mọi nhánh nội dung hội tụ về hành động {action}, không tạo áp lực giả."},
            ],
            "seoTitle": f"{idea.capitalize()} | Trải nghiệm {direction_name}",
            "seoDescription": f"Khám phá {idea} dành cho {audience}, với nội dung rõ và hành động tiếp theo dễ hiểu.",
        },
        "visualPlan": {
            "layoutFamily": LAYOUTS[layout_index],
            "density": preferred_density if variant % 3 else ["airy", "balanced", "compact"][(industry_index + variant) % 3],
            "typeMood": preferred_type if variant % 2 else TYPE_MOODS[(industry_index + direction_index) % len(TYPE_MOODS)],
            "accentRole": ["cta_only", "section_marker", "product_highlight"][(direction_index + variant) % 3],
            "motionLevel": ["quiet", "expressive", "cinematic"][(direction_index + variant) % 3],
            "threeMotif": MOTIFS[layout_index],
            "sectionOrder": order_options[(industry_index + variant) % len(order_options)],
        },
    }


def _code_package(brand: str, generation: dict, accent: str) -> dict:
    brief = generation["brief"]
    plan = generation["visualPlan"]
    sections = {
        "hero": f'<section class="hero"><p class="eyebrow">BẢN XEM TRƯỚC</p><h1>{brief["headline"]}</h1><p>{brief["subheadline"]}</p><a href="#contact">{brief["ctaLabel"]}</a></section>',
        "story": f'<section id="story"><h2>{brief["aboutTitle"]}</h2><p>{brief["aboutCopy"]}</p></section>',
        "highlights": '<section class="highlights" aria-label="Điểm nổi bật">' + "".join(f'<article><h3>{item["title"]}</h3><p>{item["copy"]}</p></article>' for item in brief["features"]) + "</section>",
        "contact": f'<section id="contact"><h2>Sẵn sàng cho bước tiếp theo?</h2><button type="button">{brief["ctaLabel"]}</button></section>',
    }
    body = "".join(sections[name] for name in plan["sectionOrder"])
    html = f'<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="styles.css"><title>{brand}</title></head><body><main>{body}</main><script src="app.js"></script></body></html>'
    css = f':root{{--accent:{accent};--ink:#10242a;--paper:#f5f2e9}}*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui;line-height:1.55}}main{{overflow:hidden}}section{{padding:clamp(3rem,8vw,8rem) clamp(1.25rem,7vw,7rem)}}.hero{{min-height:100svh;display:grid;align-content:center;gap:1.2rem}}h1{{font-size:clamp(3rem,10vw,8rem);line-height:.92;max-width:11ch;margin:0}}a,button{{min-height:44px;width:max-content;padding:.8rem 1.2rem;background:var(--accent);color:white;border:0}}.highlights{{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:2rem}}:focus-visible{{outline:3px solid var(--accent);outline-offset:4px}}@media(prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}}}/* {plan["layoutFamily"]} {plan["threeMotif"]} */'
    js = 'const reduce=matchMedia("(prefers-reduced-motion: reduce)");document.querySelectorAll(\'a[href^="#"]\').forEach((link)=>link.addEventListener("click",(event)=>{const target=document.querySelector(link.getAttribute("href"));if(target){event.preventDefault();target.scrollIntoView({behavior:reduce.matches?"auto":"smooth"});}}));'
    return {"files": {"index.html": html, "styles.css": css, "app.js": js}, "manifest": {"libraries": [], "experimental": True}}


def build_studio_v2() -> tuple[list[dict], list[dict]]:
    train, holdout = [], []
    train_design, holdout_design = [], []
    accents = ["#147568", "#a3462f", "#3558a2", "#866822", "#7a3f68", "#176a87", "#84512f", "#4d6654"]
    for industry_index, item in enumerate(INDUSTRIES):
        industry = item[0]
        for direction_index, direction in enumerate(DIRECTIONS):
            direction_name = direction[0]
            for variant in range(6):
                split = "holdout" if variant == 5 else "train"
                generation = _generation(industry_index, direction_index, variant, item, direction)
                project_family = f"{split}-{industry}-{direction_name}-{variant}"
                brand = f"Dự án {industry_index + 1}-{direction_index + 1}-{variant + 1}"
                row = {
                    "case_id": f"studio-v2-{project_family}",
                    "task": "design_plan",
                    "source_ids": ["hostora-design-rubric-v2", "wcag-interaction", "motion-accessibility"],
                    "prompt": [
                        {"role": "system", "content": SYSTEM_STUDIO},
                        {"role": "user", "content": json.dumps({"brand": brand, "idea": item[1], "audience": item[2], "direction": direction_name, "goal": item[3], "accent": accents[direction_index], "project": project_family}, ensure_ascii=False)},
                    ],
                    "completion": [{"role": "assistant", "content": json.dumps(generation, ensure_ascii=False)}],
                    "metadata": {"split": split, "version": "studio-v2", "industry": industry, "direction": direction_name, "style": direction_name, "project_family": project_family},
                }
                (holdout_design if split == "holdout" else train_design).append((row, generation, brand, accents[direction_index]))
                (holdout if split == "holdout" else train).append(row)
    for split, source, target, limit in (
        ("train", train_design, train, 128),
        ("holdout", holdout_design, holdout, 32),
    ):
        for index, (design, generation, brand, accent) in enumerate(source[:limit]):
            project_family = f"{design['metadata']['project_family']}-code"
            target.append({
                "case_id": f"code-v2-{split}-{index}",
                "task": "code_package",
                "source_ids": ["hostora-codegen-policy-v2", "wcag-interaction"],
                "prompt": [
                    {"role": "system", "content": SYSTEM_STUDIO + " Trả đúng ba file tự chứa, không mạng, không storage, không eval."},
                    {"role": "user", "content": json.dumps({"brand": brand, "project": project_family, **generation}, ensure_ascii=False)},
                ],
                "completion": [{"role": "assistant", "content": json.dumps(_code_package(brand, generation, accent), ensure_ascii=False)}],
                "metadata": {**design["metadata"], "project_family": project_family, "experimental": True},
            })
    return train, holdout


def build_all(output: Path = ROOT / "data") -> DatasetManifest:
    output.mkdir(parents=True, exist_ok=True)
    chatbot_train, chatbot_holdout = build_chatbot_v4()
    studio_train, studio_holdout = build_studio_v2()
    groups = {
        "chatbot_v4_train": chatbot_train,
        "chatbot_v4_holdout": chatbot_holdout,
        "studio_v2_train": studio_train,
        "studio_v2_holdout": studio_holdout,
    }
    validate_rows([row for rows in groups.values() for row in rows])
    files, counts = {}, {}
    for name, rows in groups.items():
        path = output / f"{name}.jsonl"
        path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
        files[name] = sha256_file(path)
        counts[name] = len(rows)
    manifest = DatasetManifest(
        version="deep-v2",
        created_at=datetime.now(timezone.utc).isoformat(),
        files=files,
        counts=counts,
    )
    (output / "deep_dataset_manifest.json").write_text(json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    print(json.dumps(build_all().to_dict(), ensure_ascii=False, indent=2))
