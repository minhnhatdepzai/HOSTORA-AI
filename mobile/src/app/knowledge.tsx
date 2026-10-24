import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailHeader } from "@/components/detail-header";
import {
  Body,
  Card,
  Eyebrow,
  IconBox,
  Pill,
  Screen,
  Title,
} from "@/components/ui";
import { colors, radii } from "@/constants/theme";

const topics = [
  {
    icon: "server" as const,
    title: "Hosting là gì?",
    short: "Nơi lưu nội dung để website luôn sẵn sàng cho khách truy cập.",
    detail:
      "Hãy hình dung hosting như căn nhà của website. Một gói phù hợp giúp trang hoạt động ổn định, tải nhanh và có chỗ để lưu nội dung.",
  },
  {
    icon: "at-sign" as const,
    title: "Tên miền là gì?",
    short: "Địa chỉ dễ nhớ giúp khách truy cập website của bạn.",
    detail:
      "Tên miền giống địa chỉ cửa hàng. Khách gõ địa chỉ này để tìm đến website. Đuôi .com phù hợp nhiều thị trường; .vn nhấn mạnh khách hàng Việt Nam.",
  },
  {
    icon: "shield" as const,
    title: "Kết nối an toàn có tác dụng gì?",
    short: "Giúp bảo vệ thông tin khi khách truy cập website.",
    detail:
      "Biểu tượng ổ khóa trên trình duyệt cho biết kết nối đang được bảo vệ. Đây là yêu cầu cơ bản cho đăng nhập và thanh toán, nhưng vẫn cần cập nhật và bảo vệ website thường xuyên.",
  },
  {
    icon: "globe" as const,
    title: "Tăng tốc cho khách ở xa",
    short: "Giúp hình ảnh và nội dung đến khách nhanh hơn ở nhiều khu vực.",
    detail:
      "Dịch vụ tăng tốc có thể phân phối hình ảnh và nội dung từ nơi gần khách hơn. Website vẫn cần ảnh gọn và nội dung được sắp xếp hợp lý để tải nhanh.",
  },
  {
    icon: "archive" as const,
    title: "Sao lưu là gì?",
    short: "Bản sao giúp khôi phục website sau lỗi hoặc mất dữ liệu.",
    detail:
      "Hãy kiểm tra website được sao lưu bao lâu một lần, giữ bản sao trong bao lâu và ai có thể khôi phục. Shop có đơn hàng mỗi ngày thường cần sao lưu thường xuyên hơn.",
  },
  {
    icon: "trending-up" as const,
    title: "Khi nào cần nâng cấp?",
    short: "Khi website chậm, thường xuyên lỗi hoặc lượng khách tăng rõ rệt.",
    detail:
      "Đừng nâng cấp chỉ theo cảm giác. Hãy ghi lại thời gian tải, số lần lỗi và lượng khách vào giờ cao điểm rồi mới quyết định.",
  },
];

export default function KnowledgeScreen() {
  const [open, setOpen] = useState(0);
  const [level, setLevel] = useState<"Dễ hiểu" | "Cách dùng" | "Kinh doanh">(
    "Dễ hiểu",
  );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top"]}
    >
      <DetailHeader
        title="Trung tâm kiến thức"
        action={<Pill tone="blue">DỄ HIỂU</Pill>}
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>Kiến thức cho chủ website</Eyebrow>
          <Title style={{ marginTop: 8 }}>
            Hiểu hạ tầng theo cách của bạn.
          </Title>
          <Body style={{ marginTop: 10 }}>
            Những khái niệm cần biết được giải thích bằng ví dụ gần gũi và việc
            bạn nên làm tiếp theo.
          </Body>
        </View>
        <View style={styles.content}>
          <View style={styles.levels}>
            {(["Dễ hiểu", "Cách dùng", "Kinh doanh"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => setLevel(item)}
                style={[styles.level, level === item && styles.levelActive]}
              >
                <Text
                  style={[
                    styles.levelText,
                    level === item && { color: "white" },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <Card dark style={styles.featured}>
            <View style={styles.featuredTop}>
              <IconBox name="book-open" tone="dark" />
              <Pill tone="dark">{level.toUpperCase()}</Pill>
            </View>
            <Text style={styles.featuredTitle}>
              Hosting không cần khó hiểu.
            </Text>
            <Text style={styles.featuredCopy}>
              Chọn một chủ đề bên dưới. HOSTORA giải thích từ ví dụ đời thường
              đến cách áp dụng cho website của bạn.
            </Text>
            <View style={styles.source}>
              <Feather name="database" color={colors.mint} size={14} />
              <Text style={styles.sourceText}>
                6 tài liệu đã đối chiếu · có nguồn và ngày kiểm tra
              </Text>
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Chủ đề nền tảng</Text>
          <View style={{ gap: 9 }}>
            {topics.map((topic, index) => {
              const expanded = open === index;
              return (
                <Pressable
                  key={topic.title}
                  onPress={() => setOpen(expanded ? -1 : index)}
                  style={[styles.topic, expanded && styles.topicOpen]}
                >
                  <View style={styles.topicTop}>
                    <IconBox name={topic.icon} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <Text style={styles.topicShort}>{topic.short}</Text>
                    </View>
                    <Feather
                      name={expanded ? "chevron-up" : "chevron-down"}
                      color={colors.faint}
                      size={18}
                    />
                  </View>
                  {expanded ? (
                    <View style={styles.answer}>
                      <Text style={styles.answerText}>
                        {level === "Dễ hiểu"
                          ? topic.detail
                          : level === "Cách dùng"
                            ? `${topic.detail} Hãy ghi lại số liệu trước và sau mỗi thay đổi để biết biện pháp nào thực sự hiệu quả.`
                            : `${topic.detail} Hãy ưu tiên tác động tới khách hàng, doanh thu và chi phí lâu dài trước khi mua gói cao hơn.`}
                      </Text>
                      <View style={styles.aiExplain}>
                        <Feather name="zap" color={colors.primary} size={13} />
                        <Text style={styles.aiExplainText}>
                          Đã đối chiếu với tài liệu tham khảo
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 16 },
  levels: {
    flexDirection: "row",
    gap: 5,
    padding: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 15,
  },
  level: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 11,
  },
  levelActive: { backgroundColor: colors.primary },
  levelText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  featured: { gap: 13 },
  featuredTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 23,
    letterSpacing: -0.7,
  },
  featuredCopy: {
    color: "#A8B5C5",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 19,
  },
  source: { flexDirection: "row", alignItems: "center", gap: 7 },
  sourceText: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 9,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
    marginTop: 3,
  },
  topic: {
    backgroundColor: "white",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  topicOpen: { borderColor: colors.primary },
  topicTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  topicTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 12,
  },
  topicShort: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  answer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 12,
    paddingTop: 12,
    marginLeft: 55,
  },
  answerText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 18,
  },
  aiExplain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  aiExplainText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 8,
  },
});
