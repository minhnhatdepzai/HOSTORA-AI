"use client";

import { ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogin({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/login/email/request", {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Không gửi được mã đăng nhập.");
      setSent(true);
      setMessage("Mã 6 số đã được gửi tới email quản trị đã đăng ký.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không gửi được mã đăng nhập.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/login/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Mã xác minh không đúng.");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mã xác minh không đúng.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-story" aria-label="HOSTORA quản trị">
        <div className="admin-login-brand">
          <Image src="/hostora-icon.png" alt="" width={52} height={52} />
          <div><strong>HOSTORA</strong><span>TRUNG TÂM VẬN HÀNH</span></div>
        </div>
        <div className="admin-login-orbit" aria-hidden="true">
          <i /><i /><i /><b>H</b>
        </div>
        <p className="admin-login-kicker">CỬA KIỂM SOÁT RIÊNG</p>
        <h1>Một mã ngắn.<br />Toàn bộ dữ liệu được giữ kín.</h1>
        <p>Đơn hàng, doanh thu và danh mục dịch vụ chỉ xuất hiện sau khi email quản trị xác minh thành công.</p>
      </section>

      <section className="admin-login-panel">
        <div className="admin-login-card">
          <span className="admin-login-icon"><ShieldCheck size={22} /></span>
          <p className="admin-login-step">XÁC MINH NHÂN VIÊN</p>
          <h2>Đăng nhập quản trị</h2>
          <p className="admin-login-copy">Mã dùng một lần có hiệu lực 10 phút và chỉ được gửi tới email quản trị đã đăng ký.</p>

          {!sent ? (
            <button className="button-primary admin-login-action" onClick={() => void requestCode()} disabled={busy}>
              <Mail size={18} /> {busy ? "Đang gửi mã" : "Gửi mã qua email"} <ArrowRight size={17} />
            </button>
          ) : (
            <form onSubmit={verifyCode} className="admin-login-form">
              <label htmlFor="admin-login-code">Mã xác minh 6 số</label>
              <div className="admin-code-field"><KeyRound size={18} /><input id="admin-login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} autoFocus /></div>
              <button className="button-primary admin-login-action" disabled={busy || code.length !== 6}>
                {busy ? "Đang kiểm tra" : "Vào trung tâm quản trị"} <ArrowRight size={17} />
              </button>
              <button type="button" className="admin-login-resend" onClick={() => void requestCode()} disabled={busy}>Gửi lại mã</button>
            </form>
          )}
          {message ? <p className="admin-login-message" role="status">{message}</p> : null}
          <p className="admin-login-note">HOSTORA không bao giờ yêu cầu bạn đọc mã này qua điện thoại hoặc tin nhắn.</p>
        </div>
      </section>
    </main>
  );
}
