import { test, expect } from "@playwright/test";
import { latestMail, login, signupAndVerify, uniqueEmail, PASSWORD } from "./helpers";
import { sql } from "./db";

test("運営者だけが運営管理画面で契約状況を確認できる", async ({ page }) => {
  const { email } = await signupAndVerify(page, { company: "Stark Lab 運営" });
  expect((await page.goto("/ops"))?.status()).toBe(404);
  sql("UPDATE users SET is_platform_admin = 1 WHERE email = ?", email);
  await page.goto("/ops");
  await expect(page.getByText("登録企業数")).toBeVisible();
  await expect(page.getByText("MRR（税込）")).toBeVisible();
  await expect(page.getByText("Stark Lab 運営").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "契約状況（最新100社）" })).toBeVisible();
});

test("パスワード再設定とログイン", async ({ page }) => {
  const { email } = await signupAndVerify(page, { company: "再設定テスト社" });
  await page.context().clearCookies();
  await page.goto("/forgot-password");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "再設定メールを送る" }).click();
  await expect(page.getByText(/パスワード再設定のご案内を送信しました/)).toBeVisible();
  const mail = await latestMail(email, "パスワード再設定");
  const url = mail.text.match(/https?:\/\/\S+\/reset-password\?token=\S+/)![0];
  await page.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await page.getByLabel("新しいパスワード").fill("newpass456");
  await page.getByLabel("確認のためもう一度").fill("newpass456");
  await page.getByRole("button", { name: "パスワードを設定する" }).click();
  await expect(page.getByText("パスワードを変更しました。")).toBeVisible();
  // 古いパスワードは使えない
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。")).toBeVisible();
  await login(page, email, "newpass456");
  // 同じリンクは2回使えない
  await page.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page.getByText("リンクの有効期限が切れているか、既に使用されています。")).toBeVisible();
});

test("管理者がメンバーを招待し、一般ユーザーは会社情報を変更できない", async ({ browser }) => {
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await signupAndVerify(admin, { company: "招待テスト社" });
  await admin.goto("/app/settings");
  await admin.getByLabel("会社名・屋号").fill("招待テスト社（更新）");
  await admin.getByRole("button", { name: "会社情報を保存" }).click();
  await expect(admin.getByText("会社情報を保存しました。")).toBeVisible();

  const memberEmail = uniqueEmail("member");
  await admin.locator("#invite-name").fill("鈴木 一郎");
  await admin.locator("#invite-email").fill(memberEmail);
  await admin.getByRole("button", { name: "招待メールを送る" }).click();
  await expect(admin.getByText(`${memberEmail} に招待メールを送信しました。`)).toBeVisible();

  const mail = await latestMail(memberEmail, "への招待");
  const url = mail.text.match(/https?:\/\/\S+\/reset-password\?invite=1&token=\S+/)![0];
  const memberCtx = await browser.newContext();
  const member = await memberCtx.newPage();
  await member.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await member.getByLabel("新しいパスワード").fill("memberpass1");
  await member.getByLabel("確認のためもう一度").fill("memberpass1");
  await member.getByRole("button", { name: "パスワードを設定する" }).click();
  await login(member, memberEmail, "memberpass1");
  await expect(member.locator("header").getByText("招待テスト社（更新）")).toBeVisible();

  await member.goto("/app/settings");
  await expect(member.getByRole("button", { name: "会社情報を保存" })).toHaveCount(0);
  await expect(member.getByLabel("会社名・屋号")).toBeDisabled();
  await member.goto("/app/billing");
  await expect(member.getByText("お申し込み・お支払い方法の変更は、会社の管理者が行えます。")).toBeVisible();

  await adminCtx.close();
  await memberCtx.close();
});

test("LP・SEO：主要セクション、sitemap、robots、構造化データ", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("そのまま報告書になる");
  for (const h of ["使い方", "報告書の仕上がり", "仕様", "対象の業種", "料金", "よくある質問"]) {
    await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
  }
  await expect(page.getByText("7,480").first()).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)[0]["@type"]).toBe("SoftwareApplication");
  expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/faq");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /app");
  expect(robots).toContain("Sitemap:");
  // お問い合わせフォーム
  await page.goto("/contact");
  await page.getByLabel("お名前").fill("問い合わせ太郎");
  await page.getByLabel("メールアドレス").fill("contact-test@example.com");
  await page.getByLabel("お問い合わせ内容").fill("導入について相談したいです。");
  await page.getByRole("button", { name: "送信する" }).click();
  await expect(page.getByText("お問い合わせを受け付けました。")).toBeVisible();
  expect(sql("SELECT * FROM support_requests WHERE email = ?", "contact-test@example.com")).toHaveLength(1);
});
