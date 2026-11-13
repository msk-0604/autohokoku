import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { requireAuth } from "@/lib/auth/dal";
import { NAV_ITEMS } from "../nav";
import { Card, PageHeader } from "@/components/ui";
import { logoutAction } from "@/app/(auth)/actions";

export default async function MenuPage() {
  const ctx = await requireAuth();
  return (
    <>
      <PageHeader title="メニュー" description={`${ctx.org.name} ／ ${ctx.user.name}（${ctx.role === "admin" ? "管理者" : "一般ユーザー"}）`} />
      <Card className="divide-y divide-slate-100">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex h-14 items-center gap-3 px-4 font-bold text-navy-900">
              <Icon className="size-5 text-brand-600" aria-hidden />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="size-5 text-slate-400" aria-hidden />
            </Link>
          );
        })}
      </Card>
      <form action={logoutAction} className="mt-4">
        <button className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700">
          <LogOut className="size-5" /> ログアウト
        </button>
      </form>
    </>
  );
}
