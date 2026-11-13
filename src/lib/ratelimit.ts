import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

/**
 * 固定ウィンドウ方式のレート制限（DB 共有なのでサーバーレスの全インスタンスで有効）。
 * 1文で加算と判定を行うので、同時アクセスでも数え漏れしない。
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  if (process.env.DISABLE_RATE_LIMIT === "1") return { ok: true, retryAfter: 0 };
  const now = Date.now();
  const resetAt = now + windowSec * 1000;
  const rows = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN ${resetAt} ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });
  const row = rows[0];
  return { ok: row.count <= limit, retryAfter: Math.max(0, Math.ceil((row.resetAt - now) / 1000)) };
}

export const RATE_LIMIT_MESSAGE = "操作回数が多すぎます。しばらく時間をおいてからお試しください。";
