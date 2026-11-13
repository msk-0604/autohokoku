import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { customerOptions } from "@/lib/data/customers";
import { Alert, Card, PageHeader } from "@/components/ui";
import { SiteForm } from "../../customers/customer-form";

export default async function NewSitePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const access = accessOf(ctx.org);
  const customers = await customerOptions(ctx.org.id);
  return (
    <>
      <PageHeader
        title="現場を登録"
        back={
          <Link href="/app/sites" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <ChevronLeft className="size-4" /> 現場一覧
          </Link>
        }
      />
      {!access.canWrite && <Alert tone="error" className="mb-4">{access.message}</Alert>}
      <Card className="p-4 sm:p-6">
        <SiteForm id={null} values={{ customerId: sp.customer ?? null }} customers={customers} disabled={!access.canWrite} />
      </Card>
    </>
  );
}
