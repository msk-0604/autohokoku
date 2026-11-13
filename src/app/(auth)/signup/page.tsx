import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "14日間無料体験に申し込む", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const source = [sp.ref && `ref:${sp.ref}`, sp.utm_source && `utm:${sp.utm_source}/${sp.utm_medium ?? ""}/${sp.utm_campaign ?? ""}`]
    .filter(Boolean)
    .join(" ")
    .slice(0, 200);
  return (
    <>
      <h1 className="text-xl font-bold text-navy-900">14日間無料体験</h1>
      <p className="mt-1 text-sm text-slate-600">クレジットカードの登録は不要です。体験終了後に自動で課金されることはありません。</p>
      <div className="mt-6">
        <SignupForm source={source} />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-bold text-brand-700 underline">
          ログイン
        </Link>
      </p>
    </>
  );
}
