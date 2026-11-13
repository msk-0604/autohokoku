import { defineConfig } from "drizzle-kit";

// マイグレーション SQL を drizzle/ に生成する。
// 本番 D1 への適用は wrangler（workers/gateway/wrangler.toml の migrations_dir）で行う。
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
