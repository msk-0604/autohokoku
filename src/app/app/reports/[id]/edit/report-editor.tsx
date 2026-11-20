"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { saveReportAction, deleteReportAction } from "../../actions";
import { ReportFields, type CustomerOpt, type ReportValues, type SiteOpt } from "../../report-fields";
import { PhotoManager, type PhotoItem } from "./photo-manager";
import { FormMessage } from "@/components/form";
import { Card, buttonClass, cn } from "@/components/ui";

const LEAVE_MESSAGE = "保存していない変更があります。このページを離れますか？";

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
  const [typing, setTyping] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values ? { ...values, ...state.values } : values;

  // 未保存の変更があるときは、ブラウザを閉じる・アプリ内のリンクで移動する前に確認する
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin || e.metaKey || e.ctrlKey) return;
      if (a.pathname === location.pathname) return;
      if (!confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // スマホで文字入力中は、画面下の操作バーを隠してキーボードと重ならないようにする
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const isText = (el: EventTarget | null) =>
      el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !["checkbox", "radio", "file", "button", "submit"].includes(el.type));
    const small = () => window.matchMedia("(max-width: 1023px)").matches;
    const onIn = (e: FocusEvent) => isText(e.target) && small() && setTyping(true);
    const onOut = () => setTyping(false);
    form.addEventListener("focusin", onIn);
    form.addEventListener("focusout", onOut);
    return () => {
      form.removeEventListener("focusin", onIn);
      form.removeEventListener("focusout", onOut);
    };
  }, []);

  function checkBeforeFinalize(e: React.MouseEvent) {
    const content = (formRef.current?.elements.namedItem("workContent") as HTMLTextAreaElement | null)?.value.trim();
    if (!content) {
      e.preventDefault();
      setLocalError("確定するには「作業内容」を入力してください。");
      const el = formRef.current?.elements.namedItem("workContent") as HTMLTextAreaElement | null;
      el?.setAttribute("aria-invalid", "true");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
      return;
    }
    setLocalError(null);
    if (!confirm("報告書を確定しますか？確定後に修正すると、新しい版として記録されます。")) e.preventDefault();
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => setDirty(false)}
      onChange={(e) => {
        if ((e.target as HTMLElement).getAttribute("name")) setDirty(true);
        if ((e.target as HTMLElement).getAttribute("name") === "workContent") (e.target as HTMLElement).removeAttribute("aria-invalid");
      }}
      className="space-y-5"
    >
      <div className="sticky top-14 z-10 space-y-2 lg:top-2">
        <FormMessage state={localError ? { error: localError } : state} />
      </div>

      <Card className="p-4 sm:p-5">
        <p className="mb-4 text-sm text-slate-600">
          報告書番号 <span className="font-bold text-navy-900 tabular-nums" data-testid="report-number">{reportNumber}</span>
          <span className="mx-2 text-slate-300">|</span>作成者 {creatorName}
        </p>
        <ReportFields values={v} customers={customers} sites={sites} errors={state.fieldErrors} part="basic" />
      </Card>

      <PhotoManager reportId={reportId} initialPhotos={photos} editable />

      <Card className="p-4 sm:p-5">
        <h2 className="mb-4 text-base font-bold text-navy-900">作業の詳細</h2>
        <ReportFields values={v} customers={customers} sites={sites} errors={state.fieldErrors} part="details" />
      </Card>

      {canDelete && (
        <div className="text-right">
          <button
            type="submit"
            formAction={deleteReportAction.bind(null, reportId)}
            formNoValidate
            onClick={(e) => {
              if (!confirm("この下書きを削除しますか？写真も削除されます。")) e.preventDefault();
              else setDirty(false);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="size-4" aria-hidden /> この下書きを削除
          </button>
        </div>
      )}

      {/* 操作バー：スマホは画面下に固定（入力中は隠す）、PCは画面下に追従 */}
      <div
        className={cn(
          "safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white transition-transform lg:sticky lg:bottom-3 lg:rounded-xl lg:border",
          typing && "translate-y-full lg:translate-y-0",
        )}
      >
        {/* スマホは3等分（はみ出さない）、PCは右寄せの確定ボタン */}
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 px-3 py-2.5 sm:px-4 lg:flex lg:items-center">
          <button type="submit" name="intent" value="preview" disabled={pending} className={buttonClass("secondary", "lg", "px-1 text-sm lg:px-5")}>
            保存して確認
          </button>
          <button type="submit" name="intent" value="save" disabled={pending} className={buttonClass("secondary", "lg", "px-1 text-sm lg:px-5")}>
            {pending ? "保存中…" : "下書き保存"}
          </button>
          <button type="submit" name="intent" value="finalize" disabled={pending} onClick={checkBeforeFinalize} className={buttonClass("primary", "lg", "px-1 lg:ml-auto lg:w-64")}>
            <CheckCircle2 className="hidden size-5 sm:block" aria-hidden /> 確定する
          </button>
        </div>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
    </form>
  );
}
