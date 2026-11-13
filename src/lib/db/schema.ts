import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * すべての日時は UNIX ミリ秒（integer）で保持する。
 * 業務日付（作業日など）は 'YYYY-MM-DD' の文字列で保持する（タイムゾーンずれ防止）。
 */
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

export const PLAN_STATUSES = [
  "trialing",
  "trial_expired",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    postalCode: text("postal_code"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    logoKey: text("logo_key"),
    reportPrefix: text("report_prefix").notNull().default("R"),
    reportSeq: integer("report_seq").notNull().default(0),
    planStatus: text("plan_status").$type<PlanStatus>().notNull().default("trialing"),
    trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }).notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
    signupSource: text("signup_source"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organizations_stripe_customer_idx").on(t.stripeCustomerId),
    index("organizations_plan_status_idx").on(t.planStatus),
  ],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
    isPlatformAdmin: integer("is_platform_admin", { mode: "boolean" }).notNull().default(false),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<Role>().notNull().default("member"),
    disabledAt: integer("disabled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_idx").on(t.orgId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** sha256(token) の16進。生トークンは cookie にのみ存在する */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const AUTH_TOKEN_TYPES = ["verify_email", "reset_password", "invite"] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AuthTokenType>().notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_idx").on(t.tokenHash), index("auth_tokens_user_idx").on(t.userId)],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    companyName: text("company_name"),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    note: text("note"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("customers_org_idx").on(t.orgId, t.archivedAt, t.createdAt)],
);

export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    address: text("address"),
    managerName: text("manager_name"),
    workDescription: text("work_description"),
    note: text("note"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("sites_org_idx").on(t.orgId, t.archivedAt, t.createdAt),
    index("sites_customer_idx").on(t.customerId),
  ],
);

export const REPORT_STATUSES = ["draft", "final"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const workReports = sqliteTable(
  "work_reports",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportNumber: text("report_number").notNull(),
    status: text("status").$type<ReportStatus>().notNull().default("draft"),
    /** 確定した回数。0 = 未確定。修正→再確定で +1 */
    version: integer("version").notNull().default(0),
    title: text("title"),
    workDate: text("work_date").notNull(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    siteId: text("site_id").references(() => sites.id, { onDelete: "set null" }),
    workerNames: text("worker_names"),
    startTime: text("start_time"),
    endTime: text("end_time"),
    workContent: text("work_content"),
    materials: text("materials"),
    specialNotes: text("special_notes"),
    nextSchedule: text("next_schedule"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    finalizedAt: integer("finalized_at", { mode: "timestamp_ms" }),
    finalizedBy: text("finalized_by").references(() => users.id, { onDelete: "set null" }),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("work_reports_org_number_idx").on(t.orgId, t.reportNumber),
    index("work_reports_org_created_idx").on(t.orgId, t.deletedAt, t.createdAt),
    index("work_reports_org_status_idx").on(t.orgId, t.status),
    index("work_reports_customer_idx").on(t.customerId),
    index("work_reports_site_idx").on(t.siteId),
  ],
);

export const PHOTO_CATEGORIES = ["before", "during", "after", "other"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const workReportPhotos = sqliteTable(
  "work_report_photos",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportId: text("report_id")
      .notNull()
      .references(() => workReports.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    category: text("category").$type<PhotoCategory>().notNull().default("before"),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("photos_report_idx").on(t.reportId, t.sortOrder), index("photos_org_idx").on(t.orgId)],
);

export const reportVersions = sqliteTable(
  "report_versions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportId: text("report_id")
      .notNull()
      .references(() => workReports.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    /** 確定時点の報告書内容（JSON） */
    snapshot: text("snapshot").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("report_versions_report_version_idx").on(t.reportId, t.version), index("report_versions_org_idx").on(t.orgId)],
);

export const EMAIL_STATUSES = ["sending", "sent", "failed"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const emailLogs = sqliteTable(
  "email_logs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportId: text("report_id")
      .notNull()
      .references(() => workReports.id, { onDelete: "cascade" }),
    reportVersion: integer("report_version").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    mode: text("mode").$type<"attachment" | "link">().notNull(),
    status: text("status").$type<EmailStatus>().notNull().default("sending"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    attemptCount: integer("attempt_count").notNull().default(0),
    /** 二重送信防止キー（送信フォームごとに一意） */
    requestKey: text("request_key").notNull(),
    shareLinkId: text("share_link_id"),
    sentBy: text("sent_by").references(() => users.id, { onDelete: "set null" }),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("email_logs_request_key_idx").on(t.orgId, t.requestKey),
    index("email_logs_org_created_idx").on(t.orgId, t.createdAt),
    index("email_logs_report_idx").on(t.reportId),
    index("email_logs_status_idx").on(t.status, t.createdAt),
  ],
);

export const shareLinks = sqliteTable(
  "share_links",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportId: text("report_id")
      .notNull()
      .references(() => workReports.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    downloadCount: integer("download_count").notNull().default(0),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("share_links_token_idx").on(t.tokenHash), index("share_links_report_idx").on(t.reportId)],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    status: text("status").notNull(),
    priceId: text("price_id"),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    trialEnd: integer("trial_end", { mode: "timestamp_ms" }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
    canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
    /** Stripe イベントの順序逆転対策：最後に反映したイベントの created */
    lastEventAt: integer("last_event_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("subscriptions_stripe_id_idx").on(t.stripeSubscriptionId),
    index("subscriptions_org_idx").on(t.orgId),
  ],
);

export const stripeEvents = sqliteTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const notificationLogs = sqliteTable(
  "notification_logs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    toEmail: text("to_email").notNull(),
    status: text("status").$type<"sent" | "failed">().notNull(),
    error: text("error"),
    /** 同じ通知を二重に送らないためのキー（例: trial_ending:<orgId>） */
    dedupeKey: text("dedupe_key"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notification_logs_dedupe_idx").on(t.dedupeKey),
    index("notification_logs_created_idx").on(t.createdAt),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: text("meta"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_org_created_idx").on(t.orgId, t.createdAt)],
);

export const supportRequests = sqliteTable(
  "support_requests",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    companyName: text("company_name"),
    category: text("category").notNull(),
    message: text("message").notNull(),
    status: text("status").$type<"open" | "closed">().notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("support_requests_status_idx").on(t.status, t.createdAt)],
);

export const systemErrors = sqliteTable(
  "system_errors",
  {
    id: text("id").primaryKey(),
    level: text("level").$type<"error" | "critical">().notNull(),
    source: text("source").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    context: text("context"),
    createdAt: createdAt(),
  },
  (t) => [index("system_errors_created_idx").on(t.createdAt)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});
