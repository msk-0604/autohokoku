import { LayoutDashboard, FileText, PlusCircle, Users, MapPin, Building2, CreditCard, HelpCircle, type LucideIcon } from "lucide-react";

/**
 * 管理画面のメニュー。サーバー側（メニュー画面）とブラウザ側（サイドバー・下部ナビ）の両方から使うため、
 * "use client" のファイルには置かない（置くとサーバー側で配列として読めずエラーになる）
 */
export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
  { href: "/app/reports", label: "作業報告書", icon: FileText },
  { href: "/app/reports/new", label: "新規報告書", icon: PlusCircle, exact: true },
  { href: "/app/customers", label: "顧客", icon: Users },
  { href: "/app/sites", label: "現場", icon: MapPin },
  { href: "/app/settings", label: "会社設定", icon: Building2 },
  { href: "/app/billing", label: "契約・お支払い", icon: CreditCard },
  { href: "/app/help", label: "ヘルプ", icon: HelpCircle },
];
