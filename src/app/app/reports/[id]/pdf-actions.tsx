"use client";

import { useState } from "react";
import { FileText, FileDown } from "lucide-react";
import { buttonClass, cn } from "@/components/ui";

const LAYOUTS = [
  { value: "grid", label: "写真2列" },
  { value: "list", label: "写真と説明を横並び" },
] as const;

/** PDFの形式を選んでから「表示」「保存」する（選んだ形式は両方に効く） */
export function PdfActions({ reportId, draft }: { reportId: string; draft: boolean }) {
  const [layout, setLayout] = useState<(typeof LAYOUTS)[number]["value"]>("grid");
  const base = `/api/reports/${reportId}/pdf?layout=${layout}`;
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="PDFの写真の並べ方" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={layout === l.value}
            onClick={() => setLayout(l.value)}
            className={cn("h-9 rounded-md px-3 text-sm font-bold", layout === l.value ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-50")}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <a href={base} target="_blank" rel="noopener" className={buttonClass("secondary", "lg")} data-testid="pdf-view">
          <FileText className="size-5" aria-hidden /> PDFを表示{draft && "（下書き）"}
        </a>
        <a href={`${base}&download=1`} className={buttonClass("secondary", "lg")} data-testid="pdf-download">
          <FileDown className="size-5" aria-hidden /> PDFを保存
        </a>
      </div>
    </div>
  );
}
