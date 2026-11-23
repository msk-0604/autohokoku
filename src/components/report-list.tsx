import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/dates";

export type ReportRow = {
  id: string;
  reportNumber: string;
  title: string | null;
  status: string;
  version: number;
  workDate: string;
  customerName: string | null;
  siteName: string | null;
  firstPhotoId: string | null;
  photoCount: number;
};

const hrefOf = (r: ReportRow) => (r.status === "draft" ? `/app/reports/${r.id}/edit` : `/app/reports/${r.id}`);
const titleOf = (r: ReportRow) => r.title || r.siteName || r.customerName || "作業報告書";
const shortDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}/${m}/${day}`;
};

function Thumb({ r, size = "size-14" }: { r: ReportRow; size?: string }) {
  return (
    <div className={`relative ${size} shrink-0 overflow-hidden rounded-lg bg-slate-100`}>
      {r.firstPhotoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/photos/${r.firstPhotoId}?thumb=1`} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span className="flex size-full items-center justify-center text-xs text-slate-400">写真なし</span>
      )}
    </div>
  );
}

/**
 * 報告書の一覧。
 * - スマホ・タブレット：写真付きの行
 * - PC（table=true のとき）：見比べやすい表
 */
export function ReportList({ rows, table = false }: { rows: ReportRow[]; table?: boolean }) {
  return (
    <>
      <ul className={table ? "divide-y divide-slate-100 lg:hidden" : "divide-y divide-slate-100"} data-testid="report-list">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={hrefOf(r)} className="flex min-w-0 items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
              <Thumb r={r} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy-900">{titleOf(r)}</p>
                <p className="truncate text-sm text-slate-600">
                  {formatDate(r.workDate)}
                  {r.customerName ? `　${r.customerName}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <StatusBadge status={r.status} version={r.version} />
                  <span className="num truncate">{r.reportNumber}</span>
                  {r.photoCount > 0 && <span className="shrink-0">写真{r.photoCount}枚</span>}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {table && (
        <div className="hidden lg:block">
          <table className="w-full table-fixed text-sm" data-testid="report-table">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs whitespace-nowrap text-slate-500">
                <th className="w-24 px-5 py-2.5 font-bold">状態</th>
                <th className="w-32 px-2 py-2.5 font-bold">報告書番号</th>
                <th className="px-2 py-2.5 font-bold">報告書名・現場</th>
                <th className="w-48 px-2 py-2.5 font-bold">顧客</th>
                <th className="w-28 px-2 py-2.5 font-bold">作業日</th>
                <th className="w-20 px-5 py-2.5 text-right font-bold">写真</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="group relative hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <StatusBadge status={r.status} version={r.version} />
                  </td>
                  <td className="px-2 py-3 text-slate-600 num text-sm">{r.reportNumber}</td>
                  <td className="truncate px-2 py-3">
                    <Link href={hrefOf(r)} className="font-bold text-navy-900 after:absolute after:inset-0 group-hover:text-brand-700">
                      {titleOf(r)}
                    </Link>
                    {r.title && r.siteName && <span className="ml-2 text-slate-500">{r.siteName}</span>}
                  </td>
                  <td className="truncate px-2 py-3 text-slate-700">{r.customerName ?? "—"}</td>
                  <td className="px-2 py-3 text-slate-700 num text-sm">{shortDate(r.workDate)}</td>
                  <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{r.photoCount}枚</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
