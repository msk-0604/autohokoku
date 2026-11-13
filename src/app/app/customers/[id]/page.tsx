import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Plus, FileText } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { getCustomer, listSites } from "@/lib/data/customers";
import { listReports } from "@/lib/data/reports";
import { Alert, Badge, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { ReportList } from "@/components/report-list";
import { CustomerForm } from "../customer-form";
import { setCustomerArchivedAction } from "../actions";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const c = await getCustomer(ctx.org.id, id);
  if (!c) notFound();
  const [siteRows, reports] = await Promise.all([listSites(ctx.org.id, { customerId: id }), listReports(ctx.org.id, { customerId: id, limit: 10 })]);
  const canWrite = accessOf(ctx.org).canWrite;
  return (
    <>
      <PageHeader
        title={c.name}
        description={c.archivedAt ? <Badge tone="slate">アーカイブ済み</Badge> : undefined}
        back={
          <Link href="/app/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <ChevronLeft className="size-4" /> 顧客一覧
          </Link>
        }
        actions={
          canWrite && !c.archivedAt ? (
            <LinkButton href={`/app/reports/new?customer=${id}`}>
              <Plus className="size-5" /> この顧客の報告書
            </LinkButton>
          ) : undefined
        }
      />
      {sp.created && <Alert tone="success" className="mb-4">顧客を登録しました。</Alert>}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="p-4 sm:p-6">
          <CustomerForm id={id} values={c} disabled={!canWrite} />
          {canWrite && (
            <form action={setCustomerArchivedAction.bind(null, id, !c.archivedAt)} className="mt-6 border-t border-slate-100 pt-4">
              <SubmitButton variant={c.archivedAt ? "secondary" : "danger"} size="sm">
                {c.archivedAt ? "アーカイブから戻す" : "アーカイブする"}
              </SubmitButton>
              <p className="mt-1 text-xs text-slate-500">アーカイブすると選択肢に表示されなくなります。過去の報告書は残ります。</p>
            </form>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="現場" icon={<MapPin className="size-4 text-brand-600" />} action={canWrite ? <Link href="/app/sites/new" className="text-sm font-bold text-brand-700">追加</Link> : undefined} />
            <ul className="divide-y divide-slate-100 pb-2">
              {siteRows.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">登録された現場はありません</li>}
              {siteRows.map(({ site }) => (
                <li key={site.id}>
                  <Link href={`/app/sites/${site.id}`} className="block px-4 py-3 text-sm hover:bg-slate-50 sm:px-5">
                    <p className="font-bold text-navy-900">{site.name}</p>
                    {site.address && <p className="text-xs text-slate-500">{site.address}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="報告書" icon={<FileText className="size-4 text-brand-600" />} />
            <div className="mt-2">{reports.length ? <ReportList rows={reports} /> : <p className="px-4 pb-4 text-sm text-slate-500 sm:px-5">まだ報告書はありません</p>}</div>
          </Card>
        </div>
      </div>
    </>
  );
}
