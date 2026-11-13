import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { getAuth } from "@/lib/auth/session";
import { AppError, adminOrThrow } from "@/lib/auth/dal";
import { isSameOrigin } from "@/lib/request";
import { getObject, putObject, deleteObject, sniffImageType } from "@/lib/storage";
import { newId } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { reportError } from "@/lib/monitoring";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** 自社ロゴの表示 */
export async function GET() {
  const ctx = await getAuth();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  if (!ctx.org.logoKey) return new NextResponse("Not Found", { status: 404 });
  const obj = await getObject(ctx.org.logoKey);
  if (!obj) return new NextResponse("Not Found", { status: 404 });
  return new NextResponse(Buffer.from(obj.body), { headers: { "content-type": obj.contentType, "cache-control": "private, no-cache" } });
}

/** ロゴのアップロード（管理者のみ・PNG/JPEG・2MBまで） */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  try {
    const ctx = await adminOrThrow();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "画像を選択してください。" }, { status: 400 });
    if (file.size > MAX_LOGO_BYTES) return NextResponse.json({ error: "ロゴ画像は2MBまでです。" }, { status: 413 });
    const body = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(body);
    if (!type) return NextResponse.json({ error: "PNG または JPEG の画像を選択してください。" }, { status: 415 });
    const key = `orgs/${ctx.org.id}/logo/${newId()}.${type === "image/png" ? "png" : "jpg"}`;
    await putObject(key, body, type);
    await db.update(organizations).set({ logoKey: key, updatedAt: new Date() }).where(eq(organizations.id, ctx.org.id));
    if (ctx.org.logoKey) await deleteObject(ctx.org.logoKey).catch(() => {});
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "org.logo_uploaded" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    await reportError("org.logo", e);
    return NextResponse.json({ error: "アップロードに失敗しました。" }, { status: 500 });
  }
}
