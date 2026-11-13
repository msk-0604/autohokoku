import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY が設定されていません");
  if (env.NODE_ENV === "production" && env.STRIPE_SECRET_KEY.startsWith("sk_live_") && process.env.STRIPE_LIVE_MODE_CONFIRMED !== "true") {
    // 本番決済の誤有効化を防ぐ：本番キーを使うには明示的なフラグが必要
    throw new Error("本番の Stripe キーを使うには STRIPE_LIVE_MODE_CONFIRMED=true を設定してください");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, appInfo: { name: "stark-report" } });
  return client;
}

/** Webhook 署名検証用（API キーなしで使える） */
export function webhookVerifier() {
  return new Stripe(env.STRIPE_SECRET_KEY || "sk_test_placeholder").webhooks;
}

export type { Stripe };
