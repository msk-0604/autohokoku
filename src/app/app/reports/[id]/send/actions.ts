"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { AppError, writableOrThrow } from "@/lib/auth/dal";
import { formValues, handleAction, type ActionState } from "@/lib/actions";
import { emailSchema } from "@/lib/validation";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/ratelimit";
import { deliverEmailLog, getFinalReport, hasSentTo } from "@/lib/report-email";
import { audit } from "@/lib/audit";

const sendSchema = z.object({
  to: emailSchema,
  subject: z.string().trim().min(1, "件名を入力してください").max(200).refine((v) => !/[\r\n]/.test(v), "件名に改行は使えません"),
  body: z.string().trim().min(1, "本文を入力してください").max(5000),
  mode: z.enum(["link", "attachment"]),
  requestKey: z.uuid(),
  confirmed: z.literal("on", { error: "送信内容の確認にチェックを入れてください" }),
  confirmNewAddress: z.string().optional(),
});

export async function sendReportEmailAction(reportId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await writableOrThrow();
      const input = sendSchema.parse(Object.fromEntries(fd));
      const report = await getFinalReport(ctx.org.id, reportId);
      if (!report) throw new AppError("報告書が見つかりません。", 404);
      if (report.status !== "final") throw new AppError("確定済みの報告書のみ送信できます。");
      if (!(await rateLimit(`mail:${ctx.org.id}`, 100, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);

      // 誤送信防止：初めて送る宛先には追加の確認を必須にする
      const known = await hasSentTo(ctx.org.id, input.to);
      if (!known && input.confirmNewAddress !== "on") {
        return { error: "初めて送信する宛先です。宛先のメールアドレスに誤りがないか確認し、チェックを入れてください。", values, fieldErrors: { confirmNewAddress: ["宛先の確認が必要です"] } };
      }

      // 同じ送信フォームからの二重送信は同じ requestKey になるので、1件にまとめる
      const inserted = await db
        .insert(emailLogs)
        .values({
          id: newId(),
          orgId: ctx.org.id,
          reportId,
          reportVersion: report.version,
          toEmail: input.to,
          subject: input.subject,
          body: input.body,
          mode: input.mode,
          status: "failed",
          error: "未送信",
          requestKey: input.requestKey,
          sentBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: emailLogs.id });
      let logId = inserted[0]?.id;
      if (!logId) {
        const existing = await db
          .select({ id: emailLogs.id, status: emailLogs.status })
          .from(emailLogs)
          .where(and(eq(emailLogs.orgId, ctx.org.id), eq(emailLogs.requestKey, input.requestKey)))
          .limit(1);
        if (!existing[0]) throw new AppError("送信に失敗しました。画面を再読み込みしてください。");
        if (existing[0].status === "sent") redirect(`/app/reports/${reportId}?sent=1`);
        logId = existing[0].id;
      }

      const result = await deliverEmailLog(ctx.org, logId, ctx.user.id);
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: result.ok ? "email.sent" : "email.failed", targetType: "report", targetId: reportId, meta: { to: input.to, logId } });
      if (!result.ok) return { error: result.error, values };
      redirect(`/app/reports/${reportId}?sent=1`);
    },
    "email.send",
    values,
  );
}

export async function retryEmailAction(reportId: string, logId: string): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await writableOrThrow();
    if (!(await rateLimit(`mail:${ctx.org.id}`, 100, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);
    const rows = await db
      .select({ id: emailLogs.id, reportId: emailLogs.reportId, status: emailLogs.status, updatedAt: emailLogs.updatedAt })
      .from(emailLogs)
      .where(and(eq(emailLogs.orgId, ctx.org.id), eq(emailLogs.id, logId)))
      .limit(1);
    if (!rows[0] || rows[0].reportId !== reportId) throw new AppError("送信記録が見つかりません。", 404);
    if (rows[0].status === "sent") return { ok: true, message: "このメールは送信済みです。" };
    if (rows[0].status === "sending" && Date.now() - rows[0].updatedAt.getTime() < 5 * 60 * 1000) {
      return { error: "このメールは現在送信処理中です。数分後に送信履歴をご確認ください。" };
    }
    const result = await deliverEmailLog(ctx.org, logId, ctx.user.id);
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: result.ok ? "email.retry_sent" : "email.retry_failed", targetType: "report", targetId: reportId, meta: { logId } });
    if (!result.ok) return { error: result.error };
    return { ok: true, message: "再送しました。" };
  }, "email.retry");
}
