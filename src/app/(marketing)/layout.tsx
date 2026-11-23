import Link from "next/link";
import { Logo } from "@/components/logo";
import { COMPANY_NAME } from "@/lib/brand";
import { buttonClass } from "@/components/ui";

const NAV = [
  ["/#how", "使い方"],
  ["/#spec", "仕様"],
  ["/#pricing", "料金"],
  ["/faq", "よくある質問"],
] as const;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="サイト内メニュー">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hidden px-2 text-sm text-slate-700 hover:text-navy-900 md:block">
                {label}
              </Link>
            ))}
            <Link href="/login" className="px-2 text-sm font-bold text-navy-900 md:ml-2">
              ログイン
            </Link>
            <Link href="/signup" className={buttonClass("primary", "sm")}>
              無料で試す
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-300 bg-surface text-sm text-slate-600">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-3">写真付き作業報告書の作成・送信サービス</p>
          </div>
          <nav aria-label="フッターメニュー" className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">
            <Link href="/faq" className="hover:text-navy-900">よくある質問</Link>
            <Link href="/contact" className="hover:text-navy-900">お問い合わせ</Link>
            <Link href="/login" className="hover:text-navy-900">ログイン</Link>
            <Link href="/terms" className="hover:text-navy-900">利用規約</Link>
            <Link href="/privacy" className="hover:text-navy-900">プライバシーポリシー</Link>
            <Link href="/tokushoho" className="hover:text-navy-900">特定商取引法に基づく表記</Link>
          </nav>
        </div>
        <div className="border-t border-slate-200">
          <p className="num mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
            © {new Date().getFullYear()} {COMPANY_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}
