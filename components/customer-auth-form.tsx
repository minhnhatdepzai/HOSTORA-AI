"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { TurnstileChallenge } from "@/components/turnstile-challenge";

type Mode = "login" | "register" | "forgot" | "reset";
type TurnstileAction =
  | "customer_login"
  | "customer_register"
  | "customer_forgot";

const copy = {
  login: {
    title: "Mở sổ dịch vụ",
    subtitle: "Đăng nhập để xem voucher, yêu cầu hỗ trợ và website đã tạo.",
    submit: "Đăng nhập",
  },
  register: {
    title: "Tạo tài khoản HOSTORA",
    subtitle: "Dùng đúng email nhận hóa đơn để voucher được lưu tự động.",
    submit: "Tạo tài khoản",
  },
  forgot: {
    title: "Lấy lại mật khẩu",
    subtitle: "HOSTORA sẽ gửi một liên kết dùng một lần nếu email đã có tài khoản.",
    submit: "Gửi liên kết",
  },
  reset: {
    title: "Đặt mật khẩu mới",
    subtitle: "Mật khẩu mới sẽ đăng xuất những phiên cũ để bảo vệ tài khoản.",
    submit: "Lưu mật khẩu mới",
  },
} satisfies Record<Mode, { title: string; subtitle: string; submit: string }>;

export function CustomerAuthForm({
  mode,
  nextPath = "/account",
  resetToken = "",
}: {
  mode: Mode;
  nextPath?: string;
  resetToken?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileAction, setTurnstileAction] =
    useState<TurnstileAction | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileRevision, setTurnstileRevision] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const endpoint = mode === "forgot"
        ? "/api/account/forgot-password"
        : mode === "reset"
          ? "/api/account/reset-password"
          : `/api/account/${mode}`;
      const body = mode === "register"
        ? { name, email, password, turnstileToken: turnstileToken || undefined }
        : mode === "forgot"
          ? { email, turnstileToken: turnstileToken || undefined }
          : mode === "reset"
            ? { token: resetToken, password }
            : { email, password, turnstileToken: turnstileToken || undefined };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const output = (await response.json().catch(() => ({}))) as {
        action?: TurnstileAction;
        code?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        if (output.code === "CAPTCHA_REQUIRED" && output.action) {
          setTurnstileAction(output.action);
          setTurnstileToken("");
          setTurnstileRevision((value) => value + 1);
        }
        throw new Error(output.error ?? "Chưa thể hoàn tất yêu cầu.");
      }
      if (mode === "forgot") {
        setMessage(output.message ?? "Hãy kiểm tra hộp thư của bạn.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa thể hoàn tất yêu cầu.");
    } finally {
      setBusy(false);
    }
  }

  const passwordMode = mode !== "forgot";
  const tokenMissing = mode === "reset" && !resetToken;
  return (
    <div className="customer-auth-form-wrap">
      <div className="customer-auth-form-heading">
        <span className="customer-auth-key"><KeyRound size={18} /></span>
        <p>TÀI KHOẢN KHÁCH HÀNG</p>
        <h2>{copy[mode].title}</h2>
        <span>{copy[mode].subtitle}</span>
      </div>
      {message ? (
        <div className="customer-auth-success" role="status">
          <CheckCircle2 size={22} />
          <div><strong>Đã ghi nhận</strong><p>{message}</p></div>
        </div>
      ) : (
        <form className="customer-auth-form" onSubmit={submit}>
          {mode === "register" ? (
            <label>Họ và tên<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={100} required /></label>
          ) : null}
          {mode !== "reset" ? (
            <label>Email nhận hóa đơn<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={160} required /></label>
          ) : null}
          {passwordMode ? (
            <label>{mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
              <span className="customer-password-field">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 10} maxLength={128} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
              {mode !== "login" ? <small>Ít nhất 10 ký tự, có chữ và số.</small> : null}
            </label>
          ) : null}
          {error || tokenMissing ? <p className="customer-auth-error" role="alert">{tokenMissing ? "Liên kết đặt lại mật khẩu chưa có mã hợp lệ." : error}</p> : null}
          {turnstileAction && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
            <TurnstileChallenge
              key={turnstileRevision}
              action={turnstileAction}
              onToken={setTurnstileToken}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          ) : null}
          <button className="customer-auth-submit" type="submit" disabled={busy || tokenMissing || Boolean(turnstileAction && !turnstileToken)}>{busy ? "Đang xử lý…" : copy[mode].submit}<ArrowRight size={18} /></button>
        </form>
      )}
      <div className="customer-auth-links">
        {mode === "login" ? <><Link href={`/account/forgot-password`}>Quên mật khẩu?</Link><Link href={`/account/register?next=${encodeURIComponent(nextPath)}`}>Chưa có tài khoản? Đăng ký</Link></> : null}
        {mode === "register" ? <Link href={`/account/login?next=${encodeURIComponent(nextPath)}`}>Đã có tài khoản? Đăng nhập</Link> : null}
        {mode === "forgot" || mode === "reset" ? <Link href="/account/login">Quay lại đăng nhập</Link> : null}
      </div>
    </div>
  );
}
