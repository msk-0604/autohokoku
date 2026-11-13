"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supportRequests } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";

export async function setSupportStatusAction(id: string, status: "open" | "closed"): Promise<void> {
  const ctx = await requirePlatformAdmin();
  await db.update(supportRequests).set({ status, updatedAt: new Date() }).where(eq(supportRequests.id, id));
  await audit({ userId: ctx.user.id, action: "ops.support_status", targetType: "support", targetId: id, meta: { status } });
  revalidatePath("/ops");
}
