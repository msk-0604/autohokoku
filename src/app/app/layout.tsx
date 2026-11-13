import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { accessOf } from "@/lib/billing/access";
import { logoutAction } from "@/app/(auth)/actions";
import { BottomNav, SideNav } from "./nav";
import { LogoMark } from "@/components/logo";
import { SERVICE_NAME } from "@/lib/brand";
import { cn } from "@/components/ui";

export const metadata: Metadata = { title: "管理画面", robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuth();
  const access = accessOf(ctx.org);
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* PC: 左サイドバー */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 px-3 py-5 lg:flex no-print">
        <Link href="/app" className="mb-6 flex items-center gap-2 px-2">
          <LogoMark />
          <span className="text-lg font-bold text-white">{SERVICE_NAME}</span>
        </Link>
        <SideNav />
        <div className="mt-auto border-t border-white/10 px-2 pt-4 text-sm text-navy-100">
          <p className="truncate font-bold text-white">{ctx.org.name}</p>
          <p className="truncate">{ctx.user.name}</p>
          <form action={logoutAction} className="mt-3">
            <button className="flex items-center gap-2 text-navy-100 hover:text-white">
              <LogOut className="size-4" /> ログアウト
            </button>
          </form>
        </div>
      </aside>

      {/* スマホ: 上部バー */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden no-print">
        <Link href="/app" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="max-w-[55vw] truncate text-[15px] font-bold text-navy-900">{ctx.org.name}</span>
        </Link>
        <Link href="/app/billing" className={cn("rounded-full px-2.5 py-1 text-xs font-bold", access.tone === "ok" ? "bg-navy-50 text-navy-800" : access.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700")}>
          {access.status === "trialing" ? `体験 残り${access.trialDaysLeft}日` : access.label}
        </Link>
      </header>

      {!access.canWrite || access.tone === "warn" ? (
        <div className={cn("px-4 py-2.5 text-sm no-print", access.canWrite ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800")}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <span>{access.message}</span>
            <Link href="/app/billing" className="font-bold underline">
              {access.canWrite ? "確認する" : "お申し込みはこちら"}
            </Link>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
