import { Pressable } from "@/components/pressable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { useApp } from "@/context/app-context";
import { toCustomerLanguage } from "@/lib/customer-language";
import {
  citedSources,
  numberedChatAnswer,
  parseChatSources,
  readChatSources,
  type ChatSource,
} from "@/lib/chat-sources";
import {
  buildConversationMemory,
  recentChatMessages,
  type MobileChatMemory,
} from "@/lib/chat-memory";
import { redactChatSensitiveInfo } from "@/lib/privacy";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  ragMode?: string;
  nextAction?: "create-site" | "upload-screen";
  fromAdmin?: boolean;
};
type SupportStatus = "active" | "escalated" | "answered" | "resolved";
// A new key keeps customer-facing copy separate from conversations created by older builds.
const KEY = "hostora:mobile:chat:v3";
const MEMORY_KEY = "hostora:mobile:chat-memory:v1";
const CONVERSATION_KEY = "hostora:mobile:conversation-id:v1";
const CONVERSATION_ACCESS_KEY = "hostora:mobile:conversation-access:v1";
const SUPPORT_STATUS_KEY = "hostora:mobile:support-status:v1";
const starters = [
  "Tôi chưa có trang web, bắt đầu từ đâu?",
  "Cửa hàng mới nên chọn gói nào?",
  "Làm sao để trang web nhanh khi đông khách?",
  "Giá gia hạn khác gì giá đầu?",
];

function customerAnswer(content: string, sources: ChatSource[] = []) {
  return toCustomerLanguage(numberedChatAnswer(content, sources));
}

function randomUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export default function AssistantScreen() {
  const { customer, hydrated: authHydrated } = useCustomerAuth();
  const { requirements } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Chào bạn, mình là HOSTORA. Mình sẽ dùng hồ sơ tài khoản và nhu cầu đã lưu; bạn chỉ cần nói điều muốn cải thiện hoặc nhắn “Tư vấn cho tôi”.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [memory, setMemory] = useState<MobileChatMemory | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationAccess, setConversationAccess] = useState<string | null>(
    null,
  );
  const [supportStatus, setSupportStatus] = useState<SupportStatus>("active");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null,
  );
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
                fromAdmin?: boolean;
              }[];
              memory: MobileChatMemory | null;
              supportStatus?: SupportStatus;
            }>("/api/account/chat-history"),
            getJson<{ sources: { id: string }[] }>("/api/account/ai-sources"),
          ]);
          if (!active) return;
          setSourceCount(sourceData.sources.length);
          setConversationId(history.conversationId);
          setMemory(history.memory);
          setSupportStatus(history.supportStatus ?? "active");
          if (history.messages.length)
            setMessages(
              history.messages.map((message) => ({
                role: message.role,
                content: message.content,
                sources: parseChatSources(message.sources),
                fromAdmin: message.fromAdmin,
              })),
            );
          return;
        }
        const [
          saved,
          savedMemory,
          savedConversationId,
          savedAccess,
          savedSupportStatus,
        ] = await Promise.all([
          AsyncStorage.getItem(KEY),
          AsyncStorage.getItem(MEMORY_KEY),
          AsyncStorage.getItem(CONVERSATION_KEY),
          AsyncStorage.getItem(CONVERSATION_ACCESS_KEY),
          AsyncStorage.getItem(SUPPORT_STATUS_KEY),
        ]);
        if (!active) return;
        if (saved) setMessages(JSON.parse(saved));
        if (savedMemory) setMemory(JSON.parse(savedMemory));
        if (savedConversationId) setConversationId(savedConversationId);
        if (savedAccess) setConversationAccess(savedAccess);
        if (
          savedSupportStatus === "active" ||
          savedSupportStatus === "escalated" ||
          savedSupportStatus === "answered" ||
          savedSupportStatus === "resolved"
        )
          setSupportStatus(savedSupportStatus);
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

  useEffect(() => {
    if (
      (supportStatus !== "active" && supportStatus !== "escalated") ||
      !conversationId ||
      (!customer && !conversationAccess)
    )
      return;
    let active = true;
    async function syncConversation() {
      const apiBase = await getApiBase();
      if (!apiBase) return;
      const token = await readCustomerSessionToken();
      const response = await fetch(
        `${apiBase}/api/ai/conversations/${conversationId}`,
        {
          headers: {
            "x-hostora-client": "mobile",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(!token && conversationAccess
              ? { "x-hostora-conversation-access": conversationAccess }
              : {}),
          },
        },
      );
      if (!response.ok || !active) return;
      const output = (await response.json()) as {
        conversation: {
          status: SupportStatus;
          messages: Array<{
            role: "user" | "assistant" | "admin";
            content: string;
            sources?: unknown[];
          }>;
        };
      };
      if (!active) return;
      setSupportStatus(output.conversation.status);
      if (output.conversation.status === "active") return;
      const synced: Message[] = output.conversation.messages.map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.content,
        sources: parseChatSources(message.sources),
        fromAdmin: message.role === "admin",
      }));
      setMessages(synced);
      if (!customer) {
        await AsyncStorage.setItem(KEY, JSON.stringify(synced));
        await AsyncStorage.setItem(
          SUPPORT_STATUS_KEY,
          output.conversation.status,
        );
      }
    }
    void syncConversation().catch(() => undefined);
    const timer = setInterval(
      () => void syncConversation().catch(() => undefined),
      10_000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationAccess, conversationId, customer, supportStatus]);

  async function send(text = input) {
    const clean = redactChatSensitiveInfo(text.trim());
    if (!clean || loading) return;
    setSendError(null);
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
      const consultationCompleted =
        (await AsyncStorage.getItem("hostora:mobile:consultation:completed")) === "true" ||
        (await AsyncStorage.getItem("hostora:mobile:requirements")) !== null;
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hostora-client": "mobile",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(!token && conversationAccess
            ? { "x-hostora-conversation-access": conversationAccess }
            : {}),
        },
        body: JSON.stringify({
          messages: recentChatMessages(
            next.map(({ role, content }) => ({ role, content })),
          ),
          memory: nextMemory,
          ...(consultationCompleted ? { consultation: {
            websiteType: requirements.websiteType,
            monthlyVisits: requirements.monthlyVisits,
            monthlyBudget: requirements.monthlyBudget,
            needsDomain: requirements.needsDomain,
            ecommerce: requirements.ecommerce,
          } } : {}),
          ...(conversationId ? { conversationId } : {}),
          messageId: randomUuid(),
        }),
      });
      const answer = await response.text();
      if (!response.ok || !answer) {
        if (response.status === 403 || response.status === 404)
          throw new Error(
            "Cuộc trò chuyện cũ không còn dùng được. Hãy mở cuộc trò chuyện mới để tiếp tục.",
          );
        throw new Error("HOSTORA chưa phản hồi. Hãy thử lại sau ít phút.");
      }
      const nextConversationId = response.headers.get(
        "x-hostora-conversation-id",
      );
      const nextConversationAccess = response.headers.get(
        "x-hostora-conversation-access",
      );
      const nextSupportStatus = response.headers.get(
        "x-hostora-support-status",
      );
      if (nextConversationId) {
        setConversationId(nextConversationId);
        if (!customer)
          await AsyncStorage.setItem(CONVERSATION_KEY, nextConversationId);
      }
      if (nextConversationAccess) {
        setConversationAccess(nextConversationAccess);
        await AsyncStorage.setItem(
          CONVERSATION_ACCESS_KEY,
          nextConversationAccess,
        );
      }
      if (
        nextSupportStatus === "active" ||
        nextSupportStatus === "escalated" ||
        nextSupportStatus === "answered" ||
        nextSupportStatus === "resolved"
      ) {
        setSupportStatus(nextSupportStatus);
        if (!customer)
          await AsyncStorage.setItem(SUPPORT_STATUS_KEY, nextSupportStatus);
      }
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
    } catch (error) {
      setInput(clean);
      const failureMessage =
        error instanceof Error && error.message.startsWith("Cuộc trò chuyện cũ")
          ? error.message
          : "Chưa kết nối được với HOSTORA. Hãy thử lại hoặc mở cuộc trò chuyện mới.";
      setSendError(failureMessage);
      const failed: Message[] = [
        ...next,
        {
          role: "assistant",
          content: failureMessage,
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
        error instanceof Error
          ? error.message
          : "Kiểm tra kết nối rồi thử lại.",
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
    setInput("");
    setSendError(null);
    setConversationId(null);
    setConversationAccess(null);
    setSupportStatus("active");
    if (!customer) {
      setMemory(null);
      await AsyncStorage.setItem(KEY, JSON.stringify(initial));
      await AsyncStorage.removeItem(MEMORY_KEY);
      await AsyncStorage.removeItem(CONVERSATION_KEY);
      await AsyncStorage.removeItem(CONVERSATION_ACCESS_KEY);
      await AsyncStorage.removeItem(SUPPORT_STATUS_KEY);
    }
  }

  async function startNewConversation() {
    if (loading || imageLoading || sourceLoading) return;
    const initial: Message[] = [
      {
        role: "assistant",
        content:
          "Đây là cuộc trò chuyện mới, nhưng mình vẫn dùng hồ sơ tài khoản và nhu cầu đã lưu. Bạn chỉ cần nói điều muốn cải thiện hoặc nhắn “Tư vấn cho tôi”.",
      },
    ];
    setMessages(initial);
    setInput("");
    // A new thread clears the transcript, not the signed-in customer's
    // bounded requirement memory. Anonymous memory remains device-local and
    // is cleared below together with the anonymous conversation.
    if (!customer) setMemory(null);
    setConversationId(null);
    setConversationAccess(null);
    setSupportStatus("active");
    setSendError(null);
    if (!customer) {
      await AsyncStorage.setItem(KEY, JSON.stringify(initial));
      await Promise.all([
        AsyncStorage.removeItem(MEMORY_KEY),
        AsyncStorage.removeItem(CONVERSATION_KEY),
        AsyncStorage.removeItem(CONVERSATION_ACCESS_KEY),
        AsyncStorage.removeItem(SUPPORT_STATUS_KEY),
      ]);
    }
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
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

  async function copyMessage(index: number, content: string) {
    await Clipboard.setStringAsync(content);
    setCopiedMessageIndex(index);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Brand />
        <View style={styles.headerRight}>
          <Pill tone="mint" icon="shield">
            RIÊNG TƯ
          </Pill>
          <Pressable
            disabled={loading || imageLoading || sourceLoading}
            onPress={() => void startNewConversation()}
            style={[
              styles.newConversationIcon,
              (loading || imageLoading || sourceLoading) && { opacity: 0.35 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mở cuộc trò chuyện mới"
          >
            <Feather name="plus" color="white" size={18} />
          </Pressable>
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
          {customer && sourceCount > 0 ? ` · ${sourceCount} nguồn của bạn` : ""}
          .
        </Text>
      </View>

      <CinematicScrollView
        scrollRef={list}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          list.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((message, index) => {
          const copyText =
            message.role === "assistant"
              ? customerAnswer(message.content, message.sources)
              : message.content;
          const copied = copiedMessageIndex === index;

          return (
            <View
              key={`${index}-${message.content.slice(0, 8)}`}
              style={[
                styles.messageRow,
                message.role === "user" && styles.messageRowUser,
              ]}
            >
              {message.role === "assistant" ? (
                <View
                  style={[
                    styles.aiAvatar,
                    message.fromAdmin && styles.adminAvatar,
                  ]}
                >
                  <Feather
                    name={message.fromAdmin ? "user-check" : "zap"}
                    color={message.fromAdmin ? colors.primary : colors.mint}
                    size={14}
                  />
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  message.role === "user"
                    ? styles.userBubble
                    : [
                        styles.aiBubble,
                        message.fromAdmin && styles.adminBubble,
                      ],
                ]}
              >
                {message.role === "assistant" ? (
                  <>
                    {message.fromAdmin ? (
                      <View style={styles.adminLabel}>
                        <Feather
                          name="message-circle"
                          color={colors.primary}
                          size={12}
                        />
                        <Text style={styles.adminLabelText}>
                          QUẢN TRỊ VIÊN HOSTORA
                        </Text>
                      </View>
                    ) : null}
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
                          TÀI LIỆU THAM KHẢO
                        </Text>
                        {citedSources(message.content, message.sources).map(
                          (source, sourceIndex) => (
                            <Text
                              key={source.citation}
                              style={styles.sourceLink}
                              accessibilityRole={source.sourceUrl ? "link" : "text"}
                              onPress={
                                source.sourceUrl
                                  ? () => void Linking.openURL(source.sourceUrl!)
                                  : undefined
                              }
                            >
                              [{sourceIndex + 1}] {source.title} · {source.verifiedAt}
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
                  <Text
                    selectable
                    style={[styles.messageText, { color: "white" }]}
                  >
                    {message.content}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    copied ? "Đã sao chép tin nhắn" : "Sao chép tin nhắn"
                  }
                  onPress={() => void copyMessage(index, copyText)}
                  style={[
                    styles.copyButton,
                    message.role === "user" && styles.copyButtonUser,
                  ]}
                >
                  <Feather
                    name={copied ? "check" : "copy"}
                    color={message.role === "user" ? "white" : colors.primary}
                    size={13}
                  />
                  <Text
                    style={[
                      styles.copyButtonText,
                      message.role === "user" && styles.copyButtonTextUser,
                    ]}
                  >
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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

      {supportStatus === "escalated" ? (
        <View style={styles.supportBanner} accessibilityLiveRegion="polite">
          <View style={styles.supportBannerIcon}>
            <Feather name="user-check" color={colors.warning} size={17} />
          </View>
          <View style={styles.supportBannerCopy}>
            <Text style={styles.supportBannerTitle}>
              Đã chuyển quản trị viên
            </Text>
            <Text style={styles.supportBannerText}>
              Bạn có thể đóng app; phản hồi sẽ tự xuất hiện tại đây.
            </Text>
          </View>
        </View>
      ) : supportStatus === "answered" ? (
        <View
          style={[styles.supportBanner, styles.supportBannerAnswered]}
          accessibilityLiveRegion="polite"
        >
          <View style={styles.supportBannerIcon}>
            <Feather name="check" color={colors.primary} size={17} />
          </View>
          <View style={styles.supportBannerCopy}>
            <Text style={styles.supportBannerTitle}>
              Quản trị viên đã phản hồi
            </Text>
            <Text style={styles.supportBannerText}>
              Câu trả lời mới đã nằm ở cuối cuộc trò chuyện.
            </Text>
          </View>
        </View>
      ) : null}

      {sendError ? (
        <View style={styles.chatError} accessibilityLiveRegion="polite">
          <View style={styles.chatErrorCopy}>
            <Text style={styles.chatErrorTitle}>Tin nhắn chưa gửi được</Text>
            <Text style={styles.chatErrorText}>{sendError}</Text>
          </View>
          <View style={styles.chatErrorActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thử gửi lại tin nhắn"
              onPress={() => void send()}
              style={styles.retryButton}
            >
              <Feather name="refresh-cw" color={colors.primary} size={14} />
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở cuộc trò chuyện mới"
              onPress={() => void startNewConversation()}
              style={styles.newConversationButton}
            >
              <Feather name="plus" color="white" size={14} />
              <Text style={styles.newConversationButtonText}>Chat mới</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
          onFocus={() =>
            requestAnimationFrame(() =>
              list.current?.scrollToEnd({ animated: true }),
            )
          }
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
        Hội thoại được lưu để hỗ trợ · Email và số điện thoại được ẩn trước khi
        lưu
      </Text>
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
  newConversationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
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
  adminAvatar: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#A9D6C5",
  },
  bubble: { borderRadius: 19, paddingHorizontal: 14, paddingVertical: 11 },
  aiBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  adminBubble: {
    backgroundColor: "#F5FBF8",
    borderColor: "#A9D6C5",
  },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  messageText: {
    color: colors.text,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 12,
    lineHeight: 20,
  },
  copyButton: {
    minHeight: 32,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySoft,
  },
  copyButtonUser: { backgroundColor: "rgba(255,255,255,.16)" },
  copyButtonText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 10,
  },
  copyButtonTextUser: { color: "white" },
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
  adminLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  adminLabelText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 9,
    letterSpacing: 0.65,
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
  supportBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4C78E",
    backgroundColor: "#FFF8E8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  supportBannerAnswered: {
    borderColor: "#A9D6C5",
    backgroundColor: "#EDF8F3",
  },
  supportBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  supportBannerCopy: { flex: 1 },
  supportBannerTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  supportBannerText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  chatError: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8B0A4",
    backgroundColor: "#FFF5F2",
    gap: 10,
  },
  chatErrorCopy: { gap: 3 },
  chatErrorTitle: {
    color: colors.ink,
    fontFamily: "BeVietnamPro_800ExtraBold",
    fontSize: 11,
  },
  chatErrorText: {
    color: colors.muted,
    fontFamily: "BeVietnamPro_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  chatErrorActions: { flexDirection: "row", gap: 8 },
  retryButton: {
    minHeight: 38,
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  retryButtonText: {
    color: colors.primary,
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
  },
  newConversationButton: {
    minHeight: 38,
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  newConversationButtonText: {
    color: "white",
    fontFamily: "BeVietnamPro_700Bold",
    fontSize: 11,
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
    fontSize: 9,
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
