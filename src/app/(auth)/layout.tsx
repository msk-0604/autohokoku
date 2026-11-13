import Link from "next/link";
import { Logo } from "@/components/logo";
import { COMPANY_NAME } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-navy-50 to-surface">
      <header className="px-4 py-5 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-slate-500">
        <Link href="/terms" className="underline">
          利用規約
        </Link>
        <span className="mx-2">/</span>
        <Link href="/privacy" className="underline">
          プライバシーポリシー
        </Link>
        <p className="mt-2">© {COMPANY_NAME}</p>
      </footer>
    </div>
  );
}
