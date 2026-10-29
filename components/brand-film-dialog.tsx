"use client";
import { useCallback, useRef } from "react";
import { Play, X } from "lucide-react";

export function BrandFilmDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const open = useCallback(() => {
    dialog.current?.showModal();
    if (video.current) {
      video.current.currentTime = 0;
      void video.current.play().catch(() => {});
    }
  }, []);
  const close = useCallback(() => {
    video.current?.pause();
    dialog.current?.close();
  }, []);
  return (
    <>
      <button className="hostora-metal-button" onClick={open}>
        <Play size={15} fill="currentColor" />
        <span>Xem phim mở đầu</span>
        <small>7 giây</small>
      </button>
      <dialog
        ref={dialog}
        className="hostora-film-dialog"
        aria-label="Phim mở đầu HOSTORA"
        onClose={() => video.current?.pause()}
      >
        <button className="hostora-film-skip" onClick={close} autoFocus>
          Bỏ qua <X size={18} />
        </button>
        <video
          ref={video}
          src="/brand/hostora-intro.mp4"
          poster="/brand/hostora-poster.png"
          muted
          playsInline
          preload="none"
          onEnded={close}
          onError={close}
          controls={false}
        />
        <span className="hostora-film-signature">
          HOSTORA / MỘT KHỞI ĐẦU CỦA RIÊNG BẠN
        </span>
      </dialog>
    </>
  );
}
