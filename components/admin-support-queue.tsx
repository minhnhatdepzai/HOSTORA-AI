"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  LifeBuoy,
  MessageSquareReply,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import type {
  AdminAiConversation,
  AiConversation,
  AiEscalationReason,
  AdminCustomerSupportCase,
  CustomerSupportCase,
} from "@/lib/customer/types";

const statusLabels: Record<CustomerSupportCase["status"], string> = {
  new: "Đã tiếp nhận",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
};
const categoryLabels: Record<CustomerSupportCase["category"], string> = {
  order: "Đơn hàng",
  payment: "Thanh toán",
  refund: "Hoàn tiền",
  website: "Website AI",
  account: "Tài khoản",
  other: "Khác",
};
const aiStatusLabels: Record<AiConversation["status"], string> = {
  active: "AI đang xử lý",
  escalated: "Chờ quản trị viên",
  answered: "Đã phản hồi",
  resolved: "Đã hoàn tất",
};
const escalationLabels: Record<AiEscalationReason, string> = {
  out_of_scope: "Ngoài phạm vi HOSTORA",
  insufficient_data: "Chưa đủ dữ liệu xác minh",
  assistant_unavailable: "Trợ lý tạm gián đoạn",
  human_requested: "Khách yêu cầu người thật",
};
const refreshErrorMessage =
  "Chưa tải được hộp thư hỗ trợ. Dữ liệu đang hiển thị vẫn được giữ.";
const emptyConversationPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  allTotal: 0,
  escalatedTotal: 0,
};

export function AdminSupportQueue() {
  const [cases, setCases] = useState<AdminCustomerSupportCase[]>([]);
  const [conversations, setConversations] = useState<AdminAiConversation[]>([]);
  const [conversationPage, setConversationPage] = useState(1);
  const [conversationPagination, setConversationPagination] = useState(
    emptyConversationPagination,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerSupportCase["status"] | "all">(
    "all",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadConversations = useCallback(
    async (nextQuery: string, nextPage: number) => {
      const params = new URLSearchParams({
        q: nextQuery.trim(),
        page: String(nextPage),
        limit: "10",
      });
      const response = await fetch(`/api/admin/ai-conversations?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Chưa tải được hội thoại AI.");
      const ai = (await response.json()) as {
        conversations: AdminAiConversation[];
        pagination: typeof emptyConversationPagination;
      };
      setConversations(ai.conversations);
      setConversationPagination(ai.pagination);
      if (ai.pagination.page !== nextPage)
        setConversationPage(ai.pagination.page);
    },
    [],
  );

  const loadSupportCases = useCallback(async () => {
    const response = await fetch("/api/admin/support", { cache: "no-store" });
    if (!response.ok) throw new Error("Chưa tải được hộp thư hỗ trợ.");
    const support = (await response.json()) as {
      cases: AdminCustomerSupportCase[];
    };
    setCases(support.cases);
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      await Promise.all([
        loadSupportCases(),
        loadConversations(query, conversationPage),
      ]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        void loadSupportCases().catch(() => setMessage(refreshErrorMessage)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [loadSupportCases]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadConversations(query, conversationPage)
        .catch(() => setMessage(refreshErrorMessage))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, conversationPage, loadConversations]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    return cases.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (!needle ||
          [
            item.id,
            item.subject,
            item.customerName,
            item.customerEmail,
            item.message,
          ].some((value) => value.toLocaleLowerCase("vi").includes(needle))),
    );
  }, [cases, query, status]);

  const visibleConversations = conversations;

  async function update(id: string, nextStatus: CustomerSupportCase["status"]) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const output = (await response.json()) as {
        error?: string;
        supportCase?: AdminCustomerSupportCase;
      };
      if (!response.ok || !output.supportCase)
        throw new Error(output.error ?? "Chưa cập nhật được.");
      setCases((current) =>
        current.map((item) => (item.id === id ? output.supportCase! : item)),
      );
      setMessage(`Đã cập nhật ${id}.`);
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Chưa cập nhật được.",
      );
    } finally {
      setBusy("");
    }
  }

  async function reply(conversationId: string) {
    const replyText = replyDrafts[conversationId]?.trim();
    if (!replyText || busy) return;
    setBusy(conversationId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ai-conversations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: conversationId, reply: replyText }),
      });
      const output = (await response.json()) as {
        error?: string;
        conversation?: AdminAiConversation;
      };
      if (!response.ok || !output.conversation)
        throw new Error(output.error ?? "Chưa gửi được phản hồi.");
      setConversations((current) =>
        current.map((item) =>
          item.id === conversationId ? output.conversation! : item,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [conversationId]: "" }));
      setMessage("Đã gửi phản hồi; khách sẽ thấy trong cuộc trò chuyện.");
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Chưa gửi được phản hồi.",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="admin-support-page">
      <header className="admin-support-header">
        <div>
          <Link href="/admin">
            <ArrowLeft size={17} /> Trung tâm quản trị
          </Link>
          <p>CHĂM SÓC KHÁCH HÀNG</p>
          <h1>Yêu cầu cần được theo dõi đến cùng.</h1>
          <span>
            AI tự chuyển các câu chưa đủ căn cứ, gửi email cảnh báo và giữ
            nguyên luồng đã ẩn thông tin liên hệ để bạn trả lời khách tại đây.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            void refresh().catch(() => setMessage(refreshErrorMessage));
          }}
        >
          <RefreshCw size={17} /> Tải lại
        </button>
      </header>
      <section className="admin-support-tools">
        <label>
          <Search size={17} />
          <input
            aria-label="Tìm yêu cầu hỗ trợ"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setConversationPage(1);
            }}
            placeholder="Mã, email, chủ đề hoặc nội dung…"
          />
        </label>
        <div>
          {(["all", "new", "in_progress", "resolved"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={status === item ? "is-active" : ""}
              onClick={() => setStatus(item)}
            >
              {item === "all" ? "Tất cả" : statusLabels[item]}
            </button>
          ))}
        </div>
      </section>
      {message ? (
        <p className="admin-support-message" role="status">
          {message}
        </p>
      ) : null}
      <section
        className="admin-ai-inbox"
        aria-labelledby="admin-ai-inbox-title"
      >
        <div className="admin-ai-inbox-heading">
          <div>
            <p>HỘP THƯ HỘI THOẠI AI</p>
            <h2 id="admin-ai-inbox-title">Câu hỏi đang chờ người thật.</h2>
          </div>
          <dl>
            <div>
              <dt>Chờ trả lời</dt>
              <dd>{conversationPagination.escalatedTotal}</dd>
            </div>
            <div>
              <dt>Tổng hội thoại</dt>
              <dd>{conversationPagination.allTotal}</dd>
            </div>
          </dl>
        </div>
        {loading ? (
          <div className="admin-ai-empty" role="status">
            <RefreshCw className="admin-ai-spin" size={22} />
            <p>Đang mở hộp thư hội thoại…</p>
          </div>
        ) : visibleConversations.length ? (
          <div className="admin-ai-conversation-list">
            {visibleConversations.map((conversation) => (
              <article key={conversation.id}>
                <header>
                  <div className="admin-ai-customer">
                    <span>
                      <UserRound size={17} />
                    </span>
                    <div>
                      <h3>{conversation.customerName}</h3>
                      <p>
                        {conversation.customerEmail ?? "Khách chưa đăng nhập"}
                      </p>
                      {conversation.isDemonstration ? (
                        <span className="admin-ai-demo-badge">
                          Dữ liệu demo
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className={`admin-ai-status is-${conversation.status}`}>
                    <strong>{aiStatusLabels[conversation.status]}</strong>
                    {conversation.escalationReason ? (
                      <span>
                        {escalationLabels[conversation.escalationReason]}
                      </span>
                    ) : null}
                  </div>
                </header>
                <div
                  className="admin-ai-timeline"
                  aria-label={`Hội thoại ${conversation.id}`}
                >
                  {conversation.messages.map((item) => (
                    <div className={`is-${item.role}`} key={item.id}>
                      <span className="admin-ai-role">
                        {item.role === "user" ? (
                          <UserRound size={14} />
                        ) : item.role === "assistant" ? (
                          <Bot size={14} />
                        ) : (
                          <MessageSquareReply size={14} />
                        )}
                        {item.role === "user"
                          ? "Khách"
                          : item.role === "assistant"
                            ? "AI HOSTORA"
                            : "Quản trị viên"}
                      </span>
                      <p>{item.content}</p>
                      <time>
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </time>
                    </div>
                  ))}
                </div>
                <form
                  className="admin-ai-reply"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void reply(conversation.id);
                  }}
                >
                  <label htmlFor={`reply-${conversation.id}`}>
                    Phản hồi cho khách
                  </label>
                  <div>
                    <textarea
                      id={`reply-${conversation.id}`}
                      value={replyDrafts[conversation.id] ?? ""}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [conversation.id]: event.target.value,
                        }))
                      }
                      maxLength={4000}
                      placeholder="Trả lời rõ điều đã xác minh và bước khách cần làm tiếp theo…"
                    />
                    <button
                      type="submit"
                      disabled={
                        busy === conversation.id ||
                        !(replyDrafts[conversation.id] ?? "").trim()
                      }
                    >
                      <Send size={16} />
                      {busy === conversation.id ? "Đang gửi…" : "Gửi phản hồi"}
                    </button>
                  </div>
                </form>
                <footer>
                  <span>{conversation.id}</span>
                  <time>
                    Cập nhật{" "}
                    {new Date(conversation.updatedAt).toLocaleString("vi-VN")}
                  </time>
                </footer>
              </article>
            ))}
            <nav
              className="admin-ai-pagination"
              aria-label="Phân trang hội thoại AI"
            >
              <p>
                Trang {conversationPagination.page} /{" "}
                {conversationPagination.totalPages}
                {query.trim()
                  ? ` · ${conversationPagination.total} kết quả`
                  : ""}
              </p>
              <div>
                <button
                  type="button"
                  disabled={conversationPagination.page <= 1 || loading}
                  onClick={() =>
                    setConversationPage((current) => Math.max(1, current - 1))
                  }
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  disabled={
                    conversationPagination.page >=
                      conversationPagination.totalPages || loading
                  }
                  onClick={() => setConversationPage((current) => current + 1)}
                >
                  Trang sau
                </button>
              </div>
            </nav>
          </div>
        ) : (
          <div className="admin-ai-empty">
            <MessageSquareReply size={24} />
            <h3>Không có hội thoại phù hợp</h3>
            <p>
              Hội thoại mới hoặc câu hỏi được AI chuyển sẽ xuất hiện tại đây.
            </p>
          </div>
        )}
      </section>
      <div className="admin-support-section-title">
        <p>YÊU CẦU HỖ TRỢ CHỦ ĐỘNG</p>
        <h2>Vấn đề khách tự gửi từ tài khoản.</h2>
      </div>
      <section
        className="admin-support-list"
        aria-label="Danh sách yêu cầu hỗ trợ"
      >
        {visible.length ? (
          visible.map((item) => (
            <article key={item.id}>
              <div className="admin-support-case-mark">
                <LifeBuoy size={19} />
                <span>{item.id}</span>
              </div>
              <div className="admin-support-case-body">
                <div>
                  <span>{categoryLabels[item.category]}</span>
                  <time>
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </time>
                </div>
                <h2>{item.subject}</h2>
                <p>{item.message}</p>
                <small>
                  {item.customerName} · {item.customerEmail}
                </small>
              </div>
              <div className="admin-support-case-action">
                <label>
                  Trạng thái
                  <select
                    aria-label={`Trạng thái ${item.id}`}
                    value={item.status}
                    disabled={busy === item.id}
                    onChange={(event) =>
                      void update(
                        item.id,
                        event.target.value as CustomerSupportCase["status"],
                      )
                    }
                  >
                    <option value="new">Đã tiếp nhận</option>
                    <option value="in_progress">Đang xử lý</option>
                    <option value="resolved">Đã giải quyết</option>
                  </select>
                </label>
                <em>{statusLabels[item.status]}</em>
              </div>
            </article>
          ))
        ) : (
          <div className="admin-support-empty">
            <span className="admin-support-empty-icon">
              <LifeBuoy size={24} />
            </span>
            <h2>Không có yêu cầu phù hợp</h2>
            <p>
              {query || status !== "all"
                ? "Bỏ bộ lọc để xem lại toàn bộ yêu cầu."
                : "Yêu cầu mới sẽ xuất hiện ở đây để đội ngũ theo dõi đến khi hoàn tất."}
            </p>
            <button
              type="button"
              onClick={() => {
                if (query || status !== "all") {
                  setQuery("");
                  setStatus("all");
                } else {
                  void refresh();
                }
              }}
            >
              {query || status !== "all"
                ? "Xóa bộ lọc"
                : "Kiểm tra yêu cầu mới"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
