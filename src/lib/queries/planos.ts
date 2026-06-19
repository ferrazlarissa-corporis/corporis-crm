import { createClient } from "@/lib/supabase/server";
import type { Database, Pilar } from "@/types/database";
import { PERIODICIDADE_MESES } from "@/lib/vendas-labels";

type PlanoRaw = Database["vendas"]["Tables"]["plano"]["Row"];
type PlanoPrecoRaw = Database["vendas"]["Tables"]["plano_preco"]["Row"];

export type ServicoOption = { id: string; nome: string; pilar: Pilar; cor_token: string };
export type PlanoPrecoRow = Pick<PlanoPrecoRaw, "id" | "plano_id" | "sessoes_semana" | "valor_total" | "ativo">;

export type PlanoRow = Omit<PlanoRaw, "servicos"> & {
  servicos: string[];
  servicosMeta: ServicoOption[];
  precos: PlanoPrecoRow[];
};

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
  const planoIds = planos.map((p) => p.id);
  const servicoIds = [...new Set(planos.flatMap((p) => p.servicos))];
  const servicosById = new Map<string, ServicoOption>();
  const precosByPlano = new Map<string, PlanoPrecoRow[]>();

  if (planoIds.length) {
    const { data: precos } = await supabase
      .schema("vendas")
      .from("plano_preco")
      .select("id, plano_id, sessoes_semana, valor_total, ativo")
      .in("plano_id", planoIds)
      .order("sessoes_semana", { ascending: true });

    for (const preco of (precos ?? []) as PlanoPrecoRow[]) {
      const current = precosByPlano.get(preco.plano_id) ?? [];
      current.push(preco);
      precosByPlano.set(preco.plano_id, current);
    }
  }

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
    precos: precosByPlano.get(p.id) ?? [],
    servicosMeta: p.servicos.map((id) => servicosById.get(id)).filter((s): s is ServicoOption => Boolean(s)),
  }));
}

export function getPlanoStats(planos: PlanoRow[]): PlanoStats {
  const ativos = planos.filter((p) => p.ativo);
  const fixosAtivos = ativos.filter((p) => p.tipo === "fixo").length;
  // Ticket médio = média mensal normalizada das opções ativas de preço.
  const mensais = ativos.flatMap((p) => {
    const meses = PERIODICIDADE_MESES[p.periodicidade];
    if (p.tipo === "fixo" && p.precos.length > 0) {
      return p.precos.filter((preco) => preco.ativo).map((preco) => preco.valor_total / meses);
    }
    return [p.valor / meses];
  });
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
