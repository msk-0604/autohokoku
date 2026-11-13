import "server-only";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "@/lib/auth/dal";
import { reportError } from "@/lib/monitoring";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** フォームの再表示用に入力値を返す */
  values?: Record<string, string>;
};

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}

/**
 * Server Action の共通エラーハンドリング。
 * - redirect()/notFound() の制御例外はそのまま投げ直す
 * - AppError は利用者向けメッセージとして返す
 * - それ以外は記録して汎用メッセージを返す（内部情報は出さない）
 */
export async function handleAction(fn: () => Promise<ActionState>, source: string, values?: Record<string, string>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { error: e.message, values };
    if (e instanceof z.ZodError) {
      return { error: "入力内容をご確認ください。", fieldErrors: z.flattenError(e).fieldErrors as Record<string, string[]>, values };
    }
    await reportError(source, e);
    return { error: "エラーが発生しました。時間をおいて再度お試しください。", values };
  }
}

/** 空文字を null にする Zod ヘルパー */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max}文字以内で入力してください`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const requiredText = (max: number, label: string) =>
  z.string({ error: `${label}を入力してください` }).trim().min(1, `${label}を入力してください`).max(max, `${max}文字以内で入力してください`);

export const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .pipe(z.email("メールアドレスの形式が正しくありません").nullable())
  .optional()
  .transform((v) => v ?? null);
