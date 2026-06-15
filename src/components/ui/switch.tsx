"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, id, disabled, ...rest }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-[var(--radius-pill)] transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 rounded-[var(--radius-pill)] bg-card shadow-[var(--shadow-sm)] transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-1",
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}
