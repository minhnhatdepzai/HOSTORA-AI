import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HOSTORA AI — Cố vấn website và hosting",
    short_name: "HOSTORA",
    description: "So sánh dịch vụ, nhận tư vấn và đặt mua hosting, tên miền, email tại HOSTORA.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#061f29",
    lang: "vi",
    icons: [{ src: "/hostora-icon.png", sizes: "1254x1254", type: "image/png" }],
  };
}
