import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { ChevronLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { getReport, listEmailLogs } from "@/lib/data/reports";
import { hasSentTo } from "@/lib/report-email";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { SendForm } from "./send-form";
import { RetryButton } from "./retry-button";

export default async function SendReportPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  const { id } = await params;
  const r = await getReport(ctx.org.id, id);
  if (!r) notFound();
  if (r.report.status !== "final" || !accessOf(ctx.org).canWrite) redirect(`/app/reports/${id}`);
  const logs = await listEmailLogs(ctx.org.id, id, 20);
  const to = r.customer?.email ?? "";
  const title = r.report.title || "作業報告書";
  const recipient = r.customer ? `${r.customer.companyName && r.customer.companyName !== r.customer.name ? `${r.customer.companyName}\n` : ""}${r.customer.name} 様` : "ご担当者様";
  const subject = `【${title}】${r.site?.name ? `${r.site.name} ` : ""}${formatDate(r.report.workDate)}（${ctx.org.name}）`;
  const body = `${recipient}\n\nいつもお世話になっております。\n${ctx.org.name}の${ctx.user.name}です。\n\n${formatDate(r.report.workDate)}に実施した作業の報告書をお送りいたします。\nご確認のほど、よろしくお願いいたします。\n\n${ctx.org.name}\n${ctx.org.phone ? `TEL ${ctx.org.phone}\n` : ""}`;
  const knownAddresses = to ? { [to]: await hasSentTo(ctx.org.id, to) } : {};

  return (
    <>
      <PageHeader
        title="報告書をメールで送信"
        description={`${r.report.reportNumber}${r.report.version > 1 ? `（第${r.report.version}版）` : ""}`}
        back={
          <Link href={`/app/reports/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <ChevronLeft className="size-4" /> 報告書に戻る
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="p-4 sm:p-6">
          <SendForm reportId={id} requestKey={randomUUID()} defaults={{ to, subject, body }} knownAddresses={knownAddresses} />
        </Card>
        <Card>
          <CardHeader title="送信履歴" />
          <ul className="divide-y divide-slate-100 px-4 pb-3 text-sm sm:px-5" data-testid="send-history">
            {logs.length === 0 && <li className="py-3 text-slate-500">まだ送信していません</li>}
            {logs.map(({ log, sentByName }) => (
              <li key={log.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{log.toEmail}</span>
                  <Badge tone={log.status === "sent" ? "green" : log.status === "failed" ? "red" : "amber"}>
                    {log.status === "sent" ? "送信済み" : log.status === "failed" ? "失敗" : "送信中"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDateTime(log.createdAt)}・{log.mode === "link" ? "リンク" : "PDF添付"}・{sentByName ?? ""}
                </p>
                {log.status !== "sent" && (
                  <>
                    {log.error && <p className="mt-1 text-xs text-red-600">{log.error}</p>}
                    <RetryButton reportId={id} logId={log.id} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
