import Link from "next/link";
import { Plus, Search, MapPin, ChevronRight } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { listSites } from "@/lib/data/customers";
import { Card, EmptyState, Input, LinkButton, PageHeader, cn } from "@/components/ui";

export default async function SitesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const archived = sp.archived === "1";
  const rows = await listSites(ctx.org.id, { q: q || undefined, archived });
  return (
    <>
      <PageHeader
        title="現場管理"
        actions={
          <LinkButton href="/app/sites/new">
            <Plus className="size-5" /> 現場を登録
          </LinkButton>
        }
      />
      <form className="mb-3 flex gap-2" role="search">
        {archived && <input type="hidden" name="archived" value="1" />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-slate-400" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="現場名・住所・顧客名で検索" className="pl-10" aria-label="現場を検索" />
        </div>
        <button className="h-12 rounded-xl bg-navy-900 px-4 font-bold text-white">検索</button>
      </form>
      <div className="mb-4 flex gap-2">
        <Link href="/app/sites" className={cn("rounded-full px-4 py-2 text-sm font-bold", !archived ? "bg-navy-900 text-white" : "border border-slate-300 bg-white")}>
          利用中
        </Link>
        <Link href="/app/sites?archived=1" className={cn("rounded-full px-4 py-2 text-sm font-bold", archived ? "bg-navy-900 text-white" : "border border-slate-300 bg-white")}>
          アーカイブ
        </Link>
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<MapPin className="size-7" />} title={q ? "該当する現場がありません" : "現場が登録されていません"} action={!q && !archived ? <LinkButton href="/app/sites/new">現場を登録する</LinkButton> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="site-list">
            {rows.map(({ site, customerName }) => (
              <li key={site.id}>
                <Link href={`/app/sites/${site.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy-900">{site.name}</p>
                    <p className="truncate text-xs text-slate-500">{[customerName, site.address].filter(Boolean).join("・") || "—"}</p>
                  </div>
                  <ChevronRight className="size-5 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
