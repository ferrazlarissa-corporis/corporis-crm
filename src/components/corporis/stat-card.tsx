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
    <Card className="grid min-h-[136px] grid-rows-[auto_1fr] gap-4 p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="crm-label min-w-0 text-[10px] leading-4 tracking-[2px] text-accent">{label}</p>
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft text-accent">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 self-end">
        <p className="font-display text-[30px] leading-none text-text-primary [overflow-wrap:anywhere] [font-feature-settings:'tnum']">{value}</p>
        {hint ? <p className="mt-2 text-xs text-text-secondary">{hint}</p> : null}
      </div>
    </Card>
  );
}
