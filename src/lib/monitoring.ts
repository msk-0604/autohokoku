import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationLogs, systemErrors } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { adminAlertTemplate, type Rendered } from "@/lib/email/templates";

/**
 * エラーを system_errors に記録する。critical の場合は運営者へメール通知（同じ発生元は1時間に1通まで）。
 * 外部の監視サービス（Sentry 等）を追加する場合はここに足せばよい。
 */
export async function reportError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
  level: "error" | "critical" = "error",
) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[${level}] ${source}:`, err);
  try {
    await db.insert(systemErrors).values({
      id: newId(),
      level,
      source: source.slice(0, 200),
      message: err.message.slice(0, 2000),
      stack: err.stack?.slice(0, 8000) ?? null,
      context: context ? JSON.stringify(context).slice(0, 8000) : null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[monitoring] failed to record error", e);
  }
  if (level === "critical") {
    const hour = new Date().toISOString().slice(0, 13);
    await notifyAdmin(`重大エラー: ${source}`, `${err.message}\n\n${err.stack ?? ""}\n\n${JSON.stringify(context ?? {})}`, `alert:${source}:${hour}`);
  }
}

/** 運営者への通知（dedupeKey で重複送信を防ぐ） */
export async function notifyAdmin(title: string, detail: string, dedupeKey?: string) {
  if (!env.ADMIN_ALERT_EMAIL) return;
  await sendNotification({
    kind: "admin_alert",
    to: env.ADMIN_ALERT_EMAIL,
    rendered: adminAlertTemplate(title, detail),
    dedupeKey,
  });
}

/**
 * 通知メールを送り notification_logs に記録する。
 * dedupeKey が既に送信済みなら何もしない（cron の再実行や Webhook の再送でも二重送信しない）。
 * 失敗時は dedupeKey を外して記録するので、次回の実行で再送される。
 */
export async function sendNotification(params: {
  orgId?: string | null;
  userId?: string | null;
  kind: string;
  to: string;
  rendered: Rendered;
  dedupeKey?: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const id = newId();
  try {
    if (params.dedupeKey) {
      const inserted = await db
        .insert(notificationLogs)
        .values({
          id,
          orgId: params.orgId ?? null,
          userId: params.userId ?? null,
          kind: params.kind,
          toEmail: params.to,
          status: "sent",
          dedupeKey: params.dedupeKey,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: notificationLogs.id });
      if (inserted.length === 0) return "skipped";
    }
    await sendEmail({ to: params.to, ...params.rendered, idempotencyKey: params.dedupeKey ? `n:${params.dedupeKey}` : undefined });
    if (!params.dedupeKey) {
      await db.insert(notificationLogs).values({
        id,
        orgId: params.orgId ?? null,
        userId: params.userId ?? null,
        kind: params.kind,
        toEmail: params.to,
        status: "sent",
        createdAt: new Date(),
      });
    }
    return "sent";
  } catch (e) {
    const message = (e as Error).message?.slice(0, 1000);
    console.error(`[notification] ${params.kind} to ${params.to} failed`, e);
    try {
      if (params.dedupeKey) {
        await db.update(notificationLogs).set({ status: "failed", error: message, dedupeKey: null }).where(eq(notificationLogs.id, id));
      } else {
        await db.insert(notificationLogs).values({
          id,
          orgId: params.orgId ?? null,
          userId: params.userId ?? null,
          kind: params.kind,
          toEmail: params.to,
          status: "failed",
          error: message,
          createdAt: new Date(),
        });
      }
    } catch {}
    return "failed";
  }
}
