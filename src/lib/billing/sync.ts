import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { memberships, organizations, stripeEvents, subscriptions, users, PLAN_STATUSES, type PlanStatus } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { env } from "@/lib/env";
import { sendNotification, notifyAdmin } from "@/lib/monitoring";
import { canceledTemplate, paymentFailedTemplate } from "@/lib/email/templates";
import { audit } from "@/lib/audit";

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));
const ms = (sec: number | null | undefined) => (sec ? new Date(sec * 1000) : null);

async function findOrgId(params: { orgId?: string | null; customerId?: string | null }): Promise<string | null> {
  if (params.orgId) {
    const r = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, params.orgId)).limit(1);
    if (r[0]) return r[0].id;
  }
  if (params.customerId) {
    const r = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.stripeCustomerId, params.customerId)).limit(1);
    if (r[0]) return r[0].id;
  }
  return null;
}

/** 会社の管理者のメールアドレス（請求関連の通知先） */
export async function adminEmails(orgId: string): Promise<{ userId: string; email: string }[]> {
  return db
    .select({ userId: users.id, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.role, "admin"), isNull(memberships.disabledAt)));
}

function toPlanStatus(s: string): PlanStatus {
  return (PLAN_STATUSES as readonly string[]).includes(s) ? (s as PlanStatus) : "incomplete";
}

export async function syncSubscription(sub: Stripe.Subscription, eventCreated: number) {
  const customerId = idOf(sub.customer);
  const orgId = await findOrgId({ orgId: sub.metadata?.org_id, customerId });
  if (!orgId) {
    await notifyAdmin("Stripe: 会社が特定できないサブスクリプション", `subscription=${sub.id} customer=${customerId}`);
    return;
  }
  const eventAt = new Date(eventCreated * 1000);
  const item = sub.items?.data?.[0];
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? item?.current_period_end ?? null;
  const values = {
    orgId,
    stripeCustomerId: customerId ?? "",
    status: sub.status,
    priceId: item?.price?.id ?? null,
    currentPeriodEnd: ms(periodEnd),
    trialEnd: ms(sub.trial_end),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    canceledAt: ms(sub.ended_at ?? sub.canceled_at),
    lastEventAt: eventAt,
    updatedAt: new Date(),
  };

  // 古いイベントが後から届いた場合は上書きしない（順序逆転対策）
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, sub.id)).limit(1);
  if (existing[0]?.lastEventAt && existing[0].lastEventAt > eventAt) return; // 既に新しい状態を反映済み
  if (existing[0]) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.stripeSubscriptionId, sub.id));
  } else {
    await db.insert(subscriptions).values({ id: newId(), stripeSubscriptionId: sub.id, createdAt: new Date(), ...values });
  }
  const thisSub = (await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, sub.id)).limit(1))[0];

  // この会社で最も新しい有効なサブスクリプションの状態を会社に反映する
  const planStatus = toPlanStatus(sub.status);
  const orgRow = (await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1))[0];
  const otherActive = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.orgId, orgId), or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing"), eq(subscriptions.status, "past_due"))!))
    .limit(5);
  if ((planStatus === "canceled" || planStatus === "incomplete_expired") && otherActive.some((o) => o.id !== thisSub?.id)) {
    return; // 別の有効な契約があるので会社の状態は変えない
  }
  await db
    .update(organizations)
    .set({
      planStatus,
      stripeCustomerId: orgRow?.stripeCustomerId ?? customerId,
      ...(sub.status === "trialing" && sub.trial_end ? { trialEndsAt: new Date(sub.trial_end * 1000) } : {}),
      canceledAt: planStatus === "canceled" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  if (orgRow && orgRow.planStatus !== planStatus) {
    await audit({ orgId, action: "billing.status_changed", meta: { from: orgRow.planStatus, to: planStatus, subscription: sub.id }, ip: "stripe" });
    if (planStatus === "canceled") {
      for (const a of await adminEmails(orgId)) {
        await sendNotification({
          orgId,
          userId: a.userId,
          kind: "canceled",
          to: a.email,
          rendered: canceledTemplate(orgRow.name, `${env.APP_URL}/app/billing`),
          dedupeKey: `canceled:${sub.id}:${a.userId}`,
        });
      }
    }
  }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = idOf(invoice.customer);
  const orgId = await findOrgId({ customerId });
  if (!orgId) return;
  const org = (await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1))[0];
  await audit({ orgId, action: "billing.payment_failed", meta: { invoice: invoice.id, attempt: invoice.attempt_count }, ip: "stripe" });
  for (const a of await adminEmails(orgId)) {
    await sendNotification({
      orgId,
      userId: a.userId,
      kind: "payment_failed",
      to: a.email,
      rendered: paymentFailedTemplate(org.name, `${env.APP_URL}/app/billing`),
      dedupeKey: `payment_failed:${invoice.id}:${invoice.attempt_count ?? 0}:${a.userId}`,
    });
  }
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = await findOrgId({ orgId: session.client_reference_id ?? session.metadata?.org_id });
  const customerId = idOf(session.customer);
  if (!orgId || !customerId) return;
  await db
    .update(organizations)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(and(eq(organizations.id, orgId), isNull(organizations.stripeCustomerId)));
  await audit({ orgId, action: "billing.checkout_completed", meta: { session: session.id }, ip: "stripe" });
}

/**
 * Webhook の冪等処理。
 * 同じイベントが複数回届いても、処理済みなら何もしない。処理途中で失敗した場合は processed_at が空のまま残り、Stripe の再送で再処理される。
 */
export async function processStripeEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  await db.insert(stripeEvents).values({ id: event.id, type: event.type, createdAt: new Date() }).onConflictDoNothing();
  const row = (await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id)).limit(1))[0];
  if (row?.processedAt) return "duplicate";

  let handled = true;
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object as Stripe.Subscription, event.created);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      handled = false;
  }
  await db.update(stripeEvents).set({ processedAt: new Date() }).where(eq(stripeEvents.id, event.id));
  return handled ? "processed" : "ignored";
}
