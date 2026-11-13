import { test, expect } from "@playwright/test";
import { createCustomer, createSite, signupAndVerify } from "./helpers";

/**
 * 最重要フロー：スマホで 登録 → 顧客・現場 → 報告書作成 → 写真 → 確定 → PDF
 */
test("スマホで写真付き報告書を作成し、日本語PDFを出力できる", async ({ page, request }) => {
  await signupAndVerify(page, { company: "山田設備工業" });
  // 無料体験が開始されている
  await expect(page.getByRole("link", { name: /体験 残り14日/ })).toBeVisible();

  await createCustomer(page, "株式会社サンプル商事", "customer@example.com");
  await createSite(page, "港区1丁目 新築工事", "株式会社サンプル商事");

  // 新規報告書
  await page.goto("/app");
  await page.getByTestId("new-report-hero").click();
  await expect(page.getByRole("heading", { name: "新規報告書作成" })).toBeVisible();
  await page.getByLabel("報告書名").fill("エアコン入替工事");
  await page.getByLabel("現場").selectOption({ label: "港区1丁目 新築工事" });
  await page.getByRole("button", { name: "作成して写真を撮る" }).click();
  await expect(page.getByText("報告書を作成しました。")).toBeVisible();
  const reportNumber = await page.getByTestId("report-number").innerText();
  expect(reportNumber).toMatch(/^R-\d{4}-0001$/);
  const reportId = page.url().split("/app/reports/")[1].split("/")[0];

  // 写真（カメラ入力と同じ input に 2 枚）
  await page.getByRole("radio", { name: "作業前" }).click();
  await page.getByTestId("camera-input").setInputFiles("e2e/fixtures/photo1.jpg");
  await expect(page.getByTestId("photo-list").locator("li")).toHaveCount(1);
  await page.getByRole("radio", { name: "作業後" }).click();
  await page.getByTestId("photo-input").setInputFiles("e2e/fixtures/photo2.jpg");
  await expect(page.getByTestId("photo-list").locator("li")).toHaveCount(2);

  // 写真コメント（定型文チップ）と並べ替え
  const first = page.getByTestId("photo-list").locator("li").first();
  await first.getByRole("button", { name: "作業前の状況" }).click();
  await expect(first.getByLabel("写真へのコメント")).toHaveValue("作業前の状況");
  await page.getByTestId("photo-list").locator("li").nth(1).getByRole("button", { name: "上へ移動" }).click();
  await expect(page.getByTestId("photo-list").locator("li").first().getByLabel("写真の分類")).toHaveValue("after");
  await page.getByTestId("photo-list").locator("li").nth(1).getByRole("button", { name: "上へ移動" }).click();

  // 拡大表示
  await page.getByRole("button", { name: "写真1を拡大表示" }).click();
  await expect(page.getByRole("dialog", { name: "写真の拡大表示" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();

  // 内容入力 → 下書き保存
  await page.getByLabel("開始時間").fill("09:00");
  await page.getByLabel("終了時間").fill("17:30");
  await page.getByLabel("作業内容").fill("室外機・室内機の撤去および新規設置を行いました。");
  await page.getByRole("button", { name: "＋動作確認を行い、正常に稼働することを確認しました。" }).click();
  await page.getByLabel("使用材料").fill("冷媒配管 2分3分 ×4m");
  await page.getByRole("button", { name: "下書き保存" }).click();
  await expect(page.getByText("下書きを保存しました。")).toBeVisible();

  // 確定
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "確定する" }).click();
  await expect(page.getByText("報告書を確定しました。")).toBeVisible();
  await expect(page.getByText("確定", { exact: true })).toBeVisible();

  // PDF（ブラウザのセッション cookie で取得）
  const cookies = await page.context().cookies();
  const res = await request.get(`/api/reports/${reportId}/pdf?download=1`, {
    headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const body = await res.body();
  expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  expect(body.length).toBeGreaterThan(20_000);
  // 日本語フォントが埋め込まれていること
  expect(body.toString("latin1")).toContain("NotoSansJP");

  const list = await request.get(`/api/reports/${reportId}/pdf?layout=list`, {
    headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
  });
  expect(list.status()).toBe(200);

  // ダッシュボードの集計
  await page.goto("/app");
  await expect(page.getByTestId("stat-完成済み")).toContainText("1");
  await expect(page.getByTestId("stat-今月の報告書")).toContainText("1");
});
