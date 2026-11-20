"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RotateCw } from "lucide-react";
import { Field, Input, Select, Textarea, cn } from "@/components/ui";

export type CustomerOpt = { id: string; name: string; companyName: string | null };
export type SiteOpt = { id: string; name: string; customerId: string | null; address: string | null };
export type ReportValues = {
  title?: string | null;
  workDate?: string | null;
  customerId?: string | null;
  siteId?: string | null;
  workerNames?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  workContent?: string | null;
  materials?: string | null;
  specialNotes?: string | null;
  nextSchedule?: string | null;
};

const WORK_PHRASES = ["点検を実施しました。", "異常はありませんでした。", "動作確認を行い、正常に稼働することを確認しました。", "部品を交換しました。", "清掃を実施しました。", "作業後、周辺の清掃・片付けを行いました。"];
const PHRASES_SHOWN = 3;

/**
 * 「新しく登録」リンク。入力中の内容を失わないよう別タブで開き、戻ったら「選択肢を更新」で一覧に反映する
 */
function RegisterLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-wrap items-center gap-x-3">
      <a href={href} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1 text-brand-700 underline">
        {label}
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
      <button type="button" onClick={() => start(() => router.refresh())} disabled={pending} className="inline-flex h-8 items-center gap-1 text-slate-600 underline disabled:opacity-50">
        <RotateCw className={cn("size-3.5", pending && "animate-spin")} aria-hidden />
        選択肢を更新
      </button>
    </span>
  );
}

/** 報告書の入力項目（新規作成と編集で共通） */
export function ReportFields({
  values,
  customers,
  sites,
  errors,
  part = "all",
}: {
  values: ReportValues;
  customers: CustomerOpt[];
  sites: SiteOpt[];
  errors?: Record<string, string[] | undefined>;
  part?: "all" | "basic" | "details";
}) {
  const basic = part !== "details";
  const full = part !== "basic";
  const [customerId, setCustomerId] = useState(values.customerId ?? "");
  const [siteId, setSiteId] = useState(values.siteId ?? "");
  const [workContent, setWorkContent] = useState(values.workContent ?? "");
  const [morePhrases, setMorePhrases] = useState(false);
  const siteChoices = useMemo(() => (customerId ? sites.filter((s) => s.customerId === customerId || s.id === siteId) : sites), [customerId, siteId, sites]);
  const fe = errors ?? {};
  const phrases = morePhrases ? WORK_PHRASES : WORK_PHRASES.slice(0, PHRASES_SHOWN);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {basic && (
        <>
          {/* 現場を先に選ぶと顧客が自動で入る */}
          <Field label="現場" htmlFor="siteId" error={fe.siteId} className="sm:col-span-2" hint={<RegisterLink href="/app/sites/new" label="現場を新しく登録" />}>
            <Select
              id="siteId"
              name="siteId"
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                const s = sites.find((x) => x.id === e.target.value);
                if (s?.customerId && !customerId) setCustomerId(s.customerId);
              }}
            >
              <option value="">選択しない</option>
              {siteChoices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="作業日" htmlFor="workDate" required error={fe.workDate}>
            <Input id="workDate" name="workDate" type="date" defaultValue={values.workDate ?? ""} required />
          </Field>
          <Field label="作業担当者" htmlFor="workerNames" error={fe.workerNames}>
            <Input id="workerNames" name="workerNames" defaultValue={values.workerNames ?? ""} maxLength={200} placeholder="例）山田、鈴木" />
          </Field>
          <Field label="顧客" htmlFor="customerId" error={fe.customerId} hint={<RegisterLink href="/app/customers/new" label="顧客を新しく登録" />}>
            <Select
              id="customerId"
              name="customerId"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const s = sites.find((x) => x.id === siteId);
                if (s && e.target.value && s.customerId !== e.target.value) setSiteId("");
              }}
            >
              <option value="">選択しない</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.companyName && c.companyName !== c.name ? `（${c.companyName}）` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="報告書名" htmlFor="title" hint="空欄のときはPDFの題名が「作業報告書」になります" error={fe.title}>
            <Input id="title" name="title" defaultValue={values.title ?? ""} maxLength={100} placeholder="例）エアコン入替工事" />
          </Field>
        </>
      )}
      {full && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Field label="開始時刻" htmlFor="startTime" error={fe.startTime}>
              <Input id="startTime" name="startTime" type="time" defaultValue={values.startTime ?? ""} />
            </Field>
            <Field label="終了時刻" htmlFor="endTime" error={fe.endTime}>
              <Input id="endTime" name="endTime" type="time" defaultValue={values.endTime ?? ""} />
            </Field>
          </div>
          <Field label="作業内容" htmlFor="workContent" className="sm:col-span-2" error={fe.workContent} hint="確定するときは入力が必要です">
            <Textarea id="workContent" name="workContent" rows={5} maxLength={5000} value={workContent} onChange={(e) => setWorkContent(e.target.value)} placeholder="実施した作業の内容" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {phrases.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setWorkContent((v) => (v ? `${v}${v.endsWith("\n") ? "" : "\n"}${p}` : p))}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-left text-sm text-slate-700 active:bg-slate-100"
                >
                  ＋{p}
                </button>
              ))}
              <button type="button" onClick={() => setMorePhrases((v) => !v)} className="min-h-10 px-2 text-sm font-bold text-brand-700">
                {morePhrases ? "定型文を閉じる" : `定型文をもっと見る（${WORK_PHRASES.length - PHRASES_SHOWN}）`}
              </button>
            </div>
          </Field>
          <Field label="使用材料" htmlFor="materials" className="sm:col-span-2" error={fe.materials}>
            <Textarea id="materials" name="materials" rows={3} maxLength={3000} defaultValue={values.materials ?? ""} placeholder="例）冷媒配管 2分3分 ×5m" />
          </Field>
          <Field label="特記事項" htmlFor="specialNotes" className="sm:col-span-2" error={fe.specialNotes}>
            <Textarea id="specialNotes" name="specialNotes" rows={3} maxLength={3000} defaultValue={values.specialNotes ?? ""} />
          </Field>
          <Field label="次回作業予定" htmlFor="nextSchedule" className="sm:col-span-2" error={fe.nextSchedule}>
            <Textarea id="nextSchedule" name="nextSchedule" rows={2} maxLength={1000} defaultValue={values.nextSchedule ?? ""} />
          </Field>
        </>
      )}
    </div>
  );
}
