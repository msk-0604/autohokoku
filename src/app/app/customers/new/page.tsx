import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { Alert, Card, PageHeader } from "@/components/ui";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage() {
  const ctx = await requireAuth();
  const access = accessOf(ctx.org);
  return (
    <>
      <PageHeader
        title="顧客を登録"
        back={
          <Link href="/app/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <ChevronLeft className="size-4" /> 顧客一覧
          </Link>
        }
      />
      {!access.canWrite && <Alert tone="error" className="mb-4">{access.message}</Alert>}
      <Card className="p-4 sm:p-6">
        <CustomerForm id={null} values={{}} disabled={!access.canWrite} />
      </Card>
    </>
  );
}
