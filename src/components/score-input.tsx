"use client";

import type { CriterionId } from "@/types/demo";

export function ScoreInput({
  id,
  label,
  value,
  max,
  disabled,
  onChange
}: {
  id: CriterionId;
  label: string;
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (id: CriterionId, value: number) => void;
}) {
  return (
    <div className="sketch-note p-4">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="font-bold text-[var(--ink-soft)]">
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
          className="sketch-input h-9 w-20 px-2 text-center text-sm font-bold"
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
        className="mt-4 w-full accent-gulf-green"
      />
    </div>
  );
}
