import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { getReport, listPhotos } from "@/lib/data/reports";
import { customerOptions, siteOptions } from "@/lib/data/customers";
import { Alert, BackLink, PageHeader } from "@/components/ui";
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
        title={r.report.version > 0 ? "報告書の修正" : r.report.title || "報告書の作成"}
        back={r.report.version > 0 ? <BackLink href={`/app/reports/${id}`}>報告書に戻る</BackLink> : <BackLink href="/app/reports">報告書一覧</BackLink>}
      />
      {sp.created && <Alert tone="success" className="mb-4">報告書を作成しました。写真を撮って、作業内容を入力してください。</Alert>}
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
