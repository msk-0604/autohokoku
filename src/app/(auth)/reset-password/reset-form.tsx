"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "../actions";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";

export function ResetForm({ token, kind }: { token: string; kind: "invite" | "reset_password" }) {
  const [state, action] = useActionState(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="kind" value={kind === "invite" ? "invite" : "reset"} />
      {kind === "invite" && (
        <Field label="お名前" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" />
        </Field>
      )}
      <Field label="新しいパスワード" htmlFor="password" required error={fe.password} hint="8文字以上・英字と数字を含めてください">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="確認のためもう一度" htmlFor="confirm" required error={fe.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="設定しています…">
        パスワードを設定する
      </SubmitButton>
    </form>
  );
}
