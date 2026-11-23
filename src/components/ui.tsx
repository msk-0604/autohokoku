import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Info } from "lucide-react";

/**
 * 画面部品の共通基準
 * - 色：朱(brand)=操作、墨(navy)=見出し・選択中、緑=確定、黄=修正中、赤=エラーと削除。下書きは無彩色
 * - 角丸：入力・ボタンは 4px(rounded-lg)、枠は 6px(rounded-xl) の2種類だけ
 * - 影：使わない（区切りは罫線）
 * - 文字：本文 15〜16px、補足 13px 以上
 * - ボタン高さ：sm 40px／md 44px／lg 52px（指で押せる大きさを下回らない）
 */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost" | "navy";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50",
  navy: "bg-navy-900 text-white hover:bg-navy-800 disabled:bg-navy-900/50",
  secondary: "bg-white text-navy-900 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50 disabled:text-red-300",
  ghost: "text-navy-800 hover:bg-slate-100",
};
const sizeClass: Record<Size, string> = {
  sm: "h-10 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-lg gap-2",
  lg: "h-13 px-6 text-base rounded-lg gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center font-bold transition-colors select-none whitespace-nowrap",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed",
    variantClass[variant],
    sizeClass[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

/** 区切りの箱。影は付けない。min-w-0 で中の長い文字が画面幅を押し広げないようにする */
export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("min-w-0 rounded-xl border border-slate-200 bg-white", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
      <h2 className="text-base font-bold text-navy-900">{title}</h2>
      {action}
    </div>
  );
}

/** 一覧などへの戻りリンク（全画面で同じ見た目） */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-ml-1 mb-1 inline-flex h-9 items-center gap-0.5 rounded-lg pr-2 text-sm font-bold text-slate-600 hover:text-navy-900">
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">{title}</h1>
          {description && <div className="mt-1 text-sm text-slate-600">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const inputBase =
  "block w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-700 aria-[invalid=true]:border-red-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(inputBase, "h-12", className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(inputBase, "py-3 leading-relaxed", className)} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(inputBase, "h-12 pr-9 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22M6 8l4 4 4-4%22/></svg>')] bg-[right_0.6rem_center] bg-no-repeat", className)}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string[] | string;
  children: ReactNode;
  className?: string;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-sm font-bold text-slate-700">
        {label}
        {required && <span className="text-xs font-normal text-red-600">必須</span>}
      </label>
      {children}
      {hint && !msg && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {msg && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "success" | "error" | "warn"; children: ReactNode; className?: string }) {
  const styles = {
    info: "bg-white text-navy-900 border-slate-300 border-l-4 border-l-navy-900",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-lg border px-4 py-3 text-sm leading-relaxed", styles, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Badge({ tone = "slate", children }: { tone?: "slate" | "blue" | "green" | "amber" | "red" | "navy"; children: ReactNode }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    navy: "bg-navy-900 text-white",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap", styles)}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-bold text-navy-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** 報告書の状態表示。用語は「下書き」「修正中」「確定」の3つに統一 */
export function StatusBadge({ status, version }: { status: string; version?: number }) {
  if (status === "final") return <Badge tone="green">確定{version && version > 1 ? `・第${version}版` : ""}</Badge>;
  if (version && version > 0) return <Badge tone="amber">修正中</Badge>;
  return <Badge tone="slate">下書き</Badge>;
}

/** 絞り込みの切り替え（一覧画面で共通） */
export function FilterTabs({ items, label }: { items: { label: string; href: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-4 inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      {items.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn("flex h-9 items-center rounded-md px-4 text-sm font-bold", t.active ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-50")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
