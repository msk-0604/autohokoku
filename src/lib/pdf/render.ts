import "server-only";
import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getObject } from "@/lib/storage";
import type { ReportSnapshot } from "@/lib/data/reports";
import type { Org } from "@/lib/auth/session";
import { ReportPdf, type PdfLayout, type PdfPhoto } from "./report-document";

async function loadImage(key: string | null): Promise<{ data: Buffer; format: "jpg" | "png" } | null> {
  if (!key) return null;
  try {
    const obj = await getObject(key);
    if (!obj) return null;
    return { data: Buffer.from(obj.body), format: obj.contentType === "image/png" ? "png" : "jpg" };
  } catch (e) {
    console.error("[pdf] image load failed", key, e);
    return null;
  }
}

/** 同時実行数を制限して順番を保ったまま map する */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function renderReportPdf(org: Org, report: ReportSnapshot, layout: PdfLayout = "grid", draft = false): Promise<Buffer> {
  const [logo, photos] = await Promise.all([
    loadImage(org.logoKey),
    mapLimit(report.photos, 6, async (p): Promise<PdfPhoto> => ({ ...p, image: await loadImage(p.storageKey) })),
  ]);
  const doc = createElement(ReportPdf, {
    report,
    layout,
    draft,
    photos,
    org: { name: org.name, address: org.address, phone: org.phone, postalCode: org.postalCode, email: org.email, logo },
  }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(doc);
}

export function pdfFilename(report: { reportNumber: string; workDate: string }) {
  return `作業報告書_${report.reportNumber}_${report.workDate}.pdf`;
}

export function contentDisposition(filename: string, inline: boolean) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
