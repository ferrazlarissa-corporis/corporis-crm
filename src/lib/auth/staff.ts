import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const STAFF_ROLES = ["staff", "recepcao", "profissional", "gestao"] as const;

export type ActiveStaff =
  | { success: true; supabase: SupabaseClient<Database>; profile: { id: string; role: string } }
  | { success: false; error: string };

/** Guard compartilhado: garante usuário autenticado + profile ativo com papel de staff. */
export async function requireActiveStaff(): Promise<ActiveStaff> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const { data: profile, error: profileError } = await supabase
    .schema("crm")
    .from("profiles")
    .select("id, ativo, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { success: false, error: profileError.message };
  if (!profile?.ativo || !STAFF_ROLES.includes(profile.role as (typeof STAFF_ROLES)[number])) {
    return { success: false, error: "Seu usuário não tem permissão para esta ação." };
  }

  return { success: true, supabase, profile: { id: profile.id, role: profile.role } };
}
