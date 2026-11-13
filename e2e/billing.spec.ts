import { test, expect, type APIRequestContext } from "@playwright/test";
import Stripe from "stripe";
import { cookieHeader, latestMail, mailsTo, signupAndVerify } from "./helpers";
import { orgIdByEmail, sql } from "./db";

const WEBHOOK_SECRET = "whsec_e2e_test_secret";
const stripe = new Stripe("sk_test_dummy_for_e2e");

async function sendEvent(request: APIRequestContext, event: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": signature, "content-type": "application/json" } });
}

function subscriptionEvent(id: string, type: string, created: number, sub: Record<string, unknown>) {
  return { id, object: "event", type, created, livemode: false, data: { object: { object: "subscription", items: { data: [] }, cancel_at_period_end: false, cancel_at: null, trial_end: null, canceled_at: null, ended_at: null, ...sub } } };
}

test("Stripe Webhook：署名検証・冪等処理・契約状態の同期・解約時のアクセス制御", async ({ page, request, baseURL }) => {
  const { email } = await signupAndVerify(page, { company: "請求テスト社" });
  const orgId = orgIdByEmail(email);
  const now = Math.floor(Date.now() / 1000);
  const subId = `sub_test_${now}`;
  const customerId = `cus_test_${now}`;

  // 署名が不正なら 400、署名なしも 400
  const forged = await sendEvent(request, subscriptionEvent("evt_forged", "customer.subscription.updated", now, { id: subId, customer: customerId, status: "active", metadata: { org_id: orgId } }), "whsec_wrong");
  expect(forged.status()).toBe(400);
  expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);
  expect(sql("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?", subId)).toHaveLength(0);

  // 有料契約の開始
  const created = subscriptionEvent(`evt_created_${now}`, "customer.subscription.created", now, {
    id: subId,
    customer: customerId,
    status: "active",
    metadata: { org_id: orgId },
    items: { data: [{ price: { id: "price_e2e" }, current_period_end: now + 30 * 86400 }] },
  });
  const r1 = await sendEvent(request, created);
  expect(r1.status()).toBe(200);
  expect((await r1.json()).result).toBe("processed");
  // 同じイベントの再送は処理しない（冪等）
  const r2 = await sendEvent(request, created);
  expect((await r2.json()).result).toBe("duplicate");
  expect(sql("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?", subId)).toHaveLength(1);

  await page.goto("/app/billing");
  await expect(page.getByTestId("plan-label")).toHaveText("ご契約中");
  await expect(page.getByRole("button", { name: "お支払い方法・領収書・解約" })).toBeVisible();

  // 古いイベントが後から届いても上書きしない
  const stale = await sendEvent(request, subscriptionEvent(`evt_stale_${now}`, "customer.subscription.updated", now - 100, { id: subId, customer: customerId, status: "incomplete", metadata: { org_id: orgId } }));
  expect(stale.status()).toBe(200);
  expect(sql<{ plan_status: string }>("SELECT plan_status FROM organizations WHERE id = ?", orgId)[0].plan_status).toBe("active");

  // 決済失敗 → 管理者へメール
  const failed = await sendEvent(request, { id: `evt_inv_${now}`, object: "event", type: "invoice.payment_failed", created: now + 10, livemode: false, data: { object: { object: "invoice", id: `in_${now}`, customer: customerId, attempt_count: 1 } } });
  expect(failed.status()).toBe(200);
  const failMail = await latestMail(email, "お支払いが完了できませんでした");
  expect(failMail.text).toContain("/app/billing");

  // 支払い遅延（Stripe の再請求期間）は利用継続、警告表示
  await sendEvent(request, subscriptionEvent(`evt_pastdue_${now}`, "customer.subscription.updated", now + 20, { id: subId, customer: customerId, status: "past_due", metadata: { org_id: orgId } }));
  await page.goto("/app/billing");
  await expect(page.getByTestId("plan-label")).toHaveText("お支払い確認中");

  // 解約 → 閲覧のみ（サーバー側で書き込みを拒否）
  const del = await sendEvent(request, subscriptionEvent(`evt_deleted_${now}`, "customer.subscription.deleted", now + 30, { id: subId, customer: customerId, status: "canceled", metadata: { org_id: orgId }, ended_at: now + 30 }));
  expect(del.status()).toBe(200);
  await page.goto("/app/billing");
  await expect(page.getByTestId("plan-label")).toHaveText("解約済み");
  await page.goto("/app/reports/new");
  await expect(page.getByText(/閲覧のみご利用いただけます/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "作成して写真を撮る" })).toHaveCount(0);
  const cookies = cookieHeader(await page.context().cookies());
  const anyReport = "00000000-0000-0000-0000-000000000000";
  const up = await page.request.post(`/api/reports/${anyReport}/photos`, {
    headers: { cookie: cookies, origin: baseURL! },
    multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0]) } },
  });
  expect(up.status()).toBe(402);
  expect(mailsTo(email).some((m) => m.subject.includes("ご解約手続きが完了しました"))).toBe(true);
});

test("無料体験の終了：終了前のお知らせ・終了処理（毎日の自動処理）", async ({ page, request }) => {
  const { email } = await signupAndVerify(page, { company: "体験終了テスト社" });
  const orgId = orgIdByEmail(email);

  // 認証なしの cron は拒否
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect((await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);

  // 残り2日 → 終了前メール
  sql("UPDATE organizations SET trial_ends_at = ? WHERE id = ?", Date.now() + 2 * 86400_000, orgId);
  const r1 = await request.get("/api/cron/daily", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(r1.status()).toBe(200);
  await latestMail(email, "無料体験は");
  // 2回実行しても重複送信しない
  await request.get("/api/cron/daily", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(mailsTo(email).filter((m) => m.subject.includes("に終了します"))).toHaveLength(1);

  // 期限切れ → trial_expired・終了メール・閲覧のみ
  sql("UPDATE organizations SET trial_ends_at = ? WHERE id = ?", Date.now() - 1000, orgId);
  await request.get("/api/cron/daily", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(sql<{ plan_status: string }>("SELECT plan_status FROM organizations WHERE id = ?", orgId)[0].plan_status).toBe("trial_expired");
  await latestMail(email, "無料体験が終了しました");
  await page.goto("/app/billing");
  await expect(page.getByTestId("plan-label")).toHaveText("無料体験終了");
  await expect(page.getByRole("button", { name: "有料プランに申し込む" })).toBeVisible();
});
