/**
 * Stripe の商品・価格・カスタマーポータル設定・Webhook を作成する（何度実行しても重複作成しない）。
 *
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe-setup.ts https://<公開URL> [--out <file>] [--live]
 *
 * - 既存の Stark Report 用オブジェクト（metadata.app = "stark-report"）があれば再利用する
 * - テストモードのキー（sk_test_）を想定。本番キーは --live を付けないと拒否する
 * - 価格は税込（tax_behavior: inclusive）7,480円/月
 * - 同じ Stripe アカウントで他サービスも運用している前提で、ポータル設定はデフォルトにせず専用のものを作る
 * - Webhook の署名シークレットは画面に出さず、--out のファイル（権限600）にだけ書き出す
 */
import { writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
const appUrl = process.argv.find((a) => /^https?:\/\//.test(a));
const live = process.argv.includes("--live");
const outIdx = process.argv.indexOf("--out");
const outFile = outIdx > 0 ? process.argv[outIdx + 1] : null;
const TAG = "stark-report";

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.payment_failed",
];

async function main() {
  if (!key) throw new Error("STRIPE_SECRET_KEY を指定してください");
  if (key.startsWith("sk_live_") && !live) throw new Error("本番キーです。本当に本番で作成する場合のみ --live を付けて実行してください");
  if (!appUrl) throw new Error("公開URL（https://...）を引数に指定してください");
  // fetch クライアントを使う（プロキシ環境では NODE_USE_ENV_PROXY=1 と併用）
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });

  const acct = await stripe.balance.retrieve();
  console.log(`mode: ${acct.livemode ? "LIVE（本番）" : "test"}`);
  if (acct.livemode && !live) throw new Error("本番モードのキーです。--live なしでは実行しません");

  // 商品
  const products = await stripe.products.search({ query: `metadata['app']:'${TAG}' AND active:'true'` }).catch(() => null);
  let product = products?.data[0];
  if (!product) {
    product = await stripe.products.create({ name: "Stark Report スタンダードプラン", description: "写真付き作業報告書クラウド（月額）", metadata: { app: TAG } });
    console.log("product: created", product.id);
  } else console.log("product: exists", product.id);

  // 価格（税込 7,480円/月）
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find((p) => p.unit_amount === 7480 && p.currency === "jpy" && p.recurring?.interval === "month" && p.tax_behavior === "inclusive");
  if (!price) {
    price = await stripe.prices.create({ product: product.id, currency: "jpy", unit_amount: 7480, recurring: { interval: "month" }, tax_behavior: "inclusive", nickname: "月額7,480円（税込）", metadata: { app: TAG } });
    console.log("price: created", price.id);
  } else console.log("price: exists", price.id);

  // カスタマーポータル（専用設定・デフォルトにはしない）
  const configs = await stripe.billingPortal.configurations.list({ limit: 100 });
  let portal = configs.data.find((c) => c.metadata?.app === TAG && c.active);
  if (!portal) {
    portal = await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Stark Report のご契約・お支払い" },
      features: {
        customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "unused", "other"] } },
      },
      default_return_url: `${appUrl}/app/billing`,
      metadata: { app: TAG },
    });
    console.log("portal configuration: created", portal.id);
  } else console.log("portal configuration: exists", portal.id);

  // Webhook
  const url = `${appUrl}/api/stripe/webhook`;
  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  let hook = hooks.data.find((h) => h.url === url);
  let webhookSecret: string | null = null;
  if (!hook) {
    const created = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, description: "Stark Report", metadata: { app: TAG } });
    hook = created;
    webhookSecret = created.secret ?? null;
    console.log("webhook: created", hook.id, url);
  } else {
    console.log("webhook: exists", hook.id, url, "（署名シークレットは作成時のみ取得可能。必要ならダッシュボードで確認）");
  }

  const result = { STRIPE_PRICE_ID: price.id, STRIPE_PORTAL_CONFIGURATION_ID: portal.id, STRIPE_WEBHOOK_SECRET: webhookSecret };
  if (outFile) {
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify(result), { mode: 0o600 });
    chmodSync(outFile, 0o600);
    console.log(`IDs と Webhook シークレットを ${outFile} に保存しました（シークレットは表示しません）`);
  } else {
    console.log(`STRIPE_PRICE_ID=${price.id}`);
    console.log(`STRIPE_PORTAL_CONFIGURATION_ID=${portal.id}`);
    if (webhookSecret) console.log("STRIPE_WEBHOOK_SECRET は --out を付けて実行するとファイルに保存されます（画面には表示しません）");
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
