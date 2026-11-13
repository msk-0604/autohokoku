"use client";

import { useActionState } from "react";
import { startCheckoutAction, openPortalAction } from "./actions";
import { FormMessage, SubmitButton } from "@/components/form";

export function BillingButtons({ canSubscribe, hasCustomer }: { canSubscribe: boolean; hasCustomer: boolean }) {
  const [checkoutState, checkout] = useActionState(startCheckoutAction, {});
  const [portalState, portal] = useActionState(openPortalAction, {});
  return (
    <div className="space-y-3">
      <FormMessage state={checkoutState.error ? checkoutState : portalState} />
      {canSubscribe && (
        <form action={checkout}>
          <SubmitButton size="lg" className="w-full" pendingText="決済画面を開いています…">
            有料プランに申し込む
          </SubmitButton>
        </form>
      )}
      {hasCustomer && (
        <form action={portal}>
          <SubmitButton variant="secondary" size="lg" className="w-full" pendingText="開いています…">
            お支払い方法・領収書・解約
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
