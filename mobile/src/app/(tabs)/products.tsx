import offlineProducts from "@/data/product-catalog.json";
import { toCustomerLanguage } from "@/lib/customer-language";
import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Button } from "@/components/ui";
import { colors } from "@/constants/theme";
import { getJson, postJson } from "@/lib/api";
import { formatVnd } from "@/lib/catalog";

type Product = {
  id: string;
  provider: string;
  name: string;
  category: string;
  priceFromVnd: number | null;
  billingUnit: "month" | "year" | "usage" | "contact";
  summary: string;
  bestFor: string[];
  sourceUrl: string;
  verifiedAt: string;
  priceNote?: string;
};
type ProductResponse = {
  products: Product[];
  total: number;
  catalogTotal: number;
  disclaimer: string;
};

const categories = [
  { id: "all", label: "Tất cả" },
  { id: "hosting", label: "Lưu trữ" },
  { id: "wordpress", label: "WordPress" },
  { id: "domain", label: "Tên miền" },
  { id: "email", label: "Thư điện tử" },
  { id: "vps", label: "Máy chủ riêng" },
  { id: "cloud", label: "Đám mây" },
  { id: "ssl", label: "Bảo mật" },
  { id: "automation", label: "Tự động hóa" },
  { id: "workspace", label: "Văn phòng" },
];
const categoryCopy: Record<string, string> = {
  hosting: "Nơi lưu trữ và vận hành trang web của bạn.",
  wordpress: "Lưu trữ chuẩn bị sẵn cho trang web WordPress.",
  domain: "Địa chỉ để khách truy cập trang web.",
  email: "Hộp thư dùng tên miền của doanh nghiệp.",
  vps: "Máy chủ ảo cần người có kinh nghiệm quản trị.",
  cloud: "Lưu trữ linh hoạt cho trang web đang tăng trưởng.",
  ssl: "Bảo vệ kết nối với khách truy cập.",
  automation: "Tự động hóa các việc lặp lại.",
  workspace: "Công cụ cộng tác cho đội nhóm.",
};

export default function ProductsScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const requested = params.category;
  const initialCategory = categories.some((item) => item.id === requested)
    ? requested!
    : "all";
  return (
    <ProductsContent key={initialCategory} initialCategory={initialCategory} />
  );
}

function ProductsContent({ initialCategory }: { initialCategory: string }) {
  const [data, setData] = useState<ProductResponse>({
    products: offlineProducts as Product[],
    total: offlineProducts.length,
    catalogTotal: offlineProducts.length,
    disclaimer:
      "Giá tham khảo; HOSTORA xác nhận tổng tiền và kỳ hạn trước khi tạo hóa đơn.",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [selected, setSelected] = useState<Product | null>(null);
  const [contact, setContact] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [currentWebsite, setCurrentWebsite] = useState("");
  const [mainOffer, setMainOffer] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [seoGoals, setSeoGoals] = useState("");
  const [websiteStatus, setWebsiteStatus] = useState("idea");
  const [websiteGoal, setWebsiteGoal] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [estimatedTraffic, setEstimatedTraffic] = useState("under_1k");
  const [budgetRange, setBudgetRange] = useState("under_500k");
  const [consultationPreference, setConsultationPreference] = useState("ai");
  const [consultationDate, setConsultationDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const [consultationTime, setConsultationTime] = useState("09:00");
  const [consultationChannel, setConsultationChannel] = useState("email");
  const [voucherCode, setVoucherCode] = useState("");
  const [note, setNote] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestResult, setRequestResult] = useState<{
    id: string;
    accessCode: string;
    consultationPreference: string;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getJson<ProductResponse>("/api/products")
      .then(setData)
      .catch(() =>
        setError(
          "Đang xem bản lưu ngày 23/10/2026. Kết nối để cập nhật danh mục.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getJson<ProductResponse>("/api/products")
        .then((result) => {
          if (active) {
            setData(result);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError(
              "Đang xem bản lưu ngày 23/10/2026. Kết nối để cập nhật danh mục.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const products = useMemo(
    () =>
      (data?.products ?? []).filter((item) => {
        const found =
          `${item.provider} ${item.name} ${item.summary} ${item.bestFor.join(" ")}`.toLowerCase();
        return (
          (category === "all" || item.category === category) &&
          found.includes(query.trim().toLowerCase())
        );
      }),
    [data, category, query],
  );

  async function requestPurchase() {
    if (!selected) return;
    setRequestBusy(true);
    try {
      const result = await postJson<{
        id: string;
        accessCode: string;
        consultationPreference: string;
      }>("/api/payments/requests", {
        productId: selected.id,
        contact,
        note,
        profile: {
          customerName,
          phone,
          companyName,
          businessType,
          currentWebsite,
          mainOffer,
          serviceArea,
          seoGoals,
          websiteStatus,
          websiteGoal,
          targetCustomers,
          estimatedTraffic,
          budgetRange,
        },
        consultationPreference,
        consultationAt:
          consultationPreference === "scheduled"
            ? new Date(
                `${consultationDate}T${consultationTime}:00+07:00`,
              ).toISOString()
            : null,
        consultationChannel:
          consultationPreference === "ai" ? "email" : consultationChannel,
        voucherCode,
      });
      setRequestResult(result);
      setContact("");
      setNote("");
    } catch (error) {
      Alert.alert(
        "Chưa gửi được yêu cầu",
        error instanceof Error
          ? error.message
          : "Hãy kiểm tra kết nối rồi thử lại.",
      );
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Brand />
        </View>
        <View style={styles.header}>
          <Text style={styles.kicker}>DANH MỤC HOSTORA</Text>
          <Text style={styles.title}>Dịch vụ cho trang web.</Text>
          <Text style={styles.intro}>
            Tìm đúng dịch vụ, xem rõ giá và đặt mua ngay tại HOSTORA.
          </Text>
        </View>
        <View style={styles.howBar}>
          <Feather name="info" size={17} color={colors.primary} />
          <Text style={styles.howText}>
            Xem dịch vụ và gửi yêu cầu mua ngay trong HOSTORA. Giá được xác nhận
            trước khi tạo hóa đơn.
          </Text>
        </View>
        <View style={styles.search}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Tìm dịch vụ hoặc nhà cung cấp"
            placeholder="Tìm lưu trữ, tên miền, thư điện tử..."
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {categories.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item.id }}
              onPress={() => setCategory(item.id)}
              style={[
                styles.filter,
                category === item.id && styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  category === item.id && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.resultRow}>
          <Text style={styles.resultTitle}>
            {category === "all"
              ? "Tất cả dịch vụ"
              : categories.find((item) => item.id === category)?.label}
          </Text>
          <Text style={styles.resultCount}>{products.length} kết quả</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={load}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/settings")}
            >
              <Text style={styles.settingText}>Thiết lập kết nối</Text>
            </Pressable>
          </View>
        ) : null}
        {!loading && !error && products.length === 0 ? (
          <Text style={styles.empty}>
            Không có dịch vụ phù hợp. Thử từ khóa hoặc nhóm khác.
          </Text>
        ) : null}
        {products.map((item) => (
          <View key={item.id} style={styles.product}>
            <View style={styles.productMeta}>
              <Text style={styles.provider}>{item.provider}</Text>
              <Text style={styles.category}>
                {categories.find((entry) => entry.id === item.category)
                  ?.label ?? item.category}
              </Text>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.summary}>
              {toCustomerLanguage(categoryCopy[item.category] ?? item.summary)}
            </Text>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>GIÁ THAM KHẢO</Text>
              <Text style={styles.price}>
                {item.priceFromVnd == null
                  ? "Chưa có giá công bố"
                  : `Từ ${formatVnd(item.priceFromVnd)}${item.billingUnit === "year" ? "/năm" : item.billingUnit === "month" ? "/tháng" : ""}`}
              </Text>
              {item.priceNote ? (
                <Text style={styles.priceNote}>
                  {toCustomerLanguage(item.priceNote)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.source}>
              HOSTORA kiểm tra dữ liệu ngày {item.verifiedAt}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Yêu cầu mua ${item.name} qua HOSTORA`}
              onPress={() => {
                setSelected(item);
                setRequestResult(null);
              }}
              style={({ pressed }) => [
                styles.purchase,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.purchaseText}>Đặt mua qua HOSTORA</Text>
              <Feather name="arrow-right" size={18} color="white" />
            </Pressable>
          </View>
        ))}
        {data ? <Text style={styles.disclaimer}>{data.disclaimer}</Text> : null}
      </ScrollView>
      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            <View style={styles.modalCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => setSelected(null)}
                style={styles.modalClose}
              >
                <Feather name="x" size={22} color={colors.ink} />
              </Pressable>
              <Text style={styles.modalKicker}>MUA HÀNG QUA HOSTORA</Text>
              <Text style={styles.modalTitle}>{selected?.name}</Text>
              <Text style={styles.modalCopy}>
                {selected?.provider} · {selected?.summary}
              </Text>
              {requestResult ? (
                <View style={styles.requestSuccess}>
                  <Feather
                    name="check-circle"
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={styles.requestSuccessTitle}>
                    Hồ sơ đã gửi tới HOSTORA
                  </Text>
                  <Text style={styles.requestCode}>
                    Mã yêu cầu: {requestResult.id}
                  </Text>
                  <Text style={styles.modalCopy}>
                    Email xác nhận có nút theo dõi và hủy. Chưa có khoản tiền
                    nào bị thu.
                  </Text>
                  {requestResult.consultationPreference === "ai" ? (
                    <Button
                      label="AI tư vấn ngay"
                      icon="zap"
                      onPress={() => router.push("/(tabs)/assistant")}
                    />
                  ) : null}
                  <Button
                    label="Theo dõi hoặc hủy"
                    variant="secondary"
                    icon="clipboard"
                    onPress={() =>
                      router.push({
                        pathname: "/orders",
                        params: {
                          requestId: requestResult.id,
                          requestCode: requestResult.accessCode,
                        },
                      })
                    }
                  />
                </View>
              ) : (
                <View style={styles.modalForm}>
                  <Text style={styles.formSection}>
                    1 · NGƯỜI MUA VÀ DOANH NGHIỆP
                  </Text>
                  <Text style={styles.modalLabel}>Họ tên người phụ trách</Text>
                  <TextInput
                    accessibilityLabel="Họ tên người phụ trách"
                    style={styles.modalInput}
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Nguyễn Minh Anh"
                    placeholderTextColor={colors.muted}
                    maxLength={100}
                  />
                  <Text style={styles.modalLabel}>
                    Email nhận xác nhận và hóa đơn
                  </Text>
                  <TextInput
                    accessibilityLabel="Email nhận xác nhận và hóa đơn"
                    style={styles.modalInput}
                    value={contact}
                    onChangeText={setContact}
                    placeholder="ban@example.com"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    maxLength={160}
                  />
                  <Text style={styles.modalLabel}>Số điện thoại</Text>
                  <TextInput
                    accessibilityLabel="Số điện thoại"
                    style={styles.modalInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="09…"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                    maxLength={30}
                  />
                  <Text style={styles.modalLabel}>
                    Tên doanh nghiệp (không bắt buộc)
                  </Text>
                  <TextInput
                    accessibilityLabel="Tên doanh nghiệp"
                    style={styles.modalInput}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Công ty / cửa hàng"
                    placeholderTextColor={colors.muted}
                    maxLength={160}
                  />
                  <Text style={styles.modalLabel}>
                    Ngành hoặc loại hình kinh doanh
                  </Text>
                  <TextInput
                    accessibilityLabel="Ngành kinh doanh"
                    style={styles.modalInput}
                    value={businessType}
                    onChangeText={setBusinessType}
                    placeholder="Thời trang, nha khoa, giáo dục…"
                    placeholderTextColor={colors.muted}
                    maxLength={120}
                  />
                  <Text style={styles.modalLabel}>
                    Sản phẩm hoặc dịch vụ chủ lực
                  </Text>
                  <TextInput
                    accessibilityLabel="Sản phẩm hoặc dịch vụ chủ lực"
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={mainOffer}
                    onChangeText={setMainOffer}
                    placeholder="Bạn bán gì và điểm khác biệt là gì?"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={500}
                  />
                  <Text style={styles.formSection}>
                    2 · WEBSITE VÀ KHÁCH HÀNG
                  </Text>
                  <Text style={styles.modalLabel}>Tình trạng website</Text>
                  <ChoiceChips
                    value={websiteStatus}
                    onChange={setWebsiteStatus}
                    options={[
                      ["idea", "Mới có ý tưởng"],
                      ["building", "Đang xây"],
                      ["live", "Đã hoạt động"],
                      ["migrating", "Muốn chuyển"],
                    ]}
                  />
                  <Text style={styles.modalLabel}>
                    Website hiện tại (nếu có)
                  </Text>
                  <TextInput
                    accessibilityLabel="Website hiện tại"
                    style={styles.modalInput}
                    value={currentWebsite}
                    onChangeText={setCurrentWebsite}
                    placeholder="tenmien.vn"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    maxLength={253}
                  />
                  <Text style={styles.modalLabel}>Khu vực phục vụ</Text>
                  <TextInput
                    accessibilityLabel="Khu vực phục vụ"
                    style={styles.modalInput}
                    value={serviceArea}
                    onChangeText={setServiceArea}
                    placeholder="TP.HCM, toàn quốc…"
                    placeholderTextColor={colors.muted}
                    maxLength={160}
                  />
                  <Text style={styles.modalLabel}>Mục tiêu chính</Text>
                  <TextInput
                    accessibilityLabel="Mục tiêu website"
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={websiteGoal}
                    onChangeText={setWebsiteGoal}
                    placeholder="Bán hàng, nhận đặt lịch, giới thiệu doanh nghiệp…"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={500}
                  />
                  <Text style={styles.modalLabel}>Khách hàng mục tiêu</Text>
                  <TextInput
                    accessibilityLabel="Khách hàng mục tiêu"
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={targetCustomers}
                    onChangeText={setTargetCustomers}
                    placeholder="Ai truy cập và họ cần làm gì?"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={500}
                  />
                  <Text style={styles.modalLabel}>
                    Khách sẽ tìm bạn bằng từ nào? (không bắt buộc)
                  </Text>
                  <TextInput
                    accessibilityLabel="Từ khách dùng để tìm doanh nghiệp"
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={seoGoals}
                    onChangeText={setSeoGoals}
                    placeholder="Ví dụ: bánh sinh nhật tại Đà Nẵng"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={500}
                  />
                  <Text style={styles.modalLabel}>Lượt truy cập dự kiến</Text>
                  <ChoiceChips
                    value={estimatedTraffic}
                    onChange={setEstimatedTraffic}
                    options={[
                      ["under_1k", "< 1.000"],
                      ["1k_10k", "1–10 nghìn"],
                      ["10k_50k", "10–50 nghìn"],
                      ["over_50k", "> 50 nghìn"],
                    ]}
                  />
                  <Text style={styles.modalLabel}>Ngân sách mỗi tháng</Text>
                  <ChoiceChips
                    value={budgetRange}
                    onChange={setBudgetRange}
                    options={[
                      ["under_500k", "< 500 nghìn"],
                      ["500k_1m", "500 nghìn–1 triệu"],
                      ["1m_3m", "1–3 triệu"],
                      ["over_3m", "> 3 triệu"],
                    ]}
                  />
                  <Text style={styles.modalLabel}>Mã voucher (nếu có)</Text>
                  <TextInput
                    accessibilityLabel="Mã voucher"
                    style={styles.modalInput}
                    value={voucherCode}
                    onChangeText={(value) =>
                      setVoucherCode(value.toUpperCase())
                    }
                    placeholder="HOSTORA-…"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    maxLength={40}
                  />
                  <Text style={styles.formSection}>3 · CÁCH TƯ VẤN</Text>
                  <ChoiceChips
                    value={consultationPreference}
                    onChange={setConsultationPreference}
                    options={[
                      ["ai", "AI tư vấn ngay"],
                      ["scheduled", "Chọn lịch chuyên viên"],
                    ]}
                  />
                  {consultationPreference === "scheduled" ? (
                    <>
                      <Text style={styles.modalLabel}>
                        Ngày mong muốn (YYYY-MM-DD)
                      </Text>
                      <TextInput
                        accessibilityLabel="Ngày tư vấn"
                        style={styles.modalInput}
                        value={consultationDate}
                        onChangeText={setConsultationDate}
                        placeholder="2026-10-28"
                        placeholderTextColor={colors.muted}
                        maxLength={10}
                      />
                      <Text style={styles.modalLabel}>Khung giờ</Text>
                      <ChoiceChips
                        value={consultationTime}
                        onChange={setConsultationTime}
                        options={[
                          ["09:00", "09:00"],
                          ["14:00", "14:00"],
                          ["19:00", "19:00"],
                        ]}
                      />
                      <Text style={styles.modalLabel}>Kênh tư vấn</Text>
                      <ChoiceChips
                        value={consultationChannel}
                        onChange={setConsultationChannel}
                        options={[
                          ["email", "Email"],
                          ["phone", "Điện thoại"],
                          ["video", "Video"],
                        ]}
                      />
                    </>
                  ) : null}
                  <Text style={styles.modalLabel}>
                    Yêu cầu chi tiết (không bắt buộc)
                  </Text>
                  <TextInput
                    accessibilityLabel="Yêu cầu chi tiết"
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Sản phẩm đang bán, tính năng cần có, thời hạn triển khai…"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={1500}
                  />
                  <View style={styles.voucherBox}>
                    <Text style={styles.voucherTitle}>
                      Đơn từ 1 triệu: tặng voucher 100.000đ
                    </Text>
                    <Text style={styles.modalDisclaimer}>
                      Dùng cho đơn tiếp theo từ 1 triệu, hiệu lực 30 ngày sau
                      khi thanh toán được xác nhận.
                    </Text>
                  </View>
                  <Text style={styles.modalDisclaimer}>
                    Hồ sơ chỉ dùng để tư vấn, báo giá và vận hành đơn; không gửi
                    dữ liệu cá nhân vào AI.
                  </Text>
                  <Button
                    label={
                      requestBusy ? "Đang tạo hồ sơ…" : "Gửi hồ sơ mua hàng"
                    }
                    disabled={
                      requestBusy ||
                      customerName.trim().length < 2 ||
                      businessType.trim().length < 2 ||
                      mainOffer.trim().length < 3 ||
                      serviceArea.trim().length < 2 ||
                      websiteGoal.trim().length < 5 ||
                      targetCustomers.trim().length < 3 ||
                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()) ||
                      (consultationPreference === "scheduled" &&
                        consultationChannel === "phone" &&
                        phone.trim().length < 8)
                    }
                    onPress={() => void requestPurchase()}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ChoiceChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <View style={styles.choiceWrap}>
      {options.map(([id, label]) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityState={{ selected: value === id }}
          onPress={() => onChange(id)}
          style={[styles.choiceChip, value === id && styles.choiceChipActive]}
        >
          <Text
            style={[
              styles.choiceChipText,
              value === id && styles.choiceChipTextActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: {
    paddingBottom: 32,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  topbar: { paddingHorizontal: 20, paddingTop: 8 },
  header: { paddingHorizontal: 20, paddingTop: 11 },
  kicker: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.1,
  },
  title: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -1.15,
    marginTop: 5,
  },
  intro: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
  },
  howBar: {
    marginHorizontal: 20,
    marginTop: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  howText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 11,
    lineHeight: 18,
    flex: 1,
  },
  search: {
    marginHorizontal: 20,
    marginTop: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  filters: { paddingHorizontal: 20, paddingVertical: 11, gap: 8 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: "center",
  },
  filterActive: { backgroundColor: colors.ink },
  filterText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  filterTextActive: { color: "white" },
  resultRow: {
    marginHorizontal: 20,
    marginTop: 3,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  resultTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 19,
  },
  resultCount: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  loading: { marginTop: 30 },
  errorBox: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 18,
    gap: 12,
  },
  errorText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
    lineHeight: 19,
  },
  retry: {
    backgroundColor: colors.primary,
    padding: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  retryText: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  settingText: {
    color: colors.primary,
    textAlign: "center",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  empty: {
    marginHorizontal: 20,
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  product: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 21,
    padding: 16,
  },
  productMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  provider: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  category: {
    color: colors.muted,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 9,
  },
  name: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 19,
    marginTop: 8,
  },
  summary: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 19,
    marginTop: 5,
  },
  priceBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 15,
    paddingTop: 13,
  },
  priceLabel: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  price: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
    marginTop: 3,
  },
  priceNote: {
    color: colors.warning,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    marginTop: 4,
  },
  source: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    marginTop: 13,
    marginBottom: 12,
  },
  purchase: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  purchaseText: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(5, 23, 33, 0.68)",
  },
  modalScroll: { flexGrow: 1, justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    paddingBottom: 34,
    minHeight: 420,
  },
  modalClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  modalKicker: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    letterSpacing: 1,
    fontSize: 10,
    marginTop: 6,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 24,
    marginTop: 9,
  },
  modalCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
  modalForm: { gap: 10, marginTop: 21 },
  formSection: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
    letterSpacing: 0.9,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  modalLabel: {
    color: colors.text,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
    marginTop: 4,
  },
  modalInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    backgroundColor: "white",
    paddingHorizontal: 13,
    color: colors.text,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  modalTextarea: { minHeight: 85, textAlignVertical: "top", paddingTop: 12 },
  modalDisclaimer: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    marginVertical: 3,
  },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choiceChip: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    borderRadius: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceChipText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  choiceChipTextActive: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
  },
  voucherBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primarySoft,
    padding: 13,
    borderRadius: 10,
    marginTop: 8,
  },
  voucherTitle: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 12,
  },
  requestSuccess: {
    marginTop: 24,
    gap: 9,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: "white",
  },
  requestSuccessTitle: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 16,
  },
  requestCode: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
  },
  disclaimer: {
    marginHorizontal: 20,
    marginTop: 8,
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 18,
  },
});
