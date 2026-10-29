import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HOSTORA AI — Cố vấn website và hosting",
    short_name: "HOSTORA",
    description: "So sánh dịch vụ, nhận tư vấn và đặt mua hosting, tên miền, email tại HOSTORA.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#061f29",
    lang: "vi",
    categories: ["business", "productivity"],
    icons: [{ src: "/hostora-icon.png", sizes: "1254x1254", type: "image/png" }],
    shortcuts: [
      {
        name: "Tư vấn chọn gói",
        short_name: "Tư vấn",
        url: "/consultation",
        icons: [{ src: "/hostora-icon.png", sizes: "1254x1254", type: "image/png" }],
      },
      {
        name: "Tạo website với AI",
        short_name: "Tạo website",
        url: "/website-studio",
        icons: [{ src: "/hostora-icon.png", sizes: "1254x1254", type: "image/png" }],
      },
    ],
  };
}
