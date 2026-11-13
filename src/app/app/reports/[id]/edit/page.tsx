import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { getReport, listPhotos } from "@/lib/data/reports";
import { customerOptions, siteOptions } from "@/lib/data/customers";
import { Alert, PageHeader } from "@/components/ui";
import { ReportEditor } from "./report-editor";

export default async function EditReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const r = await getReport(ctx.org.id, id);
  if (!r) notFound();
  if (r.report.status === "final" || !accessOf(ctx.org).canWrite) redirect(`/app/reports/${id}`);
  const [photos, customers, sites] = await Promise.all([listPhotos(ctx.org.id, id), customerOptions(ctx.org.id), siteOptions(ctx.org.id)]);
  return (
    <>
      <PageHeader
        title={r.report.version > 0 ? "報告書の修正" : "報告書作成"}
        back={
          <Link href={`/app/reports/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <ChevronLeft className="size-4" /> 報告書に戻る
          </Link>
        }
      />
      {sp.created && <Alert tone="success" className="mb-4">報告書を作成しました。写真を撮影して内容を入力してください。</Alert>}
      {sp.duplicated && <Alert tone="success" className="mb-4">報告書を複製しました（写真は複製されません）。</Alert>}
      {r.report.version > 0 && <Alert tone="info" className="mb-4">第{r.report.version}版を修正中です。確定すると第{r.report.version + 1}版として記録されます。</Alert>}
      <ReportEditor
        reportId={id}
        reportNumber={r.report.reportNumber}
        creatorName={r.creatorName ?? ""}
        canDelete={r.report.version === 0}
        values={r.report}
        customers={customers}
        sites={sites}
        photos={photos.map((p) => ({ id: p.id, category: p.category, caption: p.caption, width: p.width, height: p.height }))}
      />
    </>
  );
}
