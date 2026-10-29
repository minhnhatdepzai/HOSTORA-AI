import { DetailHeader } from "@/components/detail-header";
import { Pressable } from "@/components/pressable";
import { Button, CinematicScrollView } from "@/components/ui";
import { colors } from "@/constants/theme";
import { getJson } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Article = {
  slug: string;
  stage: string;
  title: string;
  summary: string;
  minutes: number;
  sections: { heading: string; paragraphs: string[]; checklist?: string[] }[];
  action: { label: string; href: string };
};
function isArticleList(value: unknown): value is Article[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.slug === "string" &&
        typeof item.title === "string" &&
        typeof item.summary === "string" &&
        typeof item.stage === "string" &&
        typeof item.minutes === "number" &&
        Array.isArray(item.sections) &&
        item.sections.every(
          (section: unknown) =>
            section &&
            typeof section === "object" &&
            "heading" in section &&
            typeof section.heading === "string" &&
            "paragraphs" in section &&
            Array.isArray(section.paragraphs) &&
            section.paragraphs.every((paragraph: unknown) => typeof paragraph === "string") &&
            (!("checklist" in section) ||
              (Array.isArray(section.checklist) &&
                section.checklist.every((item: unknown) => typeof item === "string"))),
        ) &&
        item.action &&
        typeof item.action.label === "string" &&
        typeof item.action.href === "string",
    )
  );
}
const appActions: Record<string, Href> = {
  "/website-studio": "/studio",
  "/services": "/products",
  "/website-analyzer": "/analyzer",
  "/ai-assistant": "/assistant",
};
const journalCacheKey = "hostora:journal:v1";

export default function JournalScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingCache, setUsingCache] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setUsingCache(false);
    try {
      const result = await getJson<{ articles: Article[] }>("/api/journal");
      if (!isArticleList(result.articles))
        throw new Error("Nội dung không hợp lệ");
      setArticles(result.articles);
      void AsyncStorage.setItem(
        journalCacheKey,
        JSON.stringify(result.articles),
      ).catch(() => undefined);
    } catch {
      try {
        const cached = await AsyncStorage.getItem(journalCacheKey);
        const parsed: unknown = cached ? JSON.parse(cached) : null;
        if (!isArticleList(parsed)) throw new Error("Không có nội dung đã lưu");
        setArticles(parsed);
        setUsingCache(true);
      } catch {
        setError("Chưa tải được sổ tay. Kiểm tra kết nối HOSTORA rồi thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [slug, articles]);
  const article = articles.find((item) => item.slug === slug);
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom", "left", "right"]}
    >
      <DetailHeader title={article ? "Bài hướng dẫn" : "Sổ tay HOSTORA"} />
      <CinematicScrollView scrollRef={scrollRef} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator
            style={styles.loading}
            color={colors.primary}
            accessibilityLabel="Đang tải sổ tay"
          />
        ) : null}
        {error ? (
          <View style={styles.error}>
            <Text style={styles.copy}>{error}</Text>
            <Button label="Thử lại" onPress={() => void load()} />
          </View>
        ) : null}
        {usingCache ? (
          <Text style={styles.cacheNotice}>
            Đang xem bản sổ tay đã lưu trên điện thoại. Kết nối lại để nhận nội
            dung mới.
          </Text>
        ) : null}
        {!loading && !error && slug && !article ? (
          <Text style={styles.copy}>
            Không tìm thấy bài này. Hãy chọn một bài trong sổ tay.
          </Text>
        ) : null}
        {article ? (
          <>
            <Text style={styles.kicker}>{article.stage.toUpperCase()}</Text>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.lede}>{article.summary}</Text>
            <Text style={styles.reading}>{article.minutes} PHÚT ĐỌC</Text>
            {article.sections.map((section, index) => (
              <View key={section.heading} style={styles.section}>
                <Text style={styles.number}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={styles.heading}>{section.heading}</Text>
                {section.paragraphs.map((paragraph) => (
                  <Text key={paragraph} style={styles.copy}>
                    {paragraph}
                  </Text>
                ))}
                {section.checklist ? (
                  <View style={styles.checklist}>
                    <Text style={styles.checklistTitle}>
                      Việc bạn có thể kiểm tra ngay
                    </Text>
                    {section.checklist.map((item) => (
                      <Text key={item} style={styles.checkitem}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            <View style={styles.action}>
              <Text style={styles.actionTitle}>Làm tiếp một bước</Text>
              <Button
                label={article.action.label}
                icon="arrow-up-right"
                onPress={() =>
                  router.push(appActions[article.action.href] ?? "/(tabs)")
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/journal" as Href)}
              style={styles.allLink}
            >
              <Text style={styles.allLinkText}>Xem các bài khác</Text>
              <Feather name="arrow-right" size={18} color={colors.primary} />
            </Pressable>
          </>
        ) : !slug && !loading && !error ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>TỪ Ý TƯỞNG ĐẾN NGÀY RA MẮT</Text>
              <Text style={styles.heroTitle}>Mỗi chặng một việc rõ ràng.</Text>
              <Text style={styles.heroCopy}>
                Đọc đúng phần bạn đang làm, rồi quay lại đây khi cần bước tiếp
                theo.
              </Text>
            </View>
            {articles.map((item, index) => (
              <Pressable
                key={item.slug}
                accessibilityRole="button"
                accessibilityLabel={`Đọc bài ${item.title}`}
                onPress={() =>
                  router.push(
                    `/journal?slug=${encodeURIComponent(item.slug)}` as Href,
                  )
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.rowNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowStage}>{item.stage}</Text>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSummary}>{item.summary}</Text>
                  <Text style={styles.rowReading}>{item.minutes} phút đọc</Text>
                </View>
                <Feather
                  name="arrow-up-right"
                  size={19}
                  color={colors.primary}
                />
              </Pressable>
            ))}
          </>
        ) : null}
      </CinematicScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cacheNotice: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    padding: 12,
    lineHeight: 20,
    marginBottom: 14,
    borderRadius: 10,
  },
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 56 },
  loading: { marginTop: 56 },
  error: { gap: 18, paddingTop: 30 },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    padding: 25,
    marginBottom: 18,
  },
  heroKicker: {
    color: colors.mint,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  heroTitle: {
    color: "white",
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    marginTop: 13,
  },
  heroCopy: {
    color: "#CADBD2",
    fontFamily: "BeVietnamPro_400Regular",
    lineHeight: 22,
    marginTop: 12,
  },
  row: {
    minHeight: 136,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    paddingVertical: 21,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pressed: { opacity: 0.72 },
  rowNumber: {
    width: 28,
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
  },
  rowBody: { flex: 1 },
  rowStage: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  rowTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 17,
    lineHeight: 24,
    marginTop: 6,
  },
  rowSummary: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
  rowReading: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 11,
    marginTop: 10,
  },
  kicker: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 27,
    lineHeight: 36,
    letterSpacing: -0.8,
    marginTop: 12,
  },
  lede: {
    color: colors.inkSoft,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 15,
    lineHeight: 25,
    marginTop: 13,
  },
  reading: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
    letterSpacing: 0.7,
    marginTop: 20,
    marginBottom: 12,
  },
  section: {
    paddingVertical: 25,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  number: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  heading: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 21,
    lineHeight: 29,
    marginTop: 7,
    marginBottom: 12,
  },
  copy: {
    color: colors.inkSoft,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 12,
  },
  checklist: {
    backgroundColor: colors.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 17,
    marginTop: 8,
  },
  checklistTitle: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 13,
    marginBottom: 10,
  },
  checkitem: {
    color: colors.inkSoft,
    fontFamily: "BeVietnamPro_400Regular",
    lineHeight: 23,
    marginBottom: 5,
  },
  action: { padding: 20, backgroundColor: colors.surfaceAlt, gap: 16 },
  actionTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 17,
  },
  allLink: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  allLinkText: { color: colors.primary, fontFamily: "BeVietnamPro_700Bold" },
});
