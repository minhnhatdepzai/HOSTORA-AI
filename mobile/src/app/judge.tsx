import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Reveal, Stagger } from "@/components/motion";
import { Pressable } from "@/components/pressable";
import { Brand, Button, Screen } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { useIntroPlayback } from "@/context/intro-playback-context";
import {
  judgeCases,
  judgeFeatures,
  judgeTimeline,
  type JudgeCase,
} from "@/lib/judge-showcase";

const caseTone: Record<JudgeCase["kind"], { label: string; color: string }> = {
  normal: { label: "BÌNH THƯỜNG", color: colors.primary },
  invalid: { label: "KHÔNG HỢP LỆ", color: colors.danger },
  edge: { label: "BIÊN / SỰ CỐ", color: colors.warning },
};

function time(second: number) {
  return `${Math.floor(second / 60)}:${String(second % 60).padStart(2, "0")}`;
}

export default function JudgeScreen() {
  const { canReplayIntro, replayIntro } = useIntroPlayback();

  return (
    <Screen revealChildren={false}>
      <View style={styles.topbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại Trang chủ"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </Pressable>
        <Brand />
        <View style={styles.releaseBadge}>
          <Text style={styles.releaseBadgeText}>V2.2.5</Text>
        </View>
      </View>

      <Reveal style={styles.hero}>
        <View style={styles.heroMeta}>
          <Text style={styles.heroEyebrow}>HỒ SƠ VÒNG LOẠI · BẢNG A</Text>
          <Feather name="shield" size={18} color={colors.mint} />
        </View>
        <Text style={styles.heroTitle}>
          Một luồng thật. Bằng chứng nhìn thấy ngay.
        </Text>
        <Text style={styles.heroCopy}>
          Demo trực tiếp trên Android: chọn nhu cầu, so sánh gói, kiểm tra nguồn
          và xem cách HOSTORA xử lý dữ liệu chưa chắc chắn.
        </Text>
        <View style={styles.metrics}>
          <Metric value="05" label="TÍNH NĂNG" />
          <Metric value="02:00" label="KỊCH BẢN" />
          <Metric value="09" label="CA KIỂM THỬ" />
        </View>
        <View style={styles.heroActions}>
          <Button
            label="Bắt đầu demo 2 phút"
            icon="play"
            variant="mint"
            onPress={() => router.push("/(tabs)/consult" as Href)}
          />
          <Button
            label="Phát lại cinematic"
            icon="film"
            variant="secondary"
            disabled={!canReplayIntro}
            onPress={replayIntro}
          />
        </View>
        {!canReplayIntro ? (
          <Text style={styles.motionNotice}>
            Tắt Giảm chuyển động trong Android để xem cinematic đầy đủ.
          </Text>
        ) : null}
      </Reveal>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>THỨ TỰ TRÌNH BÀY</Text>
        <Text style={styles.sectionTitle}>
          Kịch bản không cần giải thích dài.
        </Text>
        <View style={styles.timeline}>
          {judgeTimeline.map((item, index) => (
            <Stagger key={item.second} index={index}>
              <View style={styles.timelineRow}>
                <Text style={styles.timelineTime}>{time(item.second)}</Text>
                <View style={styles.timelineMark} />
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineDetail}>{item.copy}</Text>
                </View>
              </View>
            </Stagger>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>05 TÍNH NĂNG</Text>
        <Text style={styles.sectionTitle}>Chạm để mở đúng luồng thật.</Text>
        <View style={styles.featureList}>
          {judgeFeatures.map((feature, index) => (
            <Stagger key={feature.id} index={index}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mở tính năng ${feature.title}`}
                onPress={() => router.push(feature.route as Href)}
                style={styles.feature}
              >
                <View style={styles.featureIndex}>
                  <Text style={styles.featureIndexText}>0{index + 1}</Text>
                </View>
                <View style={styles.featureIcon}>
                  <Feather
                    name={feature.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDetail}>{feature.proof}</Text>
                </View>
                <Feather
                  name="arrow-up-right"
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
            </Stagger>
          ))}
        </View>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.testEyebrow}>09 CA CÓ BẰNG CHỨNG</Text>
        <Text style={styles.testTitle}>Không chỉ quay một luồng đẹp.</Text>
        <Text style={styles.testIntro}>
          Ba ca bình thường, ba đầu vào không hợp lệ và ba ca biên/sự cố. Kết
          quả, ảnh Redmi và thời điểm chạy nằm trong hồ sơ HTML kèm ZIP.
        </Text>
        <View style={styles.caseList}>
          {judgeCases.map((item) => (
            <View key={item.id} style={styles.caseRow}>
              <Text style={styles.caseId}>{item.id}</Text>
              <View style={styles.caseCopy}>
                <Text style={styles.caseTitle}>{item.title}</Text>
                <Text style={styles.caseExpected}>{item.expected}</Text>
              </View>
              <Text
                style={[styles.caseKind, { color: caseTone[item.kind].color }]}
              >
                {caseTone[item.kind].label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseBadge: {
    minWidth: 48,
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseBadgeText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
  },
  hero: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.ink,
    overflow: "hidden",
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEyebrow: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: 24,
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 31,
    lineHeight: 39,
    letterSpacing: -1.2,
  },
  heroCopy: {
    marginTop: 12,
    color: "#C8D4CF",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 13,
    lineHeight: 22,
  },
  metrics: {
    marginVertical: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#314A49",
    flexDirection: "row",
  },
  heroActions: { gap: 10 },
  motionNotice: {
    marginTop: 10,
    color: "#B8C8C2",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
    lineHeight: 16,
  },
  metric: { flex: 1 },
  metricValue: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 21,
  },
  metricLabel: {
    marginTop: 4,
    color: "#9FB6AE",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 7,
    letterSpacing: 0.8,
  },
  section: { paddingHorizontal: 20, paddingTop: 36 },
  eyebrow: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    marginTop: 7,
    color: colors.ink,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  timeline: { marginTop: 18, borderTopWidth: 1, borderColor: colors.line },
  timelineRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  timelineTime: {
    width: 46,
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  timelineMark: {
    width: 8,
    height: 8,
    marginRight: 14,
    borderRadius: 4,
    backgroundColor: colors.mintStrong,
  },
  timelineCopy: { flex: 1 },
  timelineTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
  },
  timelineDetail: {
    marginTop: 3,
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
  },
  featureList: { marginTop: 18, gap: 10 },
  feature: {
    minHeight: 88,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIndex: { width: 24 },
  featureIndexText: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCopy: { flex: 1 },
  featureTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 12,
  },
  featureDetail: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
  },
  testSection: {
    marginTop: 36,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: colors.ink,
  },
  testEyebrow: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  testTitle: {
    marginTop: 8,
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 25,
    lineHeight: 32,
  },
  testIntro: {
    marginTop: 10,
    color: "#B8C8C2",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 20,
  },
  caseList: { marginTop: 20, borderTopWidth: 1, borderColor: "#314A49" },
  caseRow: {
    minHeight: 82,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#314A49",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  caseId: {
    width: 36,
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
  },
  caseCopy: { flex: 1 },
  caseTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  caseExpected: {
    marginTop: 4,
    color: "#9FB0AA",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
  },
  caseKind: {
    width: 68,
    textAlign: "right",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 6,
    letterSpacing: 0.45,
  },
});
