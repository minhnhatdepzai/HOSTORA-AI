import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Brand,
  Button,
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
import { useRecommendedPlans } from "@/lib/recommendations";

const shortcuts = [
  {
    label: "Tên miền",
    copy: "Tạo tên dễ nhớ",
    icon: "at-sign" as const,
    route: "/domain" as const,
  },
  {
    label: "Website",
    copy: "Kiểm tra công khai",
    icon: "globe" as const,
    route: "/analyzer" as const,
  },
  {
    label: "Launch Score",
    copy: "Chấm hồ sơ như CV",
    icon: "award" as const,
    route: "/readiness" as const,
  },
];

export default function HomeScreen() {
  const { requirements } = useApp();
  const { plans, status } = useRecommendedPlans(requirements);
  const top = plans[0];

  return (
    <Screen>
      <LinearGradient
        colors={[colors.ink, "#10253D", "#0D1B2A"]}
        style={styles.hero}
      >
        <View style={styles.topbar}>
          <Brand inverse />
          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>NL</Text>
          </Pressable>
        </View>
        <Pill tone="dark" icon="cpu">
          QWEN 3.5 · LOCAL GPU
        </Pill>
        <Title light style={styles.heroTitle}>
          Hạ tầng đúng cho{`\n`}tham vọng thật.
        </Title>
        <Body light style={styles.heroCopy}>
          Chọn hosting bằng dữ liệu đã xác minh, điểm số rõ ràng và AI chạy ngay
          trên máy của bạn.
        </Body>
        <View style={styles.heroActions}>
          <View style={{ flex: 1 }}>
            <Button
              label="Bắt đầu tư vấn"
              variant="mint"
              onPress={() => router.push("/(tabs)/consult")}
            />
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/assistant")}
            style={styles.chatButton}
            accessibilityLabel="Mở trợ lý AI"
          >
            <Feather name="message-circle" color="white" size={20} />
          </Pressable>
        </View>

        <View style={styles.signalCard}>
          <View style={styles.signalTop}>
            <View>
              <Text style={styles.signalLabel}>ĐỀ XUẤT ĐANG KHỚP</Text>
              <Text style={styles.signalName}>{top.name}</Text>
            </View>
            <View style={styles.score}>
              <Text style={styles.scoreValue}>{top.score}</Text>
              <Text style={styles.scoreSub}>/100</Text>
            </View>
          </View>
          <View style={styles.signalMetrics}>
            <Metric
              label="Ngân sách"
              value={formatVnd(requirements.monthlyBudget)}
            />
            <Metric
              label="Lưu lượng"
              value={`${requirements.monthlyVisits.toLocaleString("vi-VN")}/th`}
            />
            <Metric
              label="Dữ liệu"
              value={
                status === "verified"
                  ? "Catalog online"
                  : status === "loading"
                    ? "Đang tải"
                    : "Snapshot 23/10"
              }
            />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <SectionHeader
          eyebrow="Quyết định tiếp theo"
          title="Bạn muốn làm gì?"
        />
        <View style={styles.shortcutGrid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [
                styles.shortcut,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconBox name={item.icon} />
              <Text style={styles.shortcutTitle}>{item.label}</Text>
              <Text style={styles.shortcutCopy}>{item.copy}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.recommendation}>
          <View style={styles.recHeader}>
            <View>
              <Eyebrow>
                {status === "verified"
                  ? "Phù hợp nhất từ catalog"
                  : "3 gói snapshot 23/10 · chưa là xếp hạng đủ catalog"}
              </Eyebrow>
              <Text style={styles.recName}>{top.name}</Text>
              <Text style={styles.provider}>{top.provider}</Text>
            </View>
            <Pill tone="mint" icon="check-circle">
              {top.score} ĐIỂM
            </Pill>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(top.promo)}</Text>
            <Text style={styles.per}> / tháng</Text>
          </View>
          <View style={styles.featureRow}>
            <Feature icon="hard-drive" label={top.storage} />
            <Feature icon="refresh-cw" label={top.backup} />
          </View>
          <Button
            label="Xem phân tích đầy đủ"
            onPress={() => router.push("/recommendations")}
          />
        </Card>

        <View style={styles.privacy}>
          <IconBox name="shield" tone="dark" />
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Riêng tư theo thiết kế</Text>
            <Text style={styles.privacyCopy}>
              AI local · Không cloud API · Lead chỉ nằm trên thiết bị
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: "hard-drive" | "refresh-cw";
  label: string;
}) {
  return (
    <View style={styles.feature}>
      <Feather name={icon} color={colors.success} size={15} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 38,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,.1)",
    borderColor: "rgba(255,255,255,.15)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  heroTitle: { marginTop: 18, fontSize: 39, lineHeight: 45 },
  heroCopy: { marginTop: 15, maxWidth: 340 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 24 },
  chatButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
    backgroundColor: "rgba(255,255,255,.08)",
  },
  signalCard: {
    marginTop: 30,
    borderRadius: radii.lg,
    padding: 17,
    backgroundColor: "rgba(255,255,255,.085)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },
  signalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  signalLabel: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  signalName: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 20,
    marginTop: 3,
  },
  score: { flexDirection: "row", alignItems: "baseline" },
  scoreValue: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 27,
  },
  scoreSub: {
    color: "#91A0B3",
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  signalMetrics: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.1)",
    marginTop: 14,
    paddingTop: 14,
  },
  metricLabel: {
    color: "#91A0B3",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
  },
  metricValue: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
    marginTop: 3,
  },
  content: { paddingHorizontal: 18, paddingTop: 27, gap: 22 },
  shortcutGrid: { flexDirection: "row", gap: 9 },
  shortcut: {
    flex: 1,
    minHeight: 132,
    backgroundColor: "white",
    padding: 12,
    borderRadius: radii.md,
    borderColor: colors.line,
    borderWidth: 1,
  },
  shortcutTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 12,
    marginTop: 12,
  },
  shortcutCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  recommendation: { gap: 18 },
  recHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  recName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 25,
    marginTop: 5,
  },
  provider: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 30,
    letterSpacing: -1,
  },
  per: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 11,
  },
  featureRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  featureText: {
    color: colors.success,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  privacyTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
  },
  privacyCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 2,
  },
});
