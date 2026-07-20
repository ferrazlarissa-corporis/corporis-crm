"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MARCA_CONFIG_ID } from "./constants";

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
    return { success: false as const, error: "Você não tem permissão para editar essas configurações." };
  }

  return { success: true as const, supabase };
}

const pilarCreateSchema = z.object({
  nome: z.string().trim().min(1).max(80),
});

export async function createPilar(
  input: z.infer<typeof pilarCreateSchema>,
): Promise<ConfigResult & { id?: string }> {
  const parsed = pilarCreateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dê um nome ao pilar." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("conteudo")
    .from("pilar_editorial")
    .insert({ nome: parsed.data.nome, cor_token: "pillar-indefinido" })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/configuracoes");
  return { success: true, id: data.id };
}

const pilarUpdateSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(1).max(80),
  descricao: z.string().trim().max(280),
  publico_alvo: z.string().trim().max(280),
  ativo: z.boolean(),
});

export type PilarUpdateInput = z.infer<typeof pilarUpdateSchema>;

export async function updatePilar(input: PilarUpdateInput): Promise<ConfigResult> {
  const parsed = pilarUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revise os dados do pilar." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { id, ...rest } = parsed.data;
  const { error } = await auth.supabase
    .schema("conteudo")
    .from("pilar_editorial")
    .update(rest)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/configuracoes");
  return { success: true };
}

const tomVozSchema = z.object({
  tom_voz: z.string().trim().max(2000),
});

export async function updateTomVoz(input: z.infer<typeof tomVozSchema>): Promise<ConfigResult> {
  const parsed = tomVozSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revise o tom de voz." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("marca_config")
    .upsert({ id: MARCA_CONFIG_ID, tom_voz: parsed.data.tom_voz }, { onConflict: "id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/configuracoes");
  return { success: true };
}
