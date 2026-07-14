"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "sketch-button inline-flex items-center justify-center gap-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-[var(--ink)] text-[var(--paper-soft)] hover:bg-[var(--ink-soft)]",
        secondary: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-warm)]",
        ghost: "border-transparent bg-transparent text-[var(--ink)] shadow-none hover:border-[var(--line)] hover:bg-[var(--paper-warm)]",
        danger: "bg-[var(--ink)] text-[var(--paper-soft)] hover:bg-[var(--ink)]",
        success: "bg-[var(--ink)] text-[var(--paper-soft)] hover:bg-[var(--ink)]",
        burgundy: "bg-[var(--ink)] text-[var(--paper-soft)] hover:bg-[var(--ink)]"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-variant={variant ?? "default"} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
