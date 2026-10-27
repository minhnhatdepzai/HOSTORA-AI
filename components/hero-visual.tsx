import Image from "next/image";
import { Check, Radio, ShieldCheck } from "lucide-react";
import { HostoraScene } from "@/components/hostora-scene";

export function HeroVisual() {
  return (
    <div
      className="commerce-hero-visual"
      aria-label="HOSTORA đang so sánh dịch vụ lưu trữ và chi phí gia hạn"
    >
      <HostoraScene />
      <div className="hero-radar" aria-hidden="true">
        <span className="hero-orbit orbit-one" />
        <span className="hero-orbit orbit-two" />
        <span className="hero-signal signal-one" />
        <span className="hero-signal signal-two" />
        <span className="hero-signal signal-three" />
        <div className="hero-logo-core">
          <Image
            src="/hostora-icon.png"
            alt=""
            width={92}
            height={92}
            priority
          />
        </div>
      </div>
      <div className="hero-status-card">
        <span className="hero-live">
          <Radio size={13} /> ĐANG KIỂM TRA
        </span>
        <strong>So sánh theo nhu cầu thật</strong>
        <p className="hero-status-copy">
          Giá mở đầu và giá gia hạn được tách rõ trước khi bạn chọn.
        </p>
        <small>
          <Check size={13} />
          Không tự điền số liệu chưa được xác nhận
        </small>
      </div>
      <div className="hero-note-card">
        <ShieldCheck size={18} />
        <p>
          <strong>Giá gia hạn tách riêng</strong>
          <span>Không đánh đồng với giá mở đầu.</span>
        </p>
      </div>
      <span className="hero-coordinate coordinate-top">
        HOSTORA / RÕ TRƯỚC KHI MUA
      </span>
      <span className="hero-coordinate coordinate-bottom">
        TƯ VẤN RIÊNG TƯ · TIẾNG VIỆT
      </span>
    </div>
  );
}
