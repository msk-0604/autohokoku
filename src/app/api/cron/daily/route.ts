import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { authTokens, emailLogs, notificationLogs, organizations, rateLimits, sessions, systemErrors } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { adminEmails } from "@/lib/billing/sync";
import { notifyAdmin, reportError, sendNotification } from "@/lib/monitoring";
import { trialEndedTemplate, trialEndingTemplate } from "@/lib/email/templates";
import { formatDate } from "@/lib/dates";
import { audit } from "@/lib/audit";

export const maxDuration = 300;
const DAY = 24 * 60 * 60 * 1000;

function authorized(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!env.CRON_SECRET || header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/**
 * 毎日の自動処理（Vercel Cron から呼ばれる。vercel.json 参照）
 * 1. 無料体験終了3日前のお知らせ
 * 2. 無料体験終了の処理とお知らせ
 * 3. 期限切れセッション・トークン等の掃除
 * 4. 監視：前日のメール送信失敗・重大エラー・決済失敗を運営者へ通知
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const now = Date.now();
  const result = { trialEnding: 0, trialEnded: 0, cleaned: 0, alerts: 0 };
  try {
    // 1. 体験終了3日前（まだ申し込みのない会社）
    const ending = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.planStatus, "trialing"), gt(organizations.trialEndsAt, new Date(now)), lte(organizations.trialEndsAt, new Date(now + 3 * DAY))));
    for (const org of ending) {
      for (const a of await adminEmails(org.id)) {
        const r = await sendNotification({
          orgId: org.id,
          userId: a.userId,
          kind: "trial_ending",
          to: a.email,
          rendered: trialEndingTemplate(org.name, formatDate(org.trialEndsAt), `${env.APP_URL}/app/billing`),
          dedupeKey: `trial_ending:${org.id}:${org.trialEndsAt.getTime()}:${a.userId}`,
        });
        if (r === "sent") result.trialEnding++;
      }
    }

    // 2. 体験終了（Stripe の契約が無いまま期限を過ぎた会社）
    const expired = await db
      .update(organizations)
      .set({ planStatus: "trial_expired", updatedAt: new Date() })
      .where(and(eq(organizations.planStatus, "trialing"), lte(organizations.trialEndsAt, new Date(now))))
      .returning();
    for (const org of expired) {
      await audit({ orgId: org.id, action: "billing.trial_expired", ip: "cron" });
      for (const a of await adminEmails(org.id)) {
        const r = await sendNotification({
          orgId: org.id,
          userId: a.userId,
          kind: "trial_ended",
          to: a.email,
          rendered: trialEndedTemplate(org.name, `${env.APP_URL}/app/billing`),
          dedupeKey: `trial_ended:${org.id}:${a.userId}`,
        });
        if (r === "sent") result.trialEnded++;
      }
    }

    // 3. 掃除
    const cleaned = await Promise.all([
      db.delete(sessions).where(lt(sessions.expiresAt, new Date(now))).returning({ id: sessions.id }),
      db.delete(authTokens).where(lt(authTokens.expiresAt, new Date(now - 7 * DAY))).returning({ id: authTokens.id }),
      db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).returning({ k: rateLimits.key }),
      db.delete(systemErrors).where(lt(systemErrors.createdAt, new Date(now - 180 * DAY))).returning({ id: systemErrors.id }),
    ]);
    result.cleaned = cleaned.reduce((n, r) => n + r.length, 0);

    // 4. 監視（直近24時間）
    const since = new Date(now - DAY);
    const [failedMails, failedNotices, criticals, paymentFailures] = await Promise.all([
      db.select({ n: sql<number>`COUNT(*)` }).from(emailLogs).where(and(eq(emailLogs.status, "failed"), gte(emailLogs.updatedAt, since))),
      db.select({ n: sql<number>`COUNT(*)` }).from(notificationLogs).where(and(eq(notificationLogs.status, "failed"), gte(notificationLogs.createdAt, since))),
      db.select({ n: sql<number>`COUNT(*)` }).from(systemErrors).where(and(eq(systemErrors.level, "critical"), gte(systemErrors.createdAt, since))),
      db.select({ n: sql<number>`COUNT(*)` }).from(notificationLogs).where(and(eq(notificationLogs.kind, "payment_failed"), gte(notificationLogs.createdAt, since))),
    ]);
    const lines = [
      `報告書メール送信失敗: ${failedMails[0].n}件`,
      `通知メール送信失敗: ${failedNotices[0].n}件`,
      `重大エラー: ${criticals[0].n}件`,
      `決済失敗の通知: ${paymentFailures[0].n}件`,
    ];
    if (failedMails[0].n + failedNotices[0].n + criticals[0].n > 0) {
      await notifyAdmin("日次監視：要確認の項目があります", `${lines.join("\n")}\n\n詳細は運営管理画面（/ops）をご確認ください。`, `daily_alert:${new Date(now).toISOString().slice(0, 10)}`);
      result.alerts = 1;
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await reportError("cron.daily", e, result, "critical");
    return NextResponse.json({ ok: false, error: "cron failed" }, { status: 500 });
  }
}
