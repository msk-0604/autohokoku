"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { adminOrThrow } from "@/lib/auth/dal";
import { env, stripeEnabled } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";
import { handleAction, type ActionState } from "@/lib/actions";
import { AppError } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";

const MIN_TRIAL_MS = 49 * 60 * 60 * 1000; // Stripe は trial_end を48時間以上先にする必要がある

async function ensureCustomer(org: { id: string; name: string; stripeCustomerId: string | null }, email: string): Promise<string> {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create(
    { name: org.name, email, metadata: { org_id: org.id }, preferred_locales: ["ja"] },
    { idempotencyKey: `customer:${org.id}` },
  );
  const updated = await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(and(eq(organizations.id, org.id), isNull(organizations.stripeCustomerId)))
    .returning({ id: organizations.stripeCustomerId });
  if (!updated[0]) {
    const r = await db.select({ c: organizations.stripeCustomerId }).from(organizations).where(eq(organizations.id, org.id)).limit(1);
    return r[0].c!;
  }
  return customer.id;
}

export async function startCheckoutAction(_: ActionState): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await adminOrThrow();
    if (!stripeEnabled) throw new AppError("決済の設定が完了していません。運営までお問い合わせください。");
    if (["active", "past_due"].includes(ctx.org.planStatus)) redirect("/app/billing");
    const stripe = getStripe();
    const customer = await ensureCustomer(ctx.org, ctx.user.email);
    const trialEnd = ctx.org.trialEndsAt.getTime();
    const keepTrial = ctx.org.planStatus === "trialing" && trialEnd - Date.now() > MIN_TRIAL_MS;
    const automaticTax = env.STRIPE_AUTOMATIC_TAX === "true";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: ctx.org.id,
      metadata: { org_id: ctx.org.id },
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        metadata: { org_id: ctx.org.id },
        // 無料体験の残り期間は課金を始めない
        ...(keepTrial ? { trial_end: Math.floor(trialEnd / 1000) } : {}),
      },
      automatic_tax: { enabled: automaticTax },
      ...(automaticTax ? { customer_update: { address: "auto", name: "auto" } } : {}),
      billing_address_collection: automaticTax ? "required" : "auto",
      allow_promotion_codes: true,
      locale: "ja",
      success_url: `${env.APP_URL}/app/billing?checkout=success`,
      cancel_url: `${env.APP_URL}/app/billing?checkout=canceled`,
    });
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "billing.checkout_started", meta: { session: session.id } });
    if (!session.url) throw new AppError("決済画面を開けませんでした。");
    redirect(session.url);
  }, "billing.checkout");
}

export async function openPortalAction(_: ActionState): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await adminOrThrow();
    if (!stripeEnabled) throw new AppError("決済の設定が完了していません。");
    if (!ctx.org.stripeCustomerId) throw new AppError("まだお支払い情報が登録されていません。");
    const session = await getStripe().billingPortal.sessions.create({
      customer: ctx.org.stripeCustomerId,
      return_url: `${env.APP_URL}/app/billing`,
      locale: "ja",
    });
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "billing.portal_opened" });
    redirect(session.url);
  }, "billing.portal");
}
