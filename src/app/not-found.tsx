import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-bold text-navy-900">404</p>
      <p className="mt-3 text-slate-600">ページが見つかりませんでした。</p>
      <Link href="/" className="mt-6 font-bold text-brand-700 underline">
        トップページへ
      </Link>
    </main>
  );
}
