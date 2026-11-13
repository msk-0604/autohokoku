import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, organizations, users } from "@/lib/db/schema";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { getAuth } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { sendNotification } from "@/lib/monitoring";
import { welcomeTemplate } from "@/lib/email/templates";
import { formatDate } from "@/lib/dates";
import { audit } from "@/lib/audit";

/** メール内リンクからのメールアドレス確認 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = await consumeAuthToken(token, "verify_email");
  if (!userId) {
    return NextResponse.redirect(new URL("/verify-email?expired=1", env.APP_URL));
  }
  const updated = await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
    .returning();
  if (updated[0]) {
    const org = await db
      .select({ id: organizations.id, trialEndsAt: organizations.trialEndsAt })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(eq(memberships.userId, userId))
      .limit(1);
    await audit({ orgId: org[0]?.id, userId, action: "auth.email_verified" });
    if (org[0]) {
      await sendNotification({
        orgId: org[0].id,
        userId,
        kind: "welcome",
        to: updated[0].email,
        rendered: welcomeTemplate(updated[0].name, `${env.APP_URL}/app`, formatDate(org[0].trialEndsAt)),
        dedupeKey: `welcome:${userId}`,
      });
    }
  }
  const ctx = await getAuth();
  return NextResponse.redirect(new URL(ctx ? "/app?welcome=1" : "/login?verified=1", env.APP_URL));
}
