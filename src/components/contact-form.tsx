"use client";

import { useActionState } from "react";
import { submitSupportAction } from "@/lib/support";
import { SUPPORT_CATEGORIES } from "@/lib/content";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string; companyName?: string } }) {
  const [state, action] = useActionState(submitSupportAction, {});
  const v = { ...defaults, ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="お名前" htmlFor="c-name" required error={fe.name}>
          <Input id="c-name" name="name" defaultValue={v.name} autoComplete="name" />
        </Field>
        <Field label="メールアドレス" htmlFor="c-email" required error={fe.email}>
          <Input id="c-email" name="email" type="email" defaultValue={v.email} autoComplete="email" />
        </Field>
        <Field label="会社名" htmlFor="c-company" error={fe.companyName}>
          <Input id="c-company" name="companyName" defaultValue={v.companyName} autoComplete="organization" />
        </Field>
        <Field label="種類" htmlFor="c-category" required>
          <Select id="c-category" name="category" defaultValue={(v as Record<string, string>).category ?? SUPPORT_CATEGORIES[0]}>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="お問い合わせ内容" htmlFor="c-message" required error={fe.message}>
        <Textarea id="c-message" name="message" rows={6} defaultValue={(v as Record<string, string>).message} maxLength={5000} />
      </Field>
      <div className="hidden" aria-hidden>
        <label>
          ウェブサイト
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <SubmitButton size="lg" pendingText="送信しています…">
        送信する
      </SubmitButton>
    </form>
  );
}
