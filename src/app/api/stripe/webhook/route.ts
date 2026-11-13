import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { webhookVerifier, type Stripe } from "@/lib/billing/stripe";
import { processStripeEvent } from "@/lib/billing/sync";
import { reportError } from "@/lib/monitoring";

/**
 * Stripe Webhook
 * - 署名を検証し、検証できないリクエストは 400
 * - イベント ID で冪等処理（同じイベントの再送は "duplicate"）
 * - 処理に失敗したら 500 を返して Stripe に再送させる
 */
export async function POST(req: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = webhookVerifier().constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    await reportError("stripe.webhook", e, { eventId: event.id, type: event.type }, "critical");
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
