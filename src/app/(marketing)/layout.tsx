import Link from "next/link";
import { Logo } from "@/components/logo";
import { COMPANY_NAME, SERVICE_NAME } from "@/lib/brand";
import { buttonClass } from "@/components/ui";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-3" aria-label="サイト内メニュー">
            <Link href="/#features" className="hidden px-2 text-sm font-bold text-slate-700 hover:text-navy-900 md:block">
              特徴
            </Link>
            <Link href="/#pricing" className="hidden px-2 text-sm font-bold text-slate-700 hover:text-navy-900 md:block">
              料金
            </Link>
            <Link href="/faq" className="hidden px-2 text-sm font-bold text-slate-700 hover:text-navy-900 md:block">
              よくある質問
            </Link>
            <Link href="/login" className="px-2 text-sm font-bold text-navy-900">
              ログイン
            </Link>
            <Link href="/signup" className={buttonClass("primary", "sm", "h-10 px-4")}>
              無料で試す
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-navy-950 text-navy-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="text-lg font-bold text-white">{SERVICE_NAME}</p>
            <p className="mt-2 text-sm">写真付き作業報告書を、スマホで数分で。</p>
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/faq" className="hover:text-white">
                よくある質問
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                お問い合わせ
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                ログイン
              </Link>
            </li>
          </ul>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/terms" className="hover:text-white">
                利用規約
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                プライバシーポリシー
              </Link>
            </li>
            <li>
              <Link href="/tokushoho" className="hover:text-white">
                特定商取引法に基づく表記
              </Link>
            </li>
          </ul>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs">
          © {new Date().getFullYear()} {COMPANY_NAME}
        </p>
      </footer>
    </div>
  );
}
