import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { customerOptions, getSite } from "@/lib/data/customers";
import { listReports } from "@/lib/data/reports";
import { Alert, BackLink, Badge, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { EditToggle, InfoList } from "@/components/edit-toggle";
import { SubmitButton } from "@/components/form";
import { ReportList } from "@/components/report-list";
import { SiteForm } from "../../customers/customer-form";
import { setSiteArchivedAction } from "../../customers/actions";

export default async function SitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const row = await getSite(ctx.org.id, id);
  if (!row) notFound();
  const { site } = row;
  const [customers, reports] = await Promise.all([customerOptions(ctx.org.id), listReports(ctx.org.id, { siteId: id, limit: 20 })]);
  const canWrite = accessOf(ctx.org).canWrite;
  return (
    <>
      <PageHeader
        title={site.name}
        description={site.archivedAt ? <Badge tone="slate">アーカイブ済み</Badge> : row.customerName ?? undefined}
        back={<BackLink href="/app/sites">現場一覧</BackLink>}
        actions={
          canWrite && !site.archivedAt ? (
            <LinkButton href={`/app/reports/new?site=${id}`}>
              <Plus className="size-5" aria-hidden /> この現場の報告書
            </LinkButton>
          ) : undefined
        }
      />
      {sp.created && <Alert tone="success" className="mb-4">現場を登録しました。</Alert>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="p-4 sm:p-6">
          <EditToggle
            canEdit={canWrite}
            view={
              <InfoList
                rows={[
                  ["現場名", site.name],
                  ["顧客", row.customerName],
                  ["担当者", site.managerName],
                  ["現場住所", site.address],
                  ["作業内容", site.workDescription],
                  ["備考", site.note],
                ]}
              />
            }
            form={<SiteForm id={id} values={site} customers={customers} />}
          />
          {canWrite && (
            <form action={setSiteArchivedAction.bind(null, id, !site.archivedAt)} className="mt-6 border-t border-slate-100 pt-4">
              <SubmitButton variant="secondary" size="sm">
                {site.archivedAt ? "アーカイブから戻す" : "アーカイブする"}
              </SubmitButton>
              <p className="mt-1 text-xs text-slate-500">工事が終わった現場はアーカイブすると、選択肢に出なくなります。過去の報告書はそのまま残ります。</p>
            </form>
          )}
        </Card>
        <Card>
          <CardHeader title="この現場の報告書" />
          <div className="mt-2">{reports.length ? <ReportList rows={reports} /> : <p className="px-4 pb-4 text-sm text-slate-500 sm:px-5">まだ報告書はありません</p>}</div>
        </Card>
      </div>
    </>
  );
}
