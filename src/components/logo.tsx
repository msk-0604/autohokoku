import Link from "next/link";
import { SERVICE_NAME } from "@/lib/brand";

/** ロゴマーク：墨色の台紙に、写真（朱）と罫線を載せた報告書 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="8" fill="#161b22" />
      <rect x="16" y="11" width="32" height="42" rx="1.5" fill="#fff" />
      <rect x="21" y="16" width="22" height="15" fill="#c2410c" />
      <rect x="21" y="36" width="22" height="2.5" fill="#161b22" />
      <rect x="21" y="42" width="22" height="2.5" fill="#9aa1ab" />
      <rect x="21" y="47" width="13" height="2.5" fill="#9aa1ab" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={`${SERVICE_NAME} トップ`}>
      <LogoMark className="size-7" />
      <span className={`text-[17px] font-bold ${light ? "text-white" : "text-navy-900"}`}>{SERVICE_NAME}</span>
    </Link>
  );
}
