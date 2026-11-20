"use client";

import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";

/** 普段は見るだけの表示、「編集」を押したときだけ入力フォームを出す */
export function EditToggle({ view, form, canEdit, startOpen = false }: { view: ReactNode; form: ReactNode; canEdit: boolean; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  if (open && canEdit) {
    return (
      <div>
        {form}
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setOpen(false)}>
          編集を終える
        </Button>
      </div>
    );
  }
  return (
    <div>
      {view}
      {canEdit && (
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden /> 編集
        </Button>
      )}
    </div>
  );
}

/** 見るだけの表示用の項目リスト */
export function InfoList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6rem_1fr] gap-2 py-2.5 text-[15px] first:pt-0">
          <dt className="text-slate-500">{k}</dt>
          <dd className="min-w-0 break-words whitespace-pre-wrap text-slate-900">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
