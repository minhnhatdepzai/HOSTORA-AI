import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "@/constants/theme";
import { getNextOnboardingStep } from "@/lib/onboarding";
import { CinematicScrollView } from "@/components/ui";

const steps = [
  {
    eyebrow: "HOSTORA GIÚP BẠN MỞ TRANG WEB",
    title: "Tên miền, lưu trữ: chọn đúng thứ bạn cần.",
    copy: "Tên miền là địa chỉ; lưu trữ là nơi trang web hoạt động. HOSTORA so sánh dịch vụ từ nhiều nhà cung cấp để bạn chọn dễ hơn.",
    note: "Không cần biết kỹ thuật để bắt đầu",
    icon: "compass" as const,
    illustration: "needs" as const,
  },
  {
    eyebrow: "CHI PHÍ RÕ RÀNG",
    title: "Biết khoản phải trả trước khi đăng ký.",
    copy: "Giá ưu đãi, thời hạn cam kết và giá gia hạn được tách riêng. Mục nào chưa có dữ liệu sẽ được nói rõ, không tự điền đoán.",
    note: "So sánh cùng một kỳ hạn",
    icon: "credit-card" as const,
    illustration: "cost" as const,
  },
  {
    eyebrow: "MUA QUA HOSTORA",
    title: "Chọn dịch vụ và gửi yêu cầu trong ứng dụng.",
    copy: "HOSTORA xác nhận tổng tiền, tạo hóa đơn và để bạn theo dõi đơn trong ứng dụng. Giá tham khảo không bị tự động thu.",
    note: "Xem đơn và thanh toán qua HOSTORA",
    icon: "shield" as const,
    illustration: "privacy" as const,
  },
] as const;

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      progress.setValue(reduced ? 1 : 0);
      if (!reduced) Animated.timing(progress, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== "web" }).start();
    });
    return () => { active = false; progress.stopAnimation(); };
  }, [index, progress]);

  function advance() {
    const next = getNextOnboardingStep(index, steps.length);
    if (next.done) onFinish();
    else setIndex(next.nextIndex);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <Image source={require("../../assets/images/hostora-icon-source.png")} style={styles.mark} contentFit="cover" accessibilityLabel="Biểu tượng HOSTORA" />
            <View>
              <Text style={styles.brandName}>HOSTORA</Text>
              <Text style={styles.brandSub}>CỐ VẤN TRANG WEB</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bỏ qua hướng dẫn"
            onPress={onFinish}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Bỏ qua</Text>
          </Pressable>
        </View>

        <CinematicScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.visual, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]} accessibilityElementsHidden>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>0{index + 1}</Text>
          </View>
          <Illustration type={step.illustration} />
        </Animated.View>

        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Bước ${index + 1} trên ${steps.length}. ${step.title}`}
          style={[styles.copyArea, { opacity: progress }]}
        >
          <View style={styles.eyebrowRow}>
            <Feather name={step.icon} color={colors.mint} size={14} />
            <Text style={styles.eyebrow}>{step.eyebrow}</Text>
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.copy}>{step.copy}</Text>
          <View style={styles.noteRow}>
            <Feather name="check-circle" color={colors.mint} size={15} />
            <Text style={styles.note}>{step.note}</Text>
          </View>
        </Animated.View>

        </CinematicScrollView>
        <View style={styles.footer}>
          <View style={styles.progress} accessibilityLabel={`Bước ${index + 1} trên 3`}>
            {steps.map((item, itemIndex) => (
              <View
                key={item.title}
                style={[
                  styles.progressItem,
                  itemIndex === index && styles.progressItemActive,
                ]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={advance}
            style={({ pressed }) => [styles.next, pressed && styles.pressed]}
          >
            <Text style={styles.nextText}>
              {index === steps.length - 1 ? "Bắt đầu" : "Tiếp tục"}
            </Text>
            <View style={styles.nextIcon}>
              <Feather name="arrow-right" color={colors.ink} size={18} />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Illustration({ type }: { type: (typeof steps)[number]["illustration"] }) {
  if (type === "cost") {
    return (
      <View style={styles.artCard}>
        <Text style={styles.artLabel}>BẢNG SO SÁNH CHI PHÍ</Text>
        <Text style={styles.artPrice}>Giá theo gói</Text>
        <View style={styles.costLine} />
        <View style={styles.costRow}>
          <Text style={styles.costName}>Giá đăng ký</Text>
          <Text style={styles.costValue}>Rõ ràng</Text>
        </View>
        <View style={styles.costRow}>
          <Text style={styles.costName}>Giá gia hạn</Text>
          <Text style={styles.costValue}>Tách riêng</Text>
        </View>
      </View>
    );
  }

  if (type === "privacy") {
    return (
      <View style={styles.shieldWrap}>
        <View style={styles.shieldRing}>
          <Feather name="shield" color={colors.ink} size={64} />
        </View>
        <View style={[styles.privacyChip, styles.privacyChipTop]}>
          <Feather name="smartphone" color={colors.mint} size={14} />
          <Text style={styles.privacyChipText}>Lưu trên máy</Text>
        </View>
        <View style={[styles.privacyChip, styles.privacyChipBottom]}>
          <Feather name="eye-off" color={colors.mint} size={14} />
          <Text style={styles.privacyChipText}>Không chia sẻ</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.needsWrap}>
      <View style={styles.needsCard}>
        <View style={styles.needsIcon}>
          <Feather name="shopping-bag" color={colors.primary} size={18} />
        </View>
        <View style={styles.needsCopy}>
          <View style={[styles.fakeLine, { width: "72%" }]} />
          <View style={[styles.fakeLine, styles.fakeLineSoft, { width: "46%" }]} />
        </View>
        <Feather name="check" color={colors.success} size={18} />
      </View>
      <View style={[styles.needsCard, styles.needsCardMiddle]}>
        <View style={[styles.needsIcon, { backgroundColor: colors.successSoft }]}>
          <Feather name="users" color={colors.success} size={18} />
        </View>
        <View style={styles.needsCopy}>
          <View style={[styles.fakeLine, { width: "58%" }]} />
          <View style={[styles.fakeLine, styles.fakeLineSoft, { width: "80%" }]} />
        </View>
        <Feather name="check" color={colors.success} size={18} />
      </View>
      <View style={[styles.needsCard, styles.needsCardLast]}>
        <View style={[styles.needsIcon, { backgroundColor: colors.warningSoft }]}>
          <Feather name="dollar-sign" color={colors.warning} size={18} />
        </View>
        <View style={styles.needsCopy}>
          <View style={[styles.fakeLine, { width: "66%" }]} />
          <View style={[styles.fakeLine, styles.fakeLineSoft, { width: "52%" }]} />
        </View>
        <Feather name="check" color={colors.success} size={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  screen: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: colors.ink,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 18,
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
  },
  markText: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 18,
  },
  brandName: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 14,
    letterSpacing: -0.3,
  },
  brandSub: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 7,
    letterSpacing: 1.7,
  },
  skip: { paddingHorizontal: 10, paddingVertical: 10, minHeight: 44 },
  skipText: {
    color: "#B9C5D3",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  visual: {
    flex: 1,
    minHeight: 260,
    marginTop: 20,
    borderRadius: radii.xl,
    backgroundColor: colors.mint,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stepNumber: { position: "absolute", top: 14, right: 18 },
  stepNumberText: {
    color: "rgba(7,17,31,.14)",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 62,
    letterSpacing: -4,
  },
  copyArea: { paddingTop: 28 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  title: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -1,
    marginTop: 12,
  },
  copy: {
    color: "#B9C5D3",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  note: {
    color: "white",
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 12,
  },
  footer: { paddingTop: 24 },
  progress: { flexDirection: "row", gap: 7, marginBottom: 16 },
  progressItem: {
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#3B4B60",
  },
  progressItemActive: { width: 34, backgroundColor: colors.mint },
  next: {
    minHeight: 56,
    borderRadius: 28,
    paddingLeft: 22,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
  },
  nextText: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 14,
  },
  nextIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  needsWrap: { gap: 10, transform: [{ rotate: "-3deg" }] },
  needsCard: {
    minHeight: 66,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(7,17,31,.08)",
  },
  needsCardMiddle: { transform: [{ translateX: 18 }] },
  needsCardLast: { transform: [{ translateX: -7 }] },
  needsIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  needsCopy: { flex: 1, gap: 7 },
  fakeLine: { height: 8, borderRadius: 4, backgroundColor: colors.inkSoft },
  fakeLineSoft: { height: 6, backgroundColor: colors.line },
  artCard: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: colors.ink,
    transform: [{ rotate: "2deg" }],
  },
  artLabel: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.1,
  },
  artPrice: {
    color: "white",
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 27,
    marginTop: 8,
  },
  costLine: { height: 1, backgroundColor: "#334154", marginVertical: 18 },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  costName: {
    color: "#AAB7C7",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  costValue: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  shieldWrap: { alignItems: "center", justifyContent: "center" },
  shieldRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 14,
    borderColor: "rgba(7,17,31,.08)",
  },
  privacyChip: {
    position: "absolute",
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.ink,
  },
  privacyChipTop: { top: 6, right: 0 },
  privacyChipBottom: { bottom: 2, left: -4 },
  privacyChipText: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
});
