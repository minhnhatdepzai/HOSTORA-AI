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
    short: "Nơi lưu mã nguồn, hình ảnh và dữ liệu để website hoạt động.",
    detail:
      "Hãy hình dung hosting như căn nhà của website. Chất lượng hosting ảnh hưởng tốc độ, độ ổn định, backup và khả năng phục vụ nhiều khách cùng lúc.",
  },
  {
    icon: "at-sign" as const,
    title: "Domain là gì?",
    short: "Địa chỉ dễ nhớ giúp khách truy cập website của bạn.",
    detail:
      "Tên miền giống địa chỉ cửa hàng. Nó trỏ khách tới hosting nhưng không thay thế hosting. .com phù hợp quốc tế; .vn nhấn mạnh thị trường Việt Nam.",
  },
  {
    icon: "shield" as const,
    title: "SSL có tác dụng gì?",
    short: "Mã hóa kết nối và hiển thị HTTPS cho khách truy cập.",
    detail:
      "SSL bảo vệ dữ liệu trên đường truyền và là yêu cầu cơ bản cho đăng nhập, checkout. SSL không tự bảo vệ website khỏi mọi cuộc tấn công.",
  },
  {
    icon: "globe" as const,
    title: "CDN giúp gì?",
    short: "Đưa tài nguyên tĩnh đến điểm gần người truy cập hơn.",
    detail:
      "CDN có thể giảm độ trễ và tải lên máy chủ gốc, đặc biệt khi khách ở nhiều vùng. CDN không thay thế tối ưu code hay database.",
  },
  {
    icon: "archive" as const,
    title: "Backup là gì?",
    short: "Bản sao giúp khôi phục website sau lỗi hoặc mất dữ liệu.",
    detail:
      "Cần biết tần suất, thời gian lưu và quy trình restore. Backup hàng ngày có ích cho shop phát sinh đơn thường xuyên hơn backup hàng tuần.",
  },
  {
    icon: "trending-up" as const,
    title: "Khi nào cần nâng cấp?",
    short: "Khi số liệu thật cho thấy CPU, RAM, database hoặc I/O chạm ngưỡng.",
    detail:
      "Đừng nâng cấp chỉ theo cảm giác. Theo dõi Core Web Vitals, error rate, thời gian phản hồi và tài nguyên trong các khung giờ cao điểm.",
  },
];

export default function KnowledgeScreen() {
  const [open, setOpen] = useState(0);
  const [level, setLevel] = useState<"Dễ hiểu" | "Thực hành" | "Kỹ thuật">(
    "Dễ hiểu",
  );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top"]}
    >
      <DetailHeader
        title="Trung tâm kiến thức"
        action={<Pill tone="blue">RAG</Pill>}
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>AI knowledge center</Eyebrow>
          <Title style={{ marginTop: 8 }}>
            Hiểu hạ tầng theo cách của bạn.
          </Title>
          <Body style={{ marginTop: 10 }}>
            Kiến thức có nguồn, ba mức độ giải thích và không dùng thuật ngữ để
            làm khó người mới.
          </Body>
        </View>
        <View style={styles.content}>
          <View style={styles.levels}>
            {(["Dễ hiểu", "Thực hành", "Kỹ thuật"] as const).map((item) => (
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
              đến chi tiết vận hành.
            </Text>
            <View style={styles.source}>
              <Feather name="database" color={colors.mint} size={14} />
              <Text style={styles.sourceText}>
                6 tài liệu local · có URL và ngày xác minh
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
                          : level === "Thực hành"
                            ? `${topic.detail} Hãy ghi lại số liệu trước và sau mỗi thay đổi để biết biện pháp nào thực sự hiệu quả.`
                            : `${topic.detail} Ở mức kỹ thuật, cần quan sát latency p95, error rate, cache hit ratio và tài nguyên theo thời gian.`}
                      </Text>
                      <View style={styles.aiExplain}>
                        <Feather name="zap" color={colors.primary} size={13} />
                        <Text style={styles.aiExplainText}>
                          Grounded từ kho kiến thức local
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
