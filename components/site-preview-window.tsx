"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Monitor, Smartphone } from "lucide-react";
import {
  buildCompactPreviewHtml,
  type SiteBrief,
  type SiteIdea,
} from "@/lib/site-studio";

type Mode = "desktop" | "phone";
const dimensions: Record<Mode, { width: number; height: number }> = {
  desktop: { width: 1100, height: 640 },
  phone: { width: 390, height: 760 },
};

function subscribeNarrow(callback: () => void) {
  const query = window.matchMedia("(max-width: 700px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function SitePreviewWindow({
  idea,
  brief,
  className = "",
}: {
  idea: SiteIdea;
  brief: SiteBrief;
  className?: string;
}) {
  const isNarrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia("(max-width: 700px)").matches,
    () => false,
  );
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const mode = chosenMode ?? (isNarrow ? "phone" : "desktop");
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const viewport = dimensions[mode];
  const displayWidth = Math.min(viewport.width, Math.max(280, availableWidth - 20));
  const displayHeight = Math.min(viewport.height, 560);
  const html = buildCompactPreviewHtml(idea, brief);

  return (
    <section
      className={`studio-device-preview ${className}`}
      aria-label="Bản xem thử tương tác"
    >
      <div className="studio-device-toolbar">
        <span>BẢN XEM THỬ LIỀN MẠCH · CUỘN TRONG KHUNG</span>
        <div role="group" aria-label="Chọn thiết bị xem thử">
          <button
            type="button"
            className={mode === "desktop" ? "is-active" : ""}
            aria-pressed={mode === "desktop"}
            onClick={() => setChosenMode("desktop")}
          >
            <Monitor size={15} /> Máy tính
          </button>
          <button
            type="button"
            className={mode === "phone" ? "is-active" : ""}
            aria-pressed={mode === "phone"}
            onClick={() => setChosenMode("phone")}
          >
            <Smartphone size={15} /> Điện thoại
          </button>
        </div>
      </div>
      <div className="studio-device-canvas" ref={containerRef}>
        {availableWidth > 0 && (
          <div
            className={`studio-device-frame ${mode === "phone" ? "is-phone" : ""}`}
            style={{
              width: displayWidth,
              height: displayHeight,
            }}
          >
            <iframe
              key={`${mode}-${brief.headline}`}
              title={`Website ${idea.brand} ở chế độ ${mode === "phone" ? "điện thoại" : "máy tính"}`}
              sandbox="allow-scripts"
              scrolling="yes"
              srcDoc={html}
              style={{
                width: displayWidth,
                height: displayHeight,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
