import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { workReportPhotos, workReports, PHOTO_CATEGORIES, type PhotoCategory } from "@/lib/db/schema";
import { AppError, writableOrThrow } from "@/lib/auth/dal";
import { isSameOrigin } from "@/lib/request";
import { newId } from "@/lib/crypto";
import { putObject, sniffImageType } from "@/lib/storage";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/ratelimit";
import { reportError } from "@/lib/monitoring";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // Vercel の関数ボディ上限(4.5MB)未満
const MAX_THUMB_BYTES = 600 * 1024;
const MAX_PHOTOS_PER_REPORT = 100;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** 写真アップロード（ブラウザで圧縮済みの JPEG/PNG を受け取る） */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return jsonError("不正なリクエストです。", 403);
  try {
    const ctx = await writableOrThrow();
    const { id: reportId } = await params;
    if (!(await rateLimit(`upload:${ctx.org.id}`, 600, 3600)).ok) return jsonError(RATE_LIMIT_MESSAGE, 429);

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_PHOTO_BYTES + MAX_THUMB_BYTES + 64 * 1024) return jsonError("写真のサイズが大きすぎます（4MBまで）。", 413);

    const reports = await db
      .select({ id: workReports.id, status: workReports.status })
      .from(workReports)
      .where(and(eq(workReports.orgId, ctx.org.id), eq(workReports.id, reportId), isNull(workReports.deletedAt)))
      .limit(1);
    if (!reports[0]) return jsonError("報告書が見つかりません。", 404);
    if (reports[0].status !== "draft") return jsonError("確定済みの報告書には写真を追加できません。", 409);

    const form = await req.formData();
    const file = form.get("file");
    const thumb = form.get("thumb");
    if (!(file instanceof File)) return jsonError("写真が選択されていません。", 400);
    if (file.size === 0 || file.size > MAX_PHOTO_BYTES) return jsonError("写真のサイズが大きすぎます（4MBまで）。", 413);
    if (thumb instanceof File && thumb.size > MAX_THUMB_BYTES) return jsonError("サムネイルが大きすぎます。", 413);

    const body = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(body);
    if (!type) return jsonError("対応していない画像形式です（JPEG・PNG のみ）。", 415);
    let thumbBody: Uint8Array | null = null;
    if (thumb instanceof File && thumb.size > 0) {
      thumbBody = new Uint8Array(await thumb.arrayBuffer());
      if (!sniffImageType(thumbBody)) thumbBody = null;
    }

    const categoryRaw = String(form.get("category") ?? "before");
    const category: PhotoCategory = (PHOTO_CATEGORIES as readonly string[]).includes(categoryRaw) ? (categoryRaw as PhotoCategory) : "before";
    const caption = String(form.get("caption") ?? "").trim().slice(0, 500) || null;
    const width = Math.min(20000, Math.max(0, Number(form.get("width")) || 0)) || null;
    const height = Math.min(20000, Math.max(0, Number(form.get("height")) || 0)) || null;

    const stats = await db
      .select({ n: sql<number>`COUNT(*)`, maxOrder: sql<number>`COALESCE(MAX(${workReportPhotos.sortOrder}), -1)` })
      .from(workReportPhotos)
      .where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.reportId, reportId)));
    if (stats[0].n >= MAX_PHOTOS_PER_REPORT) return jsonError(`1つの報告書に登録できる写真は${MAX_PHOTOS_PER_REPORT}枚までです。`, 409);

    const photoId = newId();
    const ext = type === "image/png" ? "png" : "jpg";
    const key = `orgs/${ctx.org.id}/reports/${reportId}/${photoId}.${ext}`;
    const thumbKey = thumbBody ? `orgs/${ctx.org.id}/reports/${reportId}/${photoId}_t.jpg` : null;
    await putObject(key, body, type);
    if (thumbBody && thumbKey) await putObject(thumbKey, thumbBody, sniffImageType(thumbBody)!);

    const now = new Date();
    const row = {
      id: photoId,
      orgId: ctx.org.id,
      reportId,
      storageKey: key,
      thumbKey,
      contentType: type,
      sizeBytes: body.byteLength,
      width,
      height,
      category,
      caption,
      sortOrder: Number(stats[0].maxOrder) + 1,
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(workReportPhotos).values(row);
    await db.update(workReports).set({ updatedAt: now }).where(eq(workReports.id, reportId));
    return NextResponse.json({ photo: { id: photoId, category, caption, sortOrder: row.sortOrder, width, height } }, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) return jsonError(e.message, e.status);
    await reportError("photo.upload", e);
    return jsonError("アップロードに失敗しました。通信状況をご確認のうえ、もう一度お試しください。", 500);
  }
}
