"""Grounded copy examples for the exact JSON shape used by HOSTORA Studio."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

from contracts import DatasetManifest, assert_safe_training_text, sha256_file


ROOT = Path(__file__).resolve().parent
SYSTEM = (
    "Bạn là biên tập viên website cho doanh nghiệp Việt Nam. Chỉ trả JSON với "
    "headline, subheadline, ctaLabel, aboutTitle, aboutCopy, features gồm ba "
    "mục, offerTitle, offerCopy, audienceTitle, audienceCopy, closingLine, "
    "seoTitle và seoDescription. Viết tiếng Việt tự nhiên, mỗi phần một ý mới. "
    "Mọi dữ kiện phải có trong mô tả của khách. Không bịa giá, đánh giá, thành "
    "tích, chính sách, khả năng giao hàng hay liên hệ. Không viết HTML hoặc mã."
)
CTA = {"sell": "Xem sản phẩm", "book": "Xem lịch hẹn", "showcase": "Xem dự án", "contact": "Gửi nhu cầu"}

# Author-written synthetic briefs. All feature facts also appear in the input;
# they are examples of content organization, not real business claims.
TRAIN_CASES = [
    ("Mộc Quán", "Quán cà phê yên tĩnh cho người làm việc gần khu văn phòng.", "người làm việc gần khu văn phòng", "food", "book", "Một khoảng nghỉ giữa ngày bận rộn", "Chọn một góc cho hôm nay", [
        ("Xem trước menu", "Menu có cà phê pha máy và đồ uống không cà phê để khách chọn trước khi ghé."),
        ("Chọn chỗ ngồi", "Khách có thể xem ảnh không gian yên tĩnh trước khi chọn thời điểm đến."),
        ("Hẹn thời gian", "Trang có phần gửi yêu cầu đặt bàn để quán xác nhận lại với khách."),
    ]),
    ("Gốm Nâu", "Xưởng giới thiệu bình, ly và đĩa gốm làm thủ công cho không gian sống.", "người thích đồ gốm trong nhà", "retail", "contact", "Một món gốm, một góc nhà", "Bình, ly và đĩa gốm", [
        ("Xem từng dáng gốm", "Bộ sưu tập được chia thành bình, ly và đĩa để khách tìm món mình quan tâm."),
        ("Nhìn gần bề mặt", "Mỗi món có ảnh chi tiết để khách xem màu men và hình dáng trước khi hỏi thêm."),
        ("Hỏi về tác phẩm", "Khách có thể gửi lời nhắn về món gốm mình thích để xưởng trao đổi tiếp."),
    ]),
    ("Bếp Mùa", "Tiệm bánh nhận đặt bánh cho những buổi gặp gỡ và dịp riêng.", "người chuẩn bị buổi gặp gỡ", "food", "contact", "Bánh cho một dịp đáng nhớ", "Chọn bánh theo dịp", [
        ("Xem bánh", "Khách xem các loại bánh đang được tiệm giới thiệu trước khi gửi yêu cầu."),
        ("Kể về dịp", "Biểu mẫu giúp khách nêu dịp dùng bánh và điều họ muốn tiệm biết."),
        ("Trao đổi lại", "Tiệm xác nhận yêu cầu sau khi khách gửi thông tin về chiếc bánh mong muốn."),
    ]),
    ("Lá Studio", "Studio chụp chân dung cá nhân và ảnh thương hiệu nhỏ.", "cá nhân và thương hiệu nhỏ cần ảnh chân dung", "portfolio", "book", "Một chân dung có tiếng nói riêng", "Chân dung cá nhân và thương hiệu", [
        ("Xem bộ ảnh", "Khách có thể xem các bộ chân dung đã được chủ studio chọn để giới thiệu."),
        ("Chọn mục đích", "Trang phân biệt ảnh cá nhân và ảnh dành cho thương hiệu nhỏ."),
        ("Hẹn trao đổi", "Khách gửi thời gian mong muốn để studio xác nhận lịch chụp phù hợp."),
    ]),
    ("Sân Nhẹ", "Không gian tập yoga có lớp cho người mới và lịch học theo buổi.", "người mới tập yoga", "service", "book", "Bắt đầu bằng một nhịp thở", "Lớp yoga cho người mới", [
        ("Tìm lớp phù hợp", "Khách xem mô tả lớp dành cho người mới trước khi đăng ký."),
        ("Xem lịch học", "Lịch theo buổi giúp khách cân nhắc thời gian trước khi gửi yêu cầu."),
        ("Chuẩn bị buổi đầu", "Trang có phần hướng dẫn những điều cần biết trước buổi tập đầu tiên."),
    ]),
    ("Bàn Mộc", "Xưởng nội thất làm bàn và kệ gỗ theo yêu cầu về kích thước.", "người đang sắp xếp lại nhà", "retail", "contact", "Đồ gỗ vừa với nơi bạn sống", "Bàn và kệ theo kích thước", [
        ("Xem mẫu đã làm", "Khách xem các mẫu bàn và kệ để hình dung tỷ lệ trong căn phòng."),
        ("Nêu kích thước", "Khách có thể gửi kích thước mong muốn trước khi xưởng trao đổi."),
        ("Chọn hướng thiết kế", "Trang cho khách xem các hướng kiểu dáng đã được xưởng giới thiệu."),
    ]),
    ("Học Bằng Làm", "Lớp kỹ năng làm nội dung cho người bắt đầu kinh doanh trực tuyến.", "người mới bán hàng trực tuyến", "education", "book", "Học để làm được việc đầu tiên", "Lớp làm nội dung thực hành", [
        ("Xem nội dung học", "Khách xem các chủ đề về viết bài và chụp sản phẩm trước khi chọn lớp."),
        ("Biết cách học", "Mỗi buổi có phần thực hành để người học tự làm một nội dung của mình."),
        ("Chọn buổi học", "Lịch lớp giúp người học chọn thời gian phù hợp để gửi yêu cầu tham gia."),
    ]),
    ("Dải Vải", "Thương hiệu quần áo độc lập giới thiệu áo và váy theo bộ sưu tập.", "người muốn xem quần áo theo phong cách riêng", "retail", "sell", "Mặc điều hợp với mình", "Áo và váy trong từng bộ sưu tập", [
        ("Xem theo bộ", "Áo và váy được sắp theo bộ sưu tập để khách nhìn được cách phối."),
        ("Xem chi tiết", "Ảnh và mô tả từng món giúp khách xem kiểu dáng trước khi lựa chọn."),
        ("Chọn món", "Khách đi từ bộ sưu tập đến món đồ mình muốn tìm hiểu thêm."),
    ]),
    ("Nhịp Phố", "Nhóm tổ chức buổi biểu diễn âm nhạc địa phương có lịch chương trình và danh sách nghệ sĩ.", "người muốn xem nhạc tại địa phương", "service", "showcase", "Một tối dành cho âm nhạc gần nhà", "Chương trình và nghệ sĩ", [
        ("Xem lịch", "Lịch chương trình cho biết buổi diễn nào đang được giới thiệu."),
        ("Gặp nghệ sĩ", "Danh sách nghệ sĩ giúp khán giả khám phá người sẽ xuất hiện trong chương trình."),
        ("Chọn buổi diễn", "Khán giả có thể xem từng buổi trước khi tìm cách tham gia."),
    ]),
    ("Nét Nhà", "Văn phòng kiến trúc giới thiệu dự án nhà ở và cách bắt đầu buổi trao đổi thiết kế.", "chủ nhà đang chuẩn bị xây hoặc sửa nhà", "portfolio", "contact", "Không gian bắt đầu từ cách sống", "Dự án nhà ở đã giới thiệu", [
        ("Xem dự án", "Mỗi dự án có ảnh và mô tả bối cảnh để người xem hiểu hướng thiết kế."),
        ("Hiểu câu hỏi đầu tiên", "Trang gợi ý những nhu cầu chủ nhà nên chuẩn bị trước khi trao đổi."),
        ("Gửi bối cảnh", "Chủ nhà có thể nêu loại công trình và điều họ đang băn khoăn."),
    ]),
    ("Sửa Xe Gần Nhà", "Cửa hàng sửa xe đạp nhận kiểm tra phanh, lốp và bảo dưỡng cơ bản.", "người đi xe đạp hằng ngày", "service", "book", "Giữ chiếc xe sẵn sàng cho mỗi ngày", "Kiểm tra và bảo dưỡng xe đạp", [
        ("Chọn vấn đề", "Khách xem các mục kiểm tra phanh, lốp và bảo dưỡng trước khi mang xe đến."),
        ("Mô tả xe", "Biểu mẫu cho phép khách nói tình trạng xe để cửa hàng chuẩn bị trao đổi."),
        ("Hẹn thời gian", "Khách chọn thời gian mong muốn và chờ cửa hàng xác nhận lại."),
    ]),
    ("Hoa Hôm Nay", "Tiệm hoa giới thiệu bó hoa theo dịp và nhận yêu cầu chọn màu.", "người chuẩn bị gửi hoa cho người thân", "retail", "contact", "Một bó hoa nói điều bạn muốn gửi", "Hoa theo dịp và sắc màu", [
        ("Xem theo dịp", "Khách xem các bó hoa được gợi ý theo dịp trước khi chọn."),
        ("Chọn màu", "Khách có thể nêu màu mình thích khi gửi yêu cầu về bó hoa."),
        ("Gửi lời nhắn", "Yêu cầu có chỗ để khách viết điều muốn tiệm biết về người nhận."),
    ]),
    ("Bản Địa", "Nhóm hướng dẫn chuyến đi bộ tìm hiểu các khu phố cũ.", "người thích khám phá thành phố bằng cách đi bộ", "service", "book", "Đi chậm để thấy một thành phố khác", "Các tuyến đi bộ trong phố", [
        ("Xem tuyến", "Khách xem mô tả từng tuyến để chọn khu phố mình muốn tìm hiểu."),
        ("Tìm nhịp đi", "Trang cho biết nội dung chuyến đi trước khi khách chọn buổi."),
        ("Gửi lịch mong muốn", "Khách chọn thời gian rồi chờ nhóm hướng dẫn xác nhận."),
    ]),
    ("Tủ Sách Mở", "Hiệu sách nhỏ giới thiệu sách theo chủ đề và tổ chức buổi đọc chung.", "người thích đọc và trò chuyện về sách", "retail", "showcase", "Một cuốn sách mở thêm cuộc trò chuyện", "Sách theo chủ đề", [
        ("Xem chủ đề", "Sách được nhóm theo chủ đề để người đọc dễ tìm hướng mình quan tâm."),
        ("Chọn cuốn tiếp theo", "Mỗi cuốn có phần mô tả để người đọc cân nhắc trước khi hỏi thêm."),
        ("Xem buổi đọc", "Lịch đọc chung giúp người muốn tham gia tìm đúng buổi phù hợp."),
    ]),
    ("May Vừa", "Xưởng may nhận chỉnh sửa quần áo và trao đổi về phom dáng.", "người muốn sửa quần áo đang có", "service", "contact", "Một đường may cho cảm giác vừa vặn", "Chỉnh sửa quần áo theo nhu cầu", [
        ("Nêu món đồ", "Khách nói loại quần áo muốn sửa trước khi đến xưởng."),
        ("Mô tả điều chưa vừa", "Khách có thể mô tả chỗ cần chỉnh để xưởng hiểu câu hỏi ban đầu."),
        ("Hẹn trao đổi", "Xưởng xác nhận cách làm sau khi xem món đồ và trao đổi với khách."),
    ]),
    ("Góc Xanh", "Cửa hàng cây trong nhà giới thiệu các loại cây theo góc đặt và nhu cầu chăm sóc.", "người muốn thêm cây vào nhà", "retail", "sell", "Một góc xanh bắt đầu từ lựa chọn nhỏ", "Cây cho từng góc nhà", [
        ("Xem theo vị trí", "Khách xem cây theo góc dự định đặt trước khi chọn loại phù hợp."),
        ("Đọc cách chăm", "Mỗi cây có phần mô tả nhu cầu chăm sóc để khách cân nhắc."),
        ("Chọn cây", "Khách đi từ không gian của mình đến cây muốn tìm hiểu thêm."),
    ]),
]

HOLDOUT_CASES = [
    ("Chăm Bạn Bốn Chân", "Tiệm chăm sóc thú cưng nhận tắm và chải lông theo lịch.", "người nuôi thú cưng cần đặt lịch", "service", "book", "Một buổi chăm sóc nhẹ nhàng", "Tắm và chải lông theo lịch", [
        ("Xem dịch vụ", "Khách xem mục tắm và chải lông trước khi chọn."), ("Nói về thú cưng", "Khách nêu thông tin cần thiết để tiệm chuẩn bị trao đổi."), ("Chọn giờ", "Khách gửi thời gian mong muốn và chờ xác nhận."),
    ]),
    ("Học Vẽ Từ Đầu", "Lớp vẽ cho người mới có buổi học theo chủ đề và xem tác phẩm của học viên.", "người mới muốn thử vẽ", "education", "book", "Bắt đầu bằng nét vẽ đầu tiên", "Buổi vẽ theo chủ đề", [
        ("Xem chủ đề", "Người học xem chủ đề từng buổi trước khi chọn."), ("Xem bài đã làm", "Trang giới thiệu tác phẩm học viên được phép chia sẻ."), ("Chọn buổi", "Người học gửi thời gian mong muốn."),
    ]),
    ("Bếp Nhà", "Dịch vụ nấu bữa ăn gia đình nhận thực đơn theo yêu cầu trước buổi gặp.", "gia đình muốn bàn thực đơn", "food", "contact", "Bữa ăn bắt đầu từ câu chuyện nhà", "Thực đơn theo yêu cầu", [
        ("Nêu dịp ăn", "Khách cho biết bữa ăn dành cho dịp nào."), ("Trao đổi món", "Khách ghi các món muốn bàn thêm."), ("Hẹn trao đổi", "Người phụ trách xác nhận yêu cầu sau khi nhận."),
    ]),
    ("Không Gian Làm Việc", "Không gian làm việc chung có bàn theo ngày và phòng họp cần đặt trước.", "người làm việc tự do và nhóm nhỏ", "service", "book", "Một chỗ để ý tưởng đi tiếp", "Bàn làm việc và phòng họp", [
        ("Xem chỗ ngồi", "Khách xem khu bàn làm việc theo ngày."), ("Xem phòng họp", "Nhóm nhỏ xem phòng họp trước khi chọn."), ("Hỏi lịch trống", "Khách gửi thời gian mong muốn để được xác nhận."),
    ]),
    ("Sổ Tay Da", "Xưởng giới thiệu sổ bìa da và nhận yêu cầu khắc tên theo chữ khách gửi.", "người tìm quà tặng cá nhân", "retail", "contact", "Một cuốn sổ mang dấu riêng", "Sổ bìa da và chữ khắc", [
        ("Xem mẫu", "Khách xem các mẫu sổ bìa da."), ("Nêu chữ khắc", "Khách gửi nội dung muốn khắc để xưởng kiểm tra."), ("Hỏi thêm", "Khách gửi câu hỏi trước khi quyết định."),
    ]),
    ("Tư Vấn Cửa Hàng", "Nhóm tư vấn giúp cửa hàng nhỏ sắp xếp danh mục sản phẩm và cách trưng bày.", "chủ cửa hàng nhỏ", "service", "contact", "Một cửa hàng dễ chọn hơn", "Danh mục và cách trưng bày", [
        ("Kể tình trạng", "Chủ cửa hàng nêu cách đang sắp xếp sản phẩm."), ("Xem cách tiếp cận", "Trang giới thiệu việc xem danh mục và khu trưng bày."), ("Gửi nhu cầu", "Người phụ trách trao đổi sau khi nhận mô tả."),
    ]),
]


def build_brief(case: tuple) -> dict:
    brand, idea, audience, _business, goal, headline, offer_title, features = case
    return {
        "headline": headline,
        "subheadline": f"{brand} dành cho {audience}. {idea}",
        "ctaLabel": CTA[goal],
        "aboutTitle": f"Câu chuyện của {brand}",
        "aboutCopy": f"{idea} Trang này giúp {audience} bắt đầu từ điều họ đang tìm, rồi chọn bước tiếp theo phù hợp.",
        "features": [{"title": title, "copy": copy} for title, copy in features],
        "offerTitle": offer_title,
        "offerCopy": f"{features[0][1]} {features[1][1]}",
        "audienceTitle": f"Dành cho {audience}",
        "audienceCopy": f"{features[2][1]} {brand} để bạn xem nội dung trước khi quyết định bước tiếp theo.",
        "closingLine": f"Bắt đầu từ điều bạn muốn tìm ở {brand}.",
        "seoTitle": f"{brand} | {offer_title}",
        "seoDescription": f"{brand}: {idea} Dành cho {audience}.",
    }


def validate_brief(brief: dict) -> None:
    limits = {"headline": (6, 90), "subheadline": (20, 220), "ctaLabel": (2, 28), "aboutTitle": (4, 70), "aboutCopy": (30, 320), "offerTitle": (4, 80), "offerCopy": (30, 320), "audienceTitle": (4, 80), "audienceCopy": (30, 320), "closingLine": (12, 160), "seoTitle": (6, 60), "seoDescription": (20, 160)}
    for key, (low, high) in limits.items():
        if not low <= len(brief[key]) <= high:
            raise ValueError(f"{key} length {len(brief[key])} for {brief['seoTitle']}")
    if len(brief["features"]) != 3:
        raise ValueError("expected three features")
    for item in brief["features"]:
        if not 2 <= len(item["title"]) <= 45 or not 12 <= len(item["copy"]) <= 130:
            raise ValueError("invalid feature length")
    assert_safe_training_text(json.dumps(brief, ensure_ascii=False))


def row(case: tuple, split: str, style: str, variant: int) -> dict:
    brand, idea, audience, business, goal, _headline, _offer, features = case
    facts = " ".join(copy for _title, copy in features)
    suffixes = ["", " Hãy viết như đang kể chuyện với khách.", " Mỗi phần cần một ý khác nhau.", " Ưu tiên nội dung cụ thể, không dùng lời quảng cáo chung.", " Viết cho màn hình điện thoại trước.", " Giữ lời kêu gọi hành động rõ ràng."]
    user = {
        "brand": brand,
        "idea": f"{idea} {facts}" + suffixes[variant],
        "audience": audience,
        "business": business,
        "goal": goal,
        "style": style,
    }
    brief = build_brief(case)
    validate_brief(brief)
    return {
        "case_id": f"studio-v3-{split}-{brand.lower().replace(' ', '-')}-{style}-{variant}",
        "task": "studio_copy",
        "source_ids": ["hostora-authored-synthetic-copy-v3"],
        "prompt": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": json.dumps(user, ensure_ascii=False)}],
        "completion": [{"role": "assistant", "content": json.dumps(brief, ensure_ascii=False)}],
        "metadata": {"split": split, "version": "studio-v3", "business": business, "style": style, "goal": goal},
    }


def build_all(output: Path = ROOT / "data") -> DatasetManifest:
    output.mkdir(parents=True, exist_ok=True)
    styles = ["editorial", "bold", "warm", "minimal"]
    train = [row(case, "train", style, variant) for case in TRAIN_CASES for style in styles for variant in range(6)]
    holdout = [row(case, "holdout", style, 0) for case in HOLDOUT_CASES for style in styles]
    if {r["case_id"] for r in train} & {r["case_id"] for r in holdout}:
        raise ValueError("train and holdout case IDs overlap")
    train_brands = {r["metadata"]["business"] + json.loads(r["prompt"][-1]["content"])["brand"] for r in train}
    holdout_brands = {r["metadata"]["business"] + json.loads(r["prompt"][-1]["content"])["brand"] for r in holdout}
    if train_brands & holdout_brands:
        raise ValueError("train and holdout brands overlap")
    groups = {"studio_v3_train": train, "studio_v3_holdout": holdout}
    files, counts = {}, {}
    for name, rows in groups.items():
        path = output / f"{name}.jsonl"
        path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
        files[name], counts[name] = sha256_file(path), len(rows)
    manifest = DatasetManifest("studio-v3", datetime.now(timezone.utc).isoformat(), files, counts)
    (output / "studio_v3_manifest.json").write_text(json.dumps(manifest.to_dict(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    print(json.dumps(build_all().to_dict(), ensure_ascii=False, indent=2))
