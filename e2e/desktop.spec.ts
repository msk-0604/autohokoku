import { test, expect } from "@playwright/test";
import { signupAndVerify } from "./helpers";

test("PC表示：サイドバーのメニューから各画面を開ける", async ({ page }) => {
  await signupAndVerify(page, { company: "PC表示テスト社" });
  const nav = page.locator("aside").getByRole("navigation", { name: "メインメニュー" });
  for (const [label, heading] of [
    ["作業報告書", "作業報告書"],
    ["新規報告書", "新規報告書作成"],
    ["顧客", "顧客管理"],
    ["現場", "現場管理"],
    ["会社設定", "会社設定"],
    ["契約・お支払い", "契約・お支払い"],
    ["ヘルプ", "ヘルプ"],
    ["ダッシュボード", "ダッシュボード"],
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});
