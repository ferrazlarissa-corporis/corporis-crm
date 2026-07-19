"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { IdeiaOrigem, ReferenciaOrigem, TipoFonteReferencia } from "@/types/database";

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
    return { success: false as const, error: "Você não tem permissão para editar referências." };
  }

  return { success: true as const, supabase, userId: user.id };
}

const tipoFonteValues = ["instagram", "reels", "tiktok", "artigo", "pinterest", "perfil"] as const;

const createReferenciaSchema = z.object({
  titulo: z.string().trim().min(1).max(160),
  fonte: z.string().trim().min(1).max(200),
  tipo_fonte: z.enum(tipoFonteValues),
  pilar_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10),
  por_que_funciona: z.string().trim().max(600),
});

export async function createReferencia(input: z.infer<typeof createReferenciaSchema>): Promise<ConfigResult> {
  const parsed = createReferenciaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revise os dados da referência." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { titulo, fonte, tipo_fonte, pilar_id, tags, por_que_funciona } = parsed.data;

  const { error } = await auth.supabase.schema("conteudo").from("referencia").insert({
    titulo,
    url: fonte,
    fonte,
    tipo_fonte: tipo_fonte satisfies TipoFonteReferencia,
    pilar_id,
    tags,
    por_que_funciona,
    origem: "manual" satisfies ReferenciaOrigem,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/referencias");
  return { success: true };
}

export async function deleteReferencia(id: string): Promise<ConfigResult> {
  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("conteudo").from("referencia").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/referencias");
  return { success: true };
}

export async function virarIdeia(referenciaId: string): Promise<ConfigResult> {
  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: referencia, error: refError } = await auth.supabase
    .schema("conteudo")
    .from("referencia")
    .select("id, titulo, pilar_id, por_que_funciona")
    .eq("id", referenciaId)
    .maybeSingle();

  if (refError) return { success: false, error: refError.message };
  if (!referencia) return { success: false, error: "Referência não encontrada." };

  const { error: ideiaError } = await auth.supabase.schema("conteudo").from("ideia").insert({
    titulo: referencia.titulo,
    angulo: referencia.por_que_funciona,
    pilar_id: referencia.pilar_id,
    origem: "import" satisfies IdeiaOrigem,
    status: "nova",
    created_by: auth.userId,
  });

  if (ideiaError) return { success: false, error: ideiaError.message };

  revalidatePath("/conteudo/referencias");
  revalidatePath("/conteudo/ideias");
  return { success: true };
}
