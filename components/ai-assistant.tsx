"use client";

import {
  Bot,
  ImageUp,
  LoaderCircle,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  nextAction?: "create-site" | "upload-screen";
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
  const bottom = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const hasSent = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null");
        if (Array.isArray(saved) && saved.length) setMessages(saved);
      } catch {}
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
    if (hasSent.current) {
      bottom.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }, [messages, hydrated]);
  async function send(text = input) {
    const value = text.trim();
    if (!value || busy) return;
    hasSent.current = true;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      if (!res.ok || !res.body) throw new Error("Local AI chưa sẵn sàng");
      const sources = readChatSources(res.headers.get("x-hostora-sources"));
      const ragMode = res.headers.get("x-hostora-rag-mode") ?? undefined;
      const nextActionHeader = res.headers.get("x-hostora-next-action");
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
  function clear() {
    if (confirm("Xóa toàn bộ lịch sử chat trên trình duyệt này?")) {
      const initial: Message[] = [
        {
          role: "assistant",
          content: "Lịch sử đã được xóa. Bạn muốn tìm hiểu điều gì về hosting?",
        },
      ];
      setMessages(initial);
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
        <button
          onClick={clear}
          className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
          Xóa lịch sử
        </button>
      </aside>
      <section className="panel flex min-h-[520px] flex-col overflow-hidden sm:min-h-[620px]">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="font-black">Trợ lý hạ tầng</p>
          <p className="text-xs text-slate-500">
            Câu trả lời có thể sai; HOSTORA sẽ xác minh giá và điều kiện trước
            khi tạo hóa đơn.
          </p>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          {messages.map((m, i) => (
            <div
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              key={i}
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
