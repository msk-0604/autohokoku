import { defineConfig, devices } from "@playwright/test";

/**
 * E2E テスト。専用の SQLite / ストレージ / メール出力先を使い、開発用データとは分ける。
 *   npm run test:e2e
 * 既に起動中のサーバーを使う場合: E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
export const E2E_DATA_DIR = ".data/e2e";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /desktop\..*spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `node e2e/start-server.mjs`,
        url: `${baseURL}/login`,
        timeout: 240_000,
        reuseExistingServer: false,
        env: {
          PORT: String(PORT),
          APP_URL: baseURL,
          DB_DRIVER: "sqlite",
          DATABASE_PATH: `${E2E_DATA_DIR}/db.sqlite`,
          STORAGE_DRIVER: "local",
          LOCAL_STORAGE_DIR: `${E2E_DATA_DIR}/storage`,
          EMAIL_DRIVER: "log",
          OUTBOX_DIR: `${E2E_DATA_DIR}/outbox`,
          EMAIL_FAIL_TO: "fail@example.com",
          STRIPE_SECRET_KEY: "sk_test_dummy_for_e2e",
          STRIPE_WEBHOOK_SECRET: "whsec_e2e_test_secret",
          STRIPE_PRICE_ID: "price_e2e",
          CRON_SECRET: "e2e-cron-secret",
          ADMIN_ALERT_EMAIL: "ops@example.com",
          DISABLE_RATE_LIMIT: "1",
        },
      },
});
