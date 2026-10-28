export type JournalArticle = {
  slug: string;
  stage: string;
  title: string;
  summary: string;
  minutes: number;
  updatedAt: string;
  sections: { heading: string; paragraphs: string[]; checklist?: string[] }[];
  action: { label: string; href: string };
};

export const journalArticles: JournalArticle[] = [
  {
    slug: "tu-y-tuong-den-website-dau-tien",
    stage: "01 · Ý tưởng",
    title: "Chưa có website? Bắt đầu từ điều khách cần biết",
    summary:
      "Viết một trang đầu tiên đủ rõ để khách hiểu bạn bán gì, dành cho ai và liên hệ thế nào.",
    minutes: 5,
    updatedAt: "2026-10-27",
    sections: [
      {
        heading: "Đừng bắt đầu bằng hiệu ứng",
        paragraphs: [
          "Trước khi chọn màu hay giao diện, hãy viết một câu trả lời: khách đến đây để làm gì? Một cửa hàng cần món bán, giá hoặc cách hỏi giá và cách đặt hàng. Một dịch vụ cần kết quả mang lại, phạm vi công việc và cách liên hệ.",
          "Nếu chưa rõ, bạn có thể nói chuyện với trợ lý HOSTORA để chốt đối tượng khách, mục tiêu và nội dung chính. Trợ lý chỉ gợi ý; bạn quyết định điều gì đúng với doanh nghiệp mình.",
        ],
        checklist: [
          "Một câu giới thiệu có tên sản phẩm hoặc dịch vụ",
          "Ba điều khách cần biết trước khi liên hệ",
          "Một hành động chính: gọi, nhắn tin hoặc gửi yêu cầu",
        ],
      },
      {
        heading: "Xem thử trước khi mua",
        paragraphs: [
          "Xưởng tạo trang web cho bạn chọn phong cách, màu sắc và nội dung rồi xem bản thử. Hãy mở bản xem trước trên cả điện thoại lẫn máy tính, thử các nút và đọc lại từng lời hứa trên trang.",
          "Khi đã ưng ý, bạn có thể tải mã nguồn từ HOSTORA. Bản thử chưa đồng nghĩa với một website đã có tên miền và chạy công khai trên internet.",
        ],
      },
      {
        heading: "Bước tiếp theo",
        paragraphs: [
          "Sau bản thử, bạn cần nơi lưu trữ để trang chạy và tên miền để khách dễ tìm. Hãy xem tổng tiền theo kỳ, giá gia hạn và các khoản chưa bao gồm trước khi đặt mua.",
        ],
      },
    ],
    action: { label: "Tạo bản xem trước", href: "/website-studio" },
  },
  {
    slug: "chon-hosting-va-cloud-theo-nhu-cau",
    stage: "02 · Lựa chọn",
    title: "Hosting hay máy chủ đám mây: chọn theo việc cần làm",
    summary: "Một cách đọc bảng giá thực tế trước khi chọn nơi chạy website.",
    minutes: 6,
    updatedAt: "2026-10-27",
    sections: [
      {
        heading: "Chọn mức quản lý bạn muốn",
        paragraphs: [
          "Hosting chia sẻ thường phù hợp với website giới thiệu, blog hoặc cửa hàng nhỏ khi bạn muốn ít phải quản trị máy chủ. Máy chủ đám mây linh hoạt hơn khi ứng dụng cần cấu hình riêng, nhưng bạn phải tính thêm công vận hành, sao lưu và bảo mật.",
          "Đừng chọn gói chỉ vì CPU hay dung lượng lớn. Hãy hỏi người vận hành website sẽ cài, cập nhật và xử lý lỗi như thế nào.",
        ],
      },
      {
        heading: "Đọc đủ bốn khoản",
        paragraphs: [
          "So sánh giá theo cùng chu kỳ thanh toán: giá ban đầu, giá gia hạn, thuế và dịch vụ đi kèm. Giá “từ” có thể chỉ áp dụng cho kỳ dài hoặc chương trình ưu đãi.",
          "Nếu một thông số hoặc giá gia hạn chưa được xác minh, HOSTORA hiển thị “Chưa có dữ liệu”. Hãy yêu cầu xác nhận trong báo giá trước khi thanh toán.",
        ],
        checklist: [
          "Tổng tiền phải trả hôm nay",
          "Thời hạn và giá gia hạn",
          "Sao lưu, hỗ trợ và trách nhiệm vận hành",
          "Khả năng nâng cấp khi lượng truy cập tăng",
        ],
      },
      {
        heading: "Đặt mua tại HOSTORA",
        paragraphs: [
          "Bạn có thể xem dịch vụ đối tác trong danh mục, gửi yêu cầu mua và nhận hóa đơn tại HOSTORA. Giá trên danh mục là tham khảo; số tiền thanh toán được xác nhận riêng trên hóa đơn.",
        ],
      },
    ],
    action: { label: "So sánh dịch vụ", href: "/services" },
  },
  {
    slug: "dua-website-len-mang",
    stage: "03 · Ra mắt",
    title: "Checklist trước ngày mở website cho khách xem",
    summary:
      "Kiểm tra nội dung, nút bấm và cách liên hệ trước khi chia sẻ đường dẫn.",
    minutes: 4,
    updatedAt: "2026-10-27",
    sections: [
      {
        heading: "Đọc như một khách mới",
        paragraphs: [
          "Mở website trên điện thoại. Trong vài giây đầu, bạn có hiểu doanh nghiệp bán gì và bước tiếp theo là gì không? Hãy thử mọi nút chính, biểu mẫu, số điện thoại và đường dẫn tải tài liệu.",
          "Nội dung về giá, chính sách đổi trả, giao hàng hoặc bảo hành phải phản ánh đúng hoạt động của bạn; bản mẫu không thay bạn xác nhận các thông tin này.",
        ],
      },
      {
        heading: "Kiểm tra phần kỹ thuật cơ bản",
        paragraphs: [
          "Xác nhận tên miền trỏ đúng website, kết nối HTTPS hoạt động, trang mở được trên mạng di động và có phương án sao lưu. Nếu chuyển từ bản thử sang hosting thật, cần kiểm tra lại sau khi triển khai.",
        ],
        checklist: [
          "Trang chủ và trang liên hệ mở được trên điện thoại",
          "Tất cả nút và biểu mẫu có kết quả rõ ràng",
          "Thông tin doanh nghiệp và chính sách là thông tin thật",
          "Có bản sao lưu và người nhận yêu cầu hỗ trợ",
        ],
      },
      {
        heading: "Theo dõi sau khi mở",
        paragraphs: [
          "Hãy ghi lại câu hỏi khách hỏi nhiều nhất trong tuần đầu. Những câu hỏi đó là đầu vào tốt hơn mọi khẩu hiệu cho lần chỉnh website tiếp theo.",
        ],
      },
    ],
    action: { label: "Kiểm tra website", href: "/website-analyzer" },
  },
  {
    slug: "them-ai-vao-website-mot-cach-huu-ich",
    stage: "04 · Phát triển",
    title: "Thêm AI khi bạn đã biết khách thường hỏi gì",
    summary:
      "Bắt đầu từ câu hỏi thật, câu trả lời có nguồn và một đường chuyển sang người tư vấn.",
    minutes: 5,
    updatedAt: "2026-10-27",
    sections: [
      {
        heading: "Chọn một việc cụ thể cho trợ lý",
        paragraphs: [
          "Một trợ lý hữu ích có thể giải thích dịch vụ, hỏi nhu cầu và gợi ý bước tiếp theo. Hãy bắt đầu bằng mười câu hỏi khách gửi thật, câu trả lời đúng và nơi kiểm tra thông tin đó.",
          "Giá, khuyến mại và tình trạng dịch vụ cần lấy từ dữ liệu hiện hành; không nên để mô hình tự đoán.",
        ],
      },
      {
        heading: "Giữ một lối ra cho người thật",
        paragraphs: [
          "Khi khách hỏi ngoài dữ liệu, muốn báo giá riêng hoặc cần xử lý đơn, trợ lý nên nói rõ giới hạn và chuyển khách đến nơi tạo yêu cầu. Theo dõi câu hỏi chưa trả lời được để bổ sung kiến thức, thay vì để AI trả lời cho có.",
        ],
        checklist: [
          "Câu trả lời quan trọng có nguồn để kiểm tra",
          "Có bước chuyển sang tư vấn hoặc tạo yêu cầu",
          "Không đưa thông tin riêng của khách vào tài liệu huấn luyện",
        ],
      },
      {
        heading: "Thử trước khi đưa cho khách",
        paragraphs: [
          "Hãy thử những tình huống như “tôi chưa có web”, “tôi chỉ có ngân sách nhỏ” và “tôi muốn hoàn tiền”. Kiểm tra xem trợ lý đưa đúng đường dẫn và không hứa thay chính sách thanh toán.",
        ],
      },
    ],
    action: { label: "Hỏi trợ lý HOSTORA", href: "/ai-assistant" },
  },
];

export function getJournalArticle(slug: string) {
  return journalArticles.find((article) => article.slug === slug);
}
