import type { HTMLAttributes } from "react";

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  danger: "bg-rose-50 text-rose-700 ring-rose-600/15",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

function StatusBadge({
  children,
  className = "",
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export { StatusBadge };
export type { StatusBadgeProps, StatusTone };
