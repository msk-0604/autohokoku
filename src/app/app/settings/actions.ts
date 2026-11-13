"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { memberships, organizations, sessions, users } from "@/lib/db/schema";
import { hashPassword, newId, verifyPassword } from "@/lib/crypto";
import { AppError, adminOrThrow, authOrThrow } from "@/lib/auth/dal";
import { formValues, handleAction, optionalEmail, optionalText, requiredText, type ActionState } from "@/lib/actions";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email/send";
import { inviteTemplate } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { deleteObject } from "@/lib/storage";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/ratelimit";

const orgSchema = z.object({
  name: requiredText(100, "会社名"),
  postalCode: optionalText(10),
  address: optionalText(300),
  phone: optionalText(30),
  email: optionalEmail,
  reportPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,6}$/, "英数字6文字以内で入力してください"),
});

export async function updateOrgAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await adminOrThrow();
      const input = orgSchema.parse(Object.fromEntries(fd));
      await db.update(organizations).set({ ...input, updatedAt: new Date() }).where(eq(organizations.id, ctx.org.id));
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "org.update" });
      revalidatePath("/app", "layout");
      return { ok: true, message: "会社情報を保存しました。", values };
    },
    "org.update",
    values,
  );
}

export async function deleteLogoAction(): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await adminOrThrow();
    if (ctx.org.logoKey) {
      await db.update(organizations).set({ logoKey: null, updatedAt: new Date() }).where(eq(organizations.id, ctx.org.id));
      await deleteObject(ctx.org.logoKey).catch(() => {});
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "org.logo_deleted" });
    }
    revalidatePath("/app/settings");
    return { ok: true, message: "ロゴを削除しました。" };
  }, "org.logo_delete");
}

const inviteSchema = z.object({
  email: emailSchema,
  name: requiredText(50, "お名前"),
  role: z.enum(["admin", "member"]),
});

export async function inviteMemberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const ctx = await adminOrThrow();
      if (!(await rateLimit(`invite:${ctx.org.id}`, 30, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);
      const input = inviteSchema.parse(Object.fromEntries(fd));
      const existing = (await db.select().from(users).where(eq(users.email, input.email)).limit(1))[0];
      let userId: string;
      if (existing) {
        const m = await db.select().from(memberships).where(eq(memberships.userId, existing.id));
        if (m.some((x) => x.orgId === ctx.org.id)) throw new AppError("このメールアドレスのユーザーは既にメンバーです。");
        // 1ユーザーは1社のみ所属（データ分離を単純に保つため）
        throw new AppError("このメールアドレスは別の会社で利用されています。別のメールアドレスで招待してください。");
      } else {
        userId = newId();
        await db.batch([
          db.insert(users).values({ id: userId, email: input.email, name: input.name, createdAt: new Date(), updatedAt: new Date() }),
          db.insert(memberships).values({ id: newId(), orgId: ctx.org.id, userId, role: input.role, createdAt: new Date(), updatedAt: new Date() }),
        ]);
      }
      const token = await createAuthToken(userId, "invite");
      await sendEmail({
        to: input.email,
        ...inviteTemplate(ctx.org.name, ctx.user.name, `${env.APP_URL}/reset-password?invite=1&token=${encodeURIComponent(token)}`),
      });
      await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "member.invite", targetType: "user", targetId: userId, meta: { role: input.role } });
      revalidatePath("/app/settings");
      return { ok: true, message: `${input.email} に招待メールを送信しました。` };
    },
    "member.invite",
    values,
  );
}

async function assertKeepsAdmin(orgId: string, excludingUserId: string) {
  const admins = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.role, "admin"), isNull(memberships.disabledAt), ne(memberships.userId, excludingUserId)));
  if (admins.length === 0) throw new AppError("管理者が1人もいなくなるため変更できません。");
}

export async function updateMemberAction(userId: string, change: { role?: "admin" | "member"; disabled?: boolean }): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await adminOrThrow();
    if (userId === ctx.user.id) throw new AppError("自分自身の権限は変更できません。");
    const m = (await db.select().from(memberships).where(and(eq(memberships.orgId, ctx.org.id), eq(memberships.userId, userId))).limit(1))[0];
    if (!m) throw new AppError("メンバーが見つかりません。", 404);
    if ((change.role === "member" || change.disabled) && m.role === "admin") await assertKeepsAdmin(ctx.org.id, userId);
    await db
      .update(memberships)
      .set({
        ...(change.role ? { role: change.role } : {}),
        ...(change.disabled !== undefined ? { disabledAt: change.disabled ? new Date() : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(memberships.id, m.id));
    if (change.disabled) await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.orgId, ctx.org.id)));
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "member.update", targetType: "user", targetId: userId, meta: change });
    revalidatePath("/app/settings");
    return { ok: true };
  }, "member.update");
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await authOrThrow();
    const name = requiredText(50, "お名前").parse(fd.get("name"));
    await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
    revalidatePath("/app", "layout");
    return { ok: true, message: "お名前を保存しました。" };
  }, "profile.update");
}

const pwSchema = z
  .object({ current: z.string().min(1, "現在のパスワードを入力してください"), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "確認用パスワードが一致しません", path: ["confirm"] });

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await authOrThrow();
    if (!(await rateLimit(`pwchange:${ctx.user.id}`, 10, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);
    const input = pwSchema.parse(Object.fromEntries(fd));
    const u = (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0];
    if (!(await verifyPassword(input.current, u.passwordHash))) return { error: "現在のパスワードが正しくありません。" };
    await db.update(users).set({ passwordHash: await hashPassword(input.password), updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
    // 他の端末のセッションを無効化（今の端末は残す）
    await db.delete(sessions).where(and(eq(sessions.userId, ctx.user.id), ne(sessions.id, ctx.sessionId)));
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "auth.password_changed" });
    return { ok: true, message: "パスワードを変更しました。他の端末ではログアウトされます。" };
  }, "profile.password");
}
