"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "../actions";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, {});
  return (
    <>
      <h1 className="text-xl font-bold text-navy-900">パスワードの再設定</h1>
      <p className="mt-1 text-sm text-slate-600">ご登録のメールアドレスに、再設定用のリンクをお送りします。</p>
      <form action={action} className="mt-6 space-y-4" noValidate>
        <FormMessage state={state} />
        <Field label="メールアドレス" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state.values?.email} required />
        </Field>
        <SubmitButton size="lg" className="w-full" pendingText="送信しています…">
          再設定メールを送る
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-brand-700 underline">
          ログイン画面に戻る
        </Link>
      </p>
    </>
  );
}
