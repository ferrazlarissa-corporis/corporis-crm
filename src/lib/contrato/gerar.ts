import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/types/database";
import { CLINIC_CONFIG_ID, DEFAULT_CLINIC_INFO } from "@/lib/clinic-config";
import { formatBRL, PERIODICIDADE_MESES } from "@/lib/vendas-labels";
import { extensoInteiro, extensoReais } from "./extenso";
import { mesclarContrato } from "./merge";
import { formaPagamentoContrato, formatarCpf, formatarEndereco, frase, nomePessoa } from "./normalizar";

type Db = SupabaseClient<Database>;

type MatriculaContrato = Pick<
  Database["vendas"]["Tables"]["matricula"]["Row"],
  | "plano_id" | "inicio" | "fim" | "renovacao" | "dia_vencimento" | "tipo" | "periodicidade" | "valor"
  | "valor_total" | "forma_pagamento" | "cobranca_modo" | "sessoes_semana" | "total_sessoes" | "sessoes_pilates" | "sessoes_fisio_pelvica"
>;

const CLAUSULA_PACOTE =
  "3.8 – Por se tratar de pacote de sessões contratado por prazo indeterminado, o CONTRATANTE poderá solicitar o cancelamento a qualquer momento, ficando dispensados o aviso prévio e a multa previstos nos itens 3.3 e 3.4 quando o cancelamento decorrer de (i) solicitação médica, mediante apresentação de atestado ou relatório; ou (ii) ocorrência do parto. Nesses casos, será restituído o valor proporcional das sessões não usufruídas, nos termos do item 3.6. Nas demais hipóteses, aplicam-se os itens 3.3 e 3.4.";

function dataCurta(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return format(new Date(y, m - 1, d), "dd/MM/yyyy");
}

function lista(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** Valores de mesclagem do contrato, lidos do cadastro da cliente, da matrícula e da clínica. */
export async function montarValoresContrato(
  db: Db,
  pessoaId: string,
  vendaId: string | null,
): Promise<Record<string, string>> {
  const [pessoaRes, enderecoRes, clinicaRes] = await Promise.all([
    db.schema("core").from("pessoa").select("nome, cpf, telefone, profissao").eq("id", pessoaId).maybeSingle(),
    db.schema("core").from("endereco").select("logradouro, numero, complemento, bairro, cidade, uf, cep")
      .eq("pessoa_id", pessoaId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.schema("crm").from("clinic_config")
      .select("razao_social, documento, endereco, endereco_complemento, email").eq("id", CLINIC_CONFIG_ID).maybeSingle(),
  ]);

  // Matrícula da venda; sem venda, a mais recente da cliente.
  const matBase = db.schema("vendas").from("matricula")
    .select("plano_id, inicio, fim, renovacao, dia_vencimento, tipo, periodicidade, valor, valor_total, forma_pagamento, cobranca_modo, sessoes_semana, total_sessoes, sessoes_pilates, sessoes_fisio_pelvica");
  const { data: matRaw } = await (vendaId ? matBase.eq("venda_id", vendaId) : matBase.eq("pessoa_id", pessoaId))
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const mat = matRaw as MatriculaContrato | null;

  let planoNome = "";
  let servicos: string[] = [];
  if (mat?.plano_id) {
    const { data: plano } = await db.schema("vendas").from("plano").select("nome, servicos").eq("id", mat.plano_id).maybeSingle();
    planoNome = plano?.nome ?? "";
    const ids = Array.isArray(plano?.servicos) ? (plano.servicos as unknown[]).filter((s): s is string => typeof s === "string") : [];
    if (ids.length) {
      const { data: srv } = await db.schema("core").from("servico").select("nome").in("id", ids);
      servicos = (srv ?? []).map((s) => s.nome);
    }
  }

  const clinica = clinicaRes.data ?? DEFAULT_CLINIC_INFO;
  const endereco = formatarEndereco(enderecoRes.data);

  const comExtenso = (v: number) => `${formatBRL(v)} (${extensoReais(v)})`;
  const quantidade = (n: number, fem = true) => `${n} (${extensoInteiro(n, fem)})`;
  const vencimentoLongo = (inicio: string, dia: number | null) => {
    const [y, m] = inicio.split("-").map(Number);
    const d = Math.min(dia ?? Number(inicio.slice(8, 10)), 28);
    return `${d} (${extensoInteiro(d)}) de ${format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })}`;
  };

  let valor = "";
  let sessoes = "";
  let vigencia = "";
  let objeto = "";
  let condicao = "";
  let clausulaPacote = "";
  if (mat) {
    const total = Number(mat.valor_total ?? mat.valor ?? 0);
    const nome = planoNome.toUpperCase();
    const fim = mat.fim ?? mat.renovacao;
    const parcelada = mat.cobranca_modo === "parcelada_mensal" && mat.tipo === "fixo";
    const nParcelas = parcelada ? PERIODICIDADE_MESES[mat.periodicidade ?? "mensal"] : 1;

    valor = total ? formatBRL(total) : "";
    vigencia = fim ? `de ${dataCurta(mat.inicio)} até ${dataCurta(fim)}` : `a partir de ${dataCurta(mat.inicio)}`;

    if (mat.tipo === "fixo") {
      const meses = PERIODICIDADE_MESES[mat.periodicidade ?? "mensal"];
      const porSemana = mat.sessoes_semana ?? 0;
      // Convenção da clínica: 4 semanas por mês (semestral, 1x/semana = 24 sessões).
      const totalSessoes = porSemana * 4 * meses;
      sessoes = porSemana ? `${quantidade(totalSessoes)} sessões, ${quantidade(porSemana)} por semana` : "";
      objeto = `${nome}, totalizando ${quantidade(totalSessoes)} sessões, na frequência de ${quantidade(porSemana)} ${porSemana === 1 ? "sessão" : "sessões"} por semana, a serem realizadas dentro do período de vigência de ${quantidade(meses, false)} ${meses === 1 ? "mês" : "meses"}, ${vigencia}`;
    } else if (mat.tipo === "personalizado") {
      const n = mat.total_sessoes ?? 0;
      const partes = [
        mat.sessoes_pilates ? `${quantidade(mat.sessoes_pilates)} de Pilates` : null,
        mat.sessoes_fisio_pelvica ? `${quantidade(mat.sessoes_fisio_pelvica)} de Fisioterapia Pélvica` : null,
      ].filter((p): p is string => Boolean(p));
      sessoes = `${quantidade(n)} sessões${partes.length ? ` (${partes.join(" e ")})` : ""}`;
      objeto = `${nome}, totalizando ${sessoes}, a serem utilizadas a partir de ${dataCurta(mat.inicio)}, por prazo indeterminado, até a utilização integral das sessões`;
      clausulaPacote = CLAUSULA_PACOTE;
    } else {
      const n = mat.total_sessoes ?? 1;
      sessoes = `${quantidade(n)} ${n === 1 ? "sessão" : "sessões"}`;
      objeto = `SESSÃO AVULSA — ${nome}, totalizando ${sessoes}, a ser realizada em ${dataCurta(mat.inicio)}`;
    }

    if (total) {
      const venc = vencimentoLongo(mat.inicio, mat.dia_vencimento);
      condicao = parcelada
        ? `a importância de ${comExtenso(total)}, a ser paga em ${quantidade(nParcelas)} parcelas mensais de ${comExtenso(Number(mat.valor ?? total / nParcelas))}, com vencimento da primeira parcela em ${venc}`
        : `a importância de ${comExtenso(total)}, a ser paga em parcela única, com vencimento em ${venc}`;
    }
  }

  return {
    cliente: nomePessoa(pessoaRes.data?.nome),
    cpf: formatarCpf(pessoaRes.data?.cpf),
    profissao: frase(pessoaRes.data?.profissao),
    endereco_cliente: endereco,
    plano: planoNome,
    objeto_plano: objeto,
    clausula_pacote: clausulaPacote,
    condicao_pagamento: condicao,
    valor,
    data_inicio: mat ? dataCurta(mat.inicio) : "",
    sessoes,
    vigencia,
    dia_vencimento: mat?.dia_vencimento ? `dia ${mat.dia_vencimento} de cada mês` : "",
    forma_pagamento: formaPagamentoContrato(mat?.forma_pagamento),
    servicos: lista(servicos),
    clinica: clinica.razao_social,
    clinica_documento: clinica.documento,
    clinica_email: clinica.email,
    clinica_endereco: [clinica.endereco, clinica.endereco_complemento].filter(Boolean).join(" — "),
    data: format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR }),
  };
}

/** Mescla o modelo e grava `corpo_gerado`. Só mexe em contrato em rascunho. */
export async function gerarCorpoContrato(
  db: Db,
  contratoId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { data: contrato } = await db.schema("vendas").from("contrato")
    .select("id, pessoa_id, modelo_id, venda_id, status").eq("id", contratoId).maybeSingle();
  if (!contrato) return { success: false, error: "Contrato não encontrado." };
  if (contrato.status !== "rascunho") return { success: false, error: "Só é possível regerar contrato em rascunho." };
  if (!contrato.modelo_id) return { success: false, error: "Contrato sem modelo." };

  const { data: modelo } = await db.schema("vendas").from("contrato_modelo").select("corpo").eq("id", contrato.modelo_id).maybeSingle();
  if (!modelo) return { success: false, error: "Modelo não encontrado." };

  const valores = await montarValoresContrato(db, contrato.pessoa_id, contrato.venda_id);
  const { error } = await db.schema("vendas").from("contrato")
    .update({ corpo_gerado: mesclarContrato(modelo.corpo, valores) }).eq("id", contratoId);
  return error ? { success: false, error: error.message } : { success: true };
}
