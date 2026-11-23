import Link from "next/link";
import { Plus, Check } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { dashboardStats, listReports } from "@/lib/data/reports";
import { accessOf } from "@/lib/billing/access";
import { Alert, Card, CardHeader, LinkButton, cn } from "@/components/ui";
import { ReportList } from "@/components/report-list";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const [stats, drafts, unsent, recent] = await Promise.all([
    dashboardStats(ctx.org.id),
    listReports(ctx.org.id, { status: "draft", limit: 5 }),
    listReports(ctx.org.id, { status: "final", unsent: true, limit: 5 }),
    listReports(ctx.org.id, { limit: 5 }),
  ]);
  const access = accessOf(ctx.org);
  const nothingYet = recent.length === 0;
  const stat = [
    { label: "今月の報告書", value: stats.monthly, href: "/app/reports", key: "monthly" },
    { label: "下書き", value: stats.drafts, href: "/app/reports?status=draft", key: "drafts" },
    { label: "確定", value: stats.finals, href: "/app/reports?status=final", key: "finals" },
    { label: "今月の送信", value: stats.sentThisMonth, href: "/app/reports?status=final", key: "sent" },
  ];
  const setupSteps = [
    { label: "会社の住所・電話番号を登録する", done: Boolean(ctx.org.address || ctx.org.phone), href: "/app/settings" },
    { label: "最初の報告書を作成する", done: !nothingYet, href: "/app/reports/new" },
    { label: "お客様にメールで送ってみる", done: stats.sentThisMonth > 0, href: "/app/reports?status=final" },
  ];

  return (
    <>
      {sp.welcome && <Alert tone="success" className="mb-4">メールアドレスの確認が完了しました。</Alert>}
      {sp.denied && <Alert tone="error" className="mb-4">このページは管理者のみ利用できます。</Alert>}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">ダッシュボード</h1>
        {access.canWrite && (
          <LinkButton href="/app/reports/new" data-testid="new-report-hero">
            <Plus className="size-5" aria-hidden /> 新規報告書
          </LinkButton>
        )}
      </div>

      {/* 件数（1つの枠に横並び。アイコンなし） */}
      <dl className="mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-4">
        {stat.map((c, i) => (
          <Link key={c.key} href={c.href} className={cn("px-4 py-3 hover:bg-slate-50", i % 2 === 1 && "border-l border-slate-200", i >= 2 && "border-t border-slate-200 sm:border-t-0", i === 2 && "sm:border-l")}>
            <dt className="text-sm text-slate-600">{c.label}</dt>
            <dd className="mt-0.5 num text-2xl font-medium text-navy-900" data-testid={`stat-${c.key}`}>
              {c.value}
              <span className="ml-1 text-sm font-normal text-slate-500">件</span>
            </dd>
          </Link>
        ))}
      </dl>

      {setupSteps.some((s) => !s.done) && nothingYet && (
        <Card className="mb-5 p-4 sm:p-5">
          <h2 className="font-bold text-navy-900">はじめにやること</h2>
          <ol className="mt-3 space-y-1">
            {setupSteps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className="flex min-h-11 items-center gap-3 rounded-lg px-1 hover:bg-slate-50">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-600")}>
                    {s.done ? <Check className="size-4" aria-label="完了" /> : i + 1}
                  </span>
                  <span className={cn("text-[15px]", s.done ? "text-slate-500 line-through" : "font-bold text-navy-900")}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={`書きかけの下書き（${stats.drafts}件）`} action={stats.drafts > 5 ? <Link href="/app/reports?status=draft" className="text-sm font-bold text-brand-700">すべて</Link> : undefined} />
          <div className="mt-1 pb-1">{drafts.length ? <ReportList rows={drafts} /> : <p className="px-4 py-6 text-sm text-slate-500 sm:px-5">書きかけの報告書はありません。</p>}</div>
        </Card>
        <Card>
          <CardHeader title="確定済み・未送信" action={<Link href="/app/reports?status=final" className="text-sm font-bold text-brand-700">確定済みの一覧</Link>} />
          <div className="mt-1 pb-1">
            {unsent.length ? <ReportList rows={unsent} /> : <p className="px-4 py-6 text-sm text-slate-500 sm:px-5">お客様への送信待ちはありません。</p>}
          </div>
        </Card>
      </div>

      {!nothingYet && (
        <p className="mt-5 text-right">
          <Link href="/app/reports" className="inline-flex h-10 items-center text-sm font-bold text-brand-700">
            すべての報告書を見る
          </Link>
        </p>
      )}
    </>
  );
}
