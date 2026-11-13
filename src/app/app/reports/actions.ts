"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers, reportVersions, sites, workReportPhotos, workReports, PHOTO_CATEGORIES } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { AppError, writableOrThrow } from "@/lib/auth/dal";
import { handleAction, formValues, optionalText, type ActionState } from "@/lib/actions";
import { buildSnapshot, nextReportNumber } from "@/lib/data/reports";
import { audit } from "@/lib/audit";
import { todayJst } from "@/lib/dates";
import { deleteObject } from "@/lib/storage";

const timeSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻の形式が正しくありません").nullable())
  .optional()
  .transform((v) => v ?? null);

const idOrNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid().nullable())
  .optional()
  .transform((v) => v ?? null);

const fieldsSchema = z.object({
  title: optionalText(100),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "作業日を入力してください"),
  customerId: idOrNull,
  siteId: idOrNull,
  workerNames: optionalText(200),
  startTime: timeSchema,
  endTime: timeSchema,
  workContent: optionalText(5000),
  materials: optionalText(3000),
  specialNotes: optionalText(3000),
  nextSchedule: optionalText(1000),
});
type Fields = z.infer<typeof fieldsSchema>;

/** 顧客・現場が自社のものであることを確認する（他社IDの混入防止） */
async function assertRefs(orgId: string, f: { customerId: string | null; siteId: string | null }) {
  if (f.customerId) {
    const c = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.orgId, orgId), eq(customers.id, f.customerId))).limit(1);
    if (!c[0]) throw new AppError("顧客が見つかりません。");
  }
  if (f.siteId) {
    const s = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.orgId, orgId), eq(sites.id, f.siteId))).limit(1);
    if (!s[0]) throw new AppError("現場が見つかりません。");
  }
}

async function loadOwnReport(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(workReports)
    .where(and(eq(workReports.orgId, orgId), eq(workReports.id, id), isNull(workReports.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new AppError("報告書が見つかりません。", 404);
  return rows[0];
}

export async function createReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await writableOrThrow();
      const input = fieldsSchema.parse({ ...Object.fromEntries(fd), workDate: fd.get("workDate") || todayJst() });
      await assertRefs(ctx.org.id, input);
      // 現場を選んで顧客が空なら、現場の顧客を自動で入れる
      if (input.siteId && !input.customerId) {
        const s = await db.select({ customerId: sites.customerId, workDescription: sites.workDescription }).from(sites).where(and(eq(sites.orgId, ctx.org.id), eq(sites.id, input.siteId))).limit(1);
        input.customerId = s[0]?.customerId ?? null;
      }
      const id = newId();
      const reportNumber = await nextReportNumber(ctx.org.id);
      await db.insert(workReports).values({
        id,
        orgId: ctx.org.id,
        reportNumber,
        status: "draft",
        ...input,
        workerNames: input.workerNames ?? ctx.user.name,
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "report.create", targetType: "report", targetId: id });
      redirect(`/app/reports/${id}/edit?created=1`);
    },
    "report.create",
    values,
  );
}

async function saveFields(orgId: string, id: string, input: Fields) {
  const report = await loadOwnReport(orgId, id);
  if (report.status !== "draft") throw new AppError("確定済みの報告書は編集できません。「修正する」を押してから編集してください。");
  await assertRefs(orgId, input);
  await db
    .update(workReports)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(workReports.orgId, orgId), eq(workReports.id, id), eq(workReports.status, "draft")));
  return report;
}

export async function saveReportAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await writableOrThrow();
      const input = fieldsSchema.parse(Object.fromEntries(fd));
      await saveFields(ctx.org.id, id, input);
      revalidatePath(`/app/reports/${id}`);
      if (fd.get("intent") === "finalize") {
        await finalize(ctx.org.id, ctx.user.id, id);
        redirect(`/app/reports/${id}?finalized=1`);
      }
      if (fd.get("intent") === "preview") redirect(`/app/reports/${id}`);
      return { ok: true, message: "下書きを保存しました。", values };
    },
    "report.save",
    values,
  );
}

async function finalize(orgId: string, userId: string, id: string) {
  const report = await loadOwnReport(orgId, id);
  if (!report.workContent?.trim()) throw new AppError("確定するには「作業内容」を入力してください。");
  const version = report.version + 1;
  const now = new Date();
  // 先に状態を更新し、条件付き UPDATE で二重確定を防ぐ
  const updated = await db
    .update(workReports)
    .set({ status: "final", version, finalizedAt: now, finalizedBy: userId, updatedAt: now })
    .where(and(eq(workReports.orgId, orgId), eq(workReports.id, id), eq(workReports.status, "draft"), eq(workReports.version, report.version)))
    .returning({ id: workReports.id });
  if (!updated[0]) throw new AppError("報告書は既に確定されています。");
  const snapshot = await buildSnapshot(orgId, id);
  await db.insert(reportVersions).values({
    id: newId(),
    orgId,
    reportId: id,
    version,
    snapshot: JSON.stringify(snapshot),
    createdBy: userId,
    createdAt: now,
  });
  await audit({ orgId, userId, action: "report.finalize", targetType: "report", targetId: id, meta: { version } });
}

/** 確定済みを修正可能に戻す（確定時の内容は report_versions に残っている） */
export async function reopenReportAction(id: string): Promise<void> {
  const ctx = await writableOrThrow();
  const report = await loadOwnReport(ctx.org.id, id);
  if (report.status === "final") {
    await db
      .update(workReports)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(workReports.orgId, ctx.org.id), eq(workReports.id, id)));
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "report.reopen", targetType: "report", targetId: id, meta: { fromVersion: report.version } });
  }
  redirect(`/app/reports/${id}/edit`);
}

export async function duplicateReportAction(id: string): Promise<void> {
  const ctx = await writableOrThrow();
  const src = await loadOwnReport(ctx.org.id, id);
  const newReportId = newId();
  await db.insert(workReports).values({
    id: newReportId,
    orgId: ctx.org.id,
    reportNumber: await nextReportNumber(ctx.org.id),
    status: "draft",
    version: 0,
    title: src.title,
    workDate: todayJst(),
    customerId: src.customerId,
    siteId: src.siteId,
    workerNames: src.workerNames,
    startTime: src.startTime,
    endTime: src.endTime,
    workContent: src.workContent,
    materials: src.materials,
    specialNotes: src.specialNotes,
    nextSchedule: src.nextSchedule,
    createdBy: ctx.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "report.duplicate", targetType: "report", targetId: newReportId, meta: { from: id } });
  redirect(`/app/reports/${newReportId}/edit?duplicated=1`);
}

export async function deleteReportAction(id: string): Promise<void> {
  const ctx = await writableOrThrow();
  const report = await loadOwnReport(ctx.org.id, id);
  if (report.version > 0) throw new AppError("一度確定した報告書は削除できません。");
  const photos = await db
    .select({ key: workReportPhotos.storageKey, thumb: workReportPhotos.thumbKey })
    .from(workReportPhotos)
    .where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.reportId, id)));
  await db.update(workReports).set({ deletedAt: new Date() }).where(and(eq(workReports.orgId, ctx.org.id), eq(workReports.id, id)));
  await db.delete(workReportPhotos).where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.reportId, id)));
  await Promise.all(photos.flatMap((p) => [deleteObject(p.key), p.thumb ? deleteObject(p.thumb) : null]).filter(Boolean)).catch(() => {});
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "report.delete", targetType: "report", targetId: id });
  redirect("/app/reports?deleted=1");
}

// ---- 写真 ----

async function loadDraftPhoto(orgId: string, photoId: string) {
  const rows = await db
    .select({ photo: workReportPhotos, status: workReports.status })
    .from(workReportPhotos)
    .innerJoin(workReports, eq(workReports.id, workReportPhotos.reportId))
    .where(and(eq(workReportPhotos.orgId, orgId), eq(workReportPhotos.id, photoId), eq(workReports.orgId, orgId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("写真が見つかりません。", 404);
  if (row.status !== "draft") throw new AppError("確定済みの報告書の写真は変更できません。");
  return row.photo;
}

const photoUpdateSchema = z.object({
  caption: optionalText(500),
  category: z.enum(PHOTO_CATEGORIES),
});

export async function updatePhotoAction(photoId: string, input: { caption: string; category: string }): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await writableOrThrow();
    const data = photoUpdateSchema.parse(input);
    await loadDraftPhoto(ctx.org.id, photoId);
    await db
      .update(workReportPhotos)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.id, photoId)));
    return { ok: true };
  }, "photo.update");
}

export async function deletePhotoAction(photoId: string): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await writableOrThrow();
    const photo = await loadDraftPhoto(ctx.org.id, photoId);
    const report = await loadOwnReport(ctx.org.id, photo.reportId);
    await db.delete(workReportPhotos).where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.id, photoId)));
    // 一度確定した報告書の写真は、過去の版のPDF（送信済みリンク等）で使うため実体を残す
    if (report.version === 0) {
      await deleteObject(photo.storageKey).catch(() => {});
      if (photo.thumbKey) await deleteObject(photo.thumbKey).catch(() => {});
    }
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "photo.delete", targetType: "photo", targetId: photoId });
    return { ok: true };
  }, "photo.delete");
}

/** 写真の並び順を、渡された ID の順に保存する */
export async function reorderPhotosAction(reportId: string, ids: string[]): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await writableOrThrow();
    const report = await loadOwnReport(ctx.org.id, reportId);
    if (report.status !== "draft") throw new AppError("確定済みの報告書の写真は変更できません。");
    const parsed = z.array(z.uuid()).max(500).parse(ids);
    const existing = await db
      .select({ id: workReportPhotos.id })
      .from(workReportPhotos)
      .where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.reportId, reportId)))
      .orderBy(asc(workReportPhotos.sortOrder));
    const valid = new Set(existing.map((e) => e.id));
    if (parsed.length !== valid.size || !parsed.every((id) => valid.has(id))) throw new AppError("写真の一覧が古くなっています。画面を再読み込みしてください。");
    const stmts = parsed.map((id, i) =>
      db
        .update(workReportPhotos)
        .set({ sortOrder: i })
        .where(and(eq(workReportPhotos.orgId, ctx.org.id), eq(workReportPhotos.id, id))),
    );
    if (stmts.length) await db.batch(stmts as [typeof stmts[number], ...typeof stmts]);
    await db.update(workReports).set({ updatedAt: new Date() }).where(eq(workReports.id, reportId));
    return { ok: true };
  }, "photo.reorder");
}

