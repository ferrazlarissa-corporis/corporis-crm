"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/short-code";
import type { IdeiaOrigem, IdeiaStatus } from "@/types/database";

export type ActionResult = { success: true } | { success: false; error: string };

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
    return { success: false as const, error: "Você não tem permissão pra editar métricas." };
  }

  return { success: true as const, supabase, userId: user.id };
}

function revalidate() {
  revalidatePath("/conteudo/metricas");
}

export type PessoaBusca = { id: string; nome: string; telefone: string | null };

export async function buscarPessoas(query: string): Promise<{ success: true; pessoas: PessoaBusca[] } | { success: false; error: string }> {
  const parsed = z.string().trim().min(2).max(80).safeParse(query);
  if (!parsed.success) return { success: true, pessoas: [] };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("core")
    .from("pessoa")
    .select("id, nome, telefone")
    .is("archived_at", null)
    .or(`nome.ilike.%${parsed.data}%,telefone.ilike.%${parsed.data}%`)
    .order("nome")
    .limit(8);

  if (error) return { success: false, error: error.message };
  return { success: true, pessoas: data ?? [] };
}

export async function atribuirLead(input: {
  postId: string;
  pessoaId: string;
  virouAgendamento: boolean;
}): Promise<ActionResult> {
  const parsed = z
    .object({ postId: z.string().uuid(), pessoaId: z.string().uuid(), virouAgendamento: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await auth.supabase.schema("conteudo").from("cta_lead").insert({
      post_id: parsed.data.postId,
      pessoa_id: parsed.data.pessoaId,
      virou_agendamento: parsed.data.virouAgendamento,
      short_code: generateShortCode(),
    });
    if (!error) {
      revalidate();
      return { success: true };
    }
    lastError = error.message;
    if (!error.message.includes("duplicate") && !error.message.includes("unique")) break;
  }
  return { success: false, error: lastError ?? "Falha ao atribuir lead." };
}

export async function removerAtribuicao(ctaLeadId: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(ctaLeadId);
  if (!parsed.success) return { success: false, error: "Registro inválido." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("conteudo").from("cta_lead").delete().eq("id", parsed.data);
  if (error) return { success: false, error: error.message };

  revalidate();
  return { success: true };
}

const metricaSchema = z.object({
  postId: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  alcance: z.coerce.number().int().min(0).nullable().optional(),
  impressoes: z.coerce.number().int().min(0).nullable().optional(),
  curtidas: z.coerce.number().int().min(0).nullable().optional(),
  saves: z.coerce.number().int().min(0).nullable().optional(),
  comentarios: z.coerce.number().int().min(0).nullable().optional(),
  visitas_perfil: z.coerce.number().int().min(0).nullable().optional(),
  cliques_link: z.coerce.number().int().min(0).nullable().optional(),
});

export async function salvarMetricaManual(input: z.infer<typeof metricaSchema>): Promise<ActionResult> {
  const parsed = metricaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { postId, data, ...rest } = parsed.data;
  const { error } = await auth.supabase
    .schema("conteudo")
    .from("metrica")
    .upsert({ post_id: postId, data, ...rest }, { onConflict: "post_id,data" });
  if (error) return { success: false, error: error.message };

  revalidate();
  return { success: true };
}

export async function aprenderComOsMelhores(postIds: string[]): Promise<ActionResult & { criadas?: number }> {
  const parsed = z.array(z.string().uuid()).min(1).max(10).safeParse(postIds);
  if (!parsed.success) return { success: false, error: "Selecione ao menos um post." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: posts, error: postsError } = await auth.supabase
    .schema("conteudo")
    .from("post")
    .select("id, titulo, pilar_id, briefing")
    .in("id", parsed.data);
  if (postsError) return { success: false, error: postsError.message };
  if (!posts || posts.length === 0) return { success: false, error: "Posts não encontrados." };

  const rows = posts.map((p) => ({
    titulo: `${p.titulo} — variação`,
    angulo: `Repetir o que funcionou em "${p.titulo}" (post com bom resultado de leads/agendamento) com um recorte novo.`,
    pilar_id: p.pilar_id,
    origem: "sugestao" satisfies IdeiaOrigem,
    status: "nova" satisfies IdeiaStatus,
    created_by: auth.userId,
  }));

  const { error } = await auth.supabase.schema("conteudo").from("ideia").insert(rows);
  if (error) return { success: false, error: error.message };

  revalidate();
  revalidatePath("/conteudo/ideias");
  return { success: true, criadas: rows.length };
}
