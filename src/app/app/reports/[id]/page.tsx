import { notFound } from "next/navigation";
import { Copy, Mail, Pencil } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { getReport, listEmailLogs, listPhotos, listVersions } from "@/lib/data/reports";
import { formatDate, formatDateTime, workDuration } from "@/lib/dates";
import { Alert, BackLink, Badge, Card, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { PdfActions } from "./pdf-actions";
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
    ["作成", `${r.creatorName ?? ""}　${formatDateTime(rep.createdAt)}`],
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
        back={<BackLink href="/app/reports">報告書一覧</BackLink>}
        title={rep.title || "作業報告書"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rep.status} version={rep.version} />
            <span className="tabular-nums">{rep.reportNumber}</span>
          </span>
        }
      />

      {sp.finalized && <Alert tone="success" className="mb-4">報告書を確定しました。PDFの確認とお客様への送信ができます。</Alert>}
      {sp.sent && <Alert tone="success" className="mb-4">お客様へのメール送信が完了しました。</Alert>}

      {/* 主な操作：送信（確定時）または編集（下書き時）を最も目立たせる */}
      <Card className="mb-5 space-y-4 p-4 sm:p-5">
        {canWrite && (isFinal ? (
          <LinkButton href={`/app/reports/${id}/send`} size="lg" className="w-full sm:w-auto">
            <Mail className="size-5" aria-hidden /> 顧客へ送信
          </LinkButton>
        ) : (
          <LinkButton href={`/app/reports/${id}/edit`} size="lg" className="w-full sm:w-auto">
            <Pencil className="size-5" aria-hidden /> 編集を続ける
          </LinkButton>
        ))}
        <PdfActions reportId={id} draft={!isFinal} />
        {canWrite && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {isFinal && (
              <form action={reopenReportAction.bind(null, id)}>
                <SubmitButton variant="ghost" size="sm">
                  <Pencil className="size-4" aria-hidden /> 内容を修正する
                </SubmitButton>
              </form>
            )}
            <form action={duplicateReportAction.bind(null, id)}>
              <SubmitButton variant="ghost" size="sm">
                <Copy className="size-4" aria-hidden /> 複製して新規作成
              </SubmitButton>
            </form>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          {/* 報告書の内容（1枚の書類のように並べる） */}
          <Card>
            <dl className="divide-y divide-slate-100">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2 px-4 py-3 text-[15px] sm:px-5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="min-w-0 break-words text-slate-900">{v || "—"}</dd>
                </div>
              ))}
              {texts.map(([k, v]) => (
                <div key={k} className="px-4 py-3 sm:px-5">
                  <dt className="text-sm text-slate-500">{k}</dt>
                  <dd className="mt-1 text-[15px] whitespace-pre-wrap text-slate-900">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <PhotoManager reportId={id} initialPhotos={photos.map((p) => ({ id: p.id, category: p.category, caption: p.caption, width: p.width, height: p.height }))} editable={false} />
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <h2 className="px-4 pt-4 text-base font-bold text-navy-900 sm:px-5">送信履歴</h2>
            <ul className="divide-y divide-slate-100 px-4 pb-3 text-sm sm:px-5">
              {emails.length === 0 && <li className="py-3 text-slate-500">まだ送信していません</li>}
              {emails.map(({ log }) => (
                <li key={log.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{log.toEmail}</span>
                    <Badge tone={log.status === "sent" ? "green" : log.status === "failed" ? "red" : "amber"}>{log.status === "sent" ? "送信済み" : log.status === "failed" ? "失敗" : "送信中"}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(log.createdAt)}　第{log.reportVersion}版
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
            <h2 className="px-4 pt-4 text-base font-bold text-navy-900 sm:px-5">版の履歴</h2>
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
