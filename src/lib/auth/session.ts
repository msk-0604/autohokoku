import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, organizations, sessions, users, type Role } from "@/lib/db/schema";
import { randomToken, sha256 } from "@/lib/crypto";
import { isSecureUrl } from "@/lib/env";

export const SESSION_COOKIE = isSecureUrl ? "__Host-sr_session" : "sr_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type Org = typeof organizations.$inferSelect;
export type AuthContext = {
  sessionId: string;
  user: { id: string; email: string; name: string; emailVerified: boolean; isPlatformAdmin: boolean };
  org: Org;
  role: Role;
};

export async function createSession(userId: string, orgId: string, meta: { ip?: string; userAgent?: string }) {
  const token = randomToken();
  const now = Date.now();
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    orgId,
    expiresAt: new Date(now + SESSION_TTL_MS),
    lastSeenAt: new Date(now),
    ip: meta.ip,
    userAgent: meta.userAgent,
    createdAt: new Date(now),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureUrl,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** 1リクエスト内ではキャッシュされる。セッションが無効なら null */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const sid = sha256(token);
  const rows = await db
    .select({ session: sessions, user: users, org: organizations, role: memberships.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(organizations, eq(organizations.id, sessions.orgId))
    .innerJoin(
      memberships,
      and(eq(memberships.userId, sessions.userId), eq(memberships.orgId, sessions.orgId), isNull(memberships.disabledAt)),
    )
    .where(eq(sessions.id, sid))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  if (row.session.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, sid));
    return null;
  }
  if (now - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS) })
      .where(eq(sessions.id, sid));
  }
  return {
    sessionId: sid,
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      emailVerified: Boolean(row.user.emailVerifiedAt),
      isPlatformAdmin: row.user.isPlatformAdmin,
    },
    org: row.org,
    role: row.role,
  };
});
