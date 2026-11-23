import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SERVICE_NAME, PRICE_MONTHLY_TAX_INCLUDED, TRIAL_DAYS } from "@/lib/brand";

export const alt = `${SERVICE_NAME}｜撮った写真が、そのまま報告書になる。`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const bold = await readFile(join(process.cwd(), "assets/fonts/NotoSansJP_700Bold.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#ffffff", color: "#161b22", fontFamily: "NotoSansJP", borderTop: "16px solid #161b22" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 32 }}>
          <div style={{ width: 40, height: 40, background: "#161b22", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
            <div style={{ width: 20, height: 26, background: "#fff", display: "flex", padding: 3 }}>
              <div style={{ width: 14, height: 9, background: "#c2410c" }} />
            </div>
          </div>
          {SERVICE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.3 }}>撮った写真が、</div>
          <div style={{ fontSize: 76, lineHeight: 1.3 }}>そのまま報告書になる。</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#3b434f", borderTop: "2px solid #c6cad1", paddingTop: 24 }}>
          {`写真付き作業報告書PDF・メール送信　月額${PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP")}円（税込）　${TRIAL_DAYS}日間無料`}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "NotoSansJP", data: bold, weight: 700, style: "normal" }] },
  );
}
