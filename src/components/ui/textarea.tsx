import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-text-primary shadow-[var(--shadow-sm)] placeholder:text-text-secondary transition-colors focus-visible:border-primary",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
