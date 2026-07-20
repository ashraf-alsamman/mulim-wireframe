"use client";

import type { CriterionId } from "@/types/demo";
import { cn } from "@/utils/cn";

export function ScoreInput({
  id,
  label,
  value,
  max,
  disabled,
  compact = false,
  onChange
}: {
  id: CriterionId;
  label: string;
  value: number;
  max: number;
  disabled?: boolean;
  compact?: boolean;
  onChange: (id: CriterionId, value: number) => void;
}) {
  return (
    <div className={cn("sketch-note", compact ? "p-2.5" : "p-4")}>
      <div className={cn("flex items-center justify-between", compact ? "gap-2" : "gap-4")}>
        <label htmlFor={id} className={cn("font-bold text-[var(--ink-soft)]", compact && "text-sm leading-tight")}>
          {label}
        </label>
        <input
          id={`${id}-number`}
          type="number"
          min={0}
          max={max}
          step={0.5}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(id, Number(event.target.value))}
          className={cn("sketch-input px-2 text-center font-bold", compact ? "h-8 w-14 text-xs" : "h-9 w-20 text-sm")}
        />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(id, Number(event.target.value))}
        className={cn("w-full accent-gulf-green", compact ? "mt-2" : "mt-4")}
      />
    </div>
  );
}
