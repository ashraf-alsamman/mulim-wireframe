import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "burgundy";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  burgundy: "bg-burgundy-50 text-burgundy-700 ring-burgundy-100"
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", tones[tone], className)}>
      {children}
    </span>
  );
}
