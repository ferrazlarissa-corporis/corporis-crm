import { createClient } from "@/lib/supabase/server";
import type {
  Database, Pilar, PessoaStatus, Periodicidade, PlanoTipo,
  MatriculaStatus, LancamentoStatus, ContratoStatus, DocumentoTipo, CobrancaModo,
} from "@/types/database";

export type FichaPessoa = Database["core"]["Tables"]["pessoa"]["Row"];
export type FichaEndereco = Database["core"]["Tables"]["endereco"]["Row"];

export type FichaMatricula = {
  id: string;
  inicio: string;
  renovacao: string | null;
  dia_vencimento: number | null;
  status: MatriculaStatus;
  tipo: PlanoTipo;
  periodicidade: Periodicidade | null;
  valor: number | null;
  valor_total: number | null;
  forma_pagamento: string | null;
  cobranca_modo: CobrancaModo | null;
  sessoes_semana: number | null;
  total_sessoes: number | null;
  fim: string | null;
  plano: { nome: string; periodicidade: Periodicidade; tipo: PlanoTipo; pilar: Pilar | null } | null;
};

export type FichaLancamento = {
  id: string; competencia: string; descricao: string; valor: number;
  vencimento: string; status: LancamentoStatus; recebido_at: string | null;
};

export type FichaEvolucao = {
  id: string; texto: string; created_at: string;
  profissional: { nome: string } | null;
};

export type FichaDocumento = {
  id: string; tipo: DocumentoTipo; nome: string; storage_path: string; tamanho: number | null; created_at: string;
};

export type FichaContrato = {
  id: string; status: ContratoStatus; created_at: string; assinado_at: string | null;
  via_assinada_url: string | null; modelo: { nome: string } | null;
};

export type FichaAgendamento = { id: string; inicio: string; fim: string; tipo: string; categoria: string };

export type FichaAnamnese = { id: string; versao: number; dados: Record<string, unknown>; updated_at: string; autor_id: string | null };

export type FichaCliente = {
  pessoa: FichaPessoa & { status: PessoaStatus };
  endereco: FichaEndereco | null;
  responsavelNome: string | null;
  matricula: FichaMatricula | null;
  lancamentos: FichaLancamento[];
  anamnese: FichaAnamnese | null;
  anamneseVersoes: number;
  evolucoes: FichaEvolucao[];
  documentos: FichaDocumento[];
  contratos: FichaContrato[];
  proximosAgendamentos: FichaAgendamento[];
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export async function getFichaCliente(id: string): Promise<FichaCliente | null> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: pessoa } = await supabase.schema("core").from("pessoa").select("*").eq("id", id).maybeSingle();
  if (!pessoa) return null;

  const [
    enderecoRes, respRes, matriculaRes, lancRes, anamneseRes, anamneseCountRes,
    evolucoesRes, documentosRes, contratosRes, agendaRes,
  ] = await Promise.all([
    supabase.schema("core").from("endereco").select("*").eq("pessoa_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    pessoa.responsavel_id
      ? supabase.schema("crm").from("profiles").select("nome").eq("id", pessoa.responsavel_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.schema("vendas").from("matricula")
      .select("id, inicio, renovacao, dia_vencimento, status, tipo, periodicidade, valor, valor_total, forma_pagamento, cobranca_modo, sessoes_semana, total_sessoes, fim, plano:plano_id(nome, periodicidade, tipo, pilar)")
      .eq("pessoa_id", id).eq("status", "ativa").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.schema("financeiro").from("lancamento")
      .select("id, competencia, descricao, valor, vencimento, status, recebido_at")
      .eq("pessoa_id", id).order("competencia", { ascending: false }),
    supabase.schema("clinico").from("anamnese").select("id, versao, dados, updated_at, autor_id")
      .eq("pessoa_id", id).order("versao", { ascending: false }).limit(1).maybeSingle(),
    supabase.schema("clinico").from("anamnese").select("id", { count: "exact", head: true }).eq("pessoa_id", id),
    supabase.schema("clinico").from("evolucao")
      .select("id, texto, created_at, profissional_id")
      .eq("pessoa_id", id).order("created_at", { ascending: false }),
    supabase.schema("clinico").from("documento").select("id, tipo, nome, storage_path, tamanho, created_at")
      .eq("pessoa_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.schema("vendas").from("contrato")
      .select("id, status, created_at, assinado_at, via_assinada_url, modelo:modelo_id(nome)")
      .eq("pessoa_id", id).order("created_at", { ascending: false }),
    supabase.schema("crm").from("appointments").select("id, inicio, fim, tipo, categoria")
      .eq("pessoa_id", id).gte("inicio", nowIso).in("status", ["agendado", "confirmado"]).order("inicio", { ascending: true }).limit(5),
  ]);

  // Nomes de profissionais (embed cross-schema clinico→core não resolve no PostgREST).
  const evolucoesRaw = ((evolucoesRes.data as unknown[]) ?? []).map((e) => e as {
    id: string; texto: string; created_at: string; profissional_id: string | null;
  });
  const profIds = [...new Set(evolucoesRaw.map((e) => e.profissional_id).filter((v): v is string => Boolean(v)))];
  const profNome = new Map<string, string>();
  if (profIds.length) {
    const { data: profs } = await supabase.schema("core").from("profissional").select("id, nome").in("id", profIds);
    (profs ?? []).forEach((p) => profNome.set(p.id, p.nome));
  }

  return {
    pessoa: pessoa as FichaCliente["pessoa"],
    endereco: (enderecoRes.data as FichaEndereco) ?? null,
    responsavelNome: (respRes.data as { nome: string } | null)?.nome ?? null,
    matricula: matriculaRes.data
      ? { ...(matriculaRes.data as Omit<FichaMatricula, "plano"> & { plano: unknown }), plano: one((matriculaRes.data as { plano: unknown }).plano) as FichaMatricula["plano"] }
      : null,
    lancamentos: (lancRes.data as FichaLancamento[]) ?? [],
    anamnese: anamneseRes.data
      ? { ...(anamneseRes.data as Omit<FichaAnamnese, "dados"> & { dados: unknown }), dados: (anamneseRes.data.dados as Record<string, unknown>) ?? {} }
      : null,
    anamneseVersoes: anamneseCountRes.count ?? 0,
    evolucoes: evolucoesRaw.map((r) => ({
      id: r.id, texto: r.texto, created_at: r.created_at,
      profissional: r.profissional_id ? { nome: profNome.get(r.profissional_id) ?? "Profissional" } : null,
    })),
    documentos: (documentosRes.data as FichaDocumento[]) ?? [],
    contratos: ((contratosRes.data as unknown[]) ?? []).map((c) => {
      const r = c as Omit<FichaContrato, "modelo"> & { modelo: unknown };
      return { ...r, modelo: one(r.modelo) as { nome: string } | null };
    }),
    proximosAgendamentos: (agendaRes.data as FichaAgendamento[]) ?? [],
  };
}
