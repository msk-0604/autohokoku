import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SERVICE_NAME, PRICE_MONTHLY_TAX_INCLUDED, TRIAL_DAYS } from "@/lib/brand";

export const alt = `${SERVICE_NAME}｜写真付き作業報告書をスマホで数分`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const bold = await readFile(join(process.cwd(), "assets/fonts/NotoSansJP_700Bold.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #0f2a4a 0%, #1a3a63 100%)", color: "white", fontFamily: "NotoSansJP" }}>
        <div style={{ fontSize: 34, color: "#93c5fd" }}>{SERVICE_NAME}</div>
        <div style={{ fontSize: 72, marginTop: 20, lineHeight: 1.25 }}>現場で撮って、</div>
        <div style={{ fontSize: 72, lineHeight: 1.25 }}>その場で報告書が完成。</div>
        <div style={{ fontSize: 28, marginTop: 36, color: "#dde6f3" }}>{`写真付き作業報告書PDF・メール送信｜月額${PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP")}円（税込）・${TRIAL_DAYS}日間無料`}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "NotoSansJP", data: bold, weight: 700, style: "normal" }] },
  );
}
