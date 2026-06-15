import { createClient } from "@/lib/supabase/server";
import type { Database, Pilar } from "@/types/database";
import { PERIODICIDADE_MESES } from "@/lib/vendas-labels";

type PlanoRaw = Database["vendas"]["Tables"]["plano"]["Row"];

export type PlanoRow = Omit<PlanoRaw, "servicos"> & { servicos: string[] };

export type PlanoStats = {
  total: number;
  recorrentesAtivos: number;
  ticketMedio: number;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function getPlanos(): Promise<PlanoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("vendas")
    .from("plano")
    .select("*")
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return (data as PlanoRaw[]).map((p) => ({ ...p, servicos: toStringArray(p.servicos) }));
}

export function getPlanoStats(planos: PlanoRow[]): PlanoStats {
  const ativos = planos.filter((p) => p.ativo);
  const recorrentesAtivos = ativos.filter((p) => p.tipo === "recorrente").length;
  // Ticket médio = média mensal normalizada dos planos ativos.
  const mensais = ativos.map((p) => p.valor / PERIODICIDADE_MESES[p.periodicidade]);
  const ticketMedio = mensais.length ? mensais.reduce((a, b) => a + b, 0) / mensais.length : 0;
  return { total: planos.length, recorrentesAtivos, ticketMedio };
}

export type ServicoOption = { id: string; nome: string; pilar: Pilar };

export async function getServicoOptions(): Promise<ServicoOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("core")
    .from("servico")
    .select("id, nome, pilar")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return data as ServicoOption[];
}
