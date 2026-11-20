"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Plus, Users, Menu } from "lucide-react";
import { cn } from "@/components/ui";
import { NAV_ITEMS, type NavItem } from "./nav-items";

function isActive(pathname: string, item: Pick<NavItem, "href" | "exact">) {
  if (item.exact) return pathname === item.href;
  if (item.href === "/app/reports") return pathname.startsWith("/app/reports") && pathname !== "/app/reports/new";
  return pathname.startsWith(item.href);
}

/** 報告書の編集中は画面下に専用の操作バーを出すので、下部ナビは隠す */
export function isEditorPath(pathname: string) {
  return /^\/app\/reports\/[^/]+\/edit$/.test(pathname);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="メインメニュー" className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-bold whitespace-nowrap transition-colors",
              active ? "bg-white/12 text-white" : "text-navy-100 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const BOTTOM = [
  { href: "/app", label: "ホーム", icon: LayoutDashboard, exact: true },
  { href: "/app/reports", label: "報告書", icon: FileText },
  { href: "/app/reports/new", label: "新規作成", icon: Plus, exact: true },
  { href: "/app/customers", label: "顧客", icon: Users },
  { href: "/app/menu", label: "メニュー", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  if (isEditorPath(pathname)) return null;
  return (
    <nav aria-label="メインメニュー" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden no-print">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {BOTTOM.map((item) => {
          const active = isActive(pathname, item) || (item.href === "/app/menu" && ["/app/sites", "/app/settings", "/app/billing", "/app/help", "/app/menu"].some((p) => pathname.startsWith(p)));
          const Icon = item.icon;
          const isNew = item.href === "/app/reports/new";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold whitespace-nowrap", active ? "text-brand-700" : "text-slate-500")}
              >
                {isNew ? (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                ) : (
                  <Icon className="size-6" aria-hidden />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
