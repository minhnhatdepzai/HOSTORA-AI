import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, Pill } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { getApiBase } from "@/lib/api";
import {
  citedSources,
  readChatSources,
  type ChatSource,
} from "@/lib/chat-sources";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  ragMode?: string;
};
// Keep older conversations on device but never reuse answers grounded in an old catalog.
const KEY = "hostora:mobile:chat:v2";
const starters = [
  "Shop mới nên chọn gói nào?",
  "CDN giúp gì khi flash sale?",
  "Giá gia hạn khác gì giá đầu?",
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Chào bạn, mình là HOSTORA — trợ lý hosting chạy hoàn toàn bằng AI local. Bạn đang chuẩn bị website gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const list = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved) setMessages(JSON.parse(saved));
      })
      .catch(() => undefined);
  }, []);

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Message[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const apiBase = await getApiBase();
      if (!apiBase) throw new Error("Chưa cấu hình địa chỉ máy chạy Ollama.");
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next
            .slice(-12)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const answer = await response.text();
      if (!response.ok || !answer)
        throw new Error(answer || "Local AI chưa phản hồi.");
      const completed: Message[] = [
        ...next,
        {
          role: "assistant",
          content: answer,
          sources: readChatSources(response.headers.get("x-hostora-sources")),
          ragMode: response.headers.get("x-hostora-rag-mode") ?? undefined,
        },
      ];
      setMessages(completed);
      await AsyncStorage.setItem(KEY, JSON.stringify(completed));
    } catch (error) {
      const failed: Message[] = [
        ...next,
        {
          role: "assistant",
          content: `Mình chưa kết nối được local AI. ${error instanceof Error ? error.message : ""}`,
        },
      ];
      setMessages(failed);
      await AsyncStorage.setItem(KEY, JSON.stringify(failed));
    } finally {
      setLoading(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  function clear() {
    Alert.alert(
      "Xóa lịch sử chat?",
      "Thao tác này chỉ xóa dữ liệu trên thiết bị.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            const initial: Message[] = [
              {
                role: "assistant",
                content:
                  "Lịch sử đã được xóa. Bạn muốn tìm hiểu gì về hosting?",
              },
            ];
            setMessages(initial);
            void AsyncStorage.setItem(KEY, JSON.stringify(initial));
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Brand />
          <View style={styles.headerRight}>
            <Pill tone="mint" icon="circle">
              LOCAL AI
            </Pill>
            <Pressable
              onPress={clear}
              style={styles.trash}
              accessibilityRole="button"
              accessibilityLabel="Xóa lịch sử chat"
            >
              <Feather name="trash-2" color={colors.muted} size={17} />
            </Pressable>
          </View>
        </View>
        <View style={styles.heading}>
          <Text style={styles.kicker}>LOCAL RAG ASSISTANT</Text>
          <Text style={styles.title}>Hỏi sâu. Thấy rõ nguồn.</Text>
          <Text style={styles.copy}>
            Qwen trả lời từ catalog và kho kiến thức trên máy.
          </Text>
        </View>

        <ScrollView
          ref={list}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() =>
            list.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message, index) => (
            <View
              key={`${index}-${message.content.slice(0, 8)}`}
              style={[
                styles.messageRow,
                message.role === "user" && styles.messageRowUser,
              ]}
            >
              {message.role === "assistant" ? (
                <View style={styles.aiAvatar}>
                  <Feather name="zap" color={colors.mint} size={14} />
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  message.role === "user" ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {message.role === "assistant" ? (
                  <>
                    <Markdown style={markdownStyles}>
                      {message.content}
                    </Markdown>
                    {message.sources &&
                    citedSources(message.content, message.sources).length >
                      0 ? (
                      <View style={styles.sourceList}>
                        <Text style={styles.sourceHeading}>
                          NGUỒN ĐƯỢC TRÍCH DẪN
                        </Text>
                        {citedSources(message.content, message.sources).map(
                          (source) => (
                            <Text
                              key={source.citation}
                              accessibilityRole="link"
                              onPress={() =>
                                void Linking.openURL(source.sourceUrl)
                              }
                              style={styles.sourceLink}
                            >
                              [{source.citation}] {source.title} ·{" "}
                              {source.verifiedAt}
                            </Text>
                          ),
                        )}
                      </View>
                    ) : null}
                    {message.sources &&
                    message.sources.length > 0 &&
                    citedSources(message.content, message.sources).length ===
                      0 ? (
                      <Text style={styles.sourceWarning}>
                        Chưa có trích dẫn cụ thể; kiểm tra nguồn trước khi quyết
                        định mua.
                      </Text>
                    ) : null}
                    {message.ragMode === "lexical-fallback" ? (
                      <Text style={styles.sourceWarning}>
                        Embedding chưa sẵn sàng; đang truy xuất bằng từ khóa dự
                        phòng.
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={[styles.messageText, { color: "white" }]}>
                    {message.content}
                  </Text>
                )}
              </View>
            </View>
          ))}
          {loading ? (
            <View style={styles.thinking}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.thinkingText}>
                Qwen đang đọc nguồn local…
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {messages.length < 3 ? (
          <ScrollView
            horizontal
            style={styles.startersScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.starters}
          >
            {starters.map((item) => (
              <Pressable
                key={item}
                onPress={() => void send(item)}
                style={styles.starter}
              >
                <Text style={styles.starterText}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi HOSTORA về hosting..."
            placeholderTextColor={colors.faint}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            disabled={!input.trim() || loading}
            onPress={() => void send()}
            accessibilityRole="button"
            accessibilityLabel="Gửi câu hỏi cho HOSTORA"
            style={[
              styles.send,
              (!input.trim() || loading) && { opacity: 0.35 },
            ]}
          >
            <Feather name="arrow-up" color="white" size={19} />
          </Pressable>
        </View>
        <Text style={styles.privacy}>
          Không gửi nội dung tới AI cloud · Nguồn được gắn trong câu trả lời
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: "rgba(255,255,255,.9)",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 7 },
  trash: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { paddingHorizontal: 18, paddingTop: 22 },
  kicker: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontFamily: "BeVietnamPro_900Black",
    fontSize: 27,
    letterSpacing: -1,
    marginTop: 5,
  },
  copy: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 11,
    marginTop: 5,
  },
  chat: { flex: 1, marginTop: 14 },
  chatContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 13 },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "89%",
  },
  messageRowUser: { alignSelf: "flex-end" },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { borderRadius: 19, paddingHorizontal: 14, paddingVertical: 11 },
  aiBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  messageText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 20,
  },
  sourceList: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 7,
    paddingTop: 9,
    gap: 6,
  },
  sourceHeading: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 10,
  },
  sourceLink: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
    lineHeight: 18,
  },
  sourceWarning: {
    color: colors.warning,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 10,
    lineHeight: 17,
  },
  thinking: {
    marginLeft: 38,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 15,
  },
  thinkingText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  startersScroll: { flexGrow: 0, maxHeight: 58 },
  starters: { gap: 7, paddingHorizontal: 16, paddingVertical: 7 },
  starter: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
  },
  starterText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_600SemiBold",
    fontSize: 10,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginHorizontal: 12,
    padding: 7,
    borderRadius: radii.lg,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  privacy: {
    color: colors.faint,
    fontFamily: "BeVietnamPro_500Medium",
    fontSize: 8,
    textAlign: "center",
    paddingVertical: 7,
    paddingBottom: Platform.OS === "ios" ? 78 : 85,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 20,
  },
  paragraph: { marginTop: 0, marginBottom: 9 },
  heading1: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 18,
    lineHeight: 25,
    marginTop: 9,
    marginBottom: 7,
  },
  heading2: {
    color: colors.text,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 9,
    marginBottom: 7,
  },
  heading3: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 6,
  },
  strong: { fontFamily: "BeVietnamPro_700Bold" },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    marginVertical: 8,
  },
  tr: { borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row" },
  th: { flex: 1, padding: 6, backgroundColor: colors.primarySoft },
  td: { flex: 1, padding: 6 },
  link: { color: colors.primary },
});
