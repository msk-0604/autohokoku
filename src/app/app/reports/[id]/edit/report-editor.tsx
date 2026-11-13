"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Eye, Save, Trash2 } from "lucide-react";
import { saveReportAction, deleteReportAction } from "../../actions";
import { ReportFields, type CustomerOpt, type ReportValues, type SiteOpt } from "../../report-fields";
import { PhotoManager, type PhotoItem } from "./photo-manager";
import { FormMessage } from "@/components/form";
import { Card, cn } from "@/components/ui";

export function ReportEditor({
  reportId,
  reportNumber,
  creatorName,
  canDelete,
  values,
  customers,
  sites,
  photos,
}: {
  reportId: string;
  reportNumber: string;
  creatorName: string;
  canDelete: boolean;
  values: ReportValues;
  customers: CustomerOpt[];
  sites: SiteOpt[];
  photos: PhotoItem[];
}) {
  const [state, action, pending] = useActionState(saveReportAction.bind(null, reportId), {});
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values ? { ...values, ...state.values } : values;

  useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  return (
    <form ref={formRef} action={action} onChange={(e) => (e.target as HTMLElement).getAttribute("name") && setDirty(true)} className="space-y-5">
      <div className="sticky top-14 z-10 lg:top-0">
        <FormMessage state={state} />
      </div>

      <Card className="overflow-hidden">
        <dl className="grid grid-cols-[6.5rem_1fr] border-b border-slate-200 text-sm">
          <dt className="bg-slate-50 px-3 py-2.5 font-bold text-slate-600">報告書NO</dt>
          <dd className="px-3 py-2.5 font-bold text-navy-900" data-testid="report-number">
            {reportNumber}
          </dd>
          <dt className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-600">作成者</dt>
          <dd className="border-t border-slate-200 px-3 py-2.5">{creatorName}</dd>
        </dl>
        <div className="p-4 sm:p-5">
          <ReportFields values={v} customers={customers} sites={sites} errors={state.fieldErrors} part="basic" />
        </div>
      </Card>

      <PhotoManager reportId={reportId} initialPhotos={photos} editable />

      <Card className="p-4 sm:p-5">
        <h2 className="mb-4 text-base font-bold text-navy-900">作業の詳細</h2>
        <ReportFields values={v} customers={customers} sites={sites} errors={state.fieldErrors} part="details" />
      </Card>

      {/* 下部の操作バー（スマホでは画面下に固定） */}
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:static lg:rounded-2xl lg:border">
        <div className="mx-auto flex max-w-5xl items-stretch gap-1 px-2 py-2 sm:px-4">
          {canDelete && (
            <button
              type="submit"
              formAction={deleteReportAction.bind(null, reportId)}
              formNoValidate
              onClick={(e) => {
                if (!confirm("この下書きを削除しますか？写真も削除されます。")) e.preventDefault();
              }}
              className="flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-5" /> 削除
            </button>
          )}
          <button type="submit" name="intent" value="preview" disabled={pending} className="flex w-20 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold text-navy-800 hover:bg-navy-50">
            <Eye className="size-5" /> プレビュー
          </button>
          <button type="submit" name="intent" value="save" disabled={pending} className="flex w-20 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold text-navy-800 hover:bg-navy-50">
            <Save className="size-5" /> {pending ? "保存中…" : "下書き保存"}
          </button>
          <button
            type="submit"
            name="intent"
            value="finalize"
            disabled={pending}
            onClick={(e) => {
              if (!confirm("報告書を確定しますか？確定後に修正すると、新しい版として記録されます。")) e.preventDefault();
            }}
            className={cn("ml-auto flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 font-bold text-white shadow-sm sm:max-w-xs", pending && "opacity-60")}
          >
            <CheckCircle2 className="size-5" /> 確定する
          </button>
        </div>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />
    </form>
  );
}
