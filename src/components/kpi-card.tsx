import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy"
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  tone?: "navy" | "green" | "burgundy" | "blue";
}) {
  const colors = {
    navy: "bg-[var(--ink)] text-[var(--paper-soft)]",
    green: "bg-[var(--ink)] text-[var(--paper-soft)]",
    burgundy: "bg-[var(--ink)] text-[var(--paper-soft)]",
    blue: "bg-[var(--ink)] text-[var(--paper-soft)]"
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--graphite)]">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--ink)]">{value}</p>
          {detail ? <p className="mt-1 text-xs font-semibold text-[var(--graphite)]">{detail}</p> : null}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-[11px_9px_13px_10px] border-2 border-[var(--line)] ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
