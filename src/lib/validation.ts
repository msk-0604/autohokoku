import { z } from "zod";

export const emailSchema = z
  .string({ error: "メールアドレスを入力してください" })
  .trim()
  .toLowerCase()
  .max(254, "メールアドレスが長すぎます")
  .pipe(z.email("メールアドレスの形式が正しくありません"));

export const passwordSchema = z
  .string({ error: "パスワードを入力してください" })
  .min(1, "パスワードを入力してください")
  .min(8, "パスワードは8文字以上で入力してください")
  .max(128, "パスワードは128文字以内で入力してください")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "英字と数字をそれぞれ1文字以上含めてください");
