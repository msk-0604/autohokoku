import Link from "next/link";
import { Plus, Search, ChevronRight, Phone, Mail } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { listCustomers } from "@/lib/data/customers";
import { Card, EmptyState, FilterTabs, Input, LinkButton, PageHeader, buttonClass } from "@/components/ui";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const archived = sp.archived === "1";
  const rows = await listCustomers(ctx.org.id, { q: q || undefined, archived });
  return (
    <>
      <PageHeader
        title="顧客管理"
        actions={
          <LinkButton href="/app/customers/new">
            <Plus className="size-5" aria-hidden /> 顧客を登録
          </LinkButton>
        }
      />
      <form className="mb-3 flex gap-2" role="search">
        {archived && <input type="hidden" name="archived" value="1" />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 size-5 text-slate-400" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="顧客名・会社名・電話番号で検索" className="pl-10" aria-label="顧客を検索" />
        </div>
        <button className={buttonClass("secondary", "md", "h-12")}>検索</button>
      </form>
      <FilterTabs
        label="表示の切り替え"
        items={[
          { label: "利用中", href: `/app/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`, active: !archived },
          { label: "アーカイブ", href: `/app/customers?archived=1${q ? `&q=${encodeURIComponent(q)}` : ""}`, active: archived },
        ]}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title={q ? "該当する顧客がいません" : archived ? "アーカイブした顧客はいません" : "顧客が登録されていません"} action={!q && !archived ? <LinkButton href="/app/customers/new">顧客を登録する</LinkButton> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="customer-list">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/app/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy-900">{c.name}</p>
                    <p className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                      {c.companyName && <span>{c.companyName}</span>}
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3" />
                          {c.email}
                        </span>
                      )}
                    </p>
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
