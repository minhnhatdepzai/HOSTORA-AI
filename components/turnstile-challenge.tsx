"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      action: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "light";
    },
  ) => string;
  remove: (widgetId: string) => void;
};

function api() {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export function TurnstileChallenge({
  action,
  onToken,
  siteKey,
}: {
  action: string;
  onToken: (token: string) => void;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const renderWidget = useCallback(() => {
    const turnstile = api();
    const container = containerRef.current;
    if (!turnstile || !container || widgetRef.current) return;
    widgetRef.current = turnstile.render(container, {
      action,
      callback: onToken,
      "error-callback": () => {
        onToken("");
        setLoadError(true);
      },
      "expired-callback": () => onToken(""),
      sitekey: siteKey,
      theme: "light",
    });
  }, [action, onToken, siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetRef.current && api()) api()!.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [renderWidget]);

  return (
    <div className="turnstile-challenge" aria-label="Xác minh người dùng">
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
        onError={() => setLoadError(true)}
      />
      <p>Kiểm tra chống truy cập tự động</p>
      <div ref={containerRef} />
      {loadError ? (
        <p className="customer-auth-error" role="alert">
          Chưa tải được bước xác minh. Hãy kiểm tra kết nối rồi thử lại.
        </p>
      ) : null}
    </div>
  );
}
