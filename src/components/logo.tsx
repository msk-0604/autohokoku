import Link from "next/link";
import { SERVICE_NAME } from "@/lib/brand";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0f2a4a" />
      <rect x="16" y="12" width="32" height="40" rx="4" fill="#fff" />
      <rect x="21" y="18" width="22" height="13" rx="2" fill="#2563eb" />
      <circle cx="32" cy="24.5" r="4" fill="#fff" />
      <rect x="21" y="36" width="22" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="21" y="42" width="15" height="3" rx="1.5" fill="#94a3b8" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={`${SERVICE_NAME} トップ`}>
      <LogoMark />
      <span className={`text-lg font-bold tracking-wide ${light ? "text-white" : "text-navy-900"}`}>{SERVICE_NAME}</span>
    </Link>
  );
}
