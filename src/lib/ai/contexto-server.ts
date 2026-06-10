import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { DEFAULT_MODEL_ID } from "@/lib/ai/model";
import {
  CONTEXTO_TOOL_NAME,
  CONTEXTO_TOOL_SCHEMA,
  mergeContexto,
  type ContextoAvaliacao,
} from "@/lib/ai/contexto";

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
