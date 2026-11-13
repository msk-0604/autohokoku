import type { Metadata } from "next";
import Link from "next/link";
import { peekAuthToken } from "@/lib/auth/tokens";
import { Alert } from "@/components/ui";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "パスワードの設定", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const token = sp.token ?? "";
  const kind = sp.invite ? "invite" : "reset_password";
  const valid = await peekAuthToken(token, kind);
  return (
    <>
      <h1 className="text-xl font-bold text-navy-900">{kind === "invite" ? "パスワードを設定して参加" : "新しいパスワードの設定"}</h1>
      <div className="mt-6">
        {valid ? (
          <ResetForm token={token} kind={kind} />
        ) : (
          <>
            <Alert tone="error">リンクの有効期限が切れているか、既に使用されています。</Alert>
            <p className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="text-brand-700 underline">
                もう一度手続きする
              </Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
