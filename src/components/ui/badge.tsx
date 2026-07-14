import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "burgundy";

const tones: Record<BadgeTone, string> = {
  neutral: "text-[var(--ink-soft)]",
  success: "bg-[var(--ink)] text-[var(--paper-soft)]",
  warning: "bg-[var(--paper-soft)] text-[var(--ink)]",
  danger: "bg-[var(--ink)] text-[var(--paper-soft)]",
  info: "bg-[var(--paper-soft)] text-[var(--ink)]",
  burgundy: "bg-[var(--ink)] text-[var(--paper-soft)]"
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("sketch-badge inline-flex items-center px-2.5 py-1 text-xs font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}
