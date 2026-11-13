import "server-only";
import { and, asc, desc, eq, gte, isNull, or, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customers,
  emailLogs,
  organizations,
  reportVersions,
  sites,
  users,
  workReportPhotos,
  workReports,
  type PhotoCategory,
} from "@/lib/db/schema";
import { likePattern } from "./customers";
import { monthStartJstMs } from "@/lib/dates";

export type Report = typeof workReports.$inferSelect;
export type Photo = typeof workReportPhotos.$inferSelect;

const firstPhotoId = sql<string | null>`(SELECT p.id FROM work_report_photos p WHERE p.report_id = "work_reports"."id" ORDER BY p.sort_order, p.created_at LIMIT 1)`;
const photoCount = sql<number>`(SELECT COUNT(*) FROM work_report_photos p WHERE p.report_id = "work_reports"."id")`;

export async function listReports(
  orgId: string,
  opts: { q?: string; status?: "draft" | "final"; customerId?: string; siteId?: string; limit?: number; offset?: number } = {},
) {
  const conds = [eq(workReports.orgId, orgId), isNull(workReports.deletedAt)];
  if (opts.status) conds.push(eq(workReports.status, opts.status));
  if (opts.customerId) conds.push(eq(workReports.customerId, opts.customerId));
  if (opts.siteId) conds.push(eq(workReports.siteId, opts.siteId));
  if (opts.q) {
    const p = likePattern(opts.q);
    conds.push(
      or(
        sql`${workReports.reportNumber} LIKE ${p} ESCAPE '\\'`,
        sql`${workReports.title} LIKE ${p} ESCAPE '\\'`,
        sql`${workReports.workContent} LIKE ${p} ESCAPE '\\'`,
        sql`${workReports.workerNames} LIKE ${p} ESCAPE '\\'`,
        sql`${customers.name} LIKE ${p} ESCAPE '\\'`,
        sql`${sites.name} LIKE ${p} ESCAPE '\\'`,
      )!,
    );
  }
  return db
    .select({
      id: workReports.id,
      reportNumber: workReports.reportNumber,
      title: workReports.title,
      status: workReports.status,
      version: workReports.version,
      workDate: workReports.workDate,
      workerNames: workReports.workerNames,
      createdAt: workReports.createdAt,
      updatedAt: workReports.updatedAt,
      customerName: customers.name,
      siteName: sites.name,
      firstPhotoId,
      photoCount,
    })
    .from(workReports)
    .leftJoin(customers, and(eq(customers.id, workReports.customerId), eq(customers.orgId, orgId)))
    .leftJoin(sites, and(eq(sites.id, workReports.siteId), eq(sites.orgId, orgId)))
    .where(and(...conds))
    .orderBy(desc(workReports.createdAt))
    .limit(opts.limit ?? 30)
    .offset(opts.offset ?? 0);
}

export async function getReport(orgId: string, id: string) {
  const rows = await db
    .select({ report: workReports, customer: customers, site: sites, creatorName: users.name })
    .from(workReports)
    .leftJoin(customers, and(eq(customers.id, workReports.customerId), eq(customers.orgId, orgId)))
    .leftJoin(sites, and(eq(sites.id, workReports.siteId), eq(sites.orgId, orgId)))
    .leftJoin(users, eq(users.id, workReports.createdBy))
    .where(and(eq(workReports.orgId, orgId), eq(workReports.id, id), isNull(workReports.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPhotos(orgId: string, reportId: string) {
  return db
    .select()
    .from(workReportPhotos)
    .where(and(eq(workReportPhotos.orgId, orgId), eq(workReportPhotos.reportId, reportId)))
    .orderBy(asc(workReportPhotos.sortOrder), asc(workReportPhotos.createdAt));
}

export async function listVersions(orgId: string, reportId: string) {
  return db
    .select({ id: reportVersions.id, version: reportVersions.version, createdAt: reportVersions.createdAt, snapshot: reportVersions.snapshot, userName: users.name })
    .from(reportVersions)
    .leftJoin(users, eq(users.id, reportVersions.createdBy))
    .where(and(eq(reportVersions.orgId, orgId), eq(reportVersions.reportId, reportId)))
    .orderBy(desc(reportVersions.version));
}

export async function listEmailLogs(orgId: string, reportId?: string, limit = 50) {
  const conds = [eq(emailLogs.orgId, orgId)];
  if (reportId) conds.push(eq(emailLogs.reportId, reportId));
  return db
    .select({ log: emailLogs, reportNumber: workReports.reportNumber, sentByName: users.name })
    .from(emailLogs)
    .innerJoin(workReports, eq(workReports.id, emailLogs.reportId))
    .leftJoin(users, eq(users.id, emailLogs.sentBy))
    .where(and(...conds))
    .orderBy(desc(emailLogs.createdAt))
    .limit(limit);
}

/** PDF・版の保存に使う、報告書の完全なデータ */
export type ReportSnapshot = {
  reportNumber: string;
  version: number;
  title: string | null;
  workDate: string;
  customerName: string | null;
  customerCompany: string | null;
  siteName: string | null;
  siteAddress: string | null;
  workerNames: string | null;
  startTime: string | null;
  endTime: string | null;
  workContent: string | null;
  materials: string | null;
  specialNotes: string | null;
  nextSchedule: string | null;
  creatorName: string | null;
  createdAt: number;
  finalizedAt: number | null;
  photos: { id: string; storageKey: string; category: PhotoCategory; caption: string | null; width: number | null; height: number | null }[];
};

export async function buildSnapshot(orgId: string, reportId: string): Promise<ReportSnapshot | null> {
  const r = await getReport(orgId, reportId);
  if (!r) return null;
  const photos = await listPhotos(orgId, reportId);
  return {
    reportNumber: r.report.reportNumber,
    version: r.report.version,
    title: r.report.title,
    workDate: r.report.workDate,
    customerName: r.customer?.name ?? null,
    customerCompany: r.customer?.companyName ?? null,
    siteName: r.site?.name ?? null,
    siteAddress: r.site?.address ?? null,
    workerNames: r.report.workerNames,
    startTime: r.report.startTime,
    endTime: r.report.endTime,
    workContent: r.report.workContent,
    materials: r.report.materials,
    specialNotes: r.report.specialNotes,
    nextSchedule: r.report.nextSchedule,
    creatorName: r.creatorName,
    createdAt: r.report.createdAt.getTime(),
    finalizedAt: r.report.finalizedAt?.getTime() ?? null,
    photos: photos.map((p) => ({ id: p.id, storageKey: p.storageKey, category: p.category, caption: p.caption, width: p.width, height: p.height })),
  };
}

export async function dashboardStats(orgId: string) {
  const monthStart = new Date(monthStartJstMs());
  const base = and(eq(workReports.orgId, orgId), isNull(workReports.deletedAt));
  const [monthly, drafts, finals, sent] = await Promise.all([
    db.select({ n: count() }).from(workReports).where(and(base, gte(workReports.createdAt, monthStart))),
    db.select({ n: count() }).from(workReports).where(and(base, eq(workReports.status, "draft"))),
    db.select({ n: count() }).from(workReports).where(and(base, eq(workReports.status, "final"))),
    db
      .select({ n: count() })
      .from(emailLogs)
      .where(and(eq(emailLogs.orgId, orgId), eq(emailLogs.status, "sent"), gte(emailLogs.createdAt, monthStart))),
  ]);
  return { monthly: monthly[0].n, drafts: drafts[0].n, finals: finals[0].n, sentThisMonth: sent[0].n };
}

/** 報告書番号を発行する（例: R-2026-0001）。UPDATE ... RETURNING で原子的に採番 */
export async function nextReportNumber(orgId: string): Promise<string> {
  const rows = await db
    .update(organizations)
    .set({ reportSeq: sql`${organizations.reportSeq} + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ seq: organizations.reportSeq, prefix: organizations.reportPrefix });
  const { seq, prefix } = rows[0];
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
