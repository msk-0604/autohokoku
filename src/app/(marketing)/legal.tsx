import type { ReactNode } from "react";

export function LegalPage({ title, updated, children, draft = true }: { title: string; updated: string; children: ReactNode; draft?: boolean }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-navy-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">制定日：{updated}</p>
      {draft && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ※ 本ページの文面は公開前のひな形です。
        </div>
      )}
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-800 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </article>
  );
}
