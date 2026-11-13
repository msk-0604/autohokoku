import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "ログイン", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-xl font-bold text-navy-900">ログイン</h1>
      <div className="mt-4 space-y-3">
        {sp.verified && <Alert tone="success">メールアドレスの確認が完了しました。ログインしてください。</Alert>}
        {sp.reset && <Alert tone="success">パスワードを変更しました。新しいパスワードでログインしてください。</Alert>}
        {sp.joined && <Alert tone="success">パスワードを設定しました。ログインしてください。</Alert>}
      </div>
      <div className="mt-4">
        <LoginForm next={sp.next ?? ""} />
      </div>
      <div className="mt-6 space-y-2 text-center text-sm">
        <p>
          <Link href="/forgot-password" className="text-brand-700 underline">
            パスワードをお忘れの方
          </Link>
        </p>
        <p className="text-slate-600">
          はじめての方は{" "}
          <Link href="/signup" className="font-bold text-brand-700 underline">
            14日間無料体験
          </Link>
        </p>
      </div>
    </>
  );
}
