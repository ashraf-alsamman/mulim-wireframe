import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="sketch-note border-dashed p-8 text-center">
      <p className="font-bold text-[var(--ink)]">{title}</p>
      {children ? <div className="mt-2 text-sm text-[var(--graphite)]">{children}</div> : null}
    </div>
  );
}

export function LoadingSkeleton() {
  return <div className="sketch-note h-32 animate-pulse bg-[var(--paper-warm)]" />;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="sketch-note bg-[var(--paper-soft)] p-4 text-sm font-bold text-[var(--ink)]">{message}</div>;
}
