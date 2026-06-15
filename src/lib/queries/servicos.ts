import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ServicoRow = Database["core"]["Tables"]["servico"]["Row"];

export type ServicoStats = {
  ativos: number;
  capacidadeTotal: number;
  planosVinculados: number;
};

export async function getServicos(): Promise<ServicoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("core")
    .from("servico")
    .select("*")
    .order("pilar", { ascending: true })
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return data as ServicoRow[];
}

export async function getServicoStats(servicos: ServicoRow[]): Promise<ServicoStats> {
  const supabase = await createClient();
  const ativos = servicos.filter((s) => s.ativo);

  // Planos que referenciam ao menos um serviço (vendas.plano.servicos jsonb).
  const { data: planos } = await supabase
    .schema("vendas")
    .from("plano")
    .select("servicos")
    .eq("ativo", true);

  const servicoIds = new Set(ativos.map((s) => s.id));
  const planosVinculados = (planos ?? []).filter((p) => {
    const arr = Array.isArray(p.servicos) ? (p.servicos as unknown[]) : [];
    return arr.some((id) => typeof id === "string" && servicoIds.has(id));
  }).length;

  return {
    ativos: ativos.length,
    capacidadeTotal: ativos.reduce((sum, s) => sum + s.capacidade_slot, 0),
    planosVinculados,
  };
}
