import { test, expect } from "@playwright/test";
import { cookieHeader, createFinalReport, signupAndVerify } from "./helpers";
import { sql } from "./db";

/** 企業間データ分離・認証・CSRF・XSS */
test("別企業のデータ（報告書・写真・顧客・現場・PDF）にアクセスできない", async ({ browser, baseURL }) => {
  // A社
  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  await signupAndVerify(a, { company: "A社テスト" });
  const ids = await createFinalReport(a, { customer: "A社の顧客" });
  const reportNumberA = sql<{ n: string }>("SELECT report_number n FROM work_reports WHERE id = ?", ids.reportId)[0].n;

  // A社自身はアクセスできる
  const cookiesA = cookieHeader(await ctxA.cookies());
  expect((await a.request.get(`/api/photos/${ids.photoId}`, { headers: { cookie: cookiesA } })).status()).toBe(200);

  // B社
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await signupAndVerify(b, { company: "B社テスト" });
  const cookiesB = cookieHeader(await ctxB.cookies());

  for (const path of [`/app/reports/${ids.reportId}`, `/app/reports/${ids.reportId}/edit`, `/app/reports/${ids.reportId}/send`, `/app/customers/${ids.customerId}`, `/app/sites/${ids.siteId}`]) {
    const res = await b.goto(path);
    expect(res?.status(), path).toBe(404);
  }
  for (const path of [`/api/photos/${ids.photoId}`, `/api/photos/${ids.photoId}?thumb=1`, `/api/reports/${ids.reportId}/pdf`]) {
    const res = await b.request.get(path, { headers: { cookie: cookiesB } });
    expect(res.status(), path).toBe(404);
  }
  // 他社の報告書への写真アップロード
  const up = await b.request.post(`/api/reports/${ids.reportId}/photos`, {
    headers: { cookie: cookiesB, origin: baseURL! },
    multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]) } },
  });
  expect(up.status()).toBe(404);

  // B社の一覧・検索にA社のデータが出ない
  await b.goto(`/app/reports?q=${encodeURIComponent(reportNumberA)}`);
  await expect(b.getByText("該当する報告書がありません")).toBeVisible();
  await b.goto(`/app/customers?q=${encodeURIComponent("A社の顧客")}`);
  await expect(b.getByText("該当する顧客がいません")).toBeVisible();

  // 他社の現場IDを指定して報告書を作ろうとしても拒否される（サーバー側検証）
  await b.goto(`/app/reports/new?site=${ids.siteId}`);
  await expect(b.getByLabel("現場")).toHaveValue("");

  await ctxA.close();
  await ctxB.close();
});

test("未ログイン・権限なしのアクセスを拒否する", async ({ page, request, baseURL }) => {
  // 未ログインは管理画面からログインへ
  await page.goto("/app/reports");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Freports/);
  // API は 401
  expect((await request.get("/api/photos/00000000-0000-0000-0000-000000000000")).status()).toBe(401);
  expect((await request.get("/api/reports/00000000-0000-0000-0000-000000000000/pdf")).status()).toBe(401);
  // 偽のセッション cookie は無効
  expect((await request.get("/api/photos/00000000-0000-0000-0000-000000000000", { headers: { cookie: "sr_session=forged" } })).status()).toBe(401);
  // 運営管理画面は一般ユーザーには存在しないように見える
  await signupAndVerify(page, { company: "一般ユーザー社" });
  const res = await page.goto("/ops");
  expect(res?.status()).toBe(404);
  // Origin ヘッダーのない（別サイトからの）アップロードは拒否（CSRF 対策）
  const cookies = cookieHeader(await page.context().cookies());
  const csrf = await request.post("/api/reports/00000000-0000-0000-0000-000000000000/photos", { headers: { cookie: cookies, origin: "https://evil.example.com" }, multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } } });
  expect(csrf.status()).toBe(403);
  void baseURL;
});

test("入力値はエスケープされ、スクリプトとして実行されない（XSS）", async ({ page }) => {
  await signupAndVerify(page, { company: "XSS確認社" });
  let dialogFired = false;
  page.on("dialog", (d) => {
    dialogFired = true;
    void d.dismiss();
  });
  const payload = `<img src=x onerror="alert(1)"><script>alert(2)</script>`;
  await page.goto("/app/customers/new");
  await page.getByLabel("顧客名").fill(payload);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("heading", { name: payload })).toBeVisible();
  await page.goto("/app/customers");
  await expect(page.getByText(payload)).toBeVisible();
  expect(dialogFired).toBe(false);
});

test("画像以外のファイルはアップロードできない", async ({ page, baseURL }) => {
  await signupAndVerify(page, { company: "アップロード確認社" });
  await page.goto("/app/reports/new");
  await page.getByRole("button", { name: "作成して写真を撮る" }).click();
  await expect(page.getByText("報告書を作成しました。")).toBeVisible();
  const reportId = page.url().split("/app/reports/")[1].split("/")[0];
  const cookies = cookieHeader(await page.context().cookies());
  const res = await page.request.post(`/api/reports/${reportId}/photos`, {
    headers: { cookie: cookies, origin: baseURL! },
    multipart: { file: { name: "evil.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<html><script>alert(1)</script></html>") } },
  });
  expect(res.status()).toBe(415);
  const big = await page.request.post(`/api/reports/${reportId}/photos`, {
    headers: { cookie: cookies, origin: baseURL! },
    multipart: { file: { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024)]) } },
  });
  expect(big.status()).toBe(413);
});
