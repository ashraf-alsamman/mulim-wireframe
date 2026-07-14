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
    navy: "bg-navy-50 text-navy-700",
    green: "bg-emerald-50 text-emerald-700",
    burgundy: "bg-burgundy-50 text-burgundy-700",
    blue: "bg-sky-50 text-sky-700"
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-navy-900">{value}</p>
          {detail ? <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p> : null}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-md ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
