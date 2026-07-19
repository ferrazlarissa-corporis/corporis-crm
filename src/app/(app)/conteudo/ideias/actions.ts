"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_MODEL_ID } from "@/lib/ai/model";
import type { IdeiaOrigem, IdeiaStatus } from "@/types/database";

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
    return { success: false as const, error: "Você não tem permissão para editar o banco de ideias." };
  }

  return { success: true as const, supabase, userId: user.id };
}

const createIdeiaSchema = z.object({
  titulo: z.string().trim().min(1).max(160),
  angulo: z.string().trim().max(280).optional(),
  pilar_id: z.string().uuid().nullable().optional(),
  publico_alvo: z.string().trim().max(120).optional(),
  notas: z.string().trim().max(2000).optional(),
});

export async function createIdeia(input: z.infer<typeof createIdeiaSchema>): Promise<ConfigResult> {
  const parsed = createIdeiaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revise os dados da ideia." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("conteudo").from("ideia").insert({
    ...parsed.data,
    origem: "manual" satisfies IdeiaOrigem,
    created_by: auth.userId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/ideias");
  return { success: true };
}

const createFromLinkSchema = z.object({
  url: z.string().trim().min(1).max(2000),
});

export async function createIdeiaFromLink(input: z.infer<typeof createFromLinkSchema>): Promise<ConfigResult> {
  const parsed = createFromLinkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Cole um link ou texto de referência." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const raw = parsed.data.url;
  const titulo = raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;

  const { error } = await auth.supabase.schema("conteudo").from("ideia").insert({
    titulo,
    notas: raw,
    origem: "import" satisfies IdeiaOrigem,
    created_by: auth.userId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/ideias");
  return { success: true };
}

const statusValues = ["nova", "selecionada", "virou_post", "descartada"] as const;
const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(statusValues),
});

export async function updateIdeiaStatus(input: z.infer<typeof updateStatusSchema>): Promise<ConfigResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Status inválido." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("ideia")
    .update({ status: parsed.data.status satisfies IdeiaStatus })
    .eq("id", parsed.data.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/ideias");
  return { success: true };
}

export async function transformarEmPost(ideiaId: string): Promise<ConfigResult> {
  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: ideia, error: ideiaError } = await auth.supabase
    .schema("conteudo")
    .from("ideia")
    .select("id, titulo, pilar_id")
    .eq("id", ideiaId)
    .maybeSingle();

  if (ideiaError) return { success: false, error: ideiaError.message };
  if (!ideia) return { success: false, error: "Ideia não encontrada." };

  const { error: postError } = await auth.supabase.schema("conteudo").from("post").insert({
    titulo: ideia.titulo,
    formato: "carrossel",
    pilar_id: ideia.pilar_id,
    ideia_id: ideia.id,
    status: "rascunho",
  });

  if (postError) return { success: false, error: postError.message };

  const { error: statusError } = await auth.supabase
    .schema("conteudo")
    .from("ideia")
    .update({ status: "virou_post" satisfies IdeiaStatus })
    .eq("id", ideiaId);

  if (statusError) return { success: false, error: statusError.message };

  revalidatePath("/conteudo/ideias");
  return { success: true };
}

const suggestionSchema = z.object({
  titulo: z.string(),
  angulo: z.string(),
  publico_alvo: z.string(),
  pilar_nome: z.string(),
});

export async function generateIdeiaSuggestions(): Promise<ConfigResult> {
  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY não configurada." };
  }

  const [{ data: pilares }, { data: marca }] = await Promise.all([
    auth.supabase.schema("conteudo").from("pilar_editorial").select("id, nome, descricao").eq("ativo", true),
    auth.supabase.schema("conteudo").from("marca_config").select("tom_voz").maybeSingle(),
  ]);

  if (!pilares || pilares.length === 0) {
    return { success: false, error: "Nenhum pilar ativo — ative pilares em Configurações antes de gerar sugestões." };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const pillarList = pilares.map((p) => `- ${p.nome}${p.descricao ? `: ${p.descricao}` : ""}`).join("\n");

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL_ID,
    max_tokens: 1500,
    system: `Você ajuda a Corporis Fisioterapia e Pilates (Xanxerê/SC) a planejar pautas de conteúdo para Instagram.
Tom de voz da marca: ${marca?.tom_voz || "Cuidadosa, técnica e acolhedora."}
Regras inquebráveis: nunca prometa cura ou resultado, nunca use sensacionalismo, nunca use "antes e depois" apelativo, nunca compare com outros profissionais, fala "aluna" nunca "paciente". Fisioterapia pélvica sempre com discrição.
Responda SOMENTE com um array JSON válido, sem texto antes ou depois, com um objeto por pilar recebido: {"titulo": string, "angulo": string, "publico_alvo": string, "pilar_nome": string}. "titulo" é o gancho do post (curto, direto). "angulo" é uma frase explicando o recorte específico da pauta. "publico_alvo" é curto (ex.: "Gestantes", "Pós-parto").`,
    messages: [
      {
        role: "user",
        content: `Gere uma sugestão de pauta para cada um destes pilares editoriais ativos:\n${pillarList}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.Messages.TextBlock).text)
    .join("");

  let raw: unknown;
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    raw = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return { success: false, error: "A IA retornou um formato inesperado. Tente novamente." };
  }

  const parsed = z.array(suggestionSchema).safeParse(raw);
  if (!parsed.success) return { success: false, error: "A IA retornou um formato inesperado. Tente novamente." };

  const pilarByName = new Map(pilares.map((p) => [p.nome, p.id]));

  const rows = parsed.data.map((s) => ({
    titulo: s.titulo,
    angulo: s.angulo,
    publico_alvo: s.publico_alvo,
    pilar_id: pilarByName.get(s.pilar_nome) ?? null,
    origem: "sugestao" satisfies IdeiaOrigem,
    status: "nova" satisfies IdeiaStatus,
    created_by: auth.userId,
  }));

  const { error } = await auth.supabase.schema("conteudo").from("ideia").insert(rows);
  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/ideias");
  return { success: true };
}
