import { Pressable } from "@/components/pressable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, CinematicScrollView, Pill } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { deleteJson, getApiBase, getJson, postJson } from "@/lib/api";
import { readCustomerSessionToken } from "@/lib/auth-session";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { toCustomerLanguage } from "@/lib/customer-language";
import {
  citedSources,
  parseChatSources,
  readChatSources,
  type ChatSource,
} from "@/lib/chat-sources";
import {
  buildConversationMemory,
  recentChatMessages,
  type MobileChatMemory,
} from "@/lib/chat-memory";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  ragMode?: string;
  nextAction?: "create-site" | "upload-screen";
};
// A new key keeps customer-facing copy separate from conversations created by older builds.
const KEY = "hostora:mobile:chat:v3";
const MEMORY_KEY = "hostora:mobile:chat-memory:v1";
const starters = [
  "Tôi chưa có trang web, bắt đầu từ đâu?",
  "Cửa hàng mới nên chọn gói nào?",
  "Làm sao để trang web nhanh khi đông khách?",
  "Giá gia hạn khác gì giá đầu?",
];

function customerAnswer(content: string, sources: ChatSource[] = []) {
  return toCustomerLanguage(
    sources.reduce(
      (answer, source, index) =>
        answer.split(`[${source.citation}]`).join(`[Dữ liệu ${index + 1}]`),
      content,
    ),
  );
}

function randomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export default function AssistantScreen() {
  const { customer, hydrated: authHydrated } = useCustomerAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Chào bạn, mình là HOSTORA — trợ lý chọn lưu trữ và tên miền. Bạn đang chuẩn bị trang web gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceCount, setSourceCount] = useState(0);
  const [memory, setMemory] = useState<MobileChatMemory | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const list = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (!authHydrated) return;
    let active = true;
    async function hydrateHistory() {
      setHistoryLoading(true);
      try {
        if (customer) {
          const [history, sourceData] = await Promise.all([
            getJson<{
              conversationId: string | null;
              messages: {
                role: Message["role"];
                content: string;
                sources?: unknown[];
              }[];
              memory: MobileChatMemory | null;
            }>("/api/account/chat-history"),
            getJson<{ sources: { id: string }[] }>("/api/account/ai-sources"),
          ]);
          if (!active) return;
          setSourceCount(sourceData.sources.length);
          setConversationId(history.conversationId);
          setMemory(history.memory);
          if (history.messages.length)
            setMessages(
              history.messages.map((message) => ({
                role: message.role,
                content: message.content,
                sources: parseChatSources(message.sources),
              })),
            );
          return;
        }
        const [saved, savedMemory] = await Promise.all([
          AsyncStorage.getItem(KEY),
          AsyncStorage.getItem(MEMORY_KEY),
        ]);
        if (!active) return;
        if (saved) setMessages(JSON.parse(saved));
        if (savedMemory) setMemory(JSON.parse(savedMemory));
      } catch {
        // Keep the useful local greeting if history cannot be refreshed.
      } finally {
        if (active) setHistoryLoading(false);
      }
    }
    void hydrateHistory();
    return () => {
      active = false;
    };
  }, [authHydrated, customer]);

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Message[] = [...messages, { role: "user", content: clean }];
    const nextMemory = buildConversationMemory(
      next.map(({ role, content }) => ({ role, content })),
      memory,
    );
    setMessages(next);
    setMemory(nextMemory);
    setInput("");
    setLoading(true);
    try {
      const apiBase = await getApiBase();
      if (!apiBase) throw new Error("Chưa có kết nối tư vấn.");
      const token = await readCustomerSessionToken();
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hostora-client": "mobile",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: recentChatMessages(next.map(({ role, content }) => ({ role, content }))),
          memory: nextMemory,
          ...(conversationId ? { conversationId } : {}),
          messageId: randomUuid(),
        }),
      });
      const answer = await response.text();
      if (!response.ok || !answer)
        throw new Error(answer || "Trợ lý chưa phản hồi.");
      const nextConversationId = response.headers.get(
        "x-hostora-conversation-id",
      );
      if (nextConversationId) setConversationId(nextConversationId);
      const completed: Message[] = [
        ...next,
        {
          role: "assistant",
          content: answer,
          sources: readChatSources(response.headers.get("x-hostora-sources")),
          ragMode: response.headers.get("x-hostora-rag-mode") ?? undefined,
          nextAction: ["create-site", "upload-screen"].includes(
            response.headers.get("x-hostora-next-action") ?? "",
          )
            ? (response.headers.get("x-hostora-next-action") as
                "create-site" | "upload-screen")
            : undefined,
        },
      ];
      setMessages(completed);
      if (!customer) {
        await AsyncStorage.setItem(KEY, JSON.stringify(completed));
        await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(nextMemory));
      }
    } catch {
      const failed: Message[] = [
        ...next,
        {
          role: "assistant",
          content:
            "Mình chưa thể trả lời lúc này. Vui lòng mở phần Kết nối, kiểm tra lại rồi thử lần nữa.",
        },
      ];
      setMessages(failed);
      if (!customer) {
        await AsyncStorage.setItem(KEY, JSON.stringify(failed));
        await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(nextMemory));
      }
    } finally {
      setLoading(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  async function inspectScreenshot() {
    if (loading || imageLoading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      Alert.alert("Chưa đọc được ảnh", "Hãy chọn lại một ảnh màn hình rõ hơn.");
      return;
    }
    if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
      Alert.alert("Ảnh quá lớn", "HOSTORA chỉ nhận ảnh tối đa 5 MB.");
      return;
    }
    const mimeType =
      asset.mimeType === "image/png" ||
      asset.mimeType === "image/webp" ||
      asset.mimeType === "image/jpeg"
        ? asset.mimeType
        : "image/jpeg";
    const userMessage: Message = {
      role: "user",
      content: "Đã gửi ảnh màn hình để xác định bước tiếp theo.",
    };
    const next = [...messages, userMessage];
    const nextMemory = buildConversationMemory(
      next.map(({ role, content }) => ({ role, content })),
      memory,
    );
    setMessages(next);
    setMemory(nextMemory);
    setImageLoading(true);
    try {
      const apiBase = await getApiBase();
      if (!apiBase) throw new Error("Chưa có kết nối tư vấn.");
      const response = await fetch(`${apiBase}/api/ai/journey-ocr`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimeType, base64: asset.base64 }),
      });
      const payload = (await response.json()) as {
        guidance?: { title: string; summary: string; actions: string[] };
        error?: string;
      };
      if (!response.ok || !payload.guidance)
        throw new Error(payload.error || "Chưa đọc được màn hình.");
      const guidance = payload.guidance;
      const completed: Message[] = [
        ...next,
        {
          role: "assistant",
          content: `**${guidance.title}**\n\n${guidance.summary}\n\n${guidance.actions
            .map((action, index) => `${index + 1}. ${action}`)
            .join("\n")}`,
        },
      ];
      setMessages(completed);
      await AsyncStorage.setItem(KEY, JSON.stringify(completed));
      await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(nextMemory));
    } catch (error) {
      const failed: Message[] = [
        ...next,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Chưa đọc được ảnh. Hãy chụp lại rõ hơn.",
        },
      ];
      setMessages(failed);
      await AsyncStorage.setItem(KEY, JSON.stringify(failed));
      await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(nextMemory));
    } finally {
      setImageLoading(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  async function addKnowledgeFile() {
    if (loading || imageLoading || sourceLoading) return;
    if (!customer) {
      Alert.alert(
        "Cần đăng nhập",
        "Đăng nhập tài khoản HOSTORA để lưu tài liệu và dùng lại ở các lần tư vấn sau.",
      );
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/webp",
    ] as const;
    const mimeType = allowedMimeTypes.find((item) => item === asset.mimeType);
    if (!mimeType) {
      Alert.alert(
        "Định dạng chưa hỗ trợ",
        "Hãy chọn PDF, DOCX, TXT, Markdown, PNG, JPEG hoặc WebP.",
      );
      return;
    }
    const maxBytes = mimeType.startsWith("image/") ? 5 : 8;
    if ((asset.size ?? 0) > maxBytes * 1024 * 1024) {
      Alert.alert("File quá lớn", `HOSTORA chỉ nhận tối đa ${maxBytes} MB.`);
      return;
    }
    setSourceLoading(true);
    try {
      const base64 = await new File(asset.uri).base64();
      await postJson<{ source: { id: string } }>("/api/account/ai-sources", {
        kind: "file",
        filename: asset.name,
        mimeType,
        base64,
      });
      setSourceCount((current) => current + 1);
      Alert.alert(
        "Đã thêm tài liệu",
        "HOSTORA sẽ dùng nguồn này cho câu hỏi tiếp theo khi nội dung liên quan.",
      );
    } catch (error) {
      Alert.alert(
        "Chưa thêm được tài liệu",
        error instanceof Error ? error.message : "Kiểm tra kết nối rồi thử lại.",
      );
    } finally {
      setSourceLoading(false);
    }
  }

  async function performClear() {
    if (customer)
      await deleteJson<{ deleted: boolean }>("/api/account/chat-history");
    const initial: Message[] = [
      {
        role: "assistant",
        content: "Lịch sử đã được xóa. Bạn muốn tìm hiểu gì về lưu trữ?",
      },
    ];
    setMessages(initial);
    setConversationId(null);
    if (!customer) {
      setMemory(null);
      await AsyncStorage.setItem(KEY, JSON.stringify(initial));
      await AsyncStorage.removeItem(MEMORY_KEY);
    }
  }

  function clear() {
    Alert.alert(
      "Xóa lịch sử trò chuyện?",
      customer
        ? "Lịch sử sẽ được xóa khỏi tài khoản trên các thiết bị. Ghi nhớ nhu cầu vẫn được giữ."
        : "Thao tác này chỉ xóa dữ liệu trên thiết bị.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            void performClear().catch(() =>
                Alert.alert(
                  "Chưa xóa được lịch sử",
                  "Kiểm tra kết nối rồi thử lại.",
                ),
              );
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Brand />
          <View style={styles.headerRight}>
            <Pill tone="mint" icon="shield">
              RIÊNG TƯ
            </Pill>
            <Pressable
              onPress={clear}
              style={styles.trash}
              accessibilityRole="button"
              accessibilityLabel="Xóa lịch sử trò chuyện"
            >
              <Feather name="trash-2" color={colors.muted} size={17} />
            </Pressable>
          </View>
        </View>
        <View style={styles.heading}>
          <Text style={styles.kicker}>TRỢ LÝ HOSTORA</Text>
          <Text style={styles.title}>Hỏi về lưu trữ, xem rõ lựa chọn.</Text>
          <Text style={styles.copy}>
            Câu trả lời dựa trên bảng giá và tài liệu đã được kiểm tra
            {customer && sourceCount > 0
              ? ` · ${sourceCount} nguồn của bạn`
              : ""}
            .
          </Text>
        </View>

        <CinematicScrollView
          scrollRef={list}
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
                      {customerAnswer(message.content, message.sources)}
                    </Markdown>
                    {message.nextAction === "create-site" ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Tạo trang web ngay"
                        onPress={() => router.push("/studio")}
                        style={styles.nextAction}
                      >
                        <Text style={styles.nextActionText}>
                          Tạo trang web ngay
                        </Text>
                        <Feather name="arrow-right" color="white" size={17} />
                      </Pressable>
                    ) : null}
                    {message.nextAction === "upload-screen" ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Gửi ảnh màn hình"
                        onPress={() => void inspectScreenshot()}
                        style={styles.nextAction}
                      >
                        <Text style={styles.nextActionText}>
                          Gửi ảnh màn hình
                        </Text>
                        <Feather name="image" color="white" size={17} />
                      </Pressable>
                    ) : null}
                    {message.sources &&
                    citedSources(message.content, message.sources).length >
                      0 ? (
                      <View style={styles.sourceList}>
                        <Text style={styles.sourceHeading}>
                          DỮ LIỆU ĐÃ KIỂM TRA
                        </Text>
                        {citedSources(message.content, message.sources).map(
                          (source, sourceIndex) => (
                            <Text
                              key={source.citation}
                              style={styles.sourceLink}
                            >
                              Dữ liệu {sourceIndex + 1} · HOSTORA kiểm tra ngày{" "}
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
                        Chưa có đủ dữ liệu kiểm chứng; HOSTORA cần xác minh
                        trước khi bạn quyết định mua.
                      </Text>
                    ) : null}
                    {message.ragMode === "lexical-fallback" ? (
                      <Text style={styles.sourceWarning}>
                        Đang dùng dữ liệu dự phòng; HOSTORA cần xác minh trước
                        khi tạo hóa đơn.
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
          {historyLoading ? (
            <View style={styles.thinking} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.thinkingText}>Đang mở lịch sử gần nhất…</Text>
            </View>
          ) : null}
          {loading ? (
            <View style={styles.thinking}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.thinkingText}>
                HOSTORA đang kiểm tra thông tin…
              </Text>
            </View>
          ) : null}
        </CinematicScrollView>

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
          <Pressable
            disabled={loading || imageLoading || sourceLoading}
            onPress={() => void addKnowledgeFile()}
            accessibilityRole="button"
            accessibilityLabel="Thêm PDF, Word, văn bản hoặc ảnh làm kiến thức"
            style={[
              styles.imageButton,
              (loading || imageLoading || sourceLoading) && { opacity: 0.35 },
            ]}
          >
            {sourceLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Feather name="paperclip" color={colors.primary} size={19} />
            )}
          </Pressable>
          <Pressable
            disabled={loading || imageLoading || sourceLoading}
            onPress={() => void inspectScreenshot()}
            accessibilityRole="button"
            accessibilityLabel="Gửi ảnh màn hình để được hướng dẫn"
            style={[
              styles.imageButton,
              (loading || imageLoading || sourceLoading) && { opacity: 0.35 },
            ]}
          >
            {imageLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Feather name="image" color={colors.primary} size={19} />
            )}
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi HOSTORA về lưu trữ..."
            placeholderTextColor={colors.faint}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            disabled={!input.trim() || loading || imageLoading || sourceLoading}
            onPress={() => void send()}
            accessibilityRole="button"
            accessibilityLabel="Gửi câu hỏi cho HOSTORA"
            style={[
              styles.send,
              (!input.trim() || loading || imageLoading || sourceLoading) && {
                opacity: 0.35,
              },
            ]}
          >
            <Feather name="arrow-up" color="white" size={19} />
          </Pressable>
        </View>
        <Text style={styles.privacy}>
          Nội dung tư vấn được xử lý riêng tư · Dữ liệu do HOSTORA kiểm tra
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
  nextAction: {
    minHeight: 46,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextActionText: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 12,
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
  imageButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
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
