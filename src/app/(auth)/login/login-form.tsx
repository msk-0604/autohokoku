"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="メールアドレス" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="username" defaultValue={state.values?.email} required />
      </Field>
      <Field label="パスワード" htmlFor="password" error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="ログインしています…">
        ログイン
      </SubmitButton>
    </form>
  );
}
