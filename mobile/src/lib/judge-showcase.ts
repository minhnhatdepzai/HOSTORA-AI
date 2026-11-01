export type JudgeFeature = {
  id: string;
  title: string;
  proof: string;
  route: string;
  icon: "compass" | "award" | "grid" | "message-circle" | "bar-chart-2";
};

export type JudgeCase = {
  id: string;
  kind: "normal" | "invalid" | "edge";
  title: string;
  demo: string;
  expected: string;
};

export const judgeFeatures: JudgeFeature[] = [
  {
    id: "consult",
    title: "Hiểu nhu cầu trong 4 bước",
    proof: "Chọn loại website, lưu lượng, ngân sách và nhu cầu tên miền.",
    route: "/(tabs)/consult",
    icon: "compass",
  },
  {
    id: "recommend",
    title: "So sánh 3 gói có giải thích",
    proof: "Tách giá ưu đãi, trả trước, gia hạn và dữ liệu chưa xác minh.",
    route: "/recommendations",
    icon: "award",
  },
  {
    id: "catalog",
    title: "Danh mục và yêu cầu mua",
    proof: "Lọc 29 dịch vụ, xem nguồn và gửi hồ sơ qua HOSTORA.",
    route: "/(tabs)/products",
    icon: "grid",
  },
  {
    id: "assistant",
    title: "Hỏi đáp AI có nguồn",
    proof: "Trả lời bằng tiếng Việt dễ hiểu và không bịa dữ liệu thương mại.",
    route: "/(tabs)/assistant",
    icon: "message-circle",
  },
  {
    id: "cost",
    title: "Chi phí và khả năng ra mắt",
    proof: "Ước tính tất định, AI chỉ giải thích và không ghi đè con số.",
    route: "/(tabs)/tools",
    icon: "bar-chart-2",
  },
];

export const judgeCases: JudgeCase[] = [
  {
    id: "TC01",
    kind: "normal",
    title: "Mở app và vào luồng chính",
    demo: "Khởi chạy APK trên Redmi, từ Trang chủ chọn Tư vấn chọn gói.",
    expected: "Trang chủ hiển thị đầy đủ và mở đúng Bước 1/4.",
  },
  {
    id: "TC02",
    kind: "normal",
    title: "Hoàn thành tư vấn 4 bước",
    demo: "Đi hết loại website, lưu lượng, ngân sách và tên miền.",
    expected: "Kết quả trả về đúng ba gói có thứ tự và giải thích.",
  },
  {
    id: "TC03",
    kind: "normal",
    title: "Tải danh mục dịch vụ thật",
    demo: "Kết nối USB rồi mở Dịch vụ và lọc danh mục.",
    expected: "Catalog trực tuyến tải đủ và giữ nguồn xác minh.",
  },
  {
    id: "TC04",
    kind: "invalid",
    title: "Lượt truy cập bằng 0",
    demo: "Nhập 0 lượt truy cập tại Bước 2.",
    expected: "Nút Tiếp tục bị khóa và không làm sai dữ liệu tư vấn.",
  },
  {
    id: "TC05",
    kind: "invalid",
    title: "Ngân sách dưới mức tối thiểu",
    demo: "Nhập ngân sách nhỏ hơn 10.000đ tại Bước 3.",
    expected: "Không cho chuyển bước và giữ hướng dẫn phạm vi hợp lệ.",
  },
  {
    id: "TC06",
    kind: "invalid",
    title: "Thông tin liên hệ sai",
    demo: "Nhập tên rỗng hoặc số điện thoại chứa ký tự.",
    expected: "Không lưu yêu cầu và không gửi dữ liệu không hợp lệ.",
  },
  {
    id: "TC07",
    kind: "edge",
    title: "Dịch vụ chưa công bố giá",
    demo: "Mở sản phẩm có trường giá null trong catalog.",
    expected: "Hiển thị Chưa có giá công bố, tuyệt đối không biến thành 0đ.",
  },
  {
    id: "TC08",
    kind: "edge",
    title: "Backend tạm mất kết nối",
    demo: "Ngắt chuyển tiếp USB rồi tải lại danh mục.",
    expected: "Ghi rõ đang dùng bản lưu và đưa đường thiết lập kết nối.",
  },
  {
    id: "TC09",
    kind: "edge",
    title: "Cài đè và khôi phục trạng thái",
    demo: "Cài APK mới bằng adb install -r rồi mở lại app.",
    expected: "Giữ cấu hình USB và dữ liệu local, không xuất hiện crash.",
  },
];

export const judgeTimeline = [
  { second: 0, title: "Mở hồ sơ", copy: "Nêu bài toán và 5 tính năng." },
  { second: 15, title: "Chọn nhu cầu", copy: "Đi nhanh wizard 4 bước." },
  { second: 38, title: "So sánh", copy: "Giá, gia hạn và giới hạn." },
  { second: 65, title: "AI + danh mục", copy: "Nguồn thật, không bịa giá." },
  { second: 98, title: "Bằng chứng", copy: "9 ca, APK và dữ liệu local." },
] as const;
