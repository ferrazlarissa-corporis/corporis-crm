"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Modal leve, controlado. Fecha em ESC, clique no backdrop e botão X. */
export function Dialog({ open, onClose, eyebrow, title, children, footer, className }: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-[var(--color-espresso)]/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-lg)]",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="crm-label text-[10px] tracking-[2.2px] text-accent">{eyebrow}</p>
            ) : null}
            <h2 className="mt-1 font-display text-2xl leading-none text-text-primary">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-[var(--radius-md)] p-1.5 text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto crm-scrollbar px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
