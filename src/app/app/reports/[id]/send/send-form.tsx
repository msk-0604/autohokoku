"use client";

import { useActionState, useState } from "react";
import { Mail, ArrowLeft, AlertTriangle, Paperclip, Link2 } from "lucide-react";
import { sendReportEmailAction } from "./actions";
import { Button, Field, Input, Textarea, cn } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

type Defaults = { to: string; subject: string; body: string };

export function SendForm({ reportId, requestKey, defaults, knownAddresses }: { reportId: string; requestKey: string; defaults: Defaults; knownAddresses: Record<string, boolean> }) {
  const [state, action] = useActionState(sendReportEmailAction.bind(null, reportId), {});
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [to, setTo] = useState(state.values?.to ?? defaults.to);
  const [subject, setSubject] = useState(state.values?.subject ?? defaults.subject);
  const [body, setBody] = useState(state.values?.body ?? defaults.body);
  const [mode, setMode] = useState<"link" | "attachment">((state.values?.mode as "link" | "attachment") ?? "link");
  const [localError, setLocalError] = useState<string | null>(null);
  const isNewAddress = !knownAddresses[to.trim().toLowerCase()];

  function goConfirm() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) return setLocalError("宛先のメールアドレスを正しく入力してください。");
    if (!subject.trim() || !body.trim()) return setLocalError("件名と本文を入力してください。");
    setLocalError(null);
    setStep("confirm");
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="requestKey" value={requestKey} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="mode" value={mode} />

      {step === "edit" ? (
        <>
          {localError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{localError}</p>}
          <Field label="宛先メールアドレス" htmlFor="to-input" required hint={!defaults.to ? "顧客にメールアドレスが登録されていません。直接入力してください。" : undefined}>
            <Input id="to-input" type="email" inputMode="email" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="件名" htmlFor="subject-input" required>
            <Input id="subject-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </Field>
          <Field label="本文" htmlFor="body-input" required>
            <Textarea id="body-input" rows={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">報告書の渡し方</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["link", "ダウンロード用リンク（おすすめ）", "14日間有効なリンクを送ります。写真が多くても確実に届きます。", Link2],
                  ["attachment", "PDFを添付", "メールにPDFを添付します（10MBを超える場合はリンクに切り替わります）。", Paperclip],
                ] as const
              ).map(([v, label, desc, Icon]) => (
                <label key={v} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3", mode === v ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white")}>
                  <input type="radio" name="mode-choice" value={v} checked={mode === v} onChange={() => setMode(v)} className="mt-1 size-4 accent-brand-600" />
                  <span>
                    <span className="flex items-center gap-1.5 font-bold text-navy-900">
                      <Icon className="size-4" /> {label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="button" size="lg" className="w-full" onClick={goConfirm}>
            送信内容を確認する
          </Button>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <dl className="space-y-2">
              <div>
                <dt className="text-xs font-bold text-slate-500">宛先</dt>
                <dd className="text-base font-bold break-all text-navy-900" data-testid="confirm-to">
                  {to}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">件名</dt>
                <dd>{subject}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">本文</dt>
                <dd className="whitespace-pre-wrap">{body}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">報告書の渡し方</dt>
                <dd>{mode === "link" ? "ダウンロードリンク（14日間有効）" : "PDF添付"}</dd>
              </div>
            </dl>
          </div>
          {isNewAddress && (
            <label className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" name="confirmNewAddress" className="mt-0.5 size-5 accent-amber-600" />
              <span>
                <span className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="size-4" /> 初めて送信する宛先です
                </span>
                メールアドレス「{to}」に誤りがないことを確認しました
              </span>
            </label>
          )}
          {/* 確認画面で「この内容で送信する」を押すこと自体を送信内容の確認とする */}
          <input type="hidden" name="confirmed" value="on" />
          <p className="text-sm text-slate-600">送信後は取り消せません。宛先と内容をもう一度ご確認ください。</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep("edit")}>
              <ArrowLeft className="size-4" /> 修正する
            </Button>
            <SubmitButton size="lg" className="flex-1" pendingText="送信しています…" data-testid="send-submit">
              <Mail className="size-5" /> この内容で送信する
            </SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
