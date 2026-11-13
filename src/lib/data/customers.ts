import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, sites } from "@/lib/db/schema";

export type Customer = typeof customers.$inferSelect;
export type Site = typeof sites.$inferSelect;

/** LIKE 用のエスケープ */
export function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}

export async function listCustomers(orgId: string, opts: { q?: string; archived?: boolean; limit?: number } = {}) {
  const conds = [eq(customers.orgId, orgId), opts.archived ? isNotNull(customers.archivedAt) : isNull(customers.archivedAt)];
  if (opts.q) {
    const p = likePattern(opts.q);
    conds.push(
      or(
        sql`${customers.name} LIKE ${p} ESCAPE '\\'`,
        sql`${customers.companyName} LIKE ${p} ESCAPE '\\'`,
        sql`${customers.contactName} LIKE ${p} ESCAPE '\\'`,
        sql`${customers.phone} LIKE ${p} ESCAPE '\\'`,
        sql`${customers.email} LIKE ${p} ESCAPE '\\'`,
      )!,
    );
  }
  return db
    .select()
    .from(customers)
    .where(and(...conds))
    .orderBy(desc(customers.createdAt))
    .limit(opts.limit ?? 200);
}

export async function customerOptions(orgId: string) {
  return db
    .select({ id: customers.id, name: customers.name, companyName: customers.companyName, email: customers.email })
    .from(customers)
    .where(and(eq(customers.orgId, orgId), isNull(customers.archivedAt)))
    .orderBy(asc(customers.name))
    .limit(1000);
}

export async function getCustomer(orgId: string, id: string) {
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.orgId, orgId), eq(customers.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSites(orgId: string, opts: { q?: string; archived?: boolean; customerId?: string; limit?: number } = {}) {
  const conds = [eq(sites.orgId, orgId), opts.archived ? isNotNull(sites.archivedAt) : isNull(sites.archivedAt)];
  if (opts.customerId) conds.push(eq(sites.customerId, opts.customerId));
  if (opts.q) {
    const p = likePattern(opts.q);
    conds.push(
      or(
        sql`${sites.name} LIKE ${p} ESCAPE '\\'`,
        sql`${sites.address} LIKE ${p} ESCAPE '\\'`,
        sql`${sites.managerName} LIKE ${p} ESCAPE '\\'`,
        sql`${customers.name} LIKE ${p} ESCAPE '\\'`,
      )!,
    );
  }
  return db
    .select({ site: sites, customerName: customers.name })
    .from(sites)
    .leftJoin(customers, and(eq(customers.id, sites.customerId), eq(customers.orgId, orgId)))
    .where(and(...conds))
    .orderBy(desc(sites.createdAt))
    .limit(opts.limit ?? 200);
}

export async function siteOptions(orgId: string) {
  return db
    .select({ id: sites.id, name: sites.name, customerId: sites.customerId, address: sites.address, managerName: sites.managerName })
    .from(sites)
    .where(and(eq(sites.orgId, orgId), isNull(sites.archivedAt)))
    .orderBy(desc(sites.createdAt))
    .limit(1000);
}

export async function getSite(orgId: string, id: string) {
  const rows = await db
    .select({ site: sites, customerName: customers.name })
    .from(sites)
    .leftJoin(customers, and(eq(customers.id, sites.customerId), eq(customers.orgId, orgId)))
    .where(and(eq(sites.orgId, orgId), eq(sites.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

