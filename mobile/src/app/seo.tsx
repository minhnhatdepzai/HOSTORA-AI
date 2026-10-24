import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailHeader } from "@/components/detail-header";
import {
  Body,
  Button,
  Card,
  Eyebrow,
  Pill,
  Screen,
  Title,
} from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { postJson } from "@/lib/api";

type Finding = {
  id: string;
  group: string;
  label: string;
  status: "pass" | "warning" | "fail";
  impact: string;
  detail: string;
};
type Audit = {
  url: string;
  score: number;
  title: string | null;
  wordCount: number;
  findings: Finding[];
  ai: {
    executiveSummary: string;
    priorities: string[];
    contentIdeas: string[];
  };
  sources: { citation: string; title: string; sourceUrl: string }[];
  automationPlan: {
    id: string;
    priority: "P0" | "P1" | "P2";
    mode: "draft" | "verify";
    title: string;
    action: string;
    acceptance: string;
    evidence: string;
    draft: string | null;
  }[];
  limits: string[];
};

const impactLabel: Record<Finding["impact"], string> = {
  high: "Quan trọng",
  medium: "Nên cải thiện",
  low: "Bổ sung khi có thể",
};

export default function SeoScreen() {
  const [url, setUrl] = useState("https://example.com");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<Audit | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function runAudit() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await postJson<Audit>("/api/seo/audit", { url, keyword }));
    } catch {
      setError("Chưa thể kiểm tra website. Hãy kiểm tra địa chỉ và thử lại.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <DetailHeader
        title="Kiểm tra tìm kiếm Google"
        action={<Pill tone="blue">GỢI Ý CÓ NGUỒN</Pill>}
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>Khả năng được tìm thấy</Eyebrow>
          <Title style={{ marginTop: 8 }}>
            Tìm những điểm đang cản khách thấy website.
          </Title>
          <Body style={{ marginTop: 10 }}>
            Kiểm tra các thông tin công khai và tự sắp xếp việc cần làm theo mức
            quan trọng.
          </Body>
        </View>
        <View style={styles.content}>
          <Card style={styles.form}>
            <Field
              label="Địa chỉ website"
              value={url}
              onChangeText={setUrl}
              placeholder="https://tenmien.vn"
            />
            <Field
              label="Từ khóa mục tiêu"
              value={keyword}
              onChangeText={setKeyword}
              placeholder="hosting WordPress Việt Nam"
            />
            <Button
              label="Kiểm tra SEO"
              icon="search"
              onPress={() => void runAudit()}
              disabled={loading}
            />
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Card>
          {result ? (
            <>
              <Card dark style={styles.scoreCard}>
                <View>
                  <Text style={styles.scoreLabel}>MỨC HOÀN THIỆN SEO</Text>
                  <Text style={styles.score}>
                    {result.score}
                    <Text style={styles.scoreOut}>/100</Text>
                  </Text>
                </View>
                <View style={styles.scoreCopy}>
                  <Text style={styles.pageTitle}>
                    {result.title || "Chưa có title"}
                  </Text>
                  <Text style={styles.pageMeta}>
                    {result.wordCount} từ trên trang · {result.url}
                  </Text>
                </View>
              </Card>
              <Card style={{ gap: 13 }}>
                <Text style={styles.sectionTitle}>Tóm tắt và việc ưu tiên</Text>
                <Text style={styles.summary}>{result.ai.executiveSummary}</Text>
                {result.ai.priorities.map((item, index) => (
                  <Line
                    key={item}
                    icon="arrow-up-circle"
                    text={`${index + 1}. ${item}`}
                    color={colors.primary}
                  />
                ))}
              </Card>
              <Card style={{ gap: 10 }}>
                <Text style={styles.sectionTitle}>Những mục đã kiểm tra</Text>
                {result.findings.map((item) => (
                  <View key={item.id} style={styles.finding}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            item.status === "pass"
                              ? colors.success
                              : item.status === "warning"
                                ? colors.warning
                                : colors.danger,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.findingTitle}>
                        {item.label} · {impactLabel[item.impact]}
                      </Text>
                      <Text style={styles.findingDetail}>{item.detail}</Text>
                    </View>
                  </View>
                ))}
              </Card>
              <Card style={{ gap: 11 }}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Kế hoạch cải thiện</Text>
                  <Pill tone="mint">ĐÃ XẾP ƯU TIÊN</Pill>
                </View>
                <Text style={styles.summary}>
                  HOSTORA sắp xếp theo mức ảnh hưởng. Mọi thay đổi vẫn cần bạn
                  hoặc người quản lý website xác nhận trước khi áp dụng.
                </Text>
                {result.automationPlan.length ? (
                  result.automationPlan.slice(0, 8).map((task) => (
                    <View key={task.id} style={styles.task}>
                      <View style={styles.taskTop}>
                        <Text style={styles.taskPriority}>{task.priority}</Text>
                        <Text style={styles.taskMode}>
                          {task.mode === "draft"
                            ? task.draft
                              ? "CÓ GỢI Ý"
                              : "CÓ HƯỚNG DẪN"
                            : "CẦN KIỂM TRA"}
                        </Text>
                      </View>
                      <Text style={styles.findingTitle}>{task.title}</Text>
                      <Text style={styles.findingDetail}>{task.action}</Text>
                      <Text style={styles.acceptance}>
                        Hoàn thành khi: {task.acceptance}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.summary}>
                    Chưa có việc ưu tiên từ lần kiểm tra này; hãy tiếp tục theo
                    dõi phản hồi của khách sau khi website hoạt động.
                  </Text>
                )}
              </Card>
              <Card style={{ gap: 11 }}>
                <Text style={styles.sectionTitle}>Ý tưởng nội dung</Text>
                {result.ai.contentIdeas.map((item) => (
                  <Line
                    key={item}
                    icon="edit-3"
                    text={item}
                    color={colors.success}
                  />
                ))}
              </Card>
              <Card style={{ gap: 9 }}>
                <Text style={styles.sectionTitle}>Nguồn tham khảo</Text>
                {result.sources.map((item, sourceIndex) => (
                  <Pressable
                    accessibilityRole="link"
                    key={item.citation}
                    onPress={() => void Linking.openURL(item.sourceUrl)}
                  >
                    <Text style={styles.source}>
                      Mở nguồn tham khảo {sourceIndex + 1} ↗
                    </Text>
                  </Pressable>
                ))}
                {result.limits.map((item) => (
                  <Text key={item} style={styles.limit}>
                    • {item}
                  </Text>
                ))}
              </Card>
            </>
          ) : null}
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        style={styles.input}
      />
    </View>
  );
}
function Line({
  icon,
  text,
  color,
}: {
  icon: "arrow-up-circle" | "edit-3";
  text: string;
  color: string;
}) {
  return (
    <View style={styles.line}>
      <Feather name={icon} size={15} color={color} />
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 14 },
  form: { gap: 15 },
  label: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  input: {
    height: 49,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 13,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 11,
  },
  error: {
    color: colors.danger,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
    lineHeight: 16,
  },
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 18 },
  scoreLabel: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 7,
    letterSpacing: 1,
  },
  score: { color: "white", fontFamily: "BeVietnamPro_900Black", fontSize: 38 },
  scoreOut: { color: "#7D8DA2", fontSize: 13 },
  scoreCopy: { flex: 1 },
  pageTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
  },
  pageMeta: {
    color: "#9FADBE",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 8,
    lineHeight: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 17,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  task: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 11,
    gap: 5,
  },
  taskTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskPriority: {
    color: colors.danger,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 9,
  },
  taskMode: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
  },
  draft: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    padding: 9,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 15,
  },
  acceptance: {
    color: colors.success,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 8,
    lineHeight: 14,
  },
  summary: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 18,
  },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lineText: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
    lineHeight: 17,
  },
  finding: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  findingTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  findingDetail: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 3,
  },
  source: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 9,
    lineHeight: 15,
  },
  limit: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 8,
    lineHeight: 14,
  },
});
