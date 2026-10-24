import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailHeader } from "@/components/detail-header";
import { Body, Card, Eyebrow, Pill, Screen, Title } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { getJson } from "@/lib/api";
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
  "all",
  "hosting",
  "wordpress",
  "vps",
  "cloud",
  "domain",
  "email",
  "ssl",
  "automation",
  "workspace",
];
const categoryLabel: Record<string, string> = {
  all: "Tất cả",
  hosting: "Hosting",
  wordpress: "WordPress",
  vps: "Máy chủ riêng",
  cloud: "Hosting linh hoạt",
  domain: "Tên miền",
  email: "Email",
  ssl: "Bảo mật website",
  automation: "Tự động hóa",
  workspace: "Công cụ văn phòng",
};

const categorySummary: Record<string, string> = {
  hosting: "Gói lưu trữ phù hợp cho website mới, blog và cửa hàng nhỏ.",
  wordpress: "Gói được chuẩn bị sẵn cho website dùng WordPress.",
  vps: "Máy chủ riêng dành cho website cần cách vận hành riêng và có người có kinh nghiệm phụ trách.",
  cloud:
    "Hosting linh hoạt cho website đang tăng trưởng hoặc có lượng khách thay đổi nhiều.",
  domain: "Địa chỉ giúp khách dễ tìm và ghi nhớ website của bạn.",
  email: "Email mang tên thương hiệu dành cho doanh nghiệp.",
  ssl: "Dịch vụ giúp bảo vệ kết nối giữa khách và website.",
  automation: "Công cụ giúp giảm các thao tác lặp lại trong công việc.",
  workspace: "Bộ công cụ làm việc và cộng tác cho doanh nghiệp.",
};

const categoryUses: Record<string, string[]> = {
  hosting: ["website mới", "blog", "shop nhỏ"],
  wordpress: ["website WordPress", "bán hàng", "nội dung"],
  vps: ["ứng dụng riêng", "đội ngũ có kinh nghiệm"],
  cloud: ["shop tăng trưởng", "nhiều website", "khách truy cập thay đổi"],
  domain: ["thương hiệu", "website mới"],
  email: ["email thương hiệu", "đội nhóm"],
  ssl: ["bảo vệ website", "doanh nghiệp"],
  automation: ["tiết kiệm thời gian", "công việc lặp lại"],
  workspace: ["làm việc nhóm", "doanh nghiệp"],
};

export default function ProductsScreen() {
  const [data, setData] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    getJson<ProductResponse>("/api/products")
      .then(setData)
      .catch(() =>
        setError(
          "Chưa tải được danh sách sản phẩm. Vui lòng kiểm tra kết nối.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(
    () =>
      (data?.products ?? []).filter((item) => {
        const matchCategory = category === "all" || item.category === category;
        const haystack =
          `${item.provider} ${item.name} ${item.summary} ${item.bestFor.join(" ")}`.toLowerCase();
        return matchCategory && haystack.includes(query.trim().toLowerCase());
      }),
    [category, data, query],
  );
  const providers = new Set(data?.products.map((item) => item.provider)).size;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <DetailHeader
        title="Kho sản phẩm"
        action={<Pill tone="mint">ĐÃ ĐỐI CHIẾU</Pill>}
      />
      <Screen>
        <View style={styles.intro}>
          <Eyebrow>Danh sách sản phẩm</Eyebrow>
          <Title style={{ marginTop: 8 }}>So sánh rộng, chọn có căn cứ.</Title>
          <Body style={{ marginTop: 10 }}>
            Hosting, tên miền, email, bảo mật website và công cụ doanh nghiệp từ
            nguồn chính thức.
          </Body>
        </View>
        <View style={styles.content}>
          <Card dark style={styles.stats}>
            <Stat value={String(data?.catalogTotal ?? 0)} label="Sản phẩm" />
            <Stat value={String(providers)} label="Nhà cung cấp" />
            <Stat value={String(categories.length - 1)} label="Nhóm" />
          </Card>
          <View style={styles.search}>
            <Feather name="search" size={18} color={colors.faint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm hosting, WordPress, email..."
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
          </View>
          <View style={styles.chips}>
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.chip, category === item && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === item && styles.chipTextActive,
                  ]}
                >
                  {categoryLabel[item]}
                </Text>
              </Pressable>
            ))}
          </View>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          {error ? (
            <Card>
              <Text style={styles.error}>{error}</Text>
            </Card>
          ) : null}
          <Text style={styles.result}>{products.length} kết quả phù hợp</Text>
          {products.map((item) => (
            <Card key={item.id} style={styles.product}>
              <View style={styles.productTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.provider}>{item.provider}</Text>
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                <Pill>{categoryLabel[item.category] ?? item.category}</Pill>
              </View>
              <Text style={styles.summary}>
                {categorySummary[item.category] ?? item.summary}
              </Text>
              <Text style={styles.price}>
                {item.priceFromVnd == null
                  ? "Liên hệ báo giá"
                  : `Từ ${formatVnd(item.priceFromVnd)}/${item.billingUnit === "year" ? "năm" : "tháng"}`}
              </Text>
              <View style={styles.tags}>
                {(categoryUses[item.category] ?? item.bestFor).map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
              <View style={styles.source}>
                <Feather name="check-circle" size={13} color={colors.success} />
                <Text style={styles.sourceText}>
                  Nguồn chính thức · kiểm tra {item.verifiedAt}
                </Text>
              </View>
              {item.priceNote ? (
                <Text style={styles.note}>
                  Giá có thể phụ thuộc thời hạn thanh toán. Hãy kiểm tra trang
                  chính thức trước khi mua.
                </Text>
              ) : null}
            </Card>
          ))}
          {data ? (
            <Text style={styles.disclaimer}>{data.disclaimer}</Text>
          ) : null}
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 13 },
  stats: { flexDirection: "row", gap: 12 },
  statValue: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 24,
  },
  statLabel: {
    color: "#A6B4C4",
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 9,
    marginTop: 2,
  },
  search: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 15,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  chipTextActive: { color: "white" },
  result: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  product: { gap: 11 },
  productTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  provider: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  name: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 20,
    marginTop: 3,
  },
  summary: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    lineHeight: 18,
  },
  price: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 15,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 8,
  },
  source: { flexDirection: "row", alignItems: "center", gap: 6 },
  sourceText: {
    color: colors.success,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 8,
  },
  note: {
    color: colors.warning,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 8,
    lineHeight: 14,
  },
  disclaimer: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
  },
  error: {
    color: colors.danger,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 11,
  },
});
