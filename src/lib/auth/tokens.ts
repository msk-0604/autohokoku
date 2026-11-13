import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens, type AuthTokenType } from "@/lib/db/schema";
import { newId, randomToken, sha256 } from "@/lib/crypto";

const TTL: Record<AuthTokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
  invite: 7 * 24 * 60 * 60 * 1000,
};

export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = randomToken();
  await db.insert(authTokens).values({
    id: newId(),
    userId,
    type,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + TTL[type]),
    createdAt: new Date(),
  });
  return token;
}

/** トークンが有効か確認する（消費はしない） */
export async function peekAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const rows = await db
    .select({ userId: authTokens.userId })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, sha256(token)),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0]?.userId ?? null;
}

/** トークンを1回だけ使えるように消費する。成功したら userId を返す */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const rows = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, sha256(token)),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId });
  return rows[0]?.userId ?? null;
}
