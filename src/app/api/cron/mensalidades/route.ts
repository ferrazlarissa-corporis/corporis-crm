import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { postAccrual } from "@/lib/finance/post-income";
import { PERIODICIDADE_MESES } from "@/lib/vendas-labels";
import type { Pilar, Periodicidade } from "@/types/database";

/**
 * Recorrência mensal: para cada matrícula ativa que cobra na competência atual,
 * gera o financeiro.lancamento do mês (se ainda não existe) e dispara o accrual
 * na ponte Finance. Idempotente por (matricula_id, competencia).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth(); // 0-based
  const competencia = new Date(ano, mes, 1).toISOString().slice(0, 10);

  const { data: matriculas } = await supabase
    .schema("vendas").from("matricula")
    .select("id, pessoa_id, inicio, dia_vencimento, plano:plano_id(nome, valor, periodicidade)")
    .eq("status", "ativa");

  let created = 0;
  for (const m of matriculas ?? []) {
    const plano = (Array.isArray(m.plano) ? m.plano[0] : m.plano) as
      | { nome: string; valor: number; periodicidade: Periodicidade }
      | null;
    if (!plano) continue;

    // Cobra neste mês? (meses desde o início divisível pela periodicidade)
    const inicio = new Date(m.inicio);
    const mesesDesdeInicio = (ano - inicio.getFullYear()) * 12 + (mes - inicio.getMonth());
    if (mesesDesdeInicio < 0) continue;
    const periodo = PERIODICIDADE_MESES[plano.periodicidade];
    if (plano.periodicidade !== "avulso" && mesesDesdeInicio % periodo !== 0) continue;
    // O 1º lançamento já foi criado na adesão (mês de início).
    if (mesesDesdeInicio === 0) continue;

    // Dedupe por (matricula, competencia).
    const { data: existente } = await supabase
      .schema("financeiro").from("lancamento")
      .select("id").eq("matricula_id", m.id).eq("competencia", competencia).maybeSingle();
    if (existente) continue;

    const dia = Math.min(m.dia_vencimento ?? 10, 28);
    const vencimento = new Date(ano, mes, dia).toISOString().slice(0, 10);

    const { data: lanc, error } = await supabase
      .schema("financeiro").from("lancamento")
      .insert({
        pessoa_id: m.pessoa_id,
        matricula_id: m.id,
        competencia,
        descricao: `Mensalidade ${plano.nome}`,
        valor: plano.valor,
        vencimento,
        status: "a_receber",
      })
      .select("id, competencia, vencimento, valor, descricao")
      .single();
    if (error || !lanc) continue;

    created++;

    // Dados da pessoa + accrual na ponte Finance (best-effort).
    const { data: pessoa } = await supabase
      .schema("core").from("pessoa").select("nome, pilar_principal").eq("id", m.pessoa_id).maybeSingle();
    if (pessoa) {
      await postAccrual({
        lancamentoId: lanc.id,
        competencia: lanc.competencia,
        vencimento: lanc.vencimento,
        valor: lanc.valor,
        pessoaNome: pessoa.nome,
        pilar: (pessoa.pilar_principal as Pilar | null) ?? null,
        descricao: lanc.descricao,
      });
    }

    // Timeline (apenas se a pessoa tem lead — activities exige lead_id).
    const { data: lead } = await supabase
      .schema("crm").from("leads").select("id").eq("pessoa_id", m.pessoa_id).maybeSingle();
    if (lead) {
      await supabase.schema("crm").from("activities").insert({
        lead_id: lead.id,
        tipo: "sistema",
        descricao: `Mensalidade ${plano.nome} gerada para ${competencia}`,
        meta: { lancamento_id: lanc.id, competencia },
      });
    }
  }

  return NextResponse.json({ ok: true, created });
}
