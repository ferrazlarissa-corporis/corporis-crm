import { createClient } from "@/lib/supabase/server";

export type GestaoPendencia = {
  id: string;
  tipo: "financeiro" | "contrato";
  titulo: string;
  detalhe: string;
  pessoaId: string | null;
  pessoaNome: string;
  valor: number | null;
  data: string;
  idadeDias: number;
  prioridade: "alta" | "media" | "baixa";
};

export type GestaoStats = {
  clientesAtivos: number;
  mrr: number;
  recebidoMes: number;
  emAberto: number;
  inadimplentes: number;
  pendencias: GestaoPendencia[];
};

export async function getGestaoStats(): Promise<GestaoStats> {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [ativosRes, matriculasRes, lancamentosRes, contratosRes] = await Promise.all([
    supabase.schema("core").from("pessoa").select("id", { count: "exact", head: true }).eq("status", "cliente_ativo").is("archived_at", null),
    supabase.schema("vendas").from("matricula").select("tipo, valor").eq("status", "ativa"),
    supabase.schema("financeiro").from("lancamento").select("id, pessoa_id, descricao, valor, vencimento, status, competencia"),
    supabase.schema("vendas").from("contrato")
      .select("id, pessoa_id, created_at, modelo:modelo_id(nome)")
      .eq("status", "rascunho")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  // MRR
  const mrr = (matriculasRes.data ?? []).reduce((sum, m) => {
    const matricula = m as { tipo: string; valor: number | null };
    return matricula.tipo === "fixo" ? sum + (matricula.valor ?? 0) : sum;
  }, 0);

  // Lançamentos
  const lancamentos = (lancamentosRes.data ?? []) as {
    id: string; pessoa_id: string; descricao: string; valor: number; vencimento: string; status: string; competencia: string;
  }[];
  const recebidoMes = lancamentos
    .filter((l) => l.status === "recebido" && l.competencia >= mesInicio)
    .reduce((s, l) => s + l.valor, 0);
  const abertos = lancamentos.filter((l) => l.status !== "recebido");
  const emAberto = abertos.reduce((s, l) => s + l.valor, 0);
  const atrasados = abertos
    .filter((l) => l.status === "atrasado" || l.vencimento < today)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const inadimplentes = new Set(atrasados.map((l) => l.pessoa_id)).size;

  const contratos = ((contratosRes.data ?? []) as {
    id: string;
    pessoa_id: string;
    created_at: string;
    modelo: { nome: string } | { nome: string }[] | null;
  }[]);

  const pessoaIds = Array.from(new Set([
    ...atrasados.slice(0, 5).map((l) => l.pessoa_id),
    ...contratos.map((c) => c.pessoa_id),
  ].filter(Boolean)));

  const pessoasRes = pessoaIds.length > 0
    ? await supabase.schema("core").from("pessoa").select("id, nome").in("id", pessoaIds)
    : { data: [] as { id: string; nome: string }[] };
  const pessoaNome = new Map((pessoasRes.data ?? []).map((p) => [p.id, p.nome]));

  function dateOnlyDaysSince(date: string) {
    const base = new Date(`${date}T00:00:00`);
    const current = new Date(`${today}T00:00:00`);
    return Math.max(0, Math.floor((current.getTime() - base.getTime()) / 86_400_000));
  }

  function daysSinceTimestamp(iso: string) {
    return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
  }

  function diasLabel(days: number) {
    return `${days} dia${days === 1 ? "" : "s"}`;
  }

  function modeloNome(modelo: { nome: string } | { nome: string }[] | null) {
    return Array.isArray(modelo) ? (modelo[0]?.nome ?? null) : (modelo?.nome ?? null);
  }

  const pendencias: GestaoPendencia[] = [
    ...atrasados.slice(0, 5).map((l) => {
      const idadeDias = dateOnlyDaysSince(l.vencimento);
      return {
        id: `l-${l.id}`,
        tipo: "financeiro" as const,
        titulo: l.descricao,
        detalhe: idadeDias > 0 ? `Vencido há ${diasLabel(idadeDias)}` : "Vence hoje",
        pessoaId: l.pessoa_id,
        pessoaNome: pessoaNome.get(l.pessoa_id) ?? "Cliente sem nome",
        valor: l.valor,
        data: l.vencimento,
        idadeDias,
        prioridade: idadeDias >= 7 ? "alta" as const : "media" as const,
      };
    }),
    ...contratos.map((c) => {
      const idadeDias = daysSinceTimestamp(c.created_at);
      const modelo = modeloNome(c.modelo);
      return {
        id: `c-${c.id}`,
        tipo: "contrato" as const,
        titulo: modelo ? `Enviar contrato · ${modelo}` : "Enviar contrato",
        detalhe: idadeDias > 0 ? `Em rascunho há ${diasLabel(idadeDias)}` : "Criado hoje",
        pessoaId: c.pessoa_id,
        pessoaNome: pessoaNome.get(c.pessoa_id) ?? "Cliente sem nome",
        valor: null,
        data: c.created_at,
        idadeDias,
        prioridade: idadeDias >= 3 ? "media" as const : "baixa" as const,
      };
    }),
  ]
    .sort((a, b) => {
      const prioridade = { alta: 0, media: 1, baixa: 2 };
      return prioridade[a.prioridade] - prioridade[b.prioridade] || b.idadeDias - a.idadeDias;
    })
    .slice(0, 8);

  return {
    clientesAtivos: ativosRes.count ?? 0,
    mrr,
    recebidoMes,
    emAberto,
    inadimplentes,
    pendencias,
  };
}
