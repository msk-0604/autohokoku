"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "../actions";
import { FormMessage, SubmitButton } from "@/components/form";

export function ResendForm() {
  const [state, action] = useActionState(resendVerificationAction, {});
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <SubmitButton variant="secondary" className="w-full" pendingText="送信しています…">
        確認メールを再送する
      </SubmitButton>
    </form>
  );
}
