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

const agentConfigSchema = z.object({
  ativo:                z.boolean(),
  apenas_desconhecidos: z.boolean(),
  numeros_bypass:       z.array(z.string()),
  persona_prompt:       z.string().min(10),
  mensagem_fora_horario: z.string(),
  horario_atendimento:  z.record(z.string(), z.string()),
  faq:                  z.array(z.object({ q: z.string(), a: z.string() })),
  regras_handoff:       z.array(z.string()),
  exemplos_conversa:    z.array(z.object({
    id:      z.string(),
    titulo:  z.string(),
    dialogo: z.array(z.object({
      autor: z.enum(["lead", "clara"]),
      texto: z.string(),
    })),
  })),
  model_provider:       z.enum(["anthropic", "openai"]),
  model_id:             z.string().refine(
    (id) => Boolean(AGENT_MODELS[id]?.available),
    { message: "Modelo de IA indisponível." },
  ),
});

export type AgentConfigInput = z.infer<typeof agentConfigSchema>;
export type ConfigResult = { success: true } | { success: false; error: string };

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

  return { success: true as const, supabase };
}

export async function updateAgentConfig(input: AgentConfigInput): Promise<ConfigResult> {
  const parsed = agentConfigSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { error } = await db.from("agent_config").update({
    ativo:                 parsed.data.ativo,
    apenas_desconhecidos:  parsed.data.apenas_desconhecidos,
    numeros_bypass:        parsed.data.numeros_bypass,
    persona_prompt:        parsed.data.persona_prompt,
    mensagem_fora_horario: parsed.data.mensagem_fora_horario,
    horario_atendimento:   parsed.data.horario_atendimento,
    faq:                   parsed.data.faq,
    regras_handoff:        parsed.data.regras_handoff,
    exemplos_conversa:     parsed.data.exemplos_conversa,
    model_provider:        parsed.data.model_provider,
    model_id:              parsed.data.model_id,
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
