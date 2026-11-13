"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  MapPin,
  Building2,
  CreditCard,
  HelpCircle,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export const NAV_ITEMS: Item[] = [
  { href: "/app", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
  { href: "/app/reports", label: "作業報告書", icon: FileText },
  { href: "/app/reports/new", label: "新規報告書作成", icon: PlusCircle, exact: true },
  { href: "/app/customers", label: "顧客管理", icon: Users },
  { href: "/app/sites", label: "現場管理", icon: MapPin },
  { href: "/app/settings", label: "会社設定", icon: Building2 },
  { href: "/app/billing", label: "契約・お支払い", icon: CreditCard },
  { href: "/app/help", label: "ヘルプ", icon: HelpCircle },
];

function isActive(pathname: string, item: Item) {
  if (item.exact) return pathname === item.href;
  if (item.href === "/app/reports") return pathname.startsWith("/app/reports") && pathname !== "/app/reports/new";
  return pathname.startsWith(item.href);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="メインメニュー" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors",
              active ? "bg-white/12 text-white" : "text-navy-100 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/app", label: "ホーム", icon: LayoutDashboard, exact: true },
    { href: "/app/reports", label: "報告書", icon: FileText },
    { href: "/app/reports/new", label: "新規作成", icon: PlusCircle, exact: true },
    { href: "/app/customers", label: "顧客", icon: Users },
    { href: "/app/menu", label: "メニュー", icon: Menu },
  ];
  return (
    <nav aria-label="メインメニュー" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden no-print">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item) || (item.href === "/app/menu" && ["/app/sites", "/app/settings", "/app/billing", "/app/help", "/app/menu"].some((p) => pathname.startsWith(p)));
          const Icon = item.icon;
          const isNew = item.href === "/app/reports/new";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold", active ? "text-brand-700" : "text-slate-500")}
              >
                {isNew ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-white">
                    <Icon className="size-6" aria-hidden />
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
