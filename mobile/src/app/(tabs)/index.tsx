import { CinematicBackdrop } from "@/components/cinematic-backdrop";
import { BrandOrbit } from "@/components/brand-orbit";
import { Reveal, RevealWords, ScrollParallax, ScrollReveal } from "@/components/motion";
import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Brand, Button, Screen } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { formatVnd } from "@/lib/catalog";
import { useRecommendedPlans } from "@/lib/recommendations";

const essentials = [
  {
    number: "01",
    icon: "at-sign" as const,
    title: "Tên miền",
    copy: "Địa chỉ để khách tìm thấy bạn",
    category: "domain",
  },
  {
    number: "02",
    icon: "hard-drive" as const,
    title: "Lưu trữ",
    copy: "Nơi trang web chạy và lưu dữ liệu",
    category: "hosting",
  },
  {
    number: "03",
    icon: "mail" as const,
    title: "Thư điện tử",
    copy: "Hộp thư mang tên doanh nghiệp",
    category: "email",
  },
];

const afterLaunch = [
  { icon: "archive" as const, title: "Giữ bản sao dữ liệu", detail: "Chuẩn bị đường khôi phục khi cần", category: "backup" },
  { icon: "activity" as const, title: "Biết khi web gián đoạn", detail: "Nhận cảnh báo để xử lý sớm", category: "monitoring" },
  { icon: "shield" as const, title: "Bảo vệ và tăng tốc", detail: "Chọn lớp bảo vệ theo nhu cầu", category: "security" },
];

export default function HomeScreen() {
  const { requirements } = useApp();
  const { plans, status } = useRecommendedPlans(requirements);
  const top = plans[0];

  return (
    <Screen revealChildren={false}>
      <View style={styles.topbar}>
        <Brand />
        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở tài khoản khách hàng"
            onPress={() => router.push("/account" as Href)}
            style={styles.settings}
          >
            <Feather name="user" size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem đơn hàng"
            onPress={() => router.push("/orders" as Href)}
            style={styles.settings}
          >
            <Feather name="file-text" size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở cài đặt"
            onPress={() => router.push("/settings")}
            style={styles.settings}
          >
            <Feather name="settings" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <Reveal delay={80} style={styles.hero}>
        <CinematicBackdrop />
        <ScrollParallax style={styles.brandParallax} distance={52}>
          <BrandOrbit />
        </ScrollParallax>
        <View style={styles.heroTop}>
          <View style={styles.heroRule} />
          <Text style={styles.heroEyebrow}>MỘT KHỞI ĐẦU RÕ RÀNG</Text>
        </View>
        <RevealWords
          style={styles.heroTitle}
          segments={[
            { text: "Mở trang web.\n" },
            { text: "Chọn đúng từ đầu.", style: { color: colors.mint } },
          ]}
        />
        <Text style={styles.heroCopy}>
          Từ tên miền đến nơi lưu trữ. So sánh giá, hiểu từng khoản tiền rồi
          chọn gói phù hợp.
        </Text>
        <Button
          label="Tư vấn chọn gói phù hợp"
          icon="compass"
          variant="mint"
          onPress={() => router.push("/consult")}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/studio" as Href)}
          style={styles.heroLink}
        >
          <Text style={styles.heroLinkText}>Chưa có web? Tạo cùng trợ lý</Text>
          <Feather name="arrow-up-right" size={16} color={colors.mint} />
        </Pressable>
        <View style={styles.heroStamp}>
          <Feather name="shield" size={13} color={colors.mint} />
          <Text style={styles.heroStampText}>
            So sánh rõ giá · hóa đơn rõ ràng
          </Text>
        </View>
      </Reveal>

      <ScrollReveal animate={false} style={styles.content}>
        <ScrollReveal style={styles.sectionHeading}>
          <Text style={styles.kicker}>BẮT ĐẦU TỪ ĐÂU?</Text>
          <Text style={styles.sectionTitle}>Một trang web cần gì?</Text>
          <Text style={styles.sectionCopy}>
            Ba phần cơ bản để đưa trang web của bạn đến với khách hàng.
          </Text>
        </ScrollReveal>
        <ScrollReveal animate={false} style={styles.essentials}>
          {essentials.map((item) => (
            <ScrollReveal key={item.number}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem ${item.title}: ${item.copy}`}
                onPress={() =>
                  router.push({
                    pathname: "/products",
                    params: { category: item.category },
                  })
                }
                style={({ pressed }) => [
                  styles.essential,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.essentialNumber}>{item.number}</Text>
                <View style={styles.essentialIcon}>
                  <Feather name={item.icon} size={19} color={colors.primary} />
                </View>
                <View style={styles.essentialText}>
                  <Text style={styles.essentialTitle}>{item.title}</Text>
                  <Text style={styles.essentialCopy}>{item.copy}</Text>
                </View>
                <Feather name="arrow-up-right" size={18} color={colors.primary} />
              </Pressable>
            </ScrollReveal>
          ))}
        </ScrollReveal>

        <ScrollReveal style={styles.afterLaunch}>
          <View style={styles.sectionHeading}>
            <Text style={styles.kicker}>SAU KHI WEBSITE HOẠT ĐỘNG</Text>
            <Text style={styles.sectionTitle}>Giữ trang web vận hành tốt.</Text>
            <Text style={styles.sectionCopy}>Chọn thêm khi cần. HOSTORA xác nhận phạm vi và báo giá trước khi tạo hóa đơn.</Text>
          </View>
          <ScrollReveal animate={false} style={styles.afterLaunchList}>
            {afterLaunch.map((item, index) => (
              <ScrollReveal key={item.category}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xem dịch vụ ${item.title}`}
                  onPress={() =>
                    router.push({
                      pathname: "/products",
                      params: { category: item.category },
                    })
                  }
                  style={({ pressed }) => [
                    styles.afterLaunchRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.afterLaunchNumber}>{String(index + 1).padStart(2, "0")}</Text>
                  <Feather name={item.icon} size={19} color={colors.primary} />
                  <View style={styles.afterLaunchText}>
                    <Text style={styles.afterLaunchTitle}>{item.title}</Text>
                    <Text style={styles.afterLaunchDetail}>{item.detail}</Text>
                  </View>
                  <Feather name="arrow-up-right" size={18} color={colors.primary} />
                </Pressable>
              </ScrollReveal>
            ))}
          </ScrollReveal>
        </ScrollReveal>

        <ScrollReveal style={styles.how}>
          <Text style={styles.kicker}>CHỈ 3 BƯỚC</Text>
          <Text style={styles.sectionTitle}>Chọn và mua thế nào?</Text>
          <View style={styles.howSteps}>
            <Step
              number="1"
              title="Kể nhu cầu"
              copy="Chọn loại trang web và mức tiền bạn muốn chi."
            />
            <Step
              number="2"
              title="So sánh gói"
              copy="Xem giá ưu đãi, kỳ thanh toán và giá gia hạn."
            />
            <Step
              number="3"
              title="Mua qua HOSTORA"
              copy="Gửi yêu cầu trong ứng dụng. HOSTORA xác nhận giá rồi tạo hóa đơn để bạn xem và thanh toán tại đây."
            />
          </View>
          <Text style={styles.howNote}>
            Có hóa đơn HOSTORA? Xem và thanh toán trong mục Đơn hàng.
          </Text>
          <Button
            label="Xem đơn hàng"
            variant="secondary"
            icon="file-text"
            onPress={() => router.push("/orders" as Href)}
          />
        </ScrollReveal>

        <ScrollReveal>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở sổ tay làm website" onPress={() => router.push("/journal" as Href)} style={({ pressed }) => [styles.journalEntry, pressed && styles.pressed]}>
            <View style={styles.journalEntryCopy}><Text style={styles.kicker}>SỔ TAY HOSTORA</Text><Text style={styles.sectionTitle}>Làm xong rồi, tiếp theo là gì?</Text><Text style={styles.sectionCopy}>Bốn bài đọc ngắn từ ý tưởng, chọn nơi lưu trữ đến ngày ra mắt và thêm AI.</Text><Text style={styles.journalEntryAction}>Mở sổ tay  →</Text></View><Feather name="book-open" size={25} color={colors.primary}/>
          </Pressable>
        </ScrollReveal>

        {top ? (
          <ScrollReveal style={styles.featured}>
            <View style={styles.featuredHeader}>
              <Text style={styles.kicker}>{top.eligibility === "eligible" ? "GỢI Ý CHO BẠN" : "CHỈ THAM KHẢO · CHƯA ĐỦ ĐIỀU KIỆN"}</Text>
              <Text style={styles.featuredStatus}>
                {status === "verified"
                  ? "Đã đối chiếu"
                  : status === "loading"
                    ? "Đang kiểm tra"
                    : "Dữ liệu 23/10/2026"}
              </Text>
            </View>
            <Text style={styles.featuredName}>
              {top.provider} {top.name}
            </Text>
            <Text style={styles.featuredPrice}>
              Từ {formatVnd(top.promo)}
              <Text style={styles.featuredUnit}> / tháng</Text>
            </Text>
            <Text style={styles.featuredFine}>
              Trả trước {formatVnd(top.upfrontVnd)} cho kỳ {top.billingMonths} tháng; cần xem giá gia hạn, thuế và phí tên miền trước khi mua.
            </Text>
            <Button
              label="So sánh 3 gói"
              onPress={() => router.push("/recommendations")}
            />
          </ScrollReveal>
        ) : null}
      </ScrollReveal>
    </Screen>
  );
}

function Step({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{number}</Text>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepCopy}>{copy}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  afterLaunch: { gap: 20 },
  afterLaunchList: { borderTopWidth: 1, borderTopColor: colors.line },
  afterLaunchRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  afterLaunchNumber: { width: 24, color: colors.faint, fontFamily: "BeVietnamPro_700Bold", fontSize: 10 },
  afterLaunchText: { flex: 1 },
  afterLaunchTitle: { color: colors.text, fontFamily: "BeVietnamPro_700Bold", fontSize: 13 },
  afterLaunchDetail: { color: colors.muted, fontFamily: "BeVietnamPro_400Regular", fontSize: 10, marginTop: 3 },
  journalEntry:{ marginHorizontal:16, marginTop:20, padding:22, borderWidth:1, borderColor:colors.line, borderLeftWidth:3, borderLeftColor:colors.primary, backgroundColor:colors.surface, flexDirection:"row", alignItems:"flex-start", gap:12, borderRadius:18 },
  journalEntryCopy:{ flex:1 }, journalEntryAction:{ marginTop:12, color:colors.primary, fontFamily:"BeVietnamPro_700Bold", fontSize:13 },
  topbar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  settings: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    marginHorizontal: 16,
    backgroundColor: colors.ink,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 24,
    overflow: "hidden",
  },
  brandParallax: { height: 142 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  heroRule: { width: 22, height: 2, backgroundColor: colors.mint },
  heroEyebrow: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
    letterSpacing: 1.05,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -1.1,
    marginTop: 12,
  },
  heroCopy: {
    color: "#D2DCD4",
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 13,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 20,
  },
  heroLink: {
    minHeight: 42,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
  },
  heroLinkText: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  heroStamp: {
    borderTopWidth: 1,
    borderTopColor: "#405047",
    paddingTop: 14,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroStampText: {
    color: "#B8C8BD",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
  },
  content: { paddingHorizontal: 20, paddingTop: 33, gap: 33 },
  sectionHeading: { gap: 6 },
  kicker: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.1,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.9,
    marginTop: 3,
  },
  sectionCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 20,
    marginTop: 3,
  },
  essentials: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: -15,
  },
  essential: {
    minHeight: 82,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  essentialNumber: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
    width: 20,
  },
  essentialIcon: {
    width: 38,
    height: 38,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  essentialText: { flex: 1 },
  essentialTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 15,
  },
  essentialCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    marginTop: 3,
  },
  pressed: { opacity: 0.65 },
  how: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    padding: 21,
    gap: 7,
  },
  howSteps: { marginTop: 12 },
  step: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stepNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: colors.ink,
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 12,
  },
  stepContent: { flex: 1 },
  stepTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 13,
  },
  stepCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 3,
  },
  howNote: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
    lineHeight: 16,
  },
  featured: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  featuredStatus: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
  },
  featuredName: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 19,
  },
  featuredPrice: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 22,
  },
  featuredUnit: { fontFamily: "BeVietnamPro_500Medium", fontSize: 11 },
  featuredFine: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    marginBottom: 3,
  },
});
