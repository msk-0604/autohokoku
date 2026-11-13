"use server";

import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { memberships, organizations, sessions, users } from "@/lib/db/schema";
import { hashPassword, newId, verifyPassword } from "@/lib/crypto";
import { createSession, destroySession, getAuth } from "@/lib/auth/session";
import { createAuthToken, consumeAuthToken } from "@/lib/auth/tokens";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { handleAction, formValues, type ActionState } from "@/lib/actions";
import { AppError } from "@/lib/auth/dal";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/ratelimit";
import { clientIp, userAgent } from "@/lib/request";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { verifyEmailTemplate, resetPasswordTemplate } from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import { reportError } from "@/lib/monitoring";

const signupSchema = z.object({
  companyName: z.string().trim().min(1, "会社名を入力してください").max(100),
  name: z.string().trim().min(1, "お名前を入力してください").max(50),
  email: emailSchema,
  password: passwordSchema,
  agree: z.literal("on", { error: "利用規約とプライバシーポリシーへの同意が必要です" }),
  source: z.string().max(200).optional(),
});

async function sendVerification(user: { id: string; name: string; email: string }) {
  const token = await createAuthToken(user.id, "verify_email");
  const url = `${env.APP_URL}/verify?token=${encodeURIComponent(token)}`;
  try {
    await sendEmail({ to: user.email, ...verifyEmailTemplate(user.name, url) });
  } catch (e) {
    await reportError("auth.sendVerification", e, { userId: user.id }, "critical");
    throw new AppError("確認メールを送信できませんでした。時間をおいて再送してください。");
  }
}

export async function signupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  delete values.password;
  return handleAction(
    async () => {
      const ip = await clientIp();
      if (!(await rateLimit(`signup:${ip}`, 5, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);
      const input = signupSchema.parse(Object.fromEntries(fd));

      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length) {
        return {
          error: "このメールアドレスは既に登録されています。ログインするか、パスワード再設定をご利用ください。",
          values,
        };
      }

      const now = Date.now();
      const orgId = newId();
      const userId = newId();
      const passwordHash = await hashPassword(input.password);
      await db.batch([
        db.insert(organizations).values({
          id: orgId,
          name: input.companyName,
          planStatus: "trialing",
          trialEndsAt: new Date(now + env.TRIAL_DAYS * 24 * 60 * 60 * 1000),
          signupSource: input.source || null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        }),
        db.insert(users).values({
          id: userId,
          email: input.email,
          name: input.name,
          passwordHash,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        }),
        db.insert(memberships).values({ id: newId(), orgId, userId, role: "admin", createdAt: new Date(now), updatedAt: new Date(now) }),
      ]);
      await audit({ orgId, userId, action: "org.signup", ip });
      await createSession(userId, orgId, { ip, userAgent: await userAgent() });
      await sendVerification({ id: userId, name: input.name, email: input.email }).catch(() => {});
      redirect("/verify-email?sent=1");
    },
    "auth.signup",
    values,
  );
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "パスワードを入力してください").max(128) });

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = { email: String(fd.get("email") ?? "") };
  return handleAction(
    async () => {
      const input = loginSchema.parse(Object.fromEntries(fd));
      const ip = await clientIp();
      const [byIp, byEmail] = await Promise.all([
        rateLimit(`login:ip:${ip}`, 30, 600),
        rateLimit(`login:email:${input.email}`, 10, 600),
      ]);
      if (!byIp.ok || !byEmail.ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);

      const rows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const user = rows[0];
      const ok = await verifyPassword(input.password, user?.passwordHash ?? null);
      if (!user || !ok) {
        await audit({ userId: user?.id, action: "auth.login_failed", meta: { email: input.email }, ip });
        return { error: "メールアドレスまたはパスワードが正しくありません。", values };
      }
      const m = await db
        .select({ orgId: memberships.orgId })
        .from(memberships)
        .where(and(eq(memberships.userId, user.id), isNull(memberships.disabledAt)))
        .orderBy(asc(memberships.createdAt))
        .limit(1);
      if (!m[0]) return { error: "所属する会社が見つかりません。管理者にお問い合わせください。", values };

      await createSession(user.id, m[0].orgId, { ip, userAgent: await userAgent() });
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      await audit({ orgId: m[0].orgId, userId: user.id, action: "auth.login", ip });
      const next = String(fd.get("next") ?? "");
      redirect(next.startsWith("/app") ? next : user.isPlatformAdmin && next.startsWith("/ops") ? next : "/app");
    },
    "auth.login",
    values,
  );
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function resendVerificationAction(_: ActionState): Promise<ActionState> {
  return handleAction(async () => {
    const ctx = await getAuth();
    if (!ctx) redirect("/login");
    if (ctx.user.emailVerified) redirect("/app");
    if (!(await rateLimit(`verify-resend:${ctx.user.id}`, 3, 3600)).ok) throw new AppError(RATE_LIMIT_MESSAGE, 429);
    await sendVerification(ctx.user);
    return { ok: true, message: `${ctx.user.email} に確認メールを再送しました。` };
  }, "auth.resendVerification");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  return handleAction(
    async () => {
      const email = emailSchema.parse(fd.get("email"));
      const ip = await clientIp();
      if (!(await rateLimit(`forgot:ip:${ip}`, 10, 3600)).ok || !(await rateLimit(`forgot:email:${email}`, 3, 3600)).ok) {
        throw new AppError(RATE_LIMIT_MESSAGE, 429);
      }
      const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (rows[0]) {
        const token = await createAuthToken(rows[0].id, "reset_password");
        const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
        await sendEmail({ to: email, ...resetPasswordTemplate(rows[0].name, url) }).catch((e) =>
          reportError("auth.forgot", e, { userId: rows[0].id }, "critical"),
        );
        await audit({ userId: rows[0].id, action: "auth.password_reset_requested", ip });
      }
      // 登録の有無が分からないよう、常に同じメッセージを返す
      return {
        ok: true,
        message: "ご登録のメールアドレス宛に、パスワード再設定のご案内を送信しました。届かない場合は迷惑メールフォルダもご確認ください。",
      };
    },
    "auth.forgot",
    values,
  );
}

const resetSchema = z
  .object({ token: z.string().min(10).max(100), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "確認用パスワードが一致しません", path: ["confirm"] });

/** パスワード再設定と招待の受諾（どちらもトークンでパスワードを設定する） */
export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handleAction(async () => {
    const input = resetSchema.parse(Object.fromEntries(fd));
    const kind = fd.get("kind") === "invite" ? "invite" : "reset_password";
    const userId = await consumeAuthToken(input.token, kind);
    if (!userId) return { error: "リンクの有効期限が切れているか、既に使用されています。もう一度お手続きください。" };
    const name = String(fd.get("name") ?? "").trim().slice(0, 50);
    await db
      .update(users)
      .set({
        passwordHash: await hashPassword(input.password),
        emailVerifiedAt: new Date(),
        ...(kind === "invite" && name ? { name } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    // 既存のセッションはすべて無効にする
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await audit({ userId, action: kind === "invite" ? "auth.invite_accepted" : "auth.password_reset" });
    redirect(`/login?${kind === "invite" ? "joined" : "reset"}=1`);
  }, "auth.reset");
}
