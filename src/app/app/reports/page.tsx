import { Plus, Search } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { listReports } from "@/lib/data/reports";
import { Alert, Card, EmptyState, FilterTabs, Input, LinkButton, PageHeader, buttonClass } from "@/components/ui";
import { ReportList } from "@/components/report-list";

const PAGE = 30;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = sp.status === "draft" || sp.status === "final" ? sp.status : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await listReports(ctx.org.id, { q: q || undefined, status, limit: PAGE + 1, offset: (page - 1) * PAGE });
  const hasNext = rows.length > PAGE;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, status, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/app/reports${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="作業報告書"
        actions={
          <LinkButton href="/app/reports/new">
            <Plus className="size-5" aria-hidden /> 新規報告書
          </LinkButton>
        }
      />
      {sp.deleted && <Alert tone="success" className="mb-4">下書きを削除しました。</Alert>}
      <form className="mb-3 flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-slate-400" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="番号・顧客・現場・内容で検索" className="pl-10" aria-label="報告書を検索" />
        </div>
        <button className={buttonClass("secondary", "md", "h-12")}>検索</button>
      </form>
      <FilterTabs
        label="状態で絞り込み"
        items={[
          { label: "すべて", href: qs({ status: undefined, page: undefined }), active: !status },
          { label: "下書き", href: qs({ status: "draft", page: undefined }), active: status === "draft" },
          { label: "確定", href: qs({ status: "final", page: undefined }), active: status === "final" },
        ]}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title={q || status ? "該当する報告書がありません" : "まだ報告書がありません"}
            description={q || status ? "検索条件を変えてお試しください。" : "スマホで写真を撮って、最初の報告書を作ってみましょう。"}
            action={!q && !status ? <LinkButton href="/app/reports/new">報告書を作成する</LinkButton> : undefined}
          />
        ) : (
          <ReportList rows={rows.slice(0, PAGE)} table />
        )}
      </Card>
      <div className="mt-4 flex justify-between">
        {page > 1 ? <LinkButton href={qs({ page: String(page - 1) })} variant="secondary">前へ</LinkButton> : <span />}
        {hasNext && <LinkButton href={qs({ page: String(page + 1) })} variant="secondary">次へ</LinkButton>}
      </div>
    </>
  );
}
