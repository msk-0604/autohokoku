import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost" | "navy";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-brand-600/50",
  navy: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm disabled:bg-navy-900/50",
  secondary: "bg-white text-navy-900 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:text-red-300",
  ghost: "text-navy-800 hover:bg-navy-50",
};
const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "h-14 px-6 text-base rounded-xl gap-2",
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

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, icon }: { title: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const inputBase =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-100 disabled:bg-slate-100 aria-[invalid=true]:border-red-500";

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
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
        {label}
        {required && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-600">必須</span>}
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
    info: "bg-brand-50 text-navy-900 border-brand-100",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-red-50 text-red-800 border-red-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed", styles, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Badge({ tone = "slate", children }: { tone?: "slate" | "blue" | "green" | "amber" | "red" | "navy"; children: ReactNode }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    navy: "bg-navy-900 text-white",
  }[tone];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", styles)}>{children}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-2xl bg-navy-50 p-3 text-navy-700">{icon}</div>}
      <p className="font-bold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status, version }: { status: string; version?: number }) {
  if (status === "final") return <Badge tone="green">確定{version && version > 1 ? `・第${version}版` : ""}</Badge>;
  return <Badge tone="amber">{version && version > 0 ? "修正中" : "下書き"}</Badge>;
}
