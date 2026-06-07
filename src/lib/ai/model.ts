export type AgentProvider = "anthropic" | "openai";

export interface AgentModelMeta {
  provider: AgentProvider;
  label: string;
  /** Modelo disponível para uso real agora (false = exibido na UI como "em breve"). */
  available: boolean;
}

// Fonte da verdade dos modelos do agente. A UI de config consome este mapa.
export const AGENT_MODELS: Record<string, AgentModelMeta> = {
  "claude-haiku-4-5-20251001": { provider: "anthropic", label: "Claude Haiku 4.5",  available: true },
  "claude-sonnet-4-6":         { provider: "anthropic", label: "Claude Sonnet 4.6", available: true },
  "claude-opus-4-8":           { provider: "anthropic", label: "Claude Opus 4.8",   available: true },
  "gpt-5.4-mini":              { provider: "openai",    label: "GPT-5.4 mini",       available: true },
  "gpt-5.4":                   { provider: "openai",    label: "GPT-5.4",            available: true },
  "gpt-5.5":                   { provider: "openai",    label: "GPT-5.5",            available: true },
};

export const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

export interface ResolvedModel {
  provider: AgentProvider;
  modelId: string;
}

/**
 * Resolve o modelo a usar a partir da config. Cai para o default (Sonnet 4.6)
 * quando o modelo é desconhecido ou indisponível.
 * Exige OPENAI_API_KEY configurada para modelos OpenAI — sem ela cai para o default.
 */
export function resolveModel(provider: string, modelId: string): ResolvedModel {
  const meta = AGENT_MODELS[modelId];
  if (!meta || !meta.available) return { provider: "anthropic", modelId: DEFAULT_MODEL_ID };
  if (meta.provider === "openai" && !process.env.OPENAI_API_KEY) {
    return { provider: "anthropic", modelId: DEFAULT_MODEL_ID };
  }
  return { provider: meta.provider, modelId };
}
