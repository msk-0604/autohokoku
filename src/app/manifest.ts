import type { MetadataRoute } from "next";
import { SERVICE_NAME } from "@/lib/brand";

/** ホーム画面・デスクトップに追加したときの名前とアイコン */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SERVICE_NAME,
    short_name: SERVICE_NAME,
    description: "写真付き作業報告書を、スマホで数分。",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fb",
    theme_color: "#161b22",
    lang: "ja",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
