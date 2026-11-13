import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailLogs, reportVersions, shareLinks, workReports } from "@/lib/db/schema";
import { newId, randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendEmail, EmailSendError } from "@/lib/email/send";
import { reportEmailTemplate } from "@/lib/email/templates";
import { renderReportPdf, pdfFilename } from "@/lib/pdf/render";
import type { ReportSnapshot } from "@/lib/data/reports";
import type { Org } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { reportError } from "@/lib/monitoring";

export const SHARE_LINK_DAYS = 14;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type EmailLog = typeof emailLogs.$inferSelect;

export async function loadVersionSnapshot(orgId: string, reportId: string, version: number): Promise<ReportSnapshot | null> {
  const rows = await db
    .select({ snapshot: reportVersions.snapshot })
    .from(reportVersions)
    .where(and(eq(reportVersions.orgId, orgId), eq(reportVersions.reportId, reportId), eq(reportVersions.version, version)))
    .limit(1);
  return rows[0] ? (JSON.parse(rows[0].snapshot) as ReportSnapshot) : null;
}

/**
 * email_logs の1件を実際に送信する（初回・再送共通）。
 * - 送信中フラグを条件付き UPDATE で立てるので、同じログを同時に2回送ることはない
 * - Resend には attempt ごとの Idempotency-Key を付けるので、通信断で再送しても二重配信されにくい
 */
export async function deliverEmailLog(org: Org, logId: string, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db.select().from(emailLogs).where(and(eq(emailLogs.orgId, org.id), eq(emailLogs.id, logId))).limit(1);
  const log = rows[0];
  if (!log) return { ok: false, error: "送信記録が見つかりません。" };
  if (log.status === "sent") return { ok: true };

  const attempt = log.attemptCount + 1;
  const claimed = await db
    .update(emailLogs)
    .set({ status: "sending", attemptCount: attempt, error: null, updatedAt: new Date() })
    .where(and(eq(emailLogs.id, logId), eq(emailLogs.attemptCount, log.attemptCount)))
    .returning({ id: emailLogs.id });
  if (!claimed[0]) return { ok: false, error: "このメールは現在送信処理中です。しばらくしてから送信履歴をご確認ください。" };

  try {
    const snapshot = await loadVersionSnapshot(org.id, log.reportId, log.reportVersion);
    if (!snapshot) throw new Error("報告書の確定データが見つかりません");

    let mode = log.mode;
    let pdf: Buffer | null = null;
    if (mode === "attachment") {
      pdf = await renderReportPdf(org, snapshot, "grid");
      if (pdf.byteLength > MAX_ATTACHMENT_BYTES) mode = "link"; // 大きすぎる場合はリンクに切り替える
    }

    let downloadUrl: string | undefined;
    let expiresText: string | undefined;
    let shareLinkId = log.shareLinkId;
    if (mode === "link") {
      const token = randomToken();
      const expiresAt = new Date(Date.now() + SHARE_LINK_DAYS * 24 * 60 * 60 * 1000);
      shareLinkId = newId();
      await db.insert(shareLinks).values({
        id: shareLinkId,
        orgId: org.id,
        reportId: log.reportId,
        reportVersion: log.reportVersion,
        tokenHash: sha256(token),
        expiresAt,
        createdBy: userId,
        createdAt: new Date(),
      });
      downloadUrl = `${env.APP_URL}/d/${token}`;
      expiresText = formatDateTime(expiresAt);
    }

    const rendered = reportEmailTemplate({ orgName: org.name, bodyText: log.body, downloadUrl, expiresText });
    const result = await sendEmail({
      to: log.toEmail,
      subject: log.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: org.email ?? undefined,
      attachments: mode === "attachment" && pdf ? [{ filename: pdfFilename(snapshot), content: pdf, contentType: "application/pdf" }] : undefined,
      idempotencyKey: `report-mail:${log.id}:${attempt}`,
    });

    await db
      .update(emailLogs)
      .set({ status: "sent", mode, providerMessageId: result.id, shareLinkId, sentAt: new Date(), updatedAt: new Date() })
      .where(eq(emailLogs.id, logId));
    return { ok: true };
  } catch (e) {
    const message = e instanceof EmailSendError ? e.message : "送信処理中にエラーが発生しました。";
    await db.update(emailLogs).set({ status: "failed", error: message.slice(0, 500), updatedAt: new Date() }).where(eq(emailLogs.id, logId));
    await reportError("email.report", e, { orgId: org.id, logId, attempt });
    return { ok: false, error: `${message} 送信履歴の「再送」から再試行できます。` };
  }
}

export async function hasSentTo(orgId: string, email: string) {
  const rows = await db
    .select({ id: emailLogs.id })
    .from(emailLogs)
    .where(and(eq(emailLogs.orgId, orgId), eq(emailLogs.toEmail, email), eq(emailLogs.status, "sent")))
    .limit(1);
  return Boolean(rows[0]);
}

export async function getFinalReport(orgId: string, reportId: string) {
  const rows = await db
    .select()
    .from(workReports)
    .where(and(eq(workReports.orgId, orgId), eq(workReports.id, reportId)))
    .limit(1);
  return rows[0] ?? null;
}
