import { createClient } from "@/lib/supabase/server";
import type { Database, Pilar } from "@/types/database";
import { PERIODICIDADE_MESES } from "@/lib/vendas-labels";

type PlanoRaw = Database["vendas"]["Tables"]["plano"]["Row"];

export type ServicoOption = { id: string; nome: string; pilar: Pilar; cor_token: string };

export type PlanoRow = Omit<PlanoRaw, "servicos"> & { servicos: string[]; servicosMeta: ServicoOption[] };

export type PlanoStats = {
  total: number;
  fixosAtivos: number;
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
  const planos = (data as PlanoRaw[]).map((p) => ({ ...p, servicos: toStringArray(p.servicos) }));
  const servicoIds = [...new Set(planos.flatMap((p) => p.servicos))];
  const servicosById = new Map<string, ServicoOption>();

  if (servicoIds.length) {
    const { data: servicos } = await supabase
      .schema("core")
      .from("servico")
      .select("id, nome, pilar, cor_token")
      .in("id", servicoIds);

    for (const servico of (servicos ?? []) as ServicoOption[]) {
      servicosById.set(servico.id, servico);
    }
  }

  return planos.map((p) => ({
    ...p,
    servicosMeta: p.servicos.map((id) => servicosById.get(id)).filter((s): s is ServicoOption => Boolean(s)),
  }));
}

export function getPlanoStats(planos: PlanoRow[]): PlanoStats {
  const ativos = planos.filter((p) => p.ativo);
  const fixosAtivos = ativos.filter((p) => p.tipo === "fixo").length;
  // Ticket médio = média mensal normalizada dos planos ativos.
  const mensais = ativos.map((p) => p.valor / PERIODICIDADE_MESES[p.periodicidade]);
  const ticketMedio = mensais.length ? mensais.reduce((a, b) => a + b, 0) / mensais.length : 0;
  return { total: planos.length, fixosAtivos, ticketMedio };
}

export async function getServicoOptions(): Promise<ServicoOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("core")
    .from("servico")
    .select("id, nome, pilar, cor_token")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return data as ServicoOption[];
}
