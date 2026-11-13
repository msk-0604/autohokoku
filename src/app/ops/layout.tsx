import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/dal";
import { SERVICE_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "運営管理", robots: { index: false, follow: false } };

/** Stark Lab 運営者専用。users.is_platform_admin = true のユーザー以外には 404 を返す */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePlatformAdmin();
  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/ops" className="font-bold">
            {SERVICE_NAME} 運営管理
          </Link>
          <span className="text-xs text-slate-300">{ctx.user.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
