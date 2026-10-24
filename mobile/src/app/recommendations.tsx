import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
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
import { useApp } from "@/context/app-context";
import { postJson } from "@/lib/api";
import { formatVnd } from "@/lib/catalog";
import {
  useRecommendedPlans,
  type RecommendedPlan,
} from "@/lib/recommendations";

type ExplainResult = {
  summary: string;
  tradeoffs?: string[];
  nextStep?: string;
};
const faqItems: [string, string][] = [
  [
    "Hosting và tên miền khác nhau thế nào?",
    "Tên miền là địa chỉ website; hosting là nơi lưu nội dung và vận hành website. Shop thường cần cả hai.",
  ],
  [
    "Shop mới có cần VPS không?",
    "Thường có thể bắt đầu bằng hosting được quản lý. VPS phù hợp khi website cần cách vận hành riêng và đã có người có kinh nghiệm phụ trách.",
  ],
  [
    "Giá ưu đãi có phải giá lâu dài?",
    "Không. Giá ưu đãi gắn với kỳ thanh toán; hãy xem giá gia hạn và điều khoản tại trang chính thức trước khi mua.",
  ],
  [
    "Băng thông không giới hạn nghĩa là gì?",
    "Vẫn có thể có chính sách sử dụng hợp lý. Nếu nguồn không công bố rõ, HOSTORA hiển thị Chưa xác minh.",
  ],
  [
    "Gói được đề xuất có chịu được flash sale?",
    "Mức phù hợp chỉ giúp chọn ban đầu. Hãy chạy thử website với lượng khách cao trước chiến dịch lớn.",
  ],
];
export default function RecommendationsScreen() {
  const { requirements, addLead } = useApp();
  const { plans: ranked, status } = useRecommendedPlans(requirements);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const selectedPlan = ranked.find((plan) => plan.id === selected) ?? ranked[0];

  async function shareSummary() {
    const lines = [
      `HOSTORA · 3 gói ${status === "verified" ? "phù hợp" : "tham khảo từ dữ liệu ngày 23/10/2026 (chưa kiểm tra giá hiện tại)"}`,
      ...ranked.map(
        (plan, index) =>
          `${index + 1}. ${plan.provider} ${plan.name}: ${formatVnd(plan.promo)}/tháng với kỳ ${plan.billingMonths} tháng; gia hạn ${plan.renewal == null ? "chưa xác minh" : `${formatVnd(plan.renewal)}/tháng`}; ${plan.storage}; băng thông ${plan.bandwidth ?? "chưa xác minh"}.`,
      ),
      "Giá có thể thay đổi; hãy kiểm tra trang chính thức trước khi mua.",
    ];
    await Share.share({ message: lines.join("\n") });
  }

  function saveLead() {
    if (
      status === "loading" ||
      !selectedPlan ||
      name.trim().length < 2 ||
      phone.replace(/\D/g, "").length < 9
    )
      return;
    addLead({
      name: name.trim(),
      phone: phone.trim(),
      plan: `${selectedPlan.provider} ${selectedPlan.name}`,
      planId: selectedPlan.id,
    });
    setName("");
    setPhone("");
    setSaved(true);
    setLeadOpen(false);
  }

  async function explain() {
    setLoading(true);
    try {
      const out = await postJson<ExplainResult>("/api/ai/explain", {
        topic: "recommendation",
        facts: JSON.stringify(ranked),
      });
      setExplanation(
        [
          out.summary,
          ...(out.tradeoffs ?? []).map((x) => `• ${x}`),
          out.nextStep ? `Bước tiếp theo: ${out.nextStep}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    } catch {
      setExplanation(
        "Chưa thể tạo lời giải thích lúc này. Bạn vẫn có thể xem các lý do đã liệt kê ở từng gói.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top"]}
    >
      <DetailHeader
        title="Gói đề xuất"
        action={
          <Pill tone={status === "verified" ? "mint" : "warning"}>
            {status === "verified" ? "ĐÃ KIỂM TRA" : "THAM KHẢO"}
          </Pill>
        }
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>Kết quả tư vấn</Eyebrow>
          <Title style={{ marginTop: 8 }}>Ba lựa chọn. Lý do rõ ràng.</Title>
          <Body style={{ marginTop: 10 }}>
            Thứ tự dựa trên nhu cầu và bảng giá đã kiểm tra, không dựa trên lời
            quảng cáo.
          </Body>
          <Text style={styles.catalogStatus}>
            {status === "verified"
              ? "So sánh từ 13 gói đã đối chiếu với trang chính thức"
              : status === "offline"
                ? "Dữ liệu ngày 23/10/2026 · chỉ để tham khảo, hãy kết nối lại để cập nhật"
                : "Đang kiểm tra bảng giá..."}
          </Text>
        </View>
        <View style={styles.content}>
          {ranked.map((plan, index) => (
            <Card
              key={plan.id}
              style={[styles.plan, index === 0 && styles.best]}
            >
              {index === 0 ? (
                <View style={styles.bestRibbon}>
                  <Text style={styles.bestRibbonText}>PHÙ HỢP NHẤT</Text>
                </View>
              ) : null}
              <View style={[styles.planTop, index === 0 && { marginTop: 10 }]}>
                <View>
                  <Text style={styles.provider}>{plan.provider}</Text>
                  <Text style={styles.planName}>{plan.name}</Text>
                </View>
                <View style={styles.score}>
                  <Text style={styles.scoreText}>{plan.score}</Text>
                  <Text style={styles.scoreSub}>/100</Text>
                </View>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatVnd(plan.promo)}</Text>
                <Text style={styles.per}>/tháng</Text>
              </View>
              <Text style={styles.renewal}>
                Giá ưu đãi áp dụng cho kỳ {plan.billingMonths} tháng; không phải
                giá cho mọi kỳ.
              </Text>
              <Text style={styles.renewal}>
                Gia hạn:{" "}
                {plan.renewal == null
                  ? "Chưa xác minh"
                  : `${formatVnd(plan.renewal)}/tháng`}
              </Text>
              <View style={styles.reasons}>
                {plan.reasons.map((reason) => (
                  <View key={reason} style={styles.reason}>
                    <Feather name="check" color={colors.success} size={14} />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.specRow}>
                <Spec label="Lưu trữ" value={plan.storage} />
                <Spec label="Sao lưu" value={plan.backup} />
                <Spec label="Tăng tốc" value={plan.cdn} />
              </View>
              <View style={styles.caution}>
                <Feather name="alert-circle" color={colors.warning} size={15} />
                <Text style={styles.cautionText}>{plan.caution}</Text>
              </View>
              <Button
                label={
                  selectedPlan?.id === plan.id
                    ? "Đang chọn gói này"
                    : "Chọn gói này"
                }
                variant={selectedPlan?.id === plan.id ? "primary" : "secondary"}
                icon="check-circle"
                disabled={status === "loading"}
                onPress={() => {
                  setSelected(plan.id);
                  setSaved(false);
                }}
              />
            </Card>
          ))}

          <ComparisonTable plans={ranked} />
          <Button
            label="Chia sẻ tóm tắt 3 gói"
            variant="secondary"
            icon="share-2"
            disabled={status === "loading"}
            onPress={() => void shareSummary()}
          />

          <Card style={{ gap: 12 }}>
            <Text style={styles.formTitle}>Đăng ký tư vấn</Text>
            <Text style={styles.formCopy}>
              Gói đã chọn:{" "}
              {selectedPlan
                ? `${selectedPlan.provider} ${selectedPlan.name}`
                : "Đang tải"}
            </Text>
            {saved ? (
              <Text style={styles.success}>
                Đã lưu yêu cầu trên thiết bị với đúng gói đã chọn.
              </Text>
            ) : null}
            {!leadOpen ? (
              <Button
                label="Đăng ký tư vấn"
                icon="user-plus"
                disabled={status === "loading"}
                onPress={() => setLeadOpen(true)}
              />
            ) : (
              <>
                <TextInput
                  accessibilityLabel="Họ tên"
                  value={name}
                  onChangeText={setName}
                  placeholder="Họ và tên"
                  style={styles.input}
                />
                <TextInput
                  accessibilityLabel="Số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Số điện thoại"
                  style={styles.input}
                />
                <Button
                  label="Lưu yêu cầu tư vấn"
                  icon="shield"
                  disabled={
                    status === "loading" ||
                    name.trim().length < 2 ||
                    phone.replace(/\D/g, "").length < 9
                  }
                  onPress={saveLead}
                />
                <Button
                  label="Đóng form"
                  variant="ghost"
                  icon="x"
                  onPress={() => setLeadOpen(false)}
                />
              </>
            )}
          </Card>

          <Card dark style={{ gap: 14 }}>
            <View style={styles.explainTop}>
              <Feather name="zap" color={colors.mint} size={20} />
              <Text style={styles.explainTitle}>
                Vì sao gói này phù hợp nhất?
              </Text>
            </View>
            <Text style={styles.explainCopy}>
              HOSTORA giải thích từ nhu cầu của bạn và thông tin đã kiểm tra;
              không tự thêm giá hay tính năng.
            </Text>
            {explanation ? (
              <Text style={styles.explanation}>{explanation}</Text>
            ) : null}
            {loading ? (
              <ActivityIndicator color={colors.mint} />
            ) : (
              <Button
                label="Giải thích dễ hiểu"
                icon="cpu"
                variant="mint"
                disabled={status !== "verified"}
                onPress={() => void explain()}
              />
            )}
          </Card>
          <Card style={{ gap: 5 }}>
            <Text style={styles.formTitle}>Câu hỏi thường gặp</Text>
            {faqItems.map(([question, answer], index) => (
              <View key={question} style={styles.faqItem}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: openFaq === index }}
                  onPress={() => setOpenFaq(openFaq === index ? null : index)}
                  style={styles.faqButton}
                >
                  <Text style={styles.faqQuestion}>{question}</Text>
                  <Feather
                    name={openFaq === index ? "chevron-up" : "chevron-down"}
                    color={colors.primary}
                    size={18}
                  />
                </Pressable>
                {openFaq === index ? (
                  <Text style={styles.faqAnswer}>{answer}</Text>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
function ComparisonTable({ plans }: { plans: RecommendedPlan[] }) {
  const rows: [string, (plan: RecommendedPlan) => string][] = [
    ["Giá ưu đãi", (p) => `${formatVnd(p.promo)}/th`],
    ["Kỳ ưu đãi", (p) => `${p.billingMonths} tháng`],
    [
      "Gia hạn",
      (p) =>
        p.renewal == null ? "Chưa xác minh" : `${formatVnd(p.renewal)}/th`,
    ],
    ["Dung lượng", (p) => p.storage],
    ["Băng thông", (p) => p.bandwidth ?? "Chưa xác minh"],
    [
      "Kết nối an toàn",
      (p) =>
        p.ssl === true ? "Có" : p.ssl === false ? "Không" : "Chưa xác minh",
    ],
    ["Sao lưu", (p) => p.backup],
    ["Tăng tốc", (p) => p.cdn],
    ["Bán hàng", (p) => (p.ecommerce ? "Có hỗ trợ" : "Chưa xác nhận")],
    ["Điểm mạnh", (p) => p.reasons[0] ?? "Chưa có dữ liệu"],
  ];
  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.formTitle}>So sánh 3 gói</Text>
      <Text style={styles.formCopy}>
        Vuốt ngang để xem đầy đủ; số liệu lấy từ trang chính thức đã kiểm tra.
      </Text>
      <View style={styles.tableFrame}>
        <View style={styles.tableFrozen}>
          <Text style={[styles.tableLabel, styles.tableHead]}>Tiêu chí</Text>
          {rows.map(([label]) => (
            <Text key={label} style={styles.tableLabel}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          style={styles.tableScroll}
          showsHorizontalScrollIndicator
          accessibilityLabel="Ba gói hosting, vuốt ngang để so sánh"
        >
          <View style={styles.tablePlanGrid}>
            {plans.map((plan) => (
              <View key={plan.id}>
                <Text style={[styles.tableCell, styles.tableHead]}>
                  {plan.provider}
                  {"\n"}
                  {plan.name}
                </Text>
                {rows.map(([label, get]) => (
                  <Text
                    key={label}
                    style={styles.tableCell}
                    accessibilityLabel={`${label}: ${get(plan)}`}
                  >
                    {get(plan)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Card>
  );
}
const styles = StyleSheet.create({
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  catalogStatus: {
    color: colors.success,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
    marginTop: 9,
  },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 14 },
  formTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 20,
  },
  formCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
  },
  success: {
    color: colors.success,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    fontFamily: "BeVietnamPro_500Medium",
    color: colors.text,
  },
  tableFrame: {
    flexDirection: "row",
    width: "100%",
  },
  tableFrozen: {
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  tableScroll: { flex: 1 },
  tablePlanGrid: { flexDirection: "row" },
  tableLabel: {
    width: 106,
    height: 74,
    paddingHorizontal: 8,
    textAlignVertical: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  tableCell: {
    width: 145,
    height: 74,
    paddingHorizontal: 9,
    textAlignVertical: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 15,
  },
  tableHead: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
  },
  faqItem: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 7 },
  faqButton: {
    minHeight: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  faqQuestion: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  faqAnswer: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    paddingBottom: 12,
  },
  plan: { overflow: "hidden" },
  best: { borderColor: colors.primary, borderWidth: 1.5 },
  bestRibbon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  bestRibbonText: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.3,
  },
  planTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  provider: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  planName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 23,
    marginTop: 3,
  },
  score: {
    flexDirection: "row",
    alignItems: "baseline",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.successSoft,
  },
  scoreText: {
    color: colors.success,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 17,
  },
  scoreSub: {
    color: colors.success,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 8,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 16 },
  price: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 27,
    letterSpacing: -1,
  },
  per: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
    marginLeft: 3,
  },
  renewal: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
  },
  reasons: { gap: 7, marginTop: 15 },
  reason: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  reasonText: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
    lineHeight: 16,
  },
  specRow: { flexDirection: "row", gap: 7, marginTop: 15 },
  specLabel: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 8,
  },
  specValue: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
  caution: {
    flexDirection: "row",
    gap: 7,
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radii.sm,
    padding: 10,
    marginTop: 14,
  },
  cautionText: {
    flex: 1,
    color: colors.warning,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 15,
  },
  explainTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  explainTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 17,
  },
  explainCopy: {
    color: "#A6B4C4",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
  },
  explanation: {
    color: "#D7E0EA",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    backgroundColor: "rgba(255,255,255,.06)",
    padding: 12,
    borderRadius: 14,
  },
});
