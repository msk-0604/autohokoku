import { requireAuth } from "@/lib/auth/dal";
import { customerOptions, siteOptions } from "@/lib/data/customers";
import { accessOf } from "@/lib/billing/access";
import { todayJst } from "@/lib/dates";
import { Alert, Card, LinkButton, PageHeader } from "@/components/ui";
import { NewReportForm } from "./new-report-form";

export default async function NewReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const access = accessOf(ctx.org);
  if (!access.canWrite) {
    return (
      <>
        <PageHeader title="新規報告書作成" />
        <Alert tone="error">{access.message}</Alert>
        <LinkButton href="/app/billing" className="mt-4">
          契約・お支払いへ
        </LinkButton>
      </>
    );
  }
  const [customers, sites] = await Promise.all([customerOptions(ctx.org.id), siteOptions(ctx.org.id)]);
  const site = sp.site ? sites.find((s) => s.id === sp.site) : undefined;
  return (
    <>
      <PageHeader title="新規報告書作成" description="基本情報を選んで「作成して写真を撮る」を押してください。あとから変更できます。" />
      <Card className="p-4 sm:p-6">
        <NewReportForm
          customers={customers}
          sites={sites}
          values={{ workDate: todayJst(), workerNames: ctx.user.name, siteId: site?.id ?? null, customerId: site?.customerId ?? sp.customer ?? null }}
        />
      </Card>
    </>
  );
}
