import { ImageResponse } from "next/og";

export const alt = "HOSTORA AI — Chọn đúng dịch vụ cho website";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#061f29",
        color: "#f7fbf8",
        padding: "68px 76px",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -150,
          top: -190,
          border: "1px solid rgba(169,242,210,.28)",
          borderRadius: 999,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          right: 50,
          bottom: -210,
          background: "#f0c29f",
          borderRadius: 999,
          opacity: 0.92,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", width: 900 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: "#a9f2d2",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 7,
          }}
        >
          <span
            style={{
              display: "flex",
              width: 48,
              height: 48,
              border: "1px solid #a9f2d2",
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: 0,
            }}
          >
            H
          </span>
          HOSTORA
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 94,
            fontSize: 70,
            lineHeight: 1.04,
            fontWeight: 760,
            letterSpacing: -3,
          }}
        >
          <span>Chọn đúng dịch vụ.</span>
          <span style={{ color: "#a9f2d2" }}>Rõ giá trước khi mua.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 42,
            fontSize: 25,
            color: "#b8cbc5",
          }}
        >
          Tạo website · Hosting · Tên miền · Thanh toán tại HOSTORA
        </div>
      </div>
    </div>,
    size,
  );
}
