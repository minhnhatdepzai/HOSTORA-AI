"use client";

import { Bot, LoaderCircle, Send, Sparkles, Trash2, User } from "lucide-react";
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
};
const starters = [
  "Shared hosting và VPS khác nhau thế nào?",
  "Vì sao phải xem giá gia hạn?",
  "Shop 50.000 lượt/tháng nên chú ý gì?",
];
// Older local history may contain obsolete catalog claims; preserve it separately.
const CHAT_KEY = "hostora:chat:v2";

export function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Chào bạn, mình là **HOSTORA**. Mình trả lời từ catalog và kho kiến thức local có nguồn. Bạn đang chuẩn bị website loại nào?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
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
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, hydrated]);
  async function send(text = input) {
    const value = text.trim();
    if (!value || busy) return;
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
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(chunk, { stream: true });
        setMessages([
          ...next,
          { role: "assistant", content: answer, sources, ragMode },
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
            <p className="font-black">Qwen 3.5 · Local AI</p>
            <p className="text-xs font-bold text-emerald-700">
              ● Local · RAG grounded
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
              className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold leading-5 hover:border-blue hover:bg-blue/5"
            >
              {x}
            </button>
          ))}
        </div>
        <button
          onClick={clear}
          className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600"
        >
          <Trash2 size={14} />
          Xóa lịch sử
        </button>
      </aside>
      <section className="panel flex min-h-[620px] flex-col overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="font-black">Trợ lý hạ tầng</p>
          <p className="text-xs text-slate-500">
            Câu trả lời có thể sai; hãy mở nguồn trước quyết định mua.
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
                        <a
                          {...props}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold underline"
                        />
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
                {m.role === "assistant" &&
                  m.content &&
                  m.sources &&
                  citedSources(m.content, m.sources).length > 0 && (
                    <div className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5">
                      <p className="font-black text-slate-600">
                        Nguồn được trích dẫn
                      </p>
                      {citedSources(m.content, m.sources).map((source) => (
                        <a
                          key={source.citation}
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block font-bold text-blue underline"
                        >
                          [{source.citation}] {source.title} ·{" "}
                          {source.verifiedAt}
                        </a>
                      ))}
                    </div>
                  )}
                {m.role === "assistant" &&
                  m.content &&
                  m.sources &&
                  m.sources.length > 0 &&
                  citedSources(m.content, m.sources).length === 0 && (
                    <p className="mt-3 text-xs text-amber-800">
                      Câu này chưa trích dẫn nguồn cụ thể; hãy kiểm chứng trước
                      khi quyết định mua.
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
          <div className="flex gap-2">
            <input
              aria-label="Tin nhắn"
              className="input"
              placeholder="Hỏi về hosting, chi phí, SSL, CDN…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={4000}
            />
            <button
              aria-label="Gửi"
              disabled={busy || !input.trim()}
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue text-white disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
