"use client";

import { useActionState } from "react";
import { saveCustomerAction, saveSiteAction } from "./actions";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

type CustomerValues = { name?: string | null; companyName?: string | null; contactName?: string | null; phone?: string | null; email?: string | null; address?: string | null; note?: string | null };

export function CustomerForm({ id, values, disabled }: { id: string | null; values: CustomerValues; disabled?: boolean }) {
  const [state, action] = useActionState(saveCustomerAction.bind(null, id), {});
  const v = { ...values, ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <Field label="顧客名" htmlFor="name" required error={fe.name} className="sm:col-span-2" hint="報告書に「〇〇 様」と表示されます">
          <Input id="name" name="name" defaultValue={v.name ?? ""} required maxLength={100} placeholder="例）株式会社サンプル商事" />
        </Field>
        <Field label="会社名" htmlFor="companyName" error={fe.companyName}>
          <Input id="companyName" name="companyName" defaultValue={v.companyName ?? ""} maxLength={100} />
        </Field>
        <Field label="担当者名" htmlFor="contactName" error={fe.contactName}>
          <Input id="contactName" name="contactName" defaultValue={v.contactName ?? ""} maxLength={100} />
        </Field>
        <Field label="電話番号" htmlFor="phone" error={fe.phone}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone ?? ""} maxLength={30} />
        </Field>
        <Field label="メールアドレス" htmlFor="email" error={fe.email} hint="報告書の送信先になります">
          <Input id="email" name="email" type="email" inputMode="email" defaultValue={v.email ?? ""} maxLength={254} />
        </Field>
        <Field label="住所" htmlFor="address" error={fe.address} className="sm:col-span-2">
          <Input id="address" name="address" defaultValue={v.address ?? ""} maxLength={300} />
        </Field>
        <Field label="備考" htmlFor="note" error={fe.note} className="sm:col-span-2">
          <Textarea id="note" name="note" rows={3} defaultValue={v.note ?? ""} maxLength={2000} />
        </Field>
      </fieldset>
      {!disabled && (
        <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="保存しています…">
          {id ? "保存する" : "登録する"}
        </SubmitButton>
      )}
    </form>
  );
}

type SiteValues = { name?: string | null; customerId?: string | null; address?: string | null; managerName?: string | null; workDescription?: string | null; note?: string | null };

export function SiteForm({ id, values, customers, disabled }: { id: string | null; values: SiteValues; customers: { id: string; name: string }[]; disabled?: boolean }) {
  const [state, action] = useActionState(saveSiteAction.bind(null, id), {});
  const v = { ...values, ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <Field label="現場名" htmlFor="name" required error={fe.name} className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={v.name ?? ""} required maxLength={100} placeholder="例）港区1丁目 新築工事" />
        </Field>
        <Field label="顧客" htmlFor="customerId" error={fe.customerId}>
          <Select id="customerId" name="customerId" defaultValue={v.customerId ?? ""}>
            <option value="">選択しない</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="担当者" htmlFor="managerName" error={fe.managerName}>
          <Input id="managerName" name="managerName" defaultValue={v.managerName ?? ""} maxLength={100} />
        </Field>
        <Field label="現場住所" htmlFor="address" error={fe.address} className="sm:col-span-2">
          <Input id="address" name="address" defaultValue={v.address ?? ""} maxLength={300} />
        </Field>
        <Field label="作業内容" htmlFor="workDescription" error={fe.workDescription} className="sm:col-span-2">
          <Textarea id="workDescription" name="workDescription" rows={3} defaultValue={v.workDescription ?? ""} maxLength={2000} />
        </Field>
        <Field label="備考" htmlFor="note" error={fe.note} className="sm:col-span-2">
          <Textarea id="note" name="note" rows={3} defaultValue={v.note ?? ""} maxLength={2000} />
        </Field>
      </fieldset>
      {!disabled && (
        <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="保存しています…">
          {id ? "保存する" : "登録する"}
        </SubmitButton>
      )}
    </form>
  );
}
