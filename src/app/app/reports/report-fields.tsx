"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";

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

const WORK_PHRASES = ["点検を実施しました。", "異常はありませんでした。", "部品を交換しました。", "清掃を実施しました。", "動作確認を行い、正常に稼働することを確認しました。", "作業後、周辺の清掃・片付けを行いました。"];

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
  const siteChoices = useMemo(() => (customerId ? sites.filter((s) => s.customerId === customerId || s.id === siteId) : sites), [customerId, siteId, sites]);
  const fe = errors ?? {};

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {basic && (
        <>
      <Field label="報告書名" htmlFor="title" hint="空欄の場合は「作業報告書」になります" className="sm:col-span-2" error={fe.title}>
        <Input id="title" name="title" defaultValue={values.title ?? ""} maxLength={100} placeholder="例）エアコン入替工事" />
      </Field>
      <Field label="作業日" htmlFor="workDate" required error={fe.workDate}>
        <Input id="workDate" name="workDate" type="date" defaultValue={values.workDate ?? ""} required />
      </Field>
      <Field label="作業担当者" htmlFor="workerNames" error={fe.workerNames}>
        <Input id="workerNames" name="workerNames" defaultValue={values.workerNames ?? ""} maxLength={200} placeholder="例）山田、鈴木" />
      </Field>
      <Field
        label="顧客"
        htmlFor="customerId"
        error={fe.customerId}
        hint={
          <Link href="/app/customers/new" className="text-brand-700 underline">
            顧客を新しく登録する
          </Link>
        }
      >
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
      <Field
        label="現場"
        htmlFor="siteId"
        error={fe.siteId}
        hint={
          <Link href="/app/sites/new" className="text-brand-700 underline">
            現場を新しく登録する
          </Link>
        }
      >
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
        </>
      )}
      {full && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Field label="開始時間" htmlFor="startTime" error={fe.startTime}>
              <Input id="startTime" name="startTime" type="time" defaultValue={values.startTime ?? ""} />
            </Field>
            <Field label="終了時間" htmlFor="endTime" error={fe.endTime}>
              <Input id="endTime" name="endTime" type="time" defaultValue={values.endTime ?? ""} />
            </Field>
          </div>
          <Field label="作業内容" htmlFor="workContent" className="sm:col-span-2" error={fe.workContent} hint="確定時に必須です">
            <Textarea id="workContent" name="workContent" rows={5} maxLength={5000} value={workContent} onChange={(e) => setWorkContent(e.target.value)} placeholder="実施した作業の内容を入力してください" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WORK_PHRASES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setWorkContent((v) => (v ? `${v}${v.endsWith("\n") ? "" : "\n"}${p}` : p))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 active:bg-brand-50"
                >
                  ＋{p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="使用材料" htmlFor="materials" className="sm:col-span-2" error={fe.materials}>
            <Textarea id="materials" name="materials" rows={3} maxLength={3000} defaultValue={values.materials ?? ""} placeholder="例）配管 φ10 ×5m" />
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
