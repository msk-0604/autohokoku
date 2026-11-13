import { test, expect } from "@playwright/test";
import { createFinalReport, latestMail, mailsTo, signupAndVerify, uniqueEmail } from "./helpers";

test("確定した報告書を、確認画面を経てお客様へメール送信できる", async ({ page, browser }) => {
  await signupAndVerify(page, { company: "メール送信テスト社" });
  const customerEmail = uniqueEmail("customer");
  const { reportId } = await createFinalReport(page, { customer: "送信先テスト株式会社", customerEmail });

  await page.getByRole("link", { name: "顧客へ送信" }).click();
  await expect(page.getByLabel("宛先メールアドレス")).toHaveValue(customerEmail);
  await page.getByRole("button", { name: "送信内容を確認する" }).click();
  await expect(page.getByTestId("confirm-to")).toHaveText(customerEmail);

  // 確認チェックなしでは送信できない
  await page.getByRole("button", { name: "この内容で送信する" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  expect(mailsTo(customerEmail)).toHaveLength(0);

  // 初回の宛先は追加の確認が必要
  await expect(page.getByText("初めて送信する宛先です")).toBeVisible();
  // 送信エラー後、React がフォームをリセットし終えてからチェックする
  await expect(async () => {
    await page.getByRole("checkbox", { name: /に誤りがないことを確認しました/ }).check();
    await page.getByRole("checkbox", { name: /上記の内容で送信します/ }).check();
    await page.waitForTimeout(300);
    await expect(page.getByRole("checkbox", { name: /上記の内容で送信します/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /に誤りがないことを確認しました/ })).toBeChecked();
  }).toPass();
  await page.getByRole("button", { name: "この内容で送信する" }).click();
  await expect(page.getByText("お客様へのメール送信が完了しました。")).toBeVisible();

  const mail = await latestMail(customerEmail);
  expect(mail.subject).toContain("メール送信テスト社");
  const link = mail.text.match(/https?:\/\/\S+\/d\/[A-Za-z0-9_-]+/)![0];

  // 期限付きリンクはログインなしで PDF を開ける
  const anon = await browser.newContext();
  const res = await anon.request.get(link.replace(/^https?:\/\/[^/]+/, ""));
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  // 改ざんしたトークンは無効
  const bad = await anon.request.get(link.replace(/^https?:\/\/[^/]+/, "").slice(0, -3) + "xyz");
  expect(bad.status()).toBe(410);
  await anon.close();

  // 送信履歴
  await page.goto(`/app/reports/${reportId}/send`);
  await expect(page.getByTestId("send-history")).toContainText("送信済み");

  // 2回目以降の同じ宛先は追加確認なし・PDF添付も選べる
  await page.getByText("PDFを添付", { exact: true }).click();
  await page.getByRole("button", { name: "送信内容を確認する" }).click();
  await expect(page.getByText("初めて送信する宛先です")).toHaveCount(0);
  await page.getByText("上記の内容で送信します").click();
  await page.getByRole("button", { name: "この内容で送信する" }).click();
  await expect(page.getByText("お客様へのメール送信が完了しました。")).toBeVisible();
  const mails = mailsTo(customerEmail);
  expect(mails).toHaveLength(2);
  expect(mails.some((m) => m.attachments?.[0]?.filename.endsWith(".pdf") && m.attachments[0].size > 10_000)).toBe(true);

  await page.goto("/app");
  await expect(page.getByTestId("stat-今月の顧客送信")).toContainText("2");
});

test("送信失敗時はエラーを表示し、送信履歴から再送できる", async ({ page }) => {
  await signupAndVerify(page, { company: "送信失敗テスト社" });
  await createFinalReport(page, { customer: "失敗する宛先社", customerEmail: "fail@example.com" });
  await page.getByRole("link", { name: "顧客へ送信" }).click();
  await page.getByRole("button", { name: "送信内容を確認する" }).click();
  await page.getByText(/に誤りがないことを確認しました/).click();
  await page.getByText("上記の内容で送信します").click();
  await page.getByRole("button", { name: "この内容で送信する" }).click();
  await expect(page.getByText(/テスト用の送信失敗/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("send-history")).toContainText("失敗");
  await page.getByRole("button", { name: "再送する" }).first().click();
  // テスト環境ではこの宛先は常に失敗するので、再送も失敗として記録される
  await expect(page.getByText(/テスト用の送信失敗/).first()).toBeVisible();
});
