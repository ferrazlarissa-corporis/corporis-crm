import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { DEFAULT_MODEL_ID } from "@/lib/ai/model";

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

// ─── Geração sob demanda (síntese da conversa) ──────────────────────────────────

const GEN_SYSTEM_PROMPT = `Você é a assistente de preparação de avaliações da Corporis, uma clínica boutique de fisioterapia e pilates.
A partir da conversa de WhatsApp entre a aluna e a recepção/IA, produza um resumo objetivo para a fisioterapeuta usar na avaliação inicial.

Regras:
- Use sempre a tool ${CONTEXTO_TOOL_NAME} para entregar o resultado.
- Linguagem da marca: "aluna" e "incômodo" — NUNCA "paciente" ou "patologia".
- NÃO faça diagnóstico, não sugira tratamento, não prometa cura ou prazo de resultado.
- Seja específico e conciso. Só registre o que aparece ou é razoavelmente inferível da conversa.
- Se um campo não tiver informação na conversa, deixe-o de fora (não invente).
- Português brasileiro.`;

/** Sintetiza o contexto completo a partir das mensagens da conversa (Anthropic Sonnet). */
export async function gerarContextoFromMessages(
  messages: { direcao: string; conteudo: string }[],
): Promise<ContextoAvaliacao> {
  const transcript = messages
    .map((m) => `${m.direcao === "entrada" ? "Aluna" : "Clara"}: ${m.conteudo}`)
    .join("\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const tool: Tool = {
    name: CONTEXTO_TOOL_NAME,
    description: "Registra o resumo de contexto da aluna para a avaliação.",
    input_schema: CONTEXTO_TOOL_SCHEMA,
  };

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL_ID,
    max_tokens: 1024,
    system: GEN_SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: "tool", name: CONTEXTO_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Conversa completa:\n\n${transcript}\n\nGere o resumo de contexto para a avaliação.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  const partial = (toolUse && toolUse.type === "tool_use"
    ? (toolUse.input as Partial<ContextoAvaliacao>)
    : {}) ?? {};

  return mergeContexto(null, partial, "resumo_ia");
}
