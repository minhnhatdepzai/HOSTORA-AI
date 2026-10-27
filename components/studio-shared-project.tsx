"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  Download,
  LoaderCircle,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { type SiteBrief, type SiteIdea } from "@/lib/site-studio";
import { SitePreviewWindow } from "@/components/site-preview-window";

const subscribe = () => () => {};

export function StudioSharedProject({
  project,
}: {
  project: {
    id: string;
    idea: SiteIdea;
    brief: SiteBrief;
    downloadUrl: string;
    sharePath?: string;
    repositoryUrl?: string | null;
    publishMessage?: string | null;
    writingTone?: "friendly" | "premium" | "direct";
  };
}) {
  const [idea, setIdea] = useState(project.idea);
  const [brief, setBrief] = useState(project.brief);
  const [style, setStyle] = useState(project.idea.style);
  const [color, setColor] = useState(project.idea.color);
  const [writingTone, setWritingTone] = useState(
    project.writingTone ?? "direct",
  );
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [designBusy, setDesignBusy] = useState(false);
  const [designNotice, setDesignNotice] = useState("");
  const [feedbackReason, setFeedbackReason] = useState<
    "visual" | "copy" | "navigation" | "business_fit" | "other"
  >("visual");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = useSyncExternalStore(
    subscribe,
    () =>
      new URL(
        project.sharePath || window.location.pathname,
        window.location.origin,
      ).toString(),
    () => project.sharePath || "",
  );
  const publishMessage = project.publishMessage?.includes(
    "HOSTORA_STUDIO_GITHUB_ENABLED",
  )
    ? "Kho mã GitHub riêng sẽ xuất hiện tại đây sau khi quản trị viên kết nối GitHub."
    : project.publishMessage;

  async function revise(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || message.trim().length < 3) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/ai/site-studio/${project.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json()) as {
        brief?: SiteBrief;
        error?: string;
        publishMessage?: string | null;
      };
      if (!response.ok || !payload.brief)
        throw new Error(payload.error ?? "Không thể lưu thay đổi.");
      setBrief(payload.brief);
      setMessage("");
      setNotice(
        payload.publishMessage ||
          "Đã cập nhật bản xem trước. Link và file ZIP vẫn giữ nguyên.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Không thể lưu thay đổi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function saveDesign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (designBusy) return;
    setDesignBusy(true);
    setDesignNotice("");
    try {
      const response = await fetch(`/api/ai/site-studio/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ style, color, writingTone }),
      });
      const payload = (await response.json()) as {
        idea?: SiteIdea;
        error?: string;
      };
      if (!response.ok || !payload.idea)
        throw new Error(payload.error ?? "Chưa lưu được giao diện.");
      setIdea(payload.idea);
      setDesignNotice(
        "Đã lưu lựa chọn. Bản xem thử và file ZIP dùng màu, phong cách mới.",
      );
    } catch (error) {
      setDesignNotice(
        error instanceof Error ? error.message : "Chưa lưu được giao diện.",
      );
    } finally {
      setDesignBusy(false);
    }
  }

  async function sendFeedback(rating: "helpful" | "needs_work") {
    if (feedbackBusy) return;
    setFeedbackBusy(true);
    setFeedbackStatus("");
    try {
      const response = await fetch(
        `/api/ai/site-studio/${project.id}/feedback`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rating, reason: feedbackReason }),
        },
      );
      if (!response.ok) throw new Error("Chưa lưu được đánh giá.");
      setFeedbackStatus(
        "Đã ghi nhận. Góp ý này giúp HOSTORA chọn các điểm cần cải thiện.",
      );
    } catch (error) {
      setFeedbackStatus(
        error instanceof Error ? error.message : "Chưa lưu được đánh giá.",
      );
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <section
      className="studio-delivery"
      aria-label="Chia sẻ và chỉnh sửa website"
    >
      <div className="studio-delivery-heading">
        <div>
          <p className="commerce-kicker dark">BẢN WEBSITE CỦA BẠN</p>
          <h2>Gửi link hoặc tải mã nguồn</h2>
        </div>
        <a className="studio-download" href={project.downloadUrl}>
          <Download size={17} /> Tải file ZIP
        </a>
      </div>
      <div className="studio-share-link">
        <label htmlFor={`share-${project.id}`}>Link xem website</label>
        <div>
          <input id={`share-${project.id}`} readOnly value={shareUrl} />
          <button
            type="button"
            onClick={() => void copyLink()}
            aria-label="Sao chép link website"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Đã chép" : "Sao chép"}
          </button>
        </div>
      </div>
      <p className="studio-repo-status">
        {project.repositoryUrl ? (
          <>
            Kho mã riêng:{" "}
            <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
              {project.repositoryUrl}
            </a>
          </>
        ) : (
          publishMessage || "Kho mã riêng chưa khả dụng trên máy chủ này."
        )}
      </p>
      <SitePreviewWindow idea={idea} brief={brief} />
      <form className="studio-design-controls" onSubmit={saveDesign}>
        <div>
          <h3>Chỉnh giao diện theo ý bạn</h3>
          <p>
            Mỗi website ghi nhớ lựa chọn này cho lần chỉnh nội dung tiếp theo.
          </p>
        </div>
        <label>
          Phong cách
          <select
            value={style}
            onChange={(event) =>
              setStyle(event.target.value as SiteIdea["style"])
            }
          >
            <option value="editorial">Biên tập</option>
            <option value="bold">Táo bạo</option>
            <option value="warm">Ấm áp</option>
            <option value="minimal">Tối giản</option>
          </select>
        </label>
        <label>
          Màu chủ đạo
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Chọn màu chủ đạo"
          />
        </label>
        <label>
          Giọng văn
          <select
            value={writingTone}
            onChange={(event) =>
              setWritingTone(event.target.value as typeof writingTone)
            }
          >
            <option value="direct">Rõ ràng</option>
            <option value="friendly">Thân thiện</option>
            <option value="premium">Tinh tế</option>
          </select>
        </label>
        <button type="submit" disabled={designBusy}>
          {designBusy ? "Đang lưu…" : "Lưu giao diện"}
        </button>
        <small role="status">{designNotice}</small>
      </form>
      <div className="studio-feedback" aria-label="Đánh giá bản demo">
        <div>
          <strong>Bản demo này đã phù hợp chưa?</strong>
          <p>Chọn điều bạn quan tâm nhất để góp ý.</p>
        </div>
        <label>
          Điểm cần đánh giá
          <select
            value={feedbackReason}
            onChange={(event) =>
              setFeedbackReason(event.target.value as typeof feedbackReason)
            }
          >
            <option value="visual">Giao diện</option>
            <option value="copy">Nội dung</option>
            <option value="navigation">Cách bấm và điều hướng</option>
            <option value="business_fit">Hợp với ngành kinh doanh</option>
            <option value="other">Khác</option>
          </select>
        </label>
        <div className="studio-feedback-actions">
          <button
            type="button"
            disabled={feedbackBusy}
            onClick={() => void sendFeedback("helpful")}
          >
            <ThumbsUp size={16} /> Phù hợp
          </button>
          <button
            type="button"
            disabled={feedbackBusy}
            onClick={() => void sendFeedback("needs_work")}
          >
            <ThumbsDown size={16} /> Cần chỉnh
          </button>
        </div>
        <small role="status">{feedbackStatus}</small>
      </div>
      <form className="studio-revision" onSubmit={revise}>
        <label htmlFor={`revision-${project.id}`}>
          Muốn đổi gì trên website?
        </label>
        <p>
          Ví dụ: “Đổi tiêu đề ngắn hơn, dùng giọng thân thiện và thêm phần giới
          thiệu menu.”
        </p>
        <textarea
          id={`revision-${project.id}`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={3}
          maxLength={500}
          required
          placeholder="Viết yêu cầu chỉnh sửa…"
        />
        <div className="studio-revision-bottom">
          <small>
            {notice ||
              "AI cục bộ sẽ chỉnh phần nội dung và giữ nguyên phần còn lại."}
          </small>
          <button type="submit" disabled={busy || message.trim().length < 3}>
            {busy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            {busy ? "Đang chỉnh…" : "Cập nhật website"}
          </button>
        </div>
      </form>
    </section>
  );
}
