import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Body,
  Brand,
  Card,
  Eyebrow,
  IconBox,
  Pill,
  Screen,
  SectionHeader,
  Title,
} from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { formatVnd } from "@/lib/catalog";
import { hostingCost } from "@/lib/hosting-cost";
import { useRecommendedPlans } from "@/lib/recommendations";

const multipliers = [1, 3, 5, 10];

export default function ToolsScreen() {
  const [months, setMonths] = useState<12 | 24 | 36 | 48>(48);
  const [traffic, setTraffic] = useState(5);
  const { requirements } = useApp();
  const { plans, status } = useRecommendedPlans(requirements);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const cost =
    status === "verified" && selectedPlan
      ? hostingCost(selectedPlan, months)
      : null;
  const costNote =
    status !== "verified"
      ? "Cần kết nối để dùng bảng giá mới nhất đã kiểm tra."
      : months < selectedPlan.billingMonths
        ? `Giá ưu đãi công bố cho kỳ ${selectedPlan.billingMonths} tháng; chưa có giá chắc chắn cho kỳ ${months} tháng.`
        : selectedPlan.renewal == null && months > selectedPlan.billingMonths
          ? "Chưa có giá gia hạn đã xác minh cho kỳ này."
          : "Chỉ tính tiền lưu trữ; chưa gồm tên miền và dịch vụ mua thêm. Hãy xác nhận tổng tiền trước khi thanh toán.";

  return (
    <Screen>
      <View style={styles.header}>
        <Brand />
        <Pill tone="blue" icon="activity">
          GÓC TÍNH TOÁN
        </Pill>
      </View>
      <View style={styles.intro}>
        <Eyebrow>Chi phí và tăng trưởng</Eyebrow>
        <Title style={styles.introTitle}>Chi phí trước khi mua</Title>
        <Body style={styles.introBody}>
          Chọn gói và kỳ thanh toán để xem tổng tiền cần chuẩn bị.
        </Body>
      </View>

      <View style={styles.content}>
        <Card dark style={styles.costCard}>
          <View style={styles.cardTop}>
            <IconBox name="credit-card" tone="dark" />
            <Pill tone="dark">CHI PHÍ THỰC TẾ</Pill>
          </View>
          <Text style={styles.darkTitle}>Tổng chi phí sở hữu</Text>
          <Text style={styles.disclaimer}>
            Chọn gói để xem ước tính theo kỳ thanh toán đã công bố.
          </Text>
          <View style={styles.planChoices}>
            {plans.map((plan) => (
              <Pressable
                key={plan.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedPlan.id === plan.id }}
                onPress={() => setSelectedPlanId(plan.id)}
                style={[
                  styles.planChoice,
                  selectedPlan.id === plan.id && styles.planChoiceActive,
                ]}
              >
                <Text style={styles.planChoiceText}>
                  {plan.provider} {plan.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.periods}>
            {([12, 24, 36, 48] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setMonths(value)}
                style={[styles.period, months === value && styles.periodActive]}
              >
                <Text
                  style={[
                    styles.periodText,
                    months === value && { color: colors.ink },
                  ]}
                >
                  {value} tháng
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.total}>
            {cost ? formatVnd(cost.total) : "Chưa đủ dữ liệu"}
          </Text>
          <Text style={styles.totalLabel}>TỔNG CHI PHÍ {months} THÁNG</Text>
          {cost ? (
            <View style={styles.costBreakdown}>
              <CostLine
                label={`Kỳ ưu đãi (${cost.promoMonths} tháng)`}
                value={formatVnd(cost.initial)}
              />
              <CostLine
                label={`Phần gia hạn (${cost.renewalMonths} tháng)`}
                value={formatVnd(cost.renewal)}
              />
            </View>
          ) : null}
          <Text style={styles.disclaimer}>{costNote}</Text>
        </Card>

        <Card style={{ gap: 16 }}>
          <View style={styles.cardTop}>
            <IconBox name="zap" />
            <Pill tone="warning">LÚC ĐÔNG KHÁCH</Pill>
          </View>
          <Text style={styles.cardTitle}>Ước tính khi khách tăng đột biến</Text>
          <Text style={styles.cardCopy}>
            Xem nhanh mức rủi ro khi lượng khách cùng lúc tăng cao hơn bình
            thường.
          </Text>
          <View style={styles.periodsLight}>
            {multipliers.map((value) => (
              <Pressable
                key={value}
                onPress={() => setTraffic(value)}
                style={[
                  styles.periodLight,
                  traffic === value && styles.periodLightActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodLightText,
                    traffic === value && { color: "white" },
                  ]}
                >
                  ×{value}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chart}>
            {[0.28, 0.38, 0.34, 0.52, 0.8, 0.56, 0.42, 0.3].map(
              (value, index) => (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    { height: 24 + value * 84 * (traffic / 5) },
                  ]}
                />
              ),
            )}
          </View>
          <View style={styles.warning}>
            <Feather name="alert-triangle" color={colors.warning} size={17} />
            <Text style={styles.warningText}>
              {traffic >= 5
                ? "Nên tối ưu tốc độ và chạy thử trước chiến dịch lớn."
                : "Rủi ro vừa; hãy tiếp tục theo dõi khi trang web hoạt động."}
            </Text>
          </View>
        </Card>

        <SectionHeader
          eyebrow="Dành cho chủ trang web"
          title="Phân tích sâu hơn"
        />
        <View style={styles.toolList}>
          <ToolRow
            icon="edit-3"
            title="Tạo trang web với trợ lý"
            copy="Kể ý tưởng, xem bản thử rồi chọn nơi lưu trữ"
            onPress={() => router.push("/studio" as Href)}
          />
          <ToolRow
            icon="award"
            title="Kiểm tra mức sẵn sàng"
            copy="Biết điểm mạnh và việc cần hoàn thiện"
            onPress={() => router.push("/readiness")}
          />
          <ToolRow
            icon="package"
            title="Kho sản phẩm"
            copy="Nhiều gói từ 6 nhà cung cấp"
            onPress={() => router.push("/products")}
          />
          <ToolRow
            icon="search"
            title="Cải thiện tìm kiếm Google"
            copy="Kiểm tra trang web và nhận danh sách việc cần làm"
            onPress={() => router.push("/seo")}
          />
          <ToolRow
            icon="at-sign"
            title="Gợi ý tên miền"
            copy="Tên ngắn, dễ nhớ cho thị trường Việt"
            onPress={() => router.push("/domain")}
          />
          <ToolRow
            icon="globe"
            title="Kiểm tra trang web"
            copy="Xem các mục cơ bản đang đạt hay cần sửa"
            onPress={() => router.push("/analyzer")}
          />
          <ToolRow
            icon="book-open"
            title="Kiến thức dễ hiểu"
            copy="Giải thích lưu trữ bằng ví dụ đời thường"
            onPress={() => router.push("/knowledge")}
          />
        </View>
      </View>
    </Screen>
  );
}

function CostLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.costLine}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={styles.costValue}>{value}</Text>
    </View>
  );
}
function ToolRow({
  icon,
  title,
  copy,
  onPress,
}: {
  icon:
    | "award"
    | "at-sign"
    | "globe"
    | "book-open"
    | "package"
    | "search"
    | "edit-3";
  title: string;
  copy: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tool, pressed && { opacity: 0.72 }]}
    >
      <IconBox name={icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toolTitle}>{title}</Text>
        <Text style={styles.toolCopy}>{copy}</Text>
      </View>
      <Feather name="chevron-right" color={colors.faint} size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intro: { paddingHorizontal: 18, paddingTop: 18 },
  introTitle: { marginTop: 6, fontSize: 28, lineHeight: 36 },
  introBody: { marginTop: 5, fontSize: 12, lineHeight: 19 },
  content: { paddingHorizontal: 18, paddingTop: 16, gap: 18 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costCard: { gap: 14 },
  planChoices: { gap: 7 },
  planChoice: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.15)",
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 11,
  },
  planChoiceActive: {
    borderColor: colors.mint,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  planChoiceText: {
    color: "white",
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  darkTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 21,
  },
  periods: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  period: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: "center",
  },
  periodActive: { backgroundColor: colors.mint },
  periodText: {
    color: "#A7B3C3",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  total: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 36,
    letterSpacing: -1.4,
  },
  totalLabel: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: -14,
  },
  costBreakdown: {
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.09)",
    paddingTop: 14,
  },
  costLine: { flexDirection: "row", justifyContent: "space-between" },
  costLabel: {
    color: "#A7B3C3",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
  },
  costValue: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  disclaimer: {
    color: "#C5D5DF",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 21,
  },
  cardCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 18,
  },
  periodsLight: { flexDirection: "row", gap: 7 },
  periodLight: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  periodLightActive: { backgroundColor: colors.primary },
  periodLightText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  chart: {
    height: 135,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  bar: {
    flex: 1,
    maxHeight: 125,
    minHeight: 18,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: colors.primary,
  },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 14,
    backgroundColor: colors.warningSoft,
    padding: 12,
  },
  warningText: {
    flex: 1,
    color: colors.warning,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
    lineHeight: 16,
  },
  toolList: { gap: 9 },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  toolTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
  },
  toolCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 2,
  },
});
