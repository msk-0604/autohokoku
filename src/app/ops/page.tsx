import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { emailLogs, notificationLogs, organizations, subscriptions, supportRequests, systemErrors, workReports } from "@/lib/db/schema";
import { PRICE_MONTHLY_TAX_INCLUDED } from "@/lib/brand";
import { formatDateTime, formatDate, monthStartJstMs } from "@/lib/dates";
import { accessOf } from "@/lib/billing/access";
import { setSupportStatusAction } from "./actions";

const DAY = 24 * 60 * 60 * 1000;

export default async function OpsPage() {
  await requirePlatformAdmin();
  const data = await loadOps();
  return <OpsView {...data} />;
}

async function loadOps() {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since24 = new Date(now - DAY);
  const monthStart = new Date(monthStartJstMs());
  const n = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);

  const [
    orgTotal,
    statusRows,
    paidSubs,
    canceledThisMonth,
    reportTotal,
    mailSentTotal,
    mailSent30,
    mailFailed30,
    paymentFailed30,
    errors24,
    supportOpen,
    recentErrors,
    recentSupport,
    orgs,
  ] = await Promise.all([
    db.select({ n: count() }).from(organizations),
    db.select({ status: organizations.planStatus, n: count() }).from(organizations).groupBy(organizations.planStatus),
    db.select({ n: count() }).from(subscriptions).where(inArray(subscriptions.status, ["active", "past_due"])),
    db.select({ n: count() }).from(organizations).where(and(eq(organizations.planStatus, "canceled"), gte(organizations.canceledAt, monthStart))),
    db.select({ n: count() }).from(workReports),
    db.select({ n: count() }).from(emailLogs).where(eq(emailLogs.status, "sent")),
    db.select({ n: count() }).from(emailLogs).where(and(eq(emailLogs.status, "sent"), gte(emailLogs.createdAt, since30))),
    db.select({ n: count() }).from(emailLogs).where(and(eq(emailLogs.status, "failed"), gte(emailLogs.updatedAt, since30))),
    db.select({ n: count() }).from(notificationLogs).where(and(eq(notificationLogs.kind, "payment_failed"), gte(notificationLogs.createdAt, since30))),
    db.select({ n: count() }).from(systemErrors).where(gte(systemErrors.createdAt, since24)),
    db.select({ n: count() }).from(supportRequests).where(eq(supportRequests.status, "open")),
    db.select().from(systemErrors).orderBy(desc(systemErrors.createdAt)).limit(15),
    db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt)).limit(15),
    db
      .select({
        org: organizations,
        reports: sql<number>`(SELECT COUNT(*) FROM work_reports r WHERE r.org_id = "organizations"."id")`,
        users: sql<number>`(SELECT COUNT(*) FROM memberships m WHERE m.org_id = "organizations"."id")`,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt))
      .limit(100),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.n)]));
  const paid = n(paidSubs);
  const metrics: [string, string | number, string?][] = [
    ["登録企業数", n(orgTotal)],
    ["無料体験中", byStatus.trialing ?? 0, "Stripe申込済みの体験中を含む"],
    ["有料契約企業数", paid, "active / past_due"],
    ["MRR（税込）", `${(paid * PRICE_MONTHLY_TAX_INCLUDED).toLocaleString("ja-JP")}円`, "有料契約数 × 月額"],
    ["解約企業数", byStatus.canceled ?? 0, `今月 ${n(canceledThisMonth)}社`],
    ["体験終了（未契約）", byStatus.trial_expired ?? 0],
    ["報告書作成総数", n(reportTotal)],
    ["メール送信件数", n(mailSentTotal), `直近30日 ${n(mailSent30)}件`],
    ["メール送信失敗（30日）", n(mailFailed30)],
    ["決済失敗（30日）", n(paymentFailed30), `支払い遅延中 ${byStatus.past_due ?? 0}社`],
    ["システムエラー（24時間）", n(errors24)],
    ["未対応の問い合わせ", n(supportOpen)],
  ];

  return { metrics, orgs, recentSupport, recentErrors };
}

function OpsView({ metrics, orgs, recentSupport, recentErrors }: Awaited<ReturnType<typeof loadOps>>) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {metrics.map(([label, value, note]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900" data-testid={`ops-${label}`}>
              {value}
            </p>
            {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold">契約状況（最新100社）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="p-2">会社名</th>
                <th className="p-2">状態</th>
                <th className="p-2">体験終了</th>
                <th className="p-2">報告書</th>
                <th className="p-2">ユーザー</th>
                <th className="p-2">Stripe顧客</th>
                <th className="p-2">登録日</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map(({ org, reports, users }) => (
                <tr key={org.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold">{org.name}</td>
                  <td className="p-2">
                    {accessOf(org).label}
                    <span className="ml-1 text-xs text-slate-400">({org.planStatus})</span>
                  </td>
                  <td className="p-2">{formatDate(org.trialEndsAt)}</td>
                  <td className="p-2">{reports}</td>
                  <td className="p-2">{users}</td>
                  <td className="p-2 font-mono text-xs">{org.stripeCustomerId ?? "—"}</td>
                  <td className="p-2">{formatDate(org.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">問い合わせ</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {recentSupport.length === 0 && <li className="py-2 text-slate-500">なし</li>}
            {recentSupport.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">
                    [{s.category}] {s.name}（{s.companyName ?? "—"}）
                  </span>
                  <form action={setSupportStatusAction.bind(null, s.id, s.status === "open" ? "closed" : "open")}>
                    <button className={`rounded px-2 py-1 text-xs font-bold ${s.status === "open" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                      {s.status === "open" ? "未対応 → 対応済みにする" : "対応済み"}
                    </button>
                  </form>
                </div>
                <p className="text-xs text-slate-500">
                  {s.email}・{formatDateTime(s.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{s.message}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">システムエラー（最新15件）</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {recentErrors.length === 0 && <li className="py-2 text-slate-500">なし</li>}
            {recentErrors.map((e) => (
              <li key={e.id} className="py-2">
                <p>
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-bold ${e.level === "critical" ? "bg-red-100 text-red-700" : "bg-slate-100"}`}>{e.level}</span>
                  <span className="font-mono text-xs">{e.source}</span>
                </p>
                <p className="mt-1 break-all text-slate-700">{e.message}</p>
                <p className="text-xs text-slate-400">{formatDateTime(e.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
