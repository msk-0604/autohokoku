import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, shareLinks } from "@/lib/db/schema";
import { sha256 } from "@/lib/crypto";
import { loadVersionSnapshot } from "@/lib/report-email";
import { renderReportPdf, pdfFilename, contentDisposition } from "@/lib/pdf/render";
import { rateLimit } from "@/lib/ratelimit";
import { ipFromRequest } from "@/lib/request";
import { reportError } from "@/lib/monitoring";

export const maxDuration = 60;

function page(status: number, message: string) {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>作業報告書</title></head><body style="font-family:sans-serif;padding:40px 20px;text-align:center;color:#0f172a"><p>${message}</p></body></html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "cache-control": "no-store" } });
}

/** メールで送った期限付きダウンロードリンク（ログイン不要。トークンはハッシュで照合） */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await rateLimit(`dl:${ipFromRequest(req)}`, 60, 600)).ok) return page(429, "アクセスが集中しています。しばらくしてから再度お試しください。");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return page(404, "リンクが正しくありません。");
  const rows = await db
    .select({ link: shareLinks, org: organizations })
    .from(shareLinks)
    .innerJoin(organizations, eq(organizations.id, shareLinks.orgId))
    .where(and(eq(shareLinks.tokenHash, sha256(token)), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return page(410, "このリンクは有効期限が切れているか、無効になっています。送信元の会社にお問い合わせください。");

  const snapshot = await loadVersionSnapshot(row.org.id, row.link.reportId, row.link.reportVersion);
  if (!snapshot) return page(404, "報告書が見つかりません。");
  try {
    const pdf = await renderReportPdf(row.org, snapshot, "grid");
    await db.update(shareLinks).set({ downloadCount: sql`${shareLinks.downloadCount} + 1` }).where(eq(shareLinks.id, row.link.id));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": contentDisposition(pdfFilename(snapshot), req.nextUrl.searchParams.get("download") !== "1"),
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex",
      },
    });
  } catch (e) {
    await reportError("pdf.share", e, { linkId: row.link.id }, "critical");
    return page(500, "PDFを表示できませんでした。時間をおいて再度お試しください。");
  }
}
