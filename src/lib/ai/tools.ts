import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import {
  buildClinicSchedule,
  CLINIC_CONFIG_ID,
  normalizeClinicHours,
  validateAppointmentWithinClinicHours,
} from "@/lib/clinic-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTextMessage } from "@/lib/evolution/client";
import type { AppointmentType, LeadInterest } from "@/types/database";

/** Título da regra de handoff para agendamento — deve coincidir com o salvo no DB. */
export const HANDOFF_RULE_AGENDAMENTO =
  "Quando lead quiser agendar uma avaliação, transferir para humano";

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
        inicio:       { type: "string", description: "Data/hora de início em ISO 8601." },
        fim:          { type: "string", description: "Data/hora de fim em ISO 8601." },
        tipo:         { type: "string", enum: ["avaliacao_pilates", "avaliacao_gestante", "avaliacao_fisio_pelvica"] },
        observacoes:  { type: "string", description: "Contexto obrigatório do agendamento." },
      },
      required: ["inicio", "fim", "tipo", "observacoes"],
    },
  },
  {
    name: "atualizar_interesse",
    description: "Registra o interesse da aluna (pilates, gestante, fisio pélvica) com base na conversa.",
    input_schema: {
      type: "object" as const,
      properties: {
        interesse: { type: "string", enum: ["pilates", "pilates_gestante", "fisio_pelvica", "indefinido"] },
      },
      required: ["interesse"],
    },
  },
  {
    name: "registrar_score",
    description: "Registra a pontuação de qualificação da lead (0-100) com base no perfil e urgência identificados.",
    input_schema: {
      type: "object" as const,
      properties: {
        score:       { type: "number", minimum: 0, maximum: 100 },
        justificativa: { type: "string", description: "Explicação breve do score." },
      },
      required: ["score", "justificativa"],
    },
  },
  {
    name: "solicitar_handoff",
    description: "Solicita que um humano assuma a conversa. Use quando: a aluna pede explicitamente, há dúvida clínica específica, reclamação ou quando o agente não sabe responder.",
    input_schema: {
      type: "object" as const,
      properties: {
        motivo: {
          type: "string",
          enum: ["pedido_humano", "duvida_clinica_especifica", "reclamacao", "agente_nao_sabe", "agendamento_avaliacao"],
        },
      },
      required: ["motivo"],
    },
  },
];

// ─── Tool executors ───────────────────────────────────────────────────────────

export type ToolInput = Record<string, unknown>;

/** IDs do contexto da conversa, injetados pelo servidor (nunca pelo modelo). */
export interface ToolContext {
  leadId: string;
  conversationId: string;
  agentConfig?: {
    mensagem_handoff_agendamento: string | null;
    notificacao_handoff: { ativo: boolean; numero: string } | null;
  };
}

export async function executeTool(
  toolName: string,
  input: ToolInput,
  ctx: ToolContext
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
        const { data: clinicConfig } = await db
          .from("clinic_config")
          .select("funcionamento")
          .eq("id", CLINIC_CONFIG_ID)
          .maybeSingle();
        const clinicHours = normalizeClinicHours(clinicConfig?.funcionamento);
        const clinicSchedule = buildClinicSchedule(clinicHours);
        const hasOpenSlots = clinicSchedule.some((day) => !day.off && day.intervals.length > 0);

        // Fetch existing appointments in the range
        const { data: taken } = await db
          .from("appointments")
          .select("inicio, fim")
          .in("status", ["agendado", "confirmado"])
          .gte("inicio", from.toISOString())
          .lte("inicio", to.toISOString());

        const slots: string[] = [];
        const cur = new Date(from);
        cur.setMinutes(0, 0, 0);
        if (cur < from) cur.setTime(cur.getTime() + 60 * 60 * 1000);

        while (hasOpenSlots && cur <= to && slots.length < 8) {
          const slotEnd = new Date(cur.getTime() + 50 * 60 * 1000);
          const isInsideClinicHours = validateAppointmentWithinClinicHours(clinicHours, cur, slotEnd).ok;
          const conflict = (taken ?? []).some((t) => {
            const ti = new Date(t.inicio);
            const tf = new Date(t.fim);
            return cur < tf && slotEnd > ti;
          });

          if (isInsideClinicHours && !conflict) {
            slots.push(cur.toISOString());
          }

          cur.setTime(cur.getTime() + 60 * 60 * 1000);
        }

        return JSON.stringify({ tipo, horarios_disponiveis: slots });
      }

      case "agendar_avaliacao": {
        const { inicio, fim, tipo, observacoes } = input as {
          inicio: string; fim: string;
          tipo: AppointmentType; observacoes?: string;
        };
        const lead_id = ctx.leadId;
        const notes = observacoes?.trim();

        if (!notes) {
          return JSON.stringify({ success: false, error: "Registre uma observação antes de confirmar o agendamento." });
        }

        const { data: clinicConfig } = await db
          .from("clinic_config")
          .select("funcionamento")
          .eq("id", CLINIC_CONFIG_ID)
          .maybeSingle();
        const clinicHours = normalizeClinicHours(clinicConfig?.funcionamento);
        const scheduleValidation = validateAppointmentWithinClinicHours(
          clinicHours,
          new Date(inicio),
          new Date(fim),
        );

        if (!scheduleValidation.ok) {
          return JSON.stringify({ success: false, error: scheduleValidation.message });
        }

        const { data } = await db.from("appointments").insert({
          lead_id, inicio, fim, tipo, observacoes: notes, status: "agendado",
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
        const { interesse } = input as { interesse: LeadInterest };
        const lead_id = ctx.leadId;
        await db.from("leads").update({ interesse }).eq("id", lead_id);
        return JSON.stringify({ success: true, interesse });
      }

      case "registrar_score": {
        const { score, justificativa } = input as {
          score: number; justificativa: string;
        };
        const lead_id = ctx.leadId;
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
        const { motivo } = input as { motivo: string };
        const conversation_id = ctx.conversationId;

        const { data: lead } = await db
          .from("leads")
          .select("nome, telefone")
          .eq("id", ctx.leadId)
          .single();

        await db.from("conversations").update({ modo: "humano", nao_lida: true }).eq("id", conversation_id);

        await db.from("activities").insert({
          lead_id: ctx.leadId,
          tipo: "handoff",
          descricao: `Handoff solicitado pelo agente IA — motivo: ${motivo}`,
          meta: { motivo, conversation_id },
        });

        const cfg = ctx.agentConfig;

        // Mensagem ao lead quando o handoff é por agendamento
        if (motivo === "agendamento_avaliacao" && cfg?.mensagem_handoff_agendamento && lead?.telefone) {
          try {
            await sendTextMessage({ phone: lead.telefone, text: cfg.mensagem_handoff_agendamento });
            await db.from("messages").insert({
              conversation_id,
              direcao: "saida",
              autor: "ia",
              conteudo: cfg.mensagem_handoff_agendamento,
              tipo: "texto",
            });
          } catch { /* não bloqueia o handoff */ }
        }

        // Notificação no WhatsApp pessoal da equipe (qualquer motivo)
        if (cfg?.notificacao_handoff?.ativo && cfg.notificacao_handoff.numero && lead) {
          try {
            const hora = new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
            });
            const motivoDesc: Record<string, string> = {
              pedido_humano:            "Lead pediu atendimento humano",
              duvida_clinica_especifica: "Dúvida clínica específica",
              reclamacao:               "Reclamação ou insatisfação",
              agente_nao_sabe:          "Agente não soube responder",
              agendamento_avaliacao:    "Lead quer agendar uma avaliação",
            };
            const texto = `*[Corporis CRM] Handoff necessário*\n\nLead: ${lead.nome}\nTelefone: ${lead.telefone}\nMotivo: ${motivoDesc[motivo] ?? motivo}\nHorário: ${hora}\n\nAcesse o inbox para continuar.`;
            await sendTextMessage({ phone: cfg.notificacao_handoff.numero, text: texto });
          } catch { /* não bloqueia o handoff */ }
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
