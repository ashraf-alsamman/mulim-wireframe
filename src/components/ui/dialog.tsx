"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.34)] backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          className={cn(
            "sketch-dialog fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 overflow-auto focus:outline-none",
            className
          )}
        >
          <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--muted-line)] p-5">
            <DialogPrimitive.Title className="text-base font-bold text-[var(--ink)]">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="p-5">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t-2 border-dashed border-[var(--muted-line)] p-4">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
