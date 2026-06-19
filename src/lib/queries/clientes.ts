import { createClient } from "@/lib/supabase/server";
import type { PessoaStatus, Pilar, Periodicidade } from "@/types/database";

export type ClienteFinanceiroStatus = "sem_plano" | "em_dia" | "atrasado";

export type ClienteListItem = {
  id: string;
  nome: string;
  status: PessoaStatus;
  pilar_principal: Pilar | null;
  created_at: string;
  planoNome: string | null;
  planoPeriodicidade: Periodicidade | null;
  planoSessoesSemana: number | null;
  financeiroStatus: ClienteFinanceiroStatus;
  lancamentosAtrasados: number;
  semPlanoAtivo: boolean;
  cadastroIncompleto: boolean;
  precisaAtencao: boolean;
};

export type ClienteStats = {
  ativos: number;
  inativos: number;
  inadimplentes: number;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function getClientes(): Promise<ClienteListItem[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [pessoasRes, matriculasRes, lancamentosRes] = await Promise.all([
    supabase.schema("core").from("pessoa").select("id, nome, cpf, nascimento, telefone, email, genero, status, pilar_principal, created_at")
      .is("archived_at", null).neq("status", "lead").order("nome", { ascending: true }),
    supabase.schema("vendas").from("matricula").select("pessoa_id, periodicidade, sessoes_semana, plano:plano_id(nome)")
      .eq("status", "ativa"),
    supabase.schema("financeiro").from("lancamento").select("pessoa_id, status, vencimento")
      .neq("status", "recebido"),
  ]);

  const pessoas = pessoasRes.data ?? [];

  const planoByPessoa = new Map<string, { nome: string; periodicidade: Periodicidade | null; sessoes_semana: number | null }>();
  for (const m of (matriculasRes.data ?? []) as { pessoa_id: string; periodicidade: Periodicidade | null; sessoes_semana: number | null; plano: unknown }[]) {
    const plano = one(m.plano) as { nome: string } | null;
    if (plano && !planoByPessoa.has(m.pessoa_id)) {
      planoByPessoa.set(m.pessoa_id, { nome: plano.nome, periodicidade: m.periodicidade, sessoes_semana: m.sessoes_semana });
    }
  }

  const atrasadosByPessoa = new Map<string, number>();
  for (const l of (lancamentosRes.data ?? []) as { pessoa_id: string; status: string; vencimento: string }[]) {
    const atrasado = l.status === "atrasado" || l.vencimento < today;
    if (atrasado) atrasadosByPessoa.set(l.pessoa_id, (atrasadosByPessoa.get(l.pessoa_id) ?? 0) + 1);
  }

  return pessoas.map((p) => {
    const plano = planoByPessoa.get(p.id) ?? null;
    const atrasados = atrasadosByPessoa.get(p.id) ?? 0;
    const semPlanoAtivo = !plano;
    const cadastro = p as typeof p & {
      cpf: string | null;
      nascimento: string | null;
      telefone: string | null;
      email: string | null;
      genero: string | null;
    };
    const cadastroIncompleto =
      !cadastro.cpf ||
      !cadastro.nascimento ||
      !cadastro.telefone ||
      !cadastro.email ||
      !cadastro.genero ||
      !p.pilar_principal;
    return {
      id: p.id,
      nome: p.nome,
      status: p.status,
      pilar_principal: p.pilar_principal,
      created_at: p.created_at,
      planoNome: plano?.nome ?? null,
      planoPeriodicidade: plano?.periodicidade ?? null,
      planoSessoesSemana: plano?.sessoes_semana ?? null,
      financeiroStatus: semPlanoAtivo ? "sem_plano" : atrasados > 0 ? "atrasado" : "em_dia",
      lancamentosAtrasados: atrasados,
      semPlanoAtivo,
      cadastroIncompleto,
      precisaAtencao: semPlanoAtivo || cadastroIncompleto,
    };
  });
}

export function getClienteStats(clientes: ClienteListItem[]): ClienteStats {
  return {
    ativos: clientes.filter((c) => c.status === "cliente_ativo").length,
    inativos: clientes.filter((c) => c.status === "inativo").length,
    inadimplentes: clientes.filter((c) => c.lancamentosAtrasados > 0).length,
  };
}
