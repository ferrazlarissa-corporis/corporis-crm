// Módulo client-safe: tipos, schema e helpers puros (sem Anthropic SDK).
// A geração via LLM vive em ./contexto-server.ts (server-only).

// ─── Tipo do contexto de avaliação ─────────────────────────────────────────────

export type ContextoFonte = "agente" | "resumo_ia";

export type ContextoCampo =
  | "queixa_principal"
  | "objetivo"
  | "historico_relevante"
  | "pontos_atencao"
  | "disponibilidade"
  | "gancho_conversao";

export type ContextoAvaliacao = {
  [K in ContextoCampo]?: string | null;
} & {
  atualizado_em?: string | null;
  fonte?: ContextoFonte | null;
};

/** Campos exibidos no card, em ordem, com rótulo pt-BR. */
export const CONTEXTO_FIELDS: { key: ContextoCampo; label: string }[] = [
  { key: "queixa_principal",    label: "Queixa principal" },
  { key: "objetivo",            label: "Objetivo" },
  { key: "historico_relevante", label: "Histórico relevante" },
  { key: "pontos_atencao",      label: "Pontos de atenção" },
  { key: "disponibilidade",     label: "Disponibilidade" },
  { key: "gancho_conversao",    label: "Gancho de conversão" },
];

/** Schema de input — compartilhado pela tool do agente e pela geração manual. */
export const CONTEXTO_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    queixa_principal:    { type: "string", description: "Principal dor/incômodo que a aluna relatou, em uma ou duas frases." },
    objetivo:            { type: "string", description: "O que a aluna quer alcançar (aliviar dor, voltar a se exercitar, preparar gestação, etc)." },
    historico_relevante: { type: "string", description: "Contexto útil: há quanto tempo sente o incômodo, atividades já praticadas, gestação, eventos relevantes mencionados. Sem virar prontuário clínico." },
    pontos_atencao:      { type: "string", description: "Limitações, dores agudas, contraindicações ou tom emocional sensível que a fisioterapeuta deve saber antes da avaliação." },
    disponibilidade:     { type: "string", description: "Disponibilidade de agenda e preferências de horário mencionadas." },
    gancho_conversao:    { type: "string", description: "Motivação/urgência da aluna e ganchos para gerar valor e converter na avaliação." },
  },
};

export const CONTEXTO_TOOL_NAME = "registrar_contexto_avaliacao";

const CONTEXTO_KEYS: ContextoCampo[] = CONTEXTO_FIELDS.map((f) => f.key);

/** Há pelo menos um campo de conteúdo preenchido? */
export function hasContexto(c: ContextoAvaliacao | null | undefined): boolean {
  if (!c) return false;
  return CONTEXTO_KEYS.some((k) => {
    const v = c[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/**
 * Merge read-modify-write: mantém o existente, sobrescreve só campos não-vazios
 * fornecidos, e atualiza `atualizado_em`/`fonte`. Usado na captura ao vivo.
 */
export function mergeContexto(
  existing: ContextoAvaliacao | null | undefined,
  partial: Partial<ContextoAvaliacao>,
  fonte: ContextoFonte,
): ContextoAvaliacao {
  const out: ContextoAvaliacao = { ...(existing ?? {}) };
  for (const key of CONTEXTO_KEYS) {
    const v = partial[key];
    if (typeof v === "string" && v.trim().length > 0) {
      out[key] = v.trim();
    }
  }
  out.atualizado_em = new Date().toISOString();
  out.fonte = fonte;
  return out;
}

/** Normaliza um valor jsonb cru do banco para ContextoAvaliacao (ou null). */
export function parseContexto(raw: unknown): ContextoAvaliacao | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: ContextoAvaliacao = {};
  for (const key of CONTEXTO_KEYS) {
    const v = r[key];
    if (typeof v === "string") out[key] = v;
  }
  if (typeof r.atualizado_em === "string") out.atualizado_em = r.atualizado_em;
  if (r.fonte === "agente" || r.fonte === "resumo_ia") out.fonte = r.fonte;
  return hasContexto(out) || out.atualizado_em ? out : null;
}
