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
  // OpenAI: exibido na UI, runtime ainda não conectado (PR futuro).
  "gpt-4o":                    { provider: "openai",    label: "GPT-4o (OpenAI)",   available: false },
};

export const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

export interface ResolvedModel {
  provider: AgentProvider;
  modelId: string;
}

/**
 * Resolve o modelo a usar a partir da config. Cai para o default (Sonnet 4.6)
 * quando o modelo é desconhecido, indisponível, ou de um provedor ainda não
 * conectado no runtime (ex.: OpenAI).
 */
export function resolveModel(provider: string, modelId: string): ResolvedModel {
  const meta = AGENT_MODELS[modelId];
  if (meta && meta.available && meta.provider === provider && meta.provider === "anthropic") {
    return { provider: meta.provider, modelId };
  }
  return { provider: "anthropic", modelId: DEFAULT_MODEL_ID };
}
