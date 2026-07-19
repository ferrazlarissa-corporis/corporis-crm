"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { StatusSlot } from "@/types/database";

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
    return { success: false as const, error: "Você não tem permissão para editar o calendário." };
  }

  return { success: true as const, supabase };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function createSlot(input: { data: string; pilar_sugerido?: string | null }): Promise<ConfigResult & { id?: string }> {
  const parsed = z.object({ data: isoDate, pilar_sugerido: z.string().uuid().nullable().optional() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Data inválida." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("conteudo")
    .from("slot_calendario")
    .insert({ data: parsed.data.data, pilar_sugerido: parsed.data.pilar_sugerido ?? null, status: "vazio" })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/calendario");
  return { success: true, id: data.id };
}

export async function rescheduleSlot(input: { id: string; data: string }): Promise<ConfigResult> {
  const parsed = z.object({ id: z.string().uuid(), data: isoDate }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Data inválida." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("slot_calendario")
    .update({ data: parsed.data.data })
    .eq("id", parsed.data.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/calendario");
  return { success: true };
}

const statusValues = ["vazio", "rascunho", "agendado", "aprovado", "publicado"] as const;

export async function updateSlot(input: {
  id: string;
  pilar_sugerido?: string | null;
  status?: StatusSlot;
}): Promise<ConfigResult> {
  const parsed = z
    .object({ id: z.string().uuid(), pilar_sugerido: z.string().uuid().nullable().optional(), status: z.enum(statusValues).optional() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { id, ...rest } = parsed.data;
  const { error } = await auth.supabase.schema("conteudo").from("slot_calendario").update(rest).eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/calendario");
  return { success: true };
}

export async function deleteSlot(id: string): Promise<ConfigResult> {
  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("conteudo").from("slot_calendario").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/conteudo/calendario");
  return { success: true };
}
