import { cn } from "@/utils/cn";

export function Progress({ value, className }: { value: number; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={width}>
      <div className="h-full rounded-full bg-gulf-green transition-all" style={{ width: `${width}%` }} />
    </div>
  );
}
