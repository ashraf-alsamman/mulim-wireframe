import { cn } from "@/utils/cn";

export function Progress({ value, className }: { value: number; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-3 overflow-hidden rounded-[999px_880px_940px_840px] border-2 border-[var(--line)] bg-[var(--paper-soft)]", className)}
      role="progressbar"
      aria-valuenow={width}
    >
      <div
        className="h-full rounded-[999px_820px_900px_860px] bg-[var(--ink)] transition-all"
        style={{
          width: `${width}%`,
          backgroundImage: "repeating-linear-gradient(-10deg, rgba(255,255,255,0.28) 0 2px, transparent 2px 7px)"
        }}
      />
    </div>
  );
}
