import Link from "next/link";
import { ImageIcon, ChevronRight } from "lucide-react";
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

export function ReportList({ rows }: { rows: ReportRow[] }) {
  return (
    <ul className="divide-y divide-slate-100" data-testid="report-list">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={r.status === "draft" ? `/app/reports/${r.id}/edit` : `/app/reports/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {r.firstPhotoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photos/${r.firstPhotoId}?thumb=1`} alt="" className="size-full object-cover" loading="lazy" />
              ) : (
                <ImageIcon className="m-auto mt-5 size-6 text-slate-400" aria-hidden />
              )}
              {r.photoCount > 0 && <span className="absolute right-1 bottom-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">{r.photoCount}枚</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} version={r.version} />
                <span className="truncate text-xs text-slate-500">{r.reportNumber}</span>
              </div>
              <p className="mt-0.5 truncate font-bold text-navy-900">{r.title || r.siteName || r.customerName || "作業報告書"}</p>
              <p className="truncate text-xs text-slate-500">
                {formatDate(r.workDate)}
                {r.customerName ? `・${r.customerName}` : ""}
                {r.siteName && r.title ? `・${r.siteName}` : ""}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-slate-300" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
