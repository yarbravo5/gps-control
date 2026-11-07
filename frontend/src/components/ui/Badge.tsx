import type { PropsWithChildren } from "react";

type BadgeTone = "neutral" | "info" | "success" | "critical";

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-800",
  info: "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-700/25",
  success: "bg-teal-50 text-teal-900 ring-1 ring-inset ring-brand-teal/30",
  critical: "bg-red-50 text-wine-dark ring-1 ring-inset ring-brand-wine/25",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
