import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workReportPhotos } from "@/lib/db/schema";
import { getAuth } from "@/lib/auth/session";
import { getObject } from "@/lib/storage";

/** 写真の表示・ダウンロード。ログイン中の会社の写真だけを返す（他社の ID なら 404） */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuth();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not Found", { status: 404 });
  const rows = await db
    .select({ key: workReportPhotos.storageKey, thumbKey: workReportPhotos.thumbKey })
    .from(workReportPhotos)
    .where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.id, id)))
    .limit(1);
  if (!rows[0]) return new NextResponse("Not Found", { status: 404 });
  const wantThumb = req.nextUrl.searchParams.get("thumb") === "1";
  const key = wantThumb && rows[0].thumbKey ? rows[0].thumbKey : rows[0].key;
  const obj = await getObject(key);
  if (!obj) return new NextResponse("Not Found", { status: 404 });
  const download = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(Buffer.from(obj.body), {
    headers: {
      "content-type": obj.contentType,
      "cache-control": "private, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
      ...(download ? { "content-disposition": `attachment; filename="photo-${id.slice(0, 8)}.${obj.contentType === "image/png" ? "png" : "jpg"}"` } : {}),
    },
  });
}
