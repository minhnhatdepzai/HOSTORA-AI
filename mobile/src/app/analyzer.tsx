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

type Result = {
  url: string;
  title: string | null;
  description: string | null;
  score: number;
  checks: Record<string, boolean>;
  disclaimer: string;
};
const labels: Record<string, string> = {
  title: "Tên trang",
  description: "Mô tả trên Google",
  viewport: "Hiển thị trên điện thoại",
  favicon: "Biểu tượng trang web",
  language: "Ngôn ngữ trang",
  https: "HTTPS",
  headings: "Một tiêu đề chính",
};

export default function AnalyzerScreen() {
  const [url, setUrl] = useState("https://example.com");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await postJson<Result>("/api/website-analyzer", { url }));
    } catch {
      setError("Chưa thể kiểm tra trang web. Hãy kiểm tra địa chỉ và thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      edges={["top", "bottom", "left", "right"]}
    >
      <DetailHeader
        title="Phân tích trang web"
        action={<Pill tone="mint">KIỂM TRA AN TOÀN</Pill>}
      />
      <Screen insetTop={false}>
        <View style={styles.intro}>
          <Eyebrow>Kiểm tra trang web</Eyebrow>
          <Title style={{ marginTop: 8 }}>
            Xem trang web cần sửa gì.
          </Title>
          <Body style={{ marginTop: 10 }}>
            Kiểm tra những gì khách truy cập và Google có thể nhìn thấy; không
            đoán hiệu năng khi chưa có dữ liệu thực tế.
          </Body>
        </View>
        <View style={styles.content}>
          <Card dark style={{ gap: 12 }}>
            <Text style={styles.label}>ĐỊA CHỈ TRANG WEB</Text>
            <View style={styles.inputWrap}>
              <Feather name="globe" color={colors.mint} size={17} />
              <TextInput
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://example.com"
                placeholderTextColor="#718196"
                style={styles.input}
              />
            </View>
            {loading ? (
              <ActivityIndicator color={colors.mint} />
            ) : (
              <Button
                label="Bắt đầu phân tích"
                icon="search"
                variant="mint"
                disabled={url.trim().length < 4}
                onPress={() => void analyze()}
              />
            )}
            {error ? (
              <View style={styles.error}>
                <Feather name="alert-triangle" color="#FFC1C1" size={15} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </Card>

          {result ? (
            <>
              <Card style={styles.scoreCard}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.score}>{result.score}</Text>
                  <Text style={styles.scoreSub}>/100</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>
                    {result.title || "Chưa có tên trang"}
                  </Text>
                  <Text style={styles.resultUrl} numberOfLines={1}>
                    {result.url}
                  </Text>
                  <Text style={styles.resultCopy} numberOfLines={3}>
                    {result.description ||
                      "Chưa có mô tả hiển thị trên Google."}
                  </Text>
                </View>
              </Card>
              <Text style={styles.sectionTitle}>Các mục cần thiết</Text>
              <Card style={{ padding: 4, overflow: "hidden" }}>
                {Object.entries(result.checks).map(([key, passed], index) => (
                  <View
                    key={key}
                    style={[styles.check, index > 0 && styles.checkBorder]}
                  >
                    <View
                      style={[
                        styles.checkIcon,
                        {
                          backgroundColor: passed
                            ? colors.successSoft
                            : colors.dangerSoft,
                        },
                      ]}
                    >
                      <Feather
                        name={passed ? "check" : "x"}
                        color={passed ? colors.success : colors.danger}
                        size={15}
                      />
                    </View>
                    <Text style={styles.checkLabel}>{labels[key] ?? key}</Text>
                    <Text
                      style={[
                        styles.checkState,
                        { color: passed ? colors.success : colors.danger },
                      ]}
                    >
                      {passed ? "Đạt" : "Cần sửa"}
                    </Text>
                  </View>
                ))}
              </Card>
              <View style={styles.disclaimer}>
                <Feather name="shield" color={colors.primary} size={17} />
                <Text style={styles.disclaimerText}>{result.disclaimer}</Text>
              </View>
            </>
          ) : (
            <Card style={styles.empty}>
              <View style={styles.radar}>
                <Feather name="crosshair" color={colors.primary} size={26} />
              </View>
              <Text style={styles.emptyTitle}>Sẵn sàng kiểm tra</Text>
              <Text style={styles.emptyCopy}>
                Nhập địa chỉ trang web để xem những mục đang đạt và những mục cần
                cải thiện.
              </Text>
            </Card>
          )}
        </View>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: 18, paddingTop: 12 },
  content: { paddingHorizontal: 18, paddingTop: 22, gap: 15 },
  label: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1.2,
  },
  inputWrap: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },
  input: {
    flex: 1,
    color: "white",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 12,
  },
  error: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  errorText: {
    flex: 1,
    color: "#FFC1C1",
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 15,
  },
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 15 },
  scoreCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 7,
    borderColor: colors.mintStrong,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  score: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 23,
  },
  scoreSub: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 8,
  },
  resultTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 14,
  },
  resultUrl: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    marginTop: 2,
  },
  resultCopy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
    marginTop: 4,
  },
  check: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  checkBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  checkIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  checkState: { fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 9 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: 13,
  },
  disclaimerText: {
    flex: 1,
    color: colors.primary,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 9,
    lineHeight: 16,
  },
  empty: { alignItems: "center", paddingVertical: 35 },
  radar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 16,
    marginTop: 13,
  },
  emptyCopy: {
    maxWidth: 260,
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },
});
