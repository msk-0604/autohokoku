import "server-only";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { clientIp } from "@/lib/request";

export async function audit(params: {
  orgId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      id: newId(),
      orgId: params.orgId ?? null,
      userId: params.userId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      meta: params.meta ? JSON.stringify(params.meta) : null,
      ip: params.ip ?? (await clientIp().catch(() => null)),
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
