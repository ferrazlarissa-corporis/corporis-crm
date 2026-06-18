import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  COR_VAR,
  PILAR_COR_PADRAO,
  PILAR_LABEL,
  type CorToken,
} from "@/lib/cadastros-labels";
import type { Periodicidade, Pilar, PlanoTipo } from "@/types/database";

const COR_TOKENS = new Set<CorToken>(["alaranjado", "tangerina", "bege", "bege_claro", "verde"]);
const PLANO_PILATES_PERIODICIDADE_COR: Partial<Record<Periodicidade, CorToken>> = {
  mensal: "alaranjado",
  trimestral: "tangerina",
  semestral: "bege",
};

type ServicoColorSource = {
  cor_token?: string | null;
  corToken?: string | null;
  pilar?: Pilar | null;
};

type PlanoColorSource = {
  pilar?: Pilar | null;
  periodicidade?: Periodicidade | null;
  tipo?: PlanoTipo | null;
  servicosMeta?: ServicoColorSource[];
};

export function normalizeCorToken(token: string | null | undefined, fallback: CorToken = "bege"): CorToken {
  return token && COR_TOKENS.has(token as CorToken) ? (token as CorToken) : fallback;
}

export function colorTokenForPilar(pilar: Pilar | null | undefined): CorToken {
  return pilar ? PILAR_COR_PADRAO[pilar] : "bege";
}

export function colorVarForToken(token: string | null | undefined, fallback: CorToken = "bege"): string {
  return COR_VAR[normalizeCorToken(token, fallback)];
}

export function colorTokenForServico(servico: ServicoColorSource | null | undefined, fallbackPilar?: Pilar | null): CorToken {
  const pilar = servico?.pilar ?? fallbackPilar ?? null;
  const fallback = colorTokenForPilar(pilar);
  return normalizeCorToken(servico?.cor_token ?? servico?.corToken, fallback);
}

export function colorTokenForPlano(plano: PlanoColorSource): CorToken {
  const isPilates = plano.pilar === "pilates" || Boolean(plano.servicosMeta?.some((s) => s.pilar === "pilates"));
  const periodicidadeToken = plano.periodicidade ? PLANO_PILATES_PERIODICIDADE_COR[plano.periodicidade] : null;
  if (plano.tipo === "fixo" && isPilates && periodicidadeToken) return periodicidadeToken;

  const firstServico = plano.servicosMeta?.[0] ?? null;
  return firstServico ? colorTokenForServico(firstServico, plano.pilar) : colorTokenForPilar(plano.pilar);
}

export function taxonomyBadgeStyle(token: string | null | undefined, fallback?: CorToken): CSSProperties {
  const color = colorVarForToken(token, fallback);
  return {
    backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 48%, transparent)`,
  };
}

export function taxonomyAccentStyle(token: string | null | undefined, fallback?: CorToken): CSSProperties {
  return { backgroundColor: colorVarForToken(token, fallback) };
}

function BadgeShell({
  children,
  token,
  className,
  dot = true,
}: {
  children: ReactNode;
  token: CorToken;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[11px] font-medium leading-5 text-text-primary",
        className,
      )}
      style={taxonomyBadgeStyle(token)}
    >
      {dot ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-[var(--radius-pill)]"
          style={taxonomyAccentStyle(token)}
        />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PilarBadge({
  pilar,
  className,
  fallback = "Sem pilar",
}: {
  pilar: Pilar | null | undefined;
  className?: string;
  fallback?: string;
}) {
  const token = colorTokenForPilar(pilar);
  return (
    <BadgeShell token={token} className={className}>
      {pilar ? PILAR_LABEL[pilar] : fallback}
    </BadgeShell>
  );
}

export function ServicoBadge({
  nome,
  corToken,
  pilar,
  className,
}: {
  nome: string;
  corToken?: string | null;
  pilar?: Pilar | null;
  className?: string;
}) {
  const token = colorTokenForServico({ corToken, pilar });
  return (
    <BadgeShell token={token} className={className}>
      {nome}
    </BadgeShell>
  );
}
