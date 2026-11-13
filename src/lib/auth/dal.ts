import "server-only";
import { redirect, notFound } from "next/navigation";
import { getAuth, type AuthContext } from "./session";
import { accessOf } from "@/lib/billing/access";

/** 利用者に見せてよいエラー（メッセージをそのまま表示する） */
export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** ページ用：ログイン必須。未ログインならログイン画面へ */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) redirect("/login");
  if (!ctx.user.emailVerified) redirect("/verify-email");
  return ctx;
}

/** ページ用：会社の管理者のみ */
export async function requireAdminPage(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.role !== "admin") redirect("/app?denied=1");
  return ctx;
}

/** 運営者（Stark Lab）専用。存在自体を隠すため 404 を返す */
export async function requirePlatformAdmin(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx || !ctx.user.isPlatformAdmin || !ctx.user.emailVerified) notFound();
  return ctx;
}

/** Server Action / API 用：ログイン必須（リダイレクトせず例外） */
export async function authOrThrow(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) throw new AppError("ログインが必要です。もう一度ログインしてください。", 401);
  if (!ctx.user.emailVerified) throw new AppError("メールアドレスの確認が完了していません。", 403);
  return ctx;
}

/** 書き込み操作：契約状態を検証する */
export async function writableOrThrow(): Promise<AuthContext> {
  const ctx = await authOrThrow();
  const access = accessOf(ctx.org);
  if (!access.canWrite) {
    throw new AppError("ご契約が有効でないため、この操作はできません。「契約・お支払い」から有料プランをお申し込みください。", 402);
  }
  return ctx;
}

export async function adminOrThrow(): Promise<AuthContext> {
  const ctx = await authOrThrow();
  if (ctx.role !== "admin") throw new AppError("この操作は管理者のみ行えます。", 403);
  return ctx;
}
