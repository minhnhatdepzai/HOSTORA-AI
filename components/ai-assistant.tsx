"use client";

import {
  Bot,
  FileText,
  FileUp,
  ImageUp,
  Link2,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  citedSources,
  parseChatSources,
  readChatSources,
  type ChatSource,
} from "@/lib/chat-sources";
import { buildConversationMemory, recentChatMessages } from "@/lib/chat-memory";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  ragMode?: string;
  nextAction?: "create-site" | "upload-screen";
};
type AccountState = "loading" | "authenticated" | "guest" | "error";
type KnowledgeSource = {
  id: string;
  title: string;
  kind: "pdf" | "docx" | "text" | "web" | "image";
  characters: number;
};
const starters = [
  "Tôi chưa biết nên làm trang web gì để bắt đầu kinh doanh.",
  "Shared hosting và VPS khác nhau thế nào?",
  "Vì sao phải xem giá gia hạn?",
];
// Older local history may contain obsolete catalog claims; preserve it separately.
const CHAT_KEY = "hostora:chat:v2";

export function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Chào bạn, mình là **HOSTORA**. Mình trả lời từ danh sách dịch vụ và phần hướng dẫn đã được kiểm tra. Bạn đang chuẩn bị loại trang web nào?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [accountState, setAccountState] = useState<AccountState>("loading");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceNotice, setSourceNotice] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [clearBusy, setClearBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const sourceInput = useRef<HTMLInputElement>(null);
  const hasSent = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function hydrate() {
      try {
        const session = await fetch("/api/account/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (session.ok) {
          setAccountState("authenticated");
          const [historyResponse, sourcesResponse] = await Promise.all([
            fetch("/api/account/chat-history", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/account/ai-sources", {
              cache: "no-store",
              signal: controller.signal,
            }),
          ]);
          if (!historyResponse.ok || !sourcesResponse.ok)
            throw new Error("Chưa tải được dữ liệu AI của tài khoản.");
          const history = (await historyResponse.json()) as {
            conversationId?: string | null;
            messages?: Array<{
              id: string;
              role: Message["role"];
              content: string;
              sources?: unknown[];
            }>;
          };
          const sourceData = (await sourcesResponse.json()) as {
            sources?: KnowledgeSource[];
          };
          setConversationId(history.conversationId ?? null);
          setKnowledgeSources(sourceData.sources ?? []);
          if (history.messages?.length)
            setMessages(
              history.messages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                sources: parseChatSources(message.sources),
              })),
            );
        } else if (session.status === 401) {
          setAccountState("guest");
          try {
            const saved = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null");
            if (Array.isArray(saved) && saved.length) setMessages(saved);
          } catch {}
        } else {
          throw new Error("Chưa kiểm tra được trạng thái đăng nhập.");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccountState("error");
        setSourceNotice(
          error instanceof Error ? error.message : "Chưa tải được dữ liệu AI.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setHydrated(true);
          setHistoryLoading(false);
        }
      }
    }
    void hydrate();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (hydrated && accountState === "guest")
      localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    if (hasSent.current) {
      bottom.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }, [messages, hydrated, accountState]);
  async function send(text = input) {
    const value = text.trim();
    if (!value || busy) return;
    hasSent.current = true;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const contextMessages = next.map(({ role, content }) => ({ role, content }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: recentChatMessages(contextMessages),
          memory: buildConversationMemory(contextMessages),
          ...(conversationId ? { conversationId } : {}),
          messageId: crypto.randomUUID(),
        }),
      });
      if (!res.ok || !res.body) throw new Error("Local AI chưa sẵn sàng");
      const sources = readChatSources(res.headers.get("x-hostora-sources"));
      const ragMode = res.headers.get("x-hostora-rag-mode") ?? undefined;
      const nextActionHeader = res.headers.get("x-hostora-next-action");
      const responseConversationId = res.headers.get(
        "x-hostora-conversation-id",
      );
      if (responseConversationId) setConversationId(responseConversationId);
      const nextAction =
        nextActionHeader === "create-site" ||
        nextActionHeader === "upload-screen"
          ? nextActionHeader
          : undefined;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(chunk, { stream: true });
        setMessages([
          ...next,
          { role: "assistant", content: answer, sources, ragMode, nextAction },
        ]);
      }
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `Không thể gọi local AI lúc này: ${e instanceof Error ? e.message : "lỗi không xác định"}. Hãy kiểm tra Ollama.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function refreshSources() {
    const response = await fetch("/api/account/ai-sources", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Chưa tải lại được danh sách nguồn.");
    const data = (await response.json()) as { sources?: KnowledgeSource[] };
    setKnowledgeSources(data.sources ?? []);
  }

  async function addKnowledgeSource(
    payload:
      | { kind: "url"; url: string }
      | {
          kind: "file";
          filename: string;
          mimeType:
            | "application/pdf"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            | "text/plain"
            | "text/markdown"
            | "image/jpeg"
            | "image/png"
            | "image/webp";
          base64: string;
        },
  ) {
    if (sourceBusy) return;
    setSourceBusy(true);
    setSourceNotice("");
    try {
      const response = await fetch("/api/account/ai-sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "HOSTORA chưa đọc được nguồn này.");
      await refreshSources();
      setSourceNotice("Đã thêm nguồn. Trợ lý có thể dùng từ câu hỏi tiếp theo.");
      if (payload.kind === "url") setUrlInput("");
      if (sourceInput.current) sourceInput.current.value = "";
    } catch (error) {
      setSourceNotice(
        error instanceof Error ? error.message : "Chưa thêm được nguồn.",
      );
    } finally {
      setSourceBusy(false);
    }
  }

  async function uploadKnowledgeFile(file: File) {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/webp",
    ] as const;
    if (!allowed.includes(file.type as (typeof allowed)[number])) {
      setSourceNotice("Chỉ nhận PDF, DOCX, TXT, Markdown, PNG, JPEG hoặc WebP.");
      return;
    }
    const maxBytes = file.type.startsWith("image/") ? 5 : 8;
    if (file.size > maxBytes * 1024 * 1024) {
      setSourceNotice(`File vượt quá ${maxBytes} MB.`);
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Không đọc được file."));
      reader.onerror = () => reject(new Error("Không đọc được file."));
      reader.readAsDataURL(file);
    });
    await addKnowledgeSource({
      kind: "file",
      filename: file.name,
      mimeType: file.type as (typeof allowed)[number],
      base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    });
  }

  async function deleteKnowledgeSource(id: string) {
    if (sourceBusy) return;
    setSourceBusy(true);
    setSourceNotice("");
    try {
      const response = await fetch(`/api/account/ai-sources/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Chưa xóa được nguồn.");
      setKnowledgeSources((current) =>
        current.filter((source) => source.id !== id),
      );
      setSourceNotice("Đã xóa nguồn.");
    } catch (error) {
      setSourceNotice(
        error instanceof Error ? error.message : "Chưa xóa được nguồn.",
      );
    } finally {
      setSourceBusy(false);
    }
  }

  async function inspectScreenshot(file: File) {
    if (ocrBusy || busy) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: "Mình chỉ đọc ảnh PNG, JPEG hoặc WebP.",
        },
      ]);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: "Ảnh vượt quá 5 MB. Hãy chụp lại hoặc giảm kích thước ảnh.",
        },
      ]);
      return;
    }
    hasSent.current = true;
    setOcrBusy(true);
    const userMessage: Message = {
      role: "user",
      content: "Đã gửi ảnh màn hình để xác định bước tiếp theo.",
    };
    const next = [...messages, userMessage];
    setMessages([
      ...next,
      { role: "assistant", content: "Đang đọc màn hình trên máy…" },
    ]);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Không đọc được ảnh."));
        reader.onerror = () => reject(new Error("Không đọc được ảnh."));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/ai/journey-ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mimeType: file.type,
          base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
        }),
      });
      const result = (await response.json()) as {
        guidance?: { title: string; summary: string; actions: string[] };
        error?: string;
      };
      if (!response.ok || !result.guidance)
        throw new Error(result.error || "Chưa đọc được màn hình.");
      const guidance = result.guidance;
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `**${guidance.title}**\n\n${guidance.summary}\n\n${guidance.actions
            .map((action, index) => `${index + 1}. ${action}`)
            .join("\n")}`,
        },
      ]);
    } catch (error) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Chưa đọc được ảnh. Hãy chụp lại rõ hơn.",
        },
      ]);
    } finally {
      setOcrBusy(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  async function clear(scope: "history" | "all" = "history") {
    const warning =
      scope === "all"
        ? "Xóa cả lịch sử và những nhu cầu HOSTORA đang ghi nhớ cho tài khoản này?"
        : "Xóa lịch sử trò chuyện? Những nhu cầu đã ghi nhớ vẫn được giữ.";
    if (!confirm(warning)) return;
    setClearBusy(true);
    try {
      if (accountState === "authenticated") {
        const response = await fetch(
          `/api/account/chat-history${scope === "all" ? "?scope=all" : ""}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("Chưa xóa được lịch sử.");
      } else {
        localStorage.removeItem(CHAT_KEY);
      }
      setConversationId(null);
      setMessages([
        {
          role: "assistant",
          content:
            scope === "all"
              ? "Lịch sử và ghi nhớ đã được xóa. Bạn muốn bắt đầu lại từ nhu cầu nào?"
              : "Lịch sử đã được xóa. Bạn muốn tìm hiểu điều gì về hosting?",
        },
      ]);
    } catch (error) {
      setSourceNotice(
        error instanceof Error ? error.message : "Chưa xóa được lịch sử.",
      );
    } finally {
      setClearBusy(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[.3fr_.7fr]">
      <aside className="panel h-fit p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-ink text-mint">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="font-black">Trợ lý HOSTORA</p>
            <p className="text-xs font-bold text-emerald-700">
              Hoạt động trên máy của bạn
            </p>
          </div>
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">
          Gợi ý câu hỏi
        </p>
        <div className="mt-3 space-y-2">
          {starters.map((x) => (
            <button
              key={x}
              onClick={() => send(x)}
              className="w-full min-h-12 rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold leading-5 hover:border-blue hover:bg-blue/5"
            >
              {x}
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 shrink-0 text-emerald-800" size={18} />
            <div>
              <p className="text-sm font-black text-slate-800">
                Kiến thức của doanh nghiệp
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Thêm tài liệu hoặc trang công khai để câu trả lời sát với doanh
                nghiệp hơn.
              </p>
            </div>
          </div>
          {accountState === "loading" ? (
            <p className="mt-3 text-xs text-slate-500" role="status">
              Đang kiểm tra tài khoản…
            </p>
          ) : accountState !== "authenticated" ? (
            <p className="mt-3 text-xs leading-5 text-slate-600">
              <Link
                className="font-black text-emerald-800 underline underline-offset-2"
                href="/account/login?next=%2Fai-assistant"
              >
                Đăng nhập
              </Link>{" "}
              để lưu lịch sử và dùng tài liệu trên nhiều lần truy cập.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <input
                ref={sourceInput}
                className="sr-only"
                type="file"
                accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp"
                aria-label="Chọn tài liệu làm kiến thức cho trợ lý"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadKnowledgeFile(file);
                }}
              />
              <button
                type="button"
                disabled={sourceBusy}
                onClick={() => sourceInput.current?.click()}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
              >
                {sourceBusy ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                ) : (
                  <FileUp aria-hidden="true" size={16} />
                )}
                Thêm file hoặc ảnh
              </button>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (urlInput.trim())
                    void addKnowledgeSource({
                      kind: "url",
                      url: urlInput.trim(),
                    });
                }}
              >
                <label className="sr-only" htmlFor="assistant-source-url">
                  Địa chỉ trang web làm nguồn
                </label>
                <input
                  id="assistant-source-url"
                  type="url"
                  required
                  maxLength={2048}
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder="https://trang-cua-ban.vn"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
                <button
                  type="submit"
                  aria-label="Thêm trang web làm nguồn"
                  disabled={sourceBusy || !urlInput.trim()}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-40"
                >
                  <Link2 aria-hidden="true" size={16} />
                </button>
              </form>
              {knowledgeSources.length ? (
                <ul className="max-h-44 space-y-1 overflow-y-auto" aria-label="Nguồn đã thêm">
                  {knowledgeSources.map((source) => (
                    <li
                      key={source.id}
                      className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">
                        {source.title}
                      </span>
                      <button
                        type="button"
                        aria-label={`Xóa nguồn ${source.title}`}
                        disabled={sourceBusy}
                        onClick={() => void deleteKnowledgeSource(source.id)}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-40"
                      >
                        <X aria-hidden="true" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Chưa có nguồn riêng. Bạn vẫn có thể dùng dữ liệu HOSTORA đã
                  kiểm tra.
                </p>
              )}
            </div>
          )}
          {sourceNotice ? (
            <p className="mt-3 text-xs leading-5 text-amber-800" role="status">
              {sourceNotice}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={clearBusy}
          onClick={() => void clear("history")}
          className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 aria-hidden="true" size={14} />
          Xóa lịch sử
        </button>
        {accountState === "authenticated" ? (
          <button
            type="button"
            disabled={clearBusy}
            onClick={() => void clear("all")}
            className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 aria-hidden="true" size={14} />
            Xóa cả ghi nhớ
          </button>
        ) : null}
      </aside>
      <section className="panel flex min-h-[520px] flex-col overflow-hidden sm:min-h-[620px]">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="font-black">Trợ lý hạ tầng</p>
          <p className="text-xs text-slate-500">
            Câu trả lời có thể sai; HOSTORA sẽ xác minh giá và điều kiện trước
            khi tạo hóa đơn.
          </p>
        </div>
        <div
          className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7"
          aria-busy={historyLoading || busy || ocrBusy}
          aria-live="polite"
        >
          {historyLoading ? (
            <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
              <LoaderCircle aria-hidden="true" size={15} className="animate-spin" />
              Đang mở cuộc trò chuyện gần nhất…
            </p>
          ) : null}
          {!historyLoading && messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              Chưa có tin nhắn. Hãy mô tả website hoặc câu hỏi bạn đang cần giải
              quyết.
            </p>
          ) : null}
          {messages.map((m, i) => (
            <div
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              key={m.id ?? `${m.role}-${i}`}
            >
              {m.role === "assistant" && (
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink text-mint">
                  <Bot size={15} />
                </span>
              )}
              <div
                className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-7 ${m.role === "user" ? "bg-blue text-white" : "bg-slate-100 text-slate-800"}`}
              >
                {m.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: (props) => (
                        <span className="font-bold">{props.children}</span>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <span className="flex items-center gap-2 text-slate-500">
                    <LoaderCircle size={15} className="animate-spin" />
                    Đang suy nghĩ trên máy…
                  </span>
                )}
                {m.role === "assistant" && m.nextAction === "create-site" && (
                  <Link
                    href="/website-studio"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0f695c] px-4 py-2 font-black text-white transition-colors hover:bg-[#0a5148] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f695c]"
                  >
                    Tạo trang web ngay
                  </Link>
                )}
                {m.role === "assistant" && m.nextAction === "upload-screen" && (
                  <button
                    type="button"
                    onClick={() => imageInput.current?.click()}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0f695c] px-4 py-2 font-black text-white transition-colors hover:bg-[#0a5148] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f695c]"
                  >
                    <ImageUp size={16} />
                    Gửi ảnh màn hình
                  </button>
                )}
                {m.role === "assistant" &&
                  m.content &&
                  m.sources &&
                  citedSources(m.content, m.sources).length > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5">
                      <p className="font-black text-slate-600">
                        Dữ liệu đã kiểm tra
                      </p>
                      {citedSources(m.content, m.sources).map((source) => (
                        <p
                          key={source.citation}
                          className="mt-1 font-bold text-slate-600"
                        >
                          [{source.citation}] {source.title} ·{" "}
                          {source.verifiedAt}
                        </p>
                      ))}
                    </div>
                  )}
                {m.role === "assistant" &&
                  m.content &&
                  m.sources &&
                  m.sources.length > 0 &&
                  citedSources(m.content, m.sources).length === 0 && (
                    <p className="mt-3 text-xs text-amber-800">
                      Câu này chưa có đủ dữ liệu kiểm chứng; HOSTORA cần xác
                      minh trước khi bạn quyết định mua.
                    </p>
                  )}
                {m.role === "assistant" && m.ragMode === "lexical-fallback" && (
                  <p className="mt-3 text-xs text-amber-800">
                    Embedding chưa sẵn sàng; HOSTORA đang truy xuất bằng từ khóa
                    dự phòng.
                  </p>
                )}
              </div>
              {m.role === "user" && (
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue text-white">
                  <User size={15} />
                </span>
              )}
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <form
          className="border-t border-slate-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex min-w-0 gap-2">
            <input
              ref={imageInput}
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Gửi ảnh màn hình để được hướng dẫn"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void inspectScreenshot(file);
              }}
            />
            <button
              type="button"
              aria-label="Gửi ảnh màn hình"
              title="Gửi ảnh màn hình để HOSTORA chỉ bước tiếp theo"
              disabled={busy || ocrBusy}
              onClick={() => imageInput.current?.click()}
              className="grid size-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-40"
            >
              {ocrBusy ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <ImageUp size={18} />
              )}
            </button>
            <input
              aria-label="Tin nhắn"
              className="input min-w-0 flex-1"
              placeholder="Hỏi về hosting, chi phí, SSL, CDN…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={4000}
            />
            <button
              aria-label="Gửi"
              disabled={busy || ocrBusy || !input.trim()}
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue text-white hover:bg-[#0b5249] disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
