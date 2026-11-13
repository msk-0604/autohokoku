import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Copy, FileDown, FileText, Mail, Pencil, History } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { getReport, listEmailLogs, listPhotos, listVersions } from "@/lib/data/reports";
import { formatDate, formatDateTime, workDuration } from "@/lib/dates";
import { Alert, Badge, Card, CardHeader, LinkButton, PageHeader, StatusBadge, buttonClass } from "@/components/ui";
import { PhotoManager } from "./edit/photo-manager";
import { duplicateReportAction, reopenReportAction } from "../actions";
import { SubmitButton } from "@/components/form";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAuth();
  const { id } = await params;
  const sp = await searchParams;
  const r = await getReport(ctx.org.id, id);
  if (!r) notFound();
  const [photos, versions, emails] = await Promise.all([listPhotos(ctx.org.id, id), listVersions(ctx.org.id, id), listEmailLogs(ctx.org.id, id, 20)]);
  const canWrite = accessOf(ctx.org).canWrite;
  const rep = r.report;
  const isFinal = rep.status === "final";
  const rows: [string, string | null | undefined][] = [
    ["作業日", formatDate(rep.workDate)],
    ["顧客", r.customer ? `${r.customer.name}${r.customer.companyName && r.customer.companyName !== r.customer.name ? `（${r.customer.companyName}）` : ""}` : null],
    ["現場", r.site ? `${r.site.name}${r.site.address ? `（${r.site.address}）` : ""}` : null],
    ["作業担当者", rep.workerNames],
    ["作業時間", rep.startTime || rep.endTime ? `${rep.startTime ?? ""} 〜 ${rep.endTime ?? ""} ${workDuration(rep.startTime, rep.endTime) ? `（${workDuration(rep.startTime, rep.endTime)}）` : ""}` : null],
    ["作成者", r.creatorName],
    ["作成日時", formatDateTime(rep.createdAt)],
  ];
  const texts: [string, string | null][] = [
    ["作業内容", rep.workContent],
    ["使用材料", rep.materials],
    ["特記事項", rep.specialNotes],
    ["次回作業予定", rep.nextSchedule],
  ];

  return (
    <>
      <PageHeader
        back={
          <Link href="/app/reports" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600">
            <ChevronLeft className="size-4" /> 報告書一覧
          </Link>
        }
        title={rep.title || "作業報告書"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-navy-900">{rep.reportNumber}</span>
            <StatusBadge status={rep.status} version={rep.version} />
          </span>
        }
      />

      {sp.finalized && <Alert tone="success" className="mb-4">報告書を確定しました。PDFの出力やお客様への送信ができます。</Alert>}
      {sp.sent && <Alert tone="success" className="mb-4">お客様へのメール送信が完了しました。</Alert>}

      {/* 主要操作 */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <a href={`/api/reports/${id}/pdf`} target="_blank" rel="noopener" className={buttonClass("primary", "lg", "col-span-2 sm:col-auto")} data-testid="pdf-view">
            <FileText className="size-5" /> PDFを表示{!isFinal && "（下書き）"}
          </a>
          <a href={`/api/reports/${id}/pdf?download=1`} className={buttonClass("secondary", "lg")} data-testid="pdf-download">
            <FileDown className="size-5" /> 保存
          </a>
          {isFinal && canWrite ? (
            <LinkButton href={`/app/reports/${id}/send`} variant="navy" size="lg">
              <Mail className="size-5" /> 顧客へ送信
            </LinkButton>
          ) : !isFinal && canWrite ? (
            <LinkButton href={`/app/reports/${id}/edit`} variant="navy" size="lg">
              <Pencil className="size-5" /> 編集を続ける
            </LinkButton>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-slate-500">PDFの形式：</span>
          <a href={`/api/reports/${id}/pdf?layout=grid`} target="_blank" rel="noopener" className="font-bold text-brand-700 underline">
            写真2列
          </a>
          <a href={`/api/reports/${id}/pdf?layout=list`} target="_blank" rel="noopener" className="font-bold text-brand-700 underline">
            写真＋説明（横並び）
          </a>
        </div>
        {canWrite && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {isFinal && (
              <form action={reopenReportAction.bind(null, id)}>
                <SubmitButton variant="secondary" size="sm">
                  <Pencil className="size-4" /> 修正する
                </SubmitButton>
              </form>
            )}
            <form action={duplicateReportAction.bind(null, id)}>
              <SubmitButton variant="secondary" size="sm">
                <Copy className="size-4" /> 複製して新規作成
              </SubmitButton>
            </form>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <dl className="divide-y divide-slate-100">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2 px-4 py-3 text-sm sm:px-5">
                  <dt className="font-bold text-slate-500">{k}</dt>
                  <dd className="min-w-0 break-words text-slate-900">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="divide-y divide-slate-100">
            {texts.map(([k, v]) => (
              <div key={k} className="px-4 py-3 sm:px-5">
                <h3 className="text-sm font-bold text-slate-500">{k}</h3>
                <p className="mt-1 text-[15px] whitespace-pre-wrap text-slate-900">{v || "—"}</p>
              </div>
            ))}
          </Card>
          <PhotoManager reportId={id} initialPhotos={photos.map((p) => ({ id: p.id, category: p.category, caption: p.caption, width: p.width, height: p.height }))} editable={false} />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="送信履歴" icon={<Mail className="size-4 text-brand-600" />} />
            <ul className="divide-y divide-slate-100 px-4 pb-3 text-sm sm:px-5">
              {emails.length === 0 && <li className="py-3 text-slate-500">まだ送信していません</li>}
              {emails.map(({ log }) => (
                <li key={log.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{log.toEmail}</span>
                    <Badge tone={log.status === "sent" ? "green" : log.status === "failed" ? "red" : "amber"}>{log.status === "sent" ? "送信済み" : log.status === "failed" ? "失敗" : "送信中"}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(log.createdAt)}・第{log.reportVersion}版
                  </p>
                  {log.status === "failed" && <p className="mt-1 text-xs text-red-600">{log.error}</p>}
                </li>
              ))}
            </ul>
            {isFinal && canWrite && emails.some((e) => e.log.status === "failed") && (
              <div className="px-4 pb-4 sm:px-5">
                <LinkButton href={`/app/reports/${id}/send`} variant="secondary" size="sm">
                  送信画面で再送する
                </LinkButton>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="版の履歴" icon={<History className="size-4 text-brand-600" />} />
            <ul className="divide-y divide-slate-100 px-4 pb-3 text-sm sm:px-5">
              {versions.length === 0 && <li className="py-3 text-slate-500">まだ確定されていません</li>}
              {versions.map((v) => (
                <li key={v.id} className="py-3">
                  <details>
                    <summary className="cursor-pointer">
                      <span className="font-bold">第{v.version}版</span>　{formatDateTime(v.createdAt)}　{v.userName ?? ""}
                    </summary>
                    <VersionSummary snapshot={v.snapshot} />
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function VersionSummary({ snapshot }: { snapshot: string }) {
  let s: Record<string, unknown> = {};
  try {
    s = JSON.parse(snapshot);
  } catch {}
  const items: [string, unknown][] = [
    ["作業日", s.workDate],
    ["顧客", s.customerName],
    ["現場", s.siteName],
    ["作業内容", s.workContent],
    ["使用材料", s.materials],
    ["特記事項", s.specialNotes],
    ["写真", Array.isArray(s.photos) ? `${s.photos.length}枚` : ""],
  ];
  return (
    <dl className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="font-bold text-slate-500">{k}</dt>
          <dd className="whitespace-pre-wrap">{v ? String(v) : "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
