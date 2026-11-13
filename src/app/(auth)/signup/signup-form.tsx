"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "../actions";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

export function SignupForm({ source }: { source: string }) {
  const [state, action] = useActionState(signupAction, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="source" value={source} />
      <Field label="会社名・屋号" htmlFor="companyName" required error={fe.companyName}>
        <Input id="companyName" name="companyName" autoComplete="organization" defaultValue={v.companyName} required placeholder="例）山田設備工業" />
      </Field>
      <Field label="お名前" htmlFor="name" required error={fe.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={v.name} required placeholder="例）山田 太郎" />
      </Field>
      <Field label="メールアドレス" htmlFor="email" required error={fe.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={v.email} required />
      </Field>
      <Field label="パスワード" htmlFor="password" required error={fe.password} hint="8文字以上・英字と数字を含めてください">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="agree" className="mt-0.5 size-5 accent-brand-600" defaultChecked={v.agree === "on"} />
          <span>
            <Link href="/terms" target="_blank" className="text-brand-700 underline">
              利用規約
            </Link>
            と
            <Link href="/privacy" target="_blank" className="text-brand-700 underline">
              プライバシーポリシー
            </Link>
            に同意します
          </span>
        </label>
        {fe.agree && <p className="mt-1 text-sm text-red-600">{fe.agree[0]}</p>}
      </div>
      <SubmitButton size="lg" className="w-full" pendingText="登録しています…">
        無料で始める
      </SubmitButton>
    </form>
  );
}
