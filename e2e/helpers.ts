import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

export const OUTBOX = process.env.E2E_OUTBOX ?? ".data/e2e/outbox";

type Mail = { to: string; subject: string; text: string; html: string; attachments?: { filename: string; size: number }[] };

/** ログ出力されたメールのうち、宛先に一致する最新のものを返す */
export async function latestMail(to: string, subjectIncludes?: string): Promise<Mail> {
  for (let i = 0; i < 40; i++) {
    let files: string[] = [];
    try {
      files = readdirSync(OUTBOX).sort().reverse();
    } catch {}
    for (const f of files) {
      const m = JSON.parse(readFileSync(join(OUTBOX, f), "utf8")) as Mail;
      if (m.to === to && (!subjectIncludes || m.subject.includes(subjectIncludes))) return m;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`mail to ${to} not found`);
}

export function mailsTo(to: string): Mail[] {
  try {
    return readdirSync(OUTBOX)
      .map((f) => JSON.parse(readFileSync(join(OUTBOX, f), "utf8")) as Mail)
      .filter((m) => m.to === to);
  } catch {
    return [];
  }
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const PASSWORD = "testpass123";

/** 新規登録 → メール確認まで行い、ダッシュボードを開いた状態にする */
export async function signupAndVerify(page: Page, opts: { company: string; name?: string; email?: string }) {
  const email = opts.email ?? uniqueEmail("user");
  await page.goto("/signup");
  await page.getByLabel("会社名・屋号").fill(opts.company);
  await page.getByLabel("お名前").fill(opts.name ?? "山田 太郎");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "無料で始める" }).click();
  await expect(page.getByRole("heading", { name: "確認メールを送信しました" })).toBeVisible();
  const mail = await latestMail(email, "メールアドレスの確認");
  const url = mail.text.match(/https?:\/\/\S+\/verify\?token=\S+/)![0];
  await page.goto(url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  return { email };
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/app/);
}

export async function createCustomer(page: Page, name: string, email?: string) {
  await page.goto("/app/customers/new");
  await page.getByLabel("顧客名").fill(name);
  if (email) await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByText("顧客を登録しました。")).toBeVisible();
  return page.url().split("/app/customers/")[1].split("?")[0];
}

export async function createSite(page: Page, name: string, customerName: string) {
  await page.goto("/app/sites/new");
  await page.getByLabel("現場名").fill(name);
  await page.getByLabel("顧客").selectOption({ label: customerName });
  await page.getByLabel("現場住所").fill("東京都港区1-2-3");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByText("現場を登録しました。")).toBeVisible();
  return page.url().split("/app/sites/")[1].split("?")[0];
}
