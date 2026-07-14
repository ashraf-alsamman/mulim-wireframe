import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-bold text-[var(--ink-soft)]", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "sketch-input h-10 w-full px-3 text-sm outline-none transition placeholder:text-[var(--graphite)] disabled:bg-[var(--paper-warm)]",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "sketch-input h-10 w-full px-3 text-sm outline-none transition disabled:bg-[var(--paper-warm)]",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "sketch-input min-h-24 w-full px-3 py-2 text-sm outline-none transition placeholder:text-[var(--graphite)] disabled:bg-[var(--paper-warm)]",
        className
      )}
      {...props}
    />
  );
}
