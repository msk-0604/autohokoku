/**
 * Stripe の商品・価格・カスタマーポータル・Webhook を作成する（初回のみ）。
 *
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe-setup.ts https://<本番ドメイン>
 *
 * - テストモードのキー（sk_test_）で実行することを想定。本番キーは --live を付けないと拒否する。
 * - 出力された STRIPE_PRICE_ID と STRIPE_WEBHOOK_SECRET を Vercel の環境変数に設定する。
 * - 価格は「税込（tax_behavior: inclusive）」で作成する。Stripe Tax を使う場合も表示は 7,480円のまま。
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = process.argv.find((a) => a.startsWith("https://") || a.startsWith("http://"));
const live = process.argv.includes("--live");

async function main() {
  if (!key) throw new Error("STRIPE_SECRET_KEY を指定してください");
  if (key.startsWith("sk_live_") && !live) throw new Error("本番キーです。本当に本番で作成する場合のみ --live を付けて実行してください");
  const stripe = new Stripe(key);

  const product = await stripe.products.create(
    { name: "Stark Report スタンダードプラン", description: "写真付き作業報告書クラウド（月額）"},
    { idempotencyKey: "stark-report-product-v1" },
  );
  const price = await stripe.prices.create(
    { product: product.id, currency: "jpy", unit_amount: 7480, recurring: { interval: "month" }, tax_behavior: "inclusive", nickname: "月額7,480円（税込）" },
    { idempotencyKey: "stark-report-price-monthly-7480-v1" },
  );
  console.log("STRIPE_PRICE_ID=" + price.id);

  const portal = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Stark Report のご契約・お支払い" },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "unused", "other"] } },
    },
    default_return_url: appUrl ? `${appUrl}/app/billing` : undefined,
  });
  console.log("カスタマーポータル設定:", portal.id, "（ダッシュボードでデフォルトに設定してください）");

  if (appUrl) {
    const hook = await stripe.webhookEndpoints.create({
      url: `${appUrl}/api/stripe/webhook`,
      enabled_events: [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
        "invoice.payment_failed",
      ],
      description: "Stark Report",
    });
    console.log("STRIPE_WEBHOOK_SECRET=" + hook.secret);
  } else {
    console.log("Webhook は作成していません（URL を引数に渡すと作成します）");
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
