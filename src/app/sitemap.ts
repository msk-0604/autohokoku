import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const pages = [
    { path: "/", priority: 1 },
    { path: "/faq", priority: 0.7 },
    { path: "/contact", priority: 0.5 },
    { path: "/signup", priority: 0.8 },
    { path: "/tokushoho", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
  ];
  return pages.map((p) => ({ url: `${base}${p.path}`, lastModified: new Date("2026-11-13"), changeFrequency: "monthly", priority: p.priority }));
}
