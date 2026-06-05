import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { AppointmentType, LeadInterest } from "@/types/database";

// ─── Tool definitions for Claude ─────────────────────────────────────────────

export const AGENT_TOOLS: Tool[] = [
  {
    name: "consultar_horarios_disponiveis",
    description: "Consulta os horários disponíveis na agenda para avaliação inicial. Retorna slots livres nos próximos dias.",
    input_schema: {
      type: "object" as const,
      properties: {
        tipo: {
          type: "string",
          enum: ["avaliacao_pilates", "avaliacao_gestante", "avaliacao_fisio_pelvica"],
          description: "Tipo de avaliação de acordo com o interesse da aluna.",
        },
        dias: {
          type: "number",
          description: "Número de dias a frente para consultar (padrão: 7).",
        },
      },
      required: ["tipo"],
    },
  },
  {
    name: "agendar_avaliacao",
    description: "Agenda uma avaliação inicial para a aluna no horário escolhido.",
    input_schema: {
      type: "object" as const,
      properties: {
        lead_id:      { type: "string", description: "ID da lead." },
        inicio:       { type: "string", description: "Data/hora de início em ISO 8601." },
        fim:          { type: "string", description: "Data/hora de fim em ISO 8601." },
        tipo:         { type: "string", enum: ["avaliacao_pilates", "avaliacao_gestante", "avaliacao_fisio_pelvica"] },
        observacoes:  { type: "string", description: "Observações opcionais do agendamento." },
      },
      required: ["lead_id", "inicio", "fim", "tipo"],
    },
  },
  {
    name: "atualizar_interesse",
    description: "Registra o interesse da aluna (pilates, gestante, fisio pélvica) com base na conversa.",
    input_schema: {
      type: "object" as const,
      properties: {
        lead_id:   { type: "string" },
        interesse: { type: "string", enum: ["pilates", "pilates_gestante", "fisio_pelvica", "indefinido"] },
      },
      required: ["lead_id", "interesse"],
    },
  },
  {
    name: "registrar_score",
    description: "Registra a pontuação de qualificação da lead (0-100) com base no perfil e urgência identificados.",
    input_schema: {
      type: "object" as const,
      properties: {
        lead_id:     { type: "string" },
        score:       { type: "number", minimum: 0, maximum: 100 },
        justificativa: { type: "string", description: "Explicação breve do score." },
      },
      required: ["lead_id", "score", "justificativa"],
    },
  },
  {
    name: "solicitar_handoff",
    description: "Solicita que um humano assuma a conversa. Use quando: a aluna pede explicitamente, há dúvida clínica específica, reclamação ou quando o agente não sabe responder.",
    input_schema: {
      type: "object" as const,
      properties: {
        conversation_id: { type: "string" },
        motivo: {
          type: "string",
          enum: ["pedido_humano", "duvida_clinica_especifica", "reclamacao", "agente_nao_sabe"],
        },
      },
      required: ["conversation_id", "motivo"],
    },
  },
];

// ─── Tool executors ───────────────────────────────────────────────────────────

export type ToolInput = Record<string, unknown>;

export async function executeTool(
  toolName: string,
  input: ToolInput
): Promise<string> {
  const supabase = createServiceRoleClient();
  const db = supabase.schema("crm");

  try {
    switch (toolName) {
      case "consultar_horarios_disponiveis": {
        const tipo = input.tipo as AppointmentType;
        const dias = Number(input.dias ?? 7);
        const from = new Date();
        const to   = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

        // Fetch existing appointments in the range
        const { data: taken } = await db
          .from("appointments")
          .select("inicio, fim")
          .in("status", ["agendado", "confirmado"])
          .gte("inicio", from.toISOString())
          .lte("inicio", to.toISOString());

        // Generate available slots (08:00-18:00, weekdays, every 60 min)
        const slots: string[] = [];
        const cur = new Date(from);
        cur.setHours(8, 0, 0, 0);

        while (cur <= to && slots.length < 8) {
          const dayOfWeek = cur.getDay();
          if (dayOfWeek !== 0) { // not Sunday
            const slotEnd = new Date(cur.getTime() + 50 * 60 * 1000);
            const conflict = (taken ?? []).some((t) => {
              const ti = new Date(t.inicio);
              const tf = new Date(t.fim);
              return cur < tf && slotEnd > ti;
            });
            if (!conflict && cur.getHours() < 19) {
              slots.push(cur.toISOString());
            }
          }
          cur.setTime(cur.getTime() + 60 * 60 * 1000);
          if (cur.getHours() >= 19) {
            cur.setDate(cur.getDate() + 1);
            cur.setHours(8, 0, 0, 0);
          }
        }

        return JSON.stringify({ tipo, horarios_disponiveis: slots });
      }

      case "agendar_avaliacao": {
        const { lead_id, inicio, fim, tipo, observacoes } = input as {
          lead_id: string; inicio: string; fim: string;
          tipo: AppointmentType; observacoes?: string;
        };

        const { data } = await db.from("appointments").insert({
          lead_id, inicio, fim, tipo, observacoes: observacoes ?? null, status: "agendado",
        }).select("id").single();

        await db.from("leads").update({
          estagio: "avaliacao_agendada",
          ultima_interacao_at: new Date().toISOString(),
        }).eq("id", lead_id);

        await db.from("activities").insert({
          lead_id,
          tipo: "agendamento",
          descricao: `Avaliação agendada pelo agente IA para ${new Date(inicio).toLocaleDateString("pt-BR")}`,
          meta: { appointment_id: data?.id, tipo, inicio },
        });

        return JSON.stringify({ success: true, appointment_id: data?.id });
      }

      case "atualizar_interesse": {
        const { lead_id, interesse } = input as { lead_id: string; interesse: LeadInterest };
        await db.from("leads").update({ interesse }).eq("id", lead_id);
        return JSON.stringify({ success: true, interesse });
      }

      case "registrar_score": {
        const { lead_id, score, justificativa } = input as {
          lead_id: string; score: number; justificativa: string;
        };
        await db.from("leads").update({ score_qualificacao: score }).eq("id", lead_id);
        await db.from("activities").insert({
          lead_id,
          tipo: "sistema",
          descricao: `Score de qualificação atualizado para ${score}/100`,
          meta: { score, justificativa },
        });
        return JSON.stringify({ success: true, score });
      }

      case "solicitar_handoff": {
        const { conversation_id, motivo } = input as { conversation_id: string; motivo: string };
        await db.from("conversations").update({ modo: "humano", nao_lida: true }).eq("id", conversation_id);

        const { data: conv } = await db.from("conversations").select("lead_id").eq("id", conversation_id).single();
        if (conv) {
          await db.from("activities").insert({
            lead_id: conv.lead_id,
            tipo: "handoff",
            descricao: `Handoff solicitado pelo agente IA — motivo: ${motivo}`,
            meta: { motivo, conversation_id },
          });
        }
        return JSON.stringify({ success: true, modo: "humano" });
      }

      default:
        return JSON.stringify({ error: "unknown_tool" });
    }
  } catch (err) {
    console.error(`[tool:${toolName}]`, err);
    return JSON.stringify({ error: String(err) });
  }
}
