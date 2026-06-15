import * as React from "react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
}

/** Cartão de KPI usado no topo das telas de cadastro/gestão. */
export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="crm-label text-[10px] tracking-[2px] text-accent">{label}</p>
        <p className="mt-2 font-display text-[32px] leading-none text-text-primary">{value}</p>
        {hint ? <p className="mt-2 text-xs text-text-secondary">{hint}</p> : null}
      </div>
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft text-accent">
          {icon}
        </span>
      ) : null}
    </Card>
  );
}
