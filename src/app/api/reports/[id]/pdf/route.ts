import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/session";
import { buildSnapshot, getReport } from "@/lib/data/reports";
import { renderReportPdf, pdfFilename, contentDisposition } from "@/lib/pdf/render";
import { PDF_LAYOUTS, type PdfLayout } from "@/lib/pdf/report-document";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/ratelimit";
import { reportError } from "@/lib/monitoring";

export const maxDuration = 60;

/** 報告書PDF。ログイン中の会社の報告書のみ（閲覧のみの契約状態でもダウンロードは可能） */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuth();
  if (!ctx || !ctx.user.emailVerified) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not Found", { status: 404 });
  if (!(await rateLimit(`pdf:${ctx.org.id}`, 120, 600)).ok) return new NextResponse(RATE_LIMIT_MESSAGE, { status: 429 });

  const report = await getReport(ctx.org.id, id);
  if (!report) return new NextResponse("Not Found", { status: 404 });
  const snapshot = await buildSnapshot(ctx.org.id, id);
  if (!snapshot) return new NextResponse("Not Found", { status: 404 });

  const layoutParam = req.nextUrl.searchParams.get("layout");
  const layout: PdfLayout = (PDF_LAYOUTS as readonly string[]).includes(layoutParam ?? "") ? (layoutParam as PdfLayout) : "grid";
  try {
    const pdf = await renderReportPdf(ctx.org, snapshot, layout, report.report.status !== "final");
    const inline = req.nextUrl.searchParams.get("download") !== "1";
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": contentDisposition(pdfFilename(snapshot), inline),
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    await reportError("pdf.render", e, { reportId: id, orgId: ctx.org.id }, "critical");
    return new NextResponse("PDFの作成に失敗しました。時間をおいて再度お試しください。", { status: 500 });
  }
}
