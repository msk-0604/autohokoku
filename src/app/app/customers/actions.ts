"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers, sites } from "@/lib/db/schema";
import { newId } from "@/lib/crypto";
import { AppError, writableOrThrow } from "@/lib/auth/dal";
import { formValues, handleAction, optionalEmail, optionalText, requiredText, type ActionState } from "@/lib/actions";
import { audit } from "@/lib/audit";

const customerSchema = z.object({
  name: requiredText(100, "顧客名"),
  companyName: optionalText(100),
  contactName: optionalText(100),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(300),
  note: optionalText(2000),
});

export async function saveCustomerAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await writableOrThrow();
      const input = customerSchema.parse(Object.fromEntries(fd));
      const now = new Date();
      if (id) {
        const r = await db
          .update(customers)
          .set({ ...input, updatedAt: now })
          .where(and(eq(customers.orgId, ctx.org.id), eq(customers.id, id)))
          .returning({ id: customers.id });
        if (!r[0]) throw new AppError("顧客が見つかりません。", 404);
        await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "customer.update", targetType: "customer", targetId: id });
        return { ok: true, message: "保存しました。", values };
      }
      const newCustomerId = newId();
      await db.insert(customers).values({ id: newCustomerId, orgId: ctx.org.id, ...input, createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "customer.create", targetType: "customer", targetId: newCustomerId });
      redirect(`/app/customers/${newCustomerId}?created=1`);
    },
    "customer.save",
    values,
  );
}

export async function setCustomerArchivedAction(id: string, archived: boolean): Promise<void> {
  const ctx = await writableOrThrow();
  await db
    .update(customers)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(customers.orgId, ctx.org.id), eq(customers.id, id)));
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: archived ? "customer.archive" : "customer.unarchive", targetType: "customer", targetId: id });
  redirect(`/app/customers/${id}`);
}

const siteSchema = z.object({
  name: requiredText(100, "現場名"),
  customerId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable())
    .optional()
    .transform((v) => v ?? null),
  address: optionalText(300),
  managerName: optionalText(100),
  workDescription: optionalText(2000),
  note: optionalText(2000),
});

export async function saveSiteAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await writableOrThrow();
      const input = siteSchema.parse(Object.fromEntries(fd));
      if (input.customerId) {
        const c = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.orgId, ctx.org.id), eq(customers.id, input.customerId))).limit(1);
        if (!c[0]) throw new AppError("顧客が見つかりません。");
      }
      const now = new Date();
      if (id) {
        const r = await db
          .update(sites)
          .set({ ...input, updatedAt: now })
          .where(and(eq(sites.orgId, ctx.org.id), eq(sites.id, id)))
          .returning({ id: sites.id });
        if (!r[0]) throw new AppError("現場が見つかりません。", 404);
        await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "site.update", targetType: "site", targetId: id });
        return { ok: true, message: "保存しました。", values };
      }
      const siteId = newId();
      await db.insert(sites).values({ id: siteId, orgId: ctx.org.id, ...input, createdBy: ctx.user.id, createdAt: now, updatedAt: now });
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "site.create", targetType: "site", targetId: siteId });
      redirect(`/app/sites/${siteId}?created=1`);
    },
    "site.save",
    values,
  );
}

export async function setSiteArchivedAction(id: string, archived: boolean): Promise<void> {
  const ctx = await writableOrThrow();
  await db
    .update(sites)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(sites.orgId, ctx.org.id), eq(sites.id, id)));
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: archived ? "site.archive" : "site.unarchive", targetType: "site", targetId: id });
  redirect(`/app/sites/${id}`);
}
