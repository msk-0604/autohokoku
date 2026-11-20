import { desc, eq } from "drizzle-orm";
import { Check } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { formatDate } from "@/lib/dates";
import { PRICE_MONTHLY_TAX_INCLUDED } from "@/lib/brand";
import { stripeEnabled } from "@/lib/env";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { BillingButtons } from "./billing-buttons";

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const access = accessOf(ctx.org);
  const sub = (await db.select().from(subscriptions).where(eq(subscriptions.orgId, ctx.org.id)).orderBy(desc(subscriptions.updatedAt)).limit(1))[0];
  const hasPaidPlan = ["active", "past_due", "trialing"].includes(sub?.status ?? "") && !!sub;
  const isAdmin = ctx.role === "admin";

  return (
    <>
      <PageHeader title="契約・お支払い" />
      {sp.checkout === "success" && (
        <Alert tone="success" className="mb-4">
          お申し込みありがとうございます。決済情報を確認しています。反映まで数十秒かかる場合があります。
        </Alert>
      )}
      {sp.checkout === "canceled" && <Alert tone="info" className="mb-4">お申し込みは完了していません。</Alert>}
      {access.status === "past_due" && <Alert tone="warn" className="mb-4">{access.message}</Alert>}
      {!access.canWrite && <Alert tone="error" className="mb-4">{access.message}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">現在のご契約</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-bold text-navy-900" data-testid="plan-label">
              {access.label}
            </span>
            <Badge tone={access.tone === "ok" ? "green" : access.tone === "warn" ? "amber" : "red"}>{access.canWrite ? "全機能" : "閲覧のみ"}</Badge>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {access.status === "trialing" && (
              <div className="flex justify-between">
                <dt className="text-slate-500">無料体験の終了日</dt>
                <dd className="font-bold">{formatDate(ctx.org.trialEndsAt)}</dd>
              </div>
            )}
            {sub?.currentPeriodEnd && hasPaidPlan && (
              <div className="flex justify-between">
                <dt className="text-slate-500">{sub.cancelAtPeriodEnd ? "ご利用終了日" : "次回更新日"}</dt>
                <dd className="font-bold">{formatDate(sub.currentPeriodEnd)}</dd>
              </div>
            )}
          </dl>
          {sub?.cancelAtPeriodEnd && hasPaidPlan && <Alert tone="warn" className="mt-4">解約手続き済みです。上記の日まではご利用いただけます。</Alert>}
          {sub?.status === "trialing" && <p className="mt-3 text-sm text-slate-600">お申し込み済みです。無料体験の終了後に初回のお支払いが行われます。</p>}

          <div className="mt-5">
            {!isAdmin ? (
              <p className="text-sm text-slate-600">お申し込み・お支払い方法の変更は、会社の管理者が行えます。</p>
            ) : !stripeEnabled ? (
              <Alert tone="warn">決済機能の設定が完了していません（運営側の設定待ち）。</Alert>
            ) : (
              <BillingButtons canSubscribe={!hasPaidPlan} hasCustomer={!!ctx.org.stripeCustomerId} />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">料金プラン</p>
          <p className="mt-2 text-3xl font-bold text-navy-900">
            月額 {PRICE_MONTHLY_TAX_INCLUDED.toLocaleString("ja-JP")}円<span className="ml-1 text-base font-normal text-slate-600">（税込）</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {["初期費用 0円", "ユーザー数・報告書数・写真枚数の追加料金なし", "毎月自動更新・いつでも解約可能", "クレジットカードでお支払い（Stripe）"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-emerald-600" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            お支払い方法の変更・領収書の確認・解約は「お支払い方法・解約」から、Stripe の安全な画面でいつでも行えます。解約後も作成済みの報告書は閲覧・PDFダウンロードできます。
          </p>
        </Card>
      </div>
    </>
  );
}
