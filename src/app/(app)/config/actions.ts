"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  CLINIC_ASSETS_BUCKET,
  CLINIC_CONFIG_ID,
  CLINIC_LOGO_EXT_BY_MIME,
  CLINIC_LOGO_MAX_BYTES,
} from "@/lib/clinic-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import {
  getConnectionState,
  getInstanceInfo,
  connectInstance,
} from "@/lib/evolution/client";
import { AGENT_MODELS } from "@/lib/ai/model";

// ─── Agent config ──────────────────────────────────────────────────────────────

const draftText = z.preprocess((value) => value ?? "", z.coerce.string());
const bestPracticeDraftSchema = z.object({
  id:     draftText.optional(),
  title:  draftText.optional(),
  detail: draftText.optional(),
});
const faqDraftSchema = z.object({
  q: draftText.optional(),
  a: draftText.optional(),
});
const dialogTurnDraftSchema = z.object({
  autor: draftText.optional(),
  texto: draftText.optional(),
});
const conversationExampleDraftSchema = z.object({
  id:      draftText.optional(),
  titulo:  draftText.optional(),
  dialogo: z.array(dialogTurnDraftSchema).optional().default([]),
});

const agentConfigSchema = z.object({
  ativo:                z.boolean().default(true),
  apenas_desconhecidos: z.boolean().default(true),
  numeros_bypass:       z.array(draftText).optional().default([]),
  persona_prompt:       z.string().min(10),
  boas_praticas:         z.array(bestPracticeDraftSchema).max(12).optional().default([]),
  mensagem_fora_horario: draftText,
  horario_atendimento:  z.record(z.string(), draftText).optional().default({}),
  faq:                  z.array(faqDraftSchema).optional().default([]),
  regras_handoff:       z.array(draftText).optional().default([]),
  exemplos_conversa:    z.array(conversationExampleDraftSchema).optional().default([]),
  model_provider:       z.enum(["anthropic", "openai"]).optional().default("anthropic"),
  model_id:             z.string().refine(
    (id) => Boolean(AGENT_MODELS[id]?.available),
    { message: "Modelo de IA indisponível." },
  ),
  mensagem_handoff_agendamento: z.string().optional(),
  notificacao_handoff: z.object({ ativo: z.boolean(), numero: z.string() }).nullable().optional(),
});

export type AgentConfigInput = z.infer<typeof agentConfigSchema>;
export type ConfigResult = { success: true } | { success: false; error: string };

function formatConfigError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Revise os dados da configuração.";
  const path = issue.path.length > 0 ? issue.path.join(".") : "(raiz)";
  return `agent_config invalid: path=${path}; code=${issue.code}; ${issue.message}`;
}

function normalizeDialogAuthor(author: string | undefined): "lead" | "clara" {
  const normalized = author?.trim().toLowerCase();
  return normalized === "lead" ? "lead" : "clara";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : [];
}

function asStringRecord(value: unknown): Record<string, string> {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record).map(([key, val]) => [key, asString(val)]));
}

function normalizeAgentConfigInput(input: unknown): AgentConfigInput {
  const obj = asRecord(input);
  const rawProvider = asString(obj.model_provider);
  const modelProvider = rawProvider === "openai" ? "openai" : "anthropic";
  const modelId = asString(obj.model_id, "claude-sonnet-4-6");
  const rawNotification = asRecord(obj.notificacao_handoff);
  const hasNotification = obj.notificacao_handoff !== null && obj.notificacao_handoff !== undefined;

  return {
    ativo: asBoolean(obj.ativo, true),
    apenas_desconhecidos: asBoolean(obj.apenas_desconhecidos, true),
    numeros_bypass: asStringArray(obj.numeros_bypass),
    persona_prompt: asString(obj.persona_prompt),
    boas_praticas: Array.isArray(obj.boas_praticas)
      ? obj.boas_praticas.map((item) => {
          const row = asRecord(item);
          return { id: asString(row.id), title: asString(row.title), detail: asString(row.detail) };
        })
      : [],
    mensagem_fora_horario: asString(obj.mensagem_fora_horario),
    horario_atendimento: asStringRecord(obj.horario_atendimento),
    faq: Array.isArray(obj.faq)
      ? obj.faq.map((item) => {
          const row = asRecord(item);
          return { q: asString(row.q), a: asString(row.a) };
        })
      : [],
    regras_handoff: asStringArray(obj.regras_handoff),
    exemplos_conversa: Array.isArray(obj.exemplos_conversa)
      ? obj.exemplos_conversa.map((item) => {
          const row = asRecord(item);
          return {
            id: asString(row.id),
            titulo: asString(row.titulo),
            dialogo: Array.isArray(row.dialogo)
              ? row.dialogo.map((turn) => {
                  const turnRow = asRecord(turn);
                  return { autor: asString(turnRow.autor), texto: asString(turnRow.texto) };
                })
              : [],
          };
        })
      : [],
    model_provider: modelProvider,
    model_id: modelId,
    mensagem_handoff_agendamento: asString(obj.mensagem_handoff_agendamento) || undefined,
    notificacao_handoff: hasNotification && rawNotification.numero
      ? { ativo: asBoolean(rawNotification.ativo, true), numero: asString(rawNotification.numero) }
      : null,
  };
}

async function getActiveStaffClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false as const, error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const { data: profile, error: profileError } = await supabase
    .schema("crm")
    .from("profiles")
    .select("id, ativo, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { success: false as const, error: profileError.message };
  if (!profile?.ativo || !["staff", "recepcao", "profissional", "gestao"].includes(profile.role)) {
    return { success: false as const, error: "Seu usuário não tem permissão para alterar configurações." };
  }

  return { success: true as const, supabase, profile };
}

export async function updateAgentConfig(input: AgentConfigInput): Promise<ConfigResult> {
  const parsed = agentConfigSchema.safeParse(input);
  if (!parsed.success) {
    console.warn(formatConfigError(parsed.error));
  }
  const data = parsed.success ? parsed.data : normalizeAgentConfigInput(input);
  if (data.persona_prompt.trim().length < 10) {
    return { success: false, error: "Prompt da persona precisa ter pelo menos 10 caracteres." };
  }

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const db = createServiceRoleClient().schema("crm");
  const boasPraticas = data.boas_praticas
    .map((item, index) => ({
      id:     item.id?.trim() || `bp-${index + 1}`,
      title:  item.title?.trim() ?? "",
      detail: item.detail?.trim() ?? "",
    }))
    .filter((item) => item.title && item.detail);
  const faq = data.faq
    .map((item) => ({
      q: item.q?.trim() ?? "",
      a: item.a?.trim() ?? "",
    }))
    .filter((item) => item.q && item.a);
  const exemplosConversa = data.exemplos_conversa
    .map((item, index) => ({
      id:      item.id?.trim() || `ex-${index + 1}`,
      titulo:  item.titulo?.trim() || "Exemplo sem título",
      dialogo: item.dialogo
        .map((turn) => ({
          autor: normalizeDialogAuthor(turn.autor),
          texto: turn.texto?.trim() ?? "",
        }))
        .filter((turn) => turn.texto),
    }))
    .filter((item) => item.dialogo.length > 0);

  const { error } = await db.from("agent_config").update({
    ativo:                 data.ativo,
    apenas_desconhecidos:  data.apenas_desconhecidos,
    numeros_bypass:        data.numeros_bypass.map((n) => n.trim()).filter(Boolean),
    persona_prompt:        data.persona_prompt,
    boas_praticas:         boasPraticas,
    mensagem_fora_horario: data.mensagem_fora_horario,
    horario_atendimento:   data.horario_atendimento,
    faq,
    regras_handoff:        data.regras_handoff,
    exemplos_conversa:     exemplosConversa,
    model_provider:        data.model_provider,
    model_id:              data.model_id,
    mensagem_handoff_agendamento: data.mensagem_handoff_agendamento ?? null,
    notificacao_handoff:   data.notificacao_handoff ?? null,
    updated_by:            auth.profile.id,
  }).neq("id", "00000000-0000-0000-0000-000000000000"); // update the singleton

  if (error) return { success: false, error: error.message };

  revalidatePath("/config/agente");
  return { success: true };
}

// ─── Message templates ─────────────────────────────────────────────────────────

const templateSchema = z.object({
  nome:      z.string().min(1),
  categoria: z.enum(["lembrete", "confirmacao", "reativacao", "boas_vindas"]),
  conteudo:  z.string().min(1),
  aprovado_whatsapp:      z.boolean().default(false),
  whatsapp_template_name: z.string().optional(),
});

export async function createTemplate(input: z.infer<typeof templateSchema>): Promise<ConfigResult> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();
  const { error } = await supabase.schema("crm").from("message_templates").insert({
    nome:      parsed.data.nome,
    categoria: parsed.data.categoria,
    conteudo:  parsed.data.conteudo,
    aprovado_whatsapp:      parsed.data.aprovado_whatsapp,
    whatsapp_template_name: parsed.data.whatsapp_template_name ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/config/sistema");
  return { success: true };
}

export async function deleteTemplate(id: string): Promise<ConfigResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const { error } = await supabase.schema("crm").from("message_templates").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/config/sistema");
  return { success: true };
}

// ─── User management ──────────────────────────────────────────────────────────

export async function toggleUserActive(userId: string, ativo: boolean): Promise<ConfigResult> {
  if (!z.string().uuid().safeParse(userId).success) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const { error } = await supabase.schema("crm").from("profiles").update({ ativo }).eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/config/sistema");
  return { success: true };
}

// ─── Clinic config ───────────────────────────────────────────────────────────

const clinicHoursSchema = z.object({
  day: z.string().trim().min(1).max(30),
  h: z.string().trim().min(1).max(40),
  off: z.boolean(),
});

const clinicInfoSchema = z.object({
  razao_social: z.string().trim().min(1).max(160),
  documento: z.string().trim().min(1).max(160),
  nome_comercial: z.string().trim().min(1).max(160),
  endereco: z.string().trim().min(1).max(180),
  endereco_complemento: z.string().trim().min(1).max(220),
  telefone: z.string().trim().min(1).max(60),
  telefone_observacao: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(120),
  funcionamento: z.array(clinicHoursSchema).length(7),
});

export type ClinicInfoInput = z.infer<typeof clinicInfoSchema>;

export async function updateClinicInfo(input: ClinicInfoInput): Promise<ConfigResult> {
  const parsed = clinicInfoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revise os dados da clínica." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("crm").from("clinic_config").upsert({
    id: CLINIC_CONFIG_ID,
    ...parsed.data,
  }, { onConflict: "id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/config/sistema");
  return { success: true };
}

export type ClinicLogoResult =
  | { success: true; logoUrl: string; logoPath: string }
  | { success: false; error: string };

// ─── WhatsApp / Evolution API ─────────────────────────────────────────────────

export type WhatsAppStatus = {
  configured: boolean;
  state: "open" | "close" | "connecting" | "unknown";
  number?: string;
  instance?: string;
};

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const envOk =
    !!process.env.EVOLUTION_API_URL &&
    !!process.env.EVOLUTION_API_KEY &&
    !!process.env.EVOLUTION_INSTANCE;

  if (!envOk) return { configured: false, state: "unknown" };

  const instanceName = process.env.EVOLUTION_INSTANCE!;

  try {
    const [state, info] = await Promise.all([
      getConnectionState(),
      getInstanceInfo().catch(() => null),
    ]);
    return {
      configured: true,
      state,
      number: info?.number,
      instance: instanceName,
    };
  } catch {
    return { configured: true, state: "unknown", instance: instanceName };
  }
}

export type QRResult =
  | { success: true; base64: string }
  | { success: false; error: string };

export async function generateWhatsAppQR(): Promise<QRResult> {
  try {
    const result = await connectInstance();
    if (!result?.base64) return { success: false, error: "QR não disponível — tente novamente." };
    return { success: true, base64: result.base64 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao conectar." };
  }
}

export async function uploadClinicLogo(formData: FormData): Promise<ClinicLogoResult> {
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return { success: false, error: "Arquivo inválido." };
  }

  if (file.size === 0) {
    return { success: false, error: "O arquivo está vazio." };
  }

  if (file.size > CLINIC_LOGO_MAX_BYTES) {
    return { success: false, error: "A logo deve ter até 2 MB." };
  }

  const ext = CLINIC_LOGO_EXT_BY_MIME[file.type];
  if (!ext) {
    return { success: false, error: "Use PNG, JPG, WebP ou SVG." };
  }

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const admin = createServiceRoleClient();
  const logoPath = `logos/logo-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(CLINIC_ASSETS_BUCKET)
    .upload(logoPath, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data } = admin.storage.from(CLINIC_ASSETS_BUCKET).getPublicUrl(logoPath);
  const logoUrl = data.publicUrl;

  const { error: configError } = await admin.schema("crm").from("clinic_config").upsert({
    id: CLINIC_CONFIG_ID,
    logo_url: logoUrl,
    logo_path: logoPath,
    logo_mime_type: file.type,
    logo_updated_at: new Date().toISOString(),
  });

  if (configError) return { success: false, error: configError.message };

  revalidatePath("/config/sistema");
  return { success: true, logoUrl, logoPath };
}
