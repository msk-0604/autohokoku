import Link from "next/link";
import { desc, eq, and, isNull } from "drizzle-orm";
import { Camera, FileText, FilePen, CheckCircle2, Send, Users, ChevronRight } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { dashboardStats, listReports } from "@/lib/data/reports";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { accessOf } from "@/lib/billing/access";
import { formatDate } from "@/lib/dates";
import { Alert, Card, CardHeader, EmptyState, LinkButton } from "@/components/ui";
import { ReportList } from "@/components/report-list";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const [stats, recent, recentCustomers] = await Promise.all([
    dashboardStats(ctx.org.id),
    listReports(ctx.org.id, { limit: 5 }),
    db
      .select({ id: customers.id, name: customers.name, companyName: customers.companyName, createdAt: customers.createdAt })
      .from(customers)
      .where(and(eq(customers.orgId, ctx.org.id), isNull(customers.archivedAt)))
      .orderBy(desc(customers.createdAt))
      .limit(5),
  ]);
  const access = accessOf(ctx.org);
  const cards = [
    { label: "今月の報告書", value: stats.monthly, icon: FileText, href: "/app/reports" },
    { label: "未完成（下書き）", value: stats.drafts, icon: FilePen, href: "/app/reports?status=draft" },
    { label: "完成済み", value: stats.finals, icon: CheckCircle2, href: "/app/reports?status=final" },
    { label: "今月の顧客送信", value: stats.sentThisMonth, icon: Send, href: "/app/reports?status=final" },
  ];

  return (
    <>
      {sp.welcome && <Alert tone="success" className="mb-4">メールアドレスの確認が完了しました。さっそく最初の報告書を作ってみましょう。</Alert>}
      {sp.denied && <Alert tone="error" className="mb-4">このページは管理者のみ利用できます。</Alert>}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{ctx.org.name}</p>
          <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">ダッシュボード</h1>
        </div>
      </div>

      {access.canWrite && (
        <Link
          href="/app/reports/new"
          className="mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-5 text-white shadow-md active:opacity-90"
          data-testid="new-report-hero"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600">
            <Camera className="size-7" />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-bold">新規報告書を作成</span>
            <span className="block text-sm text-navy-100">写真を撮って、入力するだけ</span>
          </span>
          <ChevronRight className="size-6 text-navy-200" />
        </Link>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-500">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Icon className="size-4 text-brand-600" /> {c.label}
              </div>
              <p className="mt-2 text-3xl font-bold text-navy-900" data-testid={`stat-${c.label}`}>
                {c.value}
                <span className="ml-1 text-sm font-normal text-slate-500">件</span>
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="最近作成した報告書" action={<Link href="/app/reports" className="text-sm font-bold text-brand-700">すべて見る</Link>} />
          <div className="mt-2">
            {recent.length ? (
              <ReportList rows={recent} />
            ) : (
              <EmptyState icon={<FileText className="size-7" />} title="まだ報告書がありません" description="上の「新規報告書を作成」から始めましょう。" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="最近登録した顧客" icon={<Users className="size-4 text-brand-600" />} action={<Link href="/app/customers" className="text-sm font-bold text-brand-700">一覧</Link>} />
          <ul className="mt-2 divide-y divide-slate-100 pb-2">
            {recentCustomers.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">
                顧客はまだ登録されていません
                <div className="mt-3">
                  <LinkButton href="/app/customers/new" variant="secondary" size="sm">
                    顧客を登録
                  </LinkButton>
                </div>
              </li>
            )}
            {recentCustomers.map((c) => (
              <li key={c.id}>
                <Link href={`/app/customers/${c.id}`} className="block px-4 py-3 hover:bg-slate-50 sm:px-5">
                  <p className="truncate font-bold text-navy-900">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.companyName ? `${c.companyName}・` : ""}登録日 {formatDate(c.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
