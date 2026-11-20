import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SERVICE_NAME, SERVICE_TAGLINE } from "@/lib/brand";
import { Analytics } from "@/components/analytics";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: `${SERVICE_NAME}｜${SERVICE_TAGLINE}`, template: `%s｜${SERVICE_NAME}` },
  description:
    "スマホで写真を撮って作業内容を入力するだけ。きれいな写真付き作業報告書PDFが数分で完成し、そのままお客様へメール送信できます。月額7,480円（税込）・14日間無料体験。",
  applicationName: SERVICE_NAME,
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f2a4a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
