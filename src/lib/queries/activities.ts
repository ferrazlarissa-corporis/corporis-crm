import { createClient } from "@/lib/supabase/server";
import type { ActivityType, Json } from "@/types/database";

export type ActivityRow = {
  id: string;
  tipo: ActivityType;
  descricao: string;
  meta: Json;
  created_at: string;
  autor: { id: string; nome: string } | null;
};

export async function getLeadActivities(leadId: string): Promise<ActivityRow[]> {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db
    .from("activities")
    .select("id, tipo, descricao, meta, created_at, profiles:autor_id(id, nome)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => {
    const autor = Array.isArray(r.profiles) ? r.profiles[0] ?? null : (r.profiles ?? null);
    return {
      id: r.id,
      tipo: r.tipo,
      descricao: r.descricao,
      meta: r.meta,
      created_at: r.created_at,
      autor: autor ? { id: autor.id, nome: autor.nome } : null,
    };
  });
}
