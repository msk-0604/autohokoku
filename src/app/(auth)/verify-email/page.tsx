import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { getAuth } from "@/lib/auth/session";
import { ResendForm } from "./resend-form";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: "メールアドレスの確認", robots: { index: false } };

export default async function VerifyEmailPage() {
  const ctx = await getAuth();
  if (!ctx) redirect("/login");
  if (ctx.user.emailVerified) redirect("/app");
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 w-fit text-navy-900">
        <MailCheck className="size-8" />
      </div>
      <h1 className="text-xl font-bold text-navy-900">確認メールを送信しました</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        <strong className="text-slate-900">{ctx.user.email}</strong> 宛にお送りしたメールのボタンを押して、登録を完了してください。
      </p>
      <p className="mt-2 text-xs text-slate-500">メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
      <div className="mt-6">
        <ResendForm />
      </div>
      <form action={logoutAction} className="mt-4">
        <button className="text-sm text-slate-500 underline">別のアカウントでログイン</button>
      </form>
    </div>
  );
}
