import { Pressable } from "@/components/pressable";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
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

type Suggestion = { domain: string; reason: string; availability?: string };

export default function DomainScreen() {
  const [brand, setBrand] = useState("Minh Nhật Fashion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);

  async function suggest() {
    setLoading(true);
    setError("");
    try {
      const output = await postJson<{
        suggestions?: Suggestion[];
        domains?: Suggestion[];
      }>("/api/ai/domain", { brand });
      setItems(output.suggestions ?? output.domains ?? []);
    } catch {
      setError(
        "Chưa thể tạo tên lúc này. Vui lòng kiểm tra kết nối rồi thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  const fallback = [
    "minhnhat.vn",
    "minhnhatfashion.com",
    "shopminhnhat.vn",
  ].map((domain, i) => ({
    domain,
    reason: [
      "Ngắn, gần tên thương hiệu",
      "Diễn đạt rõ ngành hàng",
      "Dễ hiểu với khách Việt",
    ][i],
  }));
  const display = items.length ? items : fallback;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top", "bottom", "left", "right"]}
    >
      <DetailHeader
        title="Cố vấn tên miền"
        action={<Pill tone="blue">GỢI Ý NHANH</Pill>}
      />
      <Screen insetTop={false}>
        <View style={styles.intro}>
          <Eyebrow>Ý tưởng tên miền</Eyebrow>
          <Title style={{ marginTop: 8 }}>
            Tìm một cái tên dễ nhớ.
          </Title>
          <Body style={{ marginTop: 10 }}>
            HOSTORA gợi ý tên dễ nhớ. Bạn cần kiểm tra lại trước khi đăng ký vì
            tên miền có thể đã được người khác mua.
          </Body>
        </View>
        <View style={styles.content}>
          <Card dark style={{ gap: 13 }}>
            <Text style={styles.label}>TÊN THƯƠNG HIỆU</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="Ví dụ: Tiệm Mây"
              placeholderTextColor="#718196"
              style={styles.input}
            />
            {loading ? (
              <ActivityIndicator color={colors.mint} />
            ) : (
              <Button
                label="Xem gợi ý tên miền"
                icon="zap"
                variant="mint"
                disabled={brand.trim().length < 2}
                onPress={() => void suggest()}
              />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Card>

          <View style={styles.signalRow}>
            <Signal value="Dễ gõ" icon="edit-3" />
            <Signal value="Dễ nhớ" icon="bookmark" />
            <Signal value="Hợp VN" icon="map-pin" />
          </View>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Tên miền đề xuất</Text>
            <Pill tone="warning">CHƯA KIỂM TRA CÒN TRỐNG</Pill>
          </View>
          {display.map((item, index) => (
            <Pressable
              key={item.domain}
              style={({ pressed }) => [
                styles.domain,
                pressed && { opacity: 0.72 },
              ]}
            >
              <View
                style={[
                  styles.rank,
                  index === 0 && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[styles.rankText, index === 0 && { color: "white" }]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.domainName}>{item.domain}</Text>
                <Text style={styles.reason}>{item.reason}</Text>
              </View>
              <Feather name="copy" color={colors.primary} size={17} />
            </Pressable>
          ))}
          <Card style={styles.note}>
            <Feather name="info" color={colors.primary} size={17} />
            <Text style={styles.noteText}>
              “Chưa kiểm tra” không có nghĩa là tên miền còn mua được. Hãy gửi
              yêu cầu trên HOSTORA để được xác minh trước khi tạo hóa đơn.
            </Text>
          </Card>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

function Signal({
  value,
  icon,
}: {
  value: string;
  icon: "edit-3" | "bookmark" | "map-pin";
}) {
  return (
    <View style={styles.signal}>
      <Feather name={icon} color={colors.success} size={15} />
      <Text style={styles.signalText}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 16 },
  label: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
    color: "white",
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 13,
  },
  error: {
    color: "#FFC9C9",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 15,
  },
  signalRow: { flexDirection: "row", gap: 8 },
  signal: {
    flex: 1,
    backgroundColor: colors.successSoft,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  signalText: {
    color: colors.success,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 9,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  listTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
  },
  domain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 13,
  },
  domainName: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 14,
  },
  reason: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    marginTop: 3,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: colors.primarySoft,
    shadowOpacity: 0,
  },
  noteText: {
    flex: 1,
    color: colors.primary,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 16,
  },
});
