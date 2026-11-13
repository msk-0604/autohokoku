import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DB_DRIVER: z.enum(["worker", "sqlite"]).default("sqlite"),
  DATABASE_PATH: z.string().default(".data/dev.sqlite"),
  STORAGE_DRIVER: z.enum(["worker", "local"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default(".data/storage"),
  GATEWAY_URL: z.string().default(""),
  GATEWAY_SECRET: z.string().default(""),

  EMAIL_DRIVER: z.enum(["resend", "log"]).default("log"),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Stark Report <no-reply@example.com>"),
  EMAIL_REPLY_TO: z.string().default(""),
  OUTBOX_DIR: z.string().default(".data/outbox"),

  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_PRICE_ID: z.string().default(""),
  STRIPE_AUTOMATIC_TAX: z.enum(["true", "false"]).default("false"),

  CRON_SECRET: z.string().default(""),
  ADMIN_ALERT_EMAIL: z.string().default(""),
  SUPPORT_EMAIL: z.string().default(""),
  TRIAL_DAYS: z.coerce.number().int().positive().default(14),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error("環境変数が不正です: " + JSON.stringify(parsed.error.flatten().fieldErrors));
}
export const env = parsed.data;

if (env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  // 本番で開発用ドライバを使っていたら警告（Vercel のファイルシステムは永続化されない）
  if (env.DB_DRIVER === "sqlite" && !process.env.ALLOW_SQLITE_IN_PRODUCTION) {
    console.warn("[env] 本番環境で DB_DRIVER=sqlite が使われています");
  }
}

export const isSecureUrl = env.APP_URL.startsWith("https://");
export const stripeEnabled = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);
