"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PilarBadge,
  ServicoBadge,
  colorTokenForPlano,
  taxonomyAccentStyle,
  taxonomyBadgeStyle,
} from "@/components/corporis/taxonomy-badges";
import {
  PERIODICIDADE_LABEL,
  PERIODICIDADE_MESES,
  PERIODICIDADE_OPTIONS,
  PLANO_TIPO_LABEL,
  formatBRL,
  pilatesPreco,
} from "@/lib/vendas-labels";
import type { PessoaListItem } from "@/lib/queries/pessoa";
import type { PlanoRow } from "@/lib/queries/planos";
import type { Periodicidade, Pilar, PlanoTipo } from "@/types/database";
import { criarHorariosPlano, criarVenda } from "../actions";

// Periodicidades válidas para plano fixo (sem anual/avulso).
const PERIODICIDADE_FIXO = PERIODICIDADE_OPTIONS.filter(
  (o) => o.value !== "anual" && o.value !== "avulso",
);

/** Soma meses a uma data ISO (yyyy-mm-dd), devolvendo ISO. */
function addMonthsISO(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatDateBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

type Modelo = { id: string; nome: string; pilares: Pilar[]; planos: string[] };
type PessoaStatusFilter = "ativas" | "inativas" | "todas";
type AgendaScheduleOptions = {
  servicos: { id: string; nome: string; pilar: Pilar; cor_token: string; capacidade_slot: number; duracao_min: number }[];
  salas: { id: string; nome: string }[];
};
type CreatedSale = {
  matriculaId: string;
  pessoaId: string;
  inicio: string;
  fim: string;
  sessoesSemana: number;
};

const FORMA_CREDITO_TOTAL = "Crédito total do plano";
const FORMAS = ["Pix recorrente", "Cartão recorrente", FORMA_CREDITO_TOTAL, "Boleto", "Dinheiro"];
const STEPS = ["Cliente", "Plano", "Condições", "Revisão"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function descontoPercentual(desconto: string): number {
  const parsed = Number(desconto);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 100);
}

function valorDesconto(valor: string, desconto: string): number {
  return (Number(valor) || 0) * (descontoPercentual(desconto) / 100);
}

function valorLiquido(valor: string, desconto: string): number {
  return Math.max(0, (Number(valor) || 0) - valorDesconto(valor, desconto));
}

function valorTotalPlano(tipo: PlanoTipo, periodicidade: Periodicidade, valor: string, desconto: string): number {
  const liquido = valorLiquido(valor, desconto);
  return tipo === "fixo" ? liquido * PERIODICIDADE_MESES[periodicidade] : liquido;
}

function parcelasDoPlano(tipo: PlanoTipo, periodicidade: Periodicidade, forma: string): number {
  if (forma === FORMA_CREDITO_TOTAL || tipo !== "fixo") return 1;
  return PERIODICIDADE_MESES[periodicidade];
}

function parcelasLabel(parcelas: number): string {
  return `${parcelas} ${parcelas === 1 ? "parcela" : "parcelas"}`;
}

export function NovaVendaClient({
  pessoas,
  planos,
  modelos,
  agendaOptions,
}: {
  pessoas: PessoaListItem[];
  planos: PlanoRow[];
  modelos: Modelo[];
  agendaOptions: AgendaScheduleOptions;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [planoId, setPlanoId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [inicio, setInicio] = useState(today());
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>("mensal");
  const [sessoesSemana, setSessoesSemana] = useState("");
  const [totalSessoes, setTotalSessoes] = useState("");
  const [forma, setForma] = useState(FORMAS[0]);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [pessoaStatus, setPessoaStatus] = useState<PessoaStatusFilter>("ativas");
  const [error, setError] = useState<string | null>(null);
  const [createdSale, setCreatedSale] = useState<CreatedSale | null>(null);
  const [pending, startTransition] = useTransition();

  const pessoa = useMemo(() => pessoas.find((p) => p.id === pessoaId) ?? null, [pessoas, pessoaId]);
  const plano = useMemo(() => planos.find((p) => p.id === planoId) ?? null, [planos, planoId]);
  const tipo: PlanoTipo = plano?.tipo ?? "fixo";
  const fim = tipo === "fixo" ? addMonthsISO(inicio, PERIODICIDADE_MESES[periodicidade]) : null;
  const liquidoMensal = valorLiquido(valor, desconto);
  const totalPlano = valorTotalPlano(tipo, periodicidade, valor, desconto);
  const totalLiquido = forma === FORMA_CREDITO_TOTAL ? totalPlano : liquidoMensal;
  const descontoNominal = valorDesconto(valor, desconto);
  const numeroParcelas = parcelasDoPlano(tipo, periodicidade, forma);
  const planoToken = plano ? colorTokenForPlano(plano) : null;
  const planoPilares = useMemo(() => {
    if (!plano) return [];
    return Array.from(new Set([plano.pilar, ...plano.servicosMeta.map((s) => s.pilar)].filter(Boolean) as Pilar[]));
  }, [plano]);
  const planoEhPilates = planoPilares.includes("pilates");

  // Pilates fixo: pré-preenche o valor pela tabela de preços (frequência × periodicidade).
  // Roda ao trocar periodicidade/frequência/plano; o valor segue editável manualmente depois.
  useEffect(() => {
    if (tipo !== "fixo" || !planoEhPilates) return;
    const preco = pilatesPreco(periodicidade, Number(sessoesSemana));
    if (preco != null) setValor(String(preco));
  }, [tipo, planoEhPilates, periodicidade, sessoesSemana]);

  const pessoasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pessoas.filter((p) => {
      const ativa = p.status === "cliente_ativo" || p.leadConvertido;
      if (pessoaStatus === "ativas" && !ativa) return false;
      if (pessoaStatus === "inativas" && p.status !== "inativo") return false;
      if (!q) return true;
      return p.nome.toLowerCase().includes(q) || (p.telefone ?? "").includes(q);
    }).slice(0, 30);
  }, [pessoas, busca, pessoaStatus]);

  const modelosCompativeis = useMemo(() => {
    if (!plano) return modelos;
    return modelos.filter(
      (m) =>
        m.planos.includes(plano.id) ||
        planoPilares.some((pilar) => m.pilares.includes(pilar)) ||
        (m.planos.length === 0 && m.pilares.length === 0),
    );
  }, [modelos, plano, planoPilares]);

  function selectPlano(p: PlanoRow) {
    setPlanoId(p.id);
    setValor(String(p.valor));
    // Pré-preenche os termos com os defaults do plano (catálogo genérico — editáveis).
    setPeriodicidade(p.periodicidade === "anual" || p.periodicidade === "avulso" ? "mensal" : p.periodicidade);
    setSessoesSemana(p.sessoes_semana != null ? String(p.sessoes_semana) : "");
    setTotalSessoes("");
  }

  function canContinue(): boolean {
    if (step === 1) return Boolean(pessoaId);
    if (step === 2) return Boolean(planoId);
    if (step === 3) {
      const descontoPct = Number(desconto);
      const descontoValido = Number.isFinite(descontoPct) && descontoPct >= 0 && descontoPct <= 100;
      const base = Number(valor) >= 0 && descontoValido && Number(diaVencimento) >= 1 && Number(diaVencimento) <= 28 && Boolean(inicio);
      if (tipo === "personalizado") return base && Number(totalSessoes) >= 1;
      return base;
    }
    return true;
  }

  function handleConfirm() {
    if (!pessoaId || !planoId) return;
    setError(null);
    startTransition(async () => {
      const r = await criarVenda({
        pessoa_id: pessoaId,
        plano_id: planoId,
        valor: Number(valor),
        desconto: descontoNominal,
        dia_vencimento: Number(diaVencimento),
        inicio,
        modelo_contrato_id: modeloId,
        tipo,
        periodicidade: tipo === "fixo" ? periodicidade : null,
        sessoes_semana: tipo === "fixo" && sessoesSemana !== "" ? Number(sessoesSemana) : null,
        total_sessoes: tipo !== "fixo" && totalSessoes !== "" ? Number(totalSessoes) : null,
      });
      if (!r.success) { setError(r.error); return; }
      if (r.matricula_id && r.pessoa_id && r.tipo === "fixo" && r.fim && (r.sessoes_semana ?? 0) > 0) {
        setCreatedSale({
          matriculaId: r.matricula_id,
          pessoaId: r.pessoa_id,
          inicio: r.inicio ?? inicio,
          fim: r.fim,
          sessoesSemana: r.sessoes_semana ?? 1,
        });
        return;
      }
      router.push(`/clientes/${pessoaId}`);
      router.refresh();
    });
  }

  function finishSaleFlow(pessoaDestino = createdSale?.pessoaId ?? pessoaId) {
    if (!pessoaDestino) {
      router.push("/vendas");
      router.refresh();
      return;
    }
    router.push(`/clientes/${pessoaDestino}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 py-5">
        <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Etapa {step} de 4 · {STEPS[step - 1]}</p>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-[var(--radius-pill)]", i < step ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_320px] gap-6 px-8 py-6">
        {/* Coluna principal */}
        <Card className="flex flex-col p-6">
          <div className="min-h-0 flex-1">
            {step === 1 ? (
              <Step1
                pessoas={pessoasFiltradas}
                pessoaId={pessoaId}
                onSelect={setPessoaId}
                busca={busca}
                setBusca={setBusca}
                status={pessoaStatus}
                setStatus={setPessoaStatus}
              />
            ) : null}
            {step === 2 ? <Step2 planos={planos} planoId={planoId} onSelect={selectPlano} /> : null}
            {step === 3 ? (
              <Step3
                tipo={tipo} fim={fim}
                valor={valor} setValor={setValor}
                desconto={desconto} setDesconto={setDesconto}
                diaVencimento={diaVencimento} setDiaVencimento={setDiaVencimento}
                inicio={inicio} setInicio={setInicio}
                periodicidade={periodicidade} setPeriodicidade={setPeriodicidade}
                sessoesSemana={sessoesSemana} setSessoesSemana={setSessoesSemana}
                totalSessoes={totalSessoes} setTotalSessoes={setTotalSessoes}
                forma={forma} setForma={setForma}
              />
            ) : null}
            {step === 4 ? (
              <Step4
                pessoa={pessoa} plano={plano}
                valor={valor} desconto={desconto} diaVencimento={diaVencimento} inicio={inicio}
                forma={forma} periodicidade={periodicidade}
                numeroParcelas={numeroParcelas}
                modelos={modelosCompativeis} modeloId={modeloId} setModeloId={setModeloId}
              />
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p>
          ) : null}

          <footer className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-text-secondary">
              {step === 1 ? "Selecione uma cliente para liberar a próxima etapa."
                : step === 4 ? "Confirme apenas depois de revisar cliente, plano e contrato."
                : "Os dados são salvos no rascunho da venda."}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" disabled={step === 1 || pending} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                Voltar
              </Button>
              {step < 4 ? (
                <Button disabled={!canContinue()} onClick={() => setStep((s) => Math.min(4, s + 1))}>
                  Continuar
                </Button>
              ) : (
                <Button disabled={pending} onClick={handleConfirm}>
                  {pending ? "Confirmando…" : "Confirmar venda"}
                </Button>
              )}
            </div>
          </footer>
        </Card>

        {/* Resumo lateral */}
        <aside>
          <Card className="sticky top-6 p-5">
            <p className="crm-label text-[10px] tracking-[2px] text-accent">Resumo</p>
            <h2 className="mt-1 font-display text-xl leading-tight text-text-primary">Adesão em construção</h2>

            <SummaryBlock label="Cliente">
              {pessoa ? (
                <>
                  <p className="text-sm text-text-primary">{pessoa.nome}</p>
                  <p className="text-xs text-text-secondary">{pessoa.telefone ?? "sem telefone"}</p>
                </>
              ) : <p className="text-xs text-text-secondary">Nenhuma cliente selecionada</p>}
            </SummaryBlock>

            <SummaryBlock label="Plano">
              {plano ? (
                <>
                  <p className="text-sm text-text-primary">{plano.nome}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span
                      className="rounded-[var(--radius-pill)] border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-primary"
                      style={planoToken ? taxonomyBadgeStyle(planoToken) : undefined}
                    >
                      {PLANO_TIPO_LABEL[tipo]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {tipo === "fixo" ? PERIODICIDADE_LABEL[periodicidade] : ""}
                    {tipo !== "fixo" && totalSessoes ? `${totalSessoes} sessões` : ""}
                  </p>
                  {tipo === "fixo" && fim ? (
                    <p className="text-xs text-text-secondary">Vigência até {formatDateBR(fim)}</p>
                  ) : null}
                </>
              ) : <p className="text-xs text-text-secondary">Nenhum plano selecionado</p>}
            </SummaryBlock>

            <SummaryBlock label="Financeiro">
              {plano ? (
                <>
                  <p className="text-sm text-text-primary">
                    {formatBRL(totalLiquido)} · {forma === FORMA_CREDITO_TOTAL ? "crédito" : `vencimento dia ${diaVencimento}`}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {forma === FORMA_CREDITO_TOTAL
                      ? `${parcelasLabel(numeroParcelas)} · ${forma} · ${formatBRL(totalPlano)}`
                      : tipo === "fixo"
                        ? `${parcelasLabel(numeroParcelas)} · ${forma}`
                        : forma}
                  </p>
                </>
              ) : <p className="text-xs text-text-secondary">Defina as condições</p>}
            </SummaryBlock>

            <div className="mt-5 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3">
              <p className="crm-label text-[9px] tracking-[1.5px] text-text-secondary">Total líquido</p>
              <p className="mt-1 font-display text-[28px] leading-none text-text-primary">{formatBRL(totalLiquido)}</p>
            </div>
          </Card>
        </aside>
      </div>

      {createdSale && plano ? (
        <HorariosPlanoModal
          sale={createdSale}
          pessoaNome={pessoa?.nome ?? "Cliente"}
          plano={plano}
          options={agendaOptions}
          onClose={() => finishSaleFlow(createdSale.pessoaId)}
          onDone={() => finishSaleFlow(createdSale.pessoaId)}
        />
      ) : null}
    </div>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────────

function Step1({
  pessoas, pessoaId, onSelect, busca, setBusca, status, setStatus,
}: {
  pessoas: PessoaListItem[]; pessoaId: string | null; onSelect: (id: string) => void;
  busca: string; setBusca: (v: string) => void;
  status: PessoaStatusFilter; setStatus: (v: PessoaStatusFilter) => void;
}) {
  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Escolha a cliente para iniciar a adesão.</h1>
      <p className="mt-2 text-sm text-text-secondary">Busque uma cliente já cadastrada por nome ou telefone.</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          {([
            ["ativas", "Ativas"],
            ["inativas", "Inativas"],
            ["todas", "Todas"],
          ] as [PessoaStatusFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cn(
                "rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium transition-colors",
                status === value ? "bg-accent-soft text-text-primary" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-text-secondary">
          {pessoas.length} {pessoas.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      <div className="mt-4 flex max-h-[46vh] flex-col gap-2 overflow-y-auto crm-scrollbar pr-1">
        {pessoas.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhuma cliente encontrada.</p>
        ) : pessoas.map((p) => (
          <button key={p.id} type="button" onClick={() => onSelect(p.id)}
            className={cn("flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
              pessoaId === p.id ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft")}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-sm font-medium text-text-primary">{p.nome}</p>
                {p.precisaAtencao ? (
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-tangerina)]"
                    strokeWidth={1.8}
                    aria-label="Pendência"
                  >
                    <title>Falta vender plano ou completar cadastro</title>
                  </AlertTriangle>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                <span>{p.telefone ?? "sem telefone"}</span>
                {p.pilar_principal ? <PilarBadge pilar={p.pilar_principal} /> : null}
              </div>
            </div>
            <span className="shrink-0 rounded-[var(--radius-pill)] bg-card px-2.5 py-0.5 text-[11px] text-text-secondary">
              {p.status === "cliente_ativo" ? "Cliente ativa" : p.leadConvertido ? "Lead convertido" : "Inativa"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step2({ planos, planoId, onSelect }: { planos: PlanoRow[]; planoId: string | null; onSelect: (p: PlanoRow) => void }) {
  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Defina o plano vinculado à matrícula.</h1>
      <p className="mt-2 text-sm text-text-secondary">Escolha um plano do catálogo ativo.</p>

      <div className="mt-5 flex max-h-[52vh] flex-col gap-2 overflow-y-auto crm-scrollbar pr-1">
        {planos.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhum plano ativo. Cadastre planos primeiro.</p>
        ) : planos.map((p) => {
          const token = colorTokenForPlano(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "relative overflow-hidden rounded-[var(--radius-md)] border px-4 py-3 pl-5 text-left transition-colors",
                planoId === p.id ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft",
              )}
            >
              <span className="absolute inset-y-0 left-0 w-1" style={taxonomyAccentStyle(token)} />
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-text-primary">{p.nome}</p>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <span
                    className="rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-text-primary"
                    style={taxonomyBadgeStyle(token)}
                  >
                    {PLANO_TIPO_LABEL[p.tipo]}
                  </span>
                  {p.tipo === "fixo" ? (
                    <span
                      className="rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-text-primary"
                      style={taxonomyBadgeStyle(token)}
                    >
                      {PERIODICIDADE_LABEL[p.periodicidade]}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {formatBRL(p.valor)} · {PERIODICIDADE_LABEL[p.periodicidade]}
                {p.sessoes_semana != null ? ` · ${p.sessoes_semana}x/semana` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.servicosMeta.slice(0, 3).map((s) => (
                  <ServicoBadge key={s.id} nome={s.nome} corToken={s.cor_token} pilar={s.pilar} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step3(props: {
  tipo: PlanoTipo; fim: string | null;
  valor: string; setValor: (v: string) => void;
  desconto: string; setDesconto: (v: string) => void;
  diaVencimento: string; setDiaVencimento: (v: string) => void;
  inicio: string; setInicio: (v: string) => void;
  periodicidade: Periodicidade; setPeriodicidade: (v: Periodicidade) => void;
  sessoesSemana: string; setSessoesSemana: (v: string) => void;
  totalSessoes: string; setTotalSessoes: (v: string) => void;
  forma: string; setForma: (v: string) => void;
}) {
  const { tipo } = props;
  const totalPlano = valorTotalPlano(tipo, props.periodicidade, props.valor, props.desconto);
  const numeroParcelas = parcelasDoPlano(tipo, props.periodicidade, props.forma);
  const valorLabel =
    tipo === "avulso" ? "Valor por sessão (R$)" : tipo === "personalizado" ? "Valor do pacote (R$)" : "Valor mensal (R$)";
  const ajuda =
    tipo === "fixo"
      ? "Plano fixo: cobrança mensal recorrente até o término calculado abaixo."
      : tipo === "personalizado"
        ? "Plano personalizado: cobrança única do pacote de sessões contratado."
        : "Sessão avulsa: cobrança única, sem recorrência.";

  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Ajuste as condições comerciais com clareza.</h1>
      <p className="mt-2 text-sm text-text-secondary">{ajuda}</p>

      {tipo === "fixo" ? (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Labeled label="Periodicidade">
            <Select value={props.periodicidade} onChange={(e) => props.setPeriodicidade(e.target.value as Periodicidade)}>
              {PERIODICIDADE_FIXO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Labeled>
          <Labeled label="Sessões por semana">
            <Input type="number" min={0} max={14} value={props.sessoesSemana} onChange={(e) => props.setSessoesSemana(e.target.value)} placeholder="2" />
          </Labeled>
        </div>
      ) : tipo === "personalizado" ? (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Labeled label="Total de sessões">
            <Input type="number" min={1} max={500} value={props.totalSessoes} onChange={(e) => props.setTotalSessoes(e.target.value)} placeholder="12" />
          </Labeled>
          <div />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Labeled label={valorLabel}>
          <Input type="number" min={0} step="0.01" value={props.valor} onChange={(e) => props.setValor(e.target.value)} />
        </Labeled>
        <Labeled label="Desconto (%)">
          <Input type="number" min={0} max={100} step="0.1" value={props.desconto} onChange={(e) => props.setDesconto(e.target.value)} />
        </Labeled>
        <Labeled label="Dia de vencimento">
          <Input type="number" min={1} max={28} value={props.diaVencimento} onChange={(e) => props.setDiaVencimento(e.target.value)} />
        </Labeled>
        <Labeled label="Início">
          <Input type="date" value={props.inicio} onChange={(e) => props.setInicio(e.target.value)} />
        </Labeled>
        <Labeled label="Forma de pagamento">
          <Select value={props.forma} onChange={(e) => props.setForma(e.target.value)}>
            {FORMAS.map((f) => (
              <option key={f} value={f}>
                {f === FORMA_CREDITO_TOTAL ? `${f} (${formatBRL(totalPlano)})` : f}
              </option>
            ))}
          </Select>
        </Labeled>
        {tipo === "fixo" ? (
          <Labeled label="Número de parcelas">
            <div className="flex h-11 w-full items-center rounded-[var(--radius-md)] border border-border bg-accent-soft px-3 text-sm text-text-primary shadow-[var(--shadow-sm)]">
              {parcelasLabel(numeroParcelas)}
            </div>
          </Labeled>
        ) : <div />}
      </div>

      {tipo === "fixo" && props.fim ? (
        <p className="mt-3 text-xs text-text-secondary">
          Término calculado: <span className="text-text-primary">{formatDateBR(props.fim)}</span>. A cobrança mensal
          encerra automaticamente nessa data.
        </p>
      ) : (
        <p className="mt-3 text-xs text-text-secondary">
          Forma de pagamento é informativa nesta fase (sem gateway). O lançamento a receber é criado na competência do início.
        </p>
      )}
    </div>
  );
}

function Step4({
  pessoa, plano, valor, desconto, diaVencimento, inicio, forma, periodicidade, numeroParcelas, modelos, modeloId, setModeloId,
}: {
  pessoa: PessoaListItem | null; plano: PlanoRow | null;
  valor: string; desconto: string; diaVencimento: string; inicio: string;
  forma: string; periodicidade: Periodicidade; numeroParcelas: number;
  modelos: Modelo[]; modeloId: string | null; setModeloId: (id: string | null) => void;
}) {
  const tipo = plano?.tipo ?? "fixo";
  const total = forma === FORMA_CREDITO_TOTAL
    ? valorTotalPlano(tipo, periodicidade, valor, desconto)
    : valorLiquido(valor, desconto);
  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Revise o que será criado antes de confirmar.</h1>
      <p className="mt-2 text-sm text-text-secondary">A confirmação cria matrícula, lançamento a receber e contrato em rascunho.</p>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-md)] border border-border">
        <RevRow label="Cliente" value={pessoa?.nome ?? "—"} />
        <RevRow
          label="Plano"
          value={plano?.nome ?? "—"}
        />
        <RevRow
          label="Condição"
          value={`${formatBRL(total)} · ${parcelasLabel(numeroParcelas)} · ${forma === FORMA_CREDITO_TOTAL ? FORMA_CREDITO_TOTAL : `vencimento dia ${diaVencimento}`} · início ${inicio}`}
        />
      </div>

      <div className="mt-5">
        <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">Modelo de contrato</p>
        <Select value={modeloId ?? ""} onChange={(e) => setModeloId(e.target.value || null)}>
          <option value="">Sem contrato por agora</option>
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Select>
        <p className="mt-1.5 text-xs text-text-secondary">
          {modelos.length === 0
            ? "Nenhum modelo compatível. Você pode gerar o contrato depois na ficha do cliente."
            : "O contrato é criado em rascunho a partir do modelo escolhido."}
        </p>
      </div>
    </div>
  );
}

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];
const FULL_HOURS = Array.from({ length: 15 }, (_, index) => index + 6);

function weekdayFromISO(iso: string): number {
  const day = new Date(`${iso}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

function defaultScheduleSlots(inicio: string, count: number) {
  const baseWeekday = Math.min(5, Math.max(1, weekdayFromISO(inicio)));
  return Array.from({ length: count }, (_, index) => ({
    weekday: Math.min(5, baseWeekday + index),
    hour: 8,
  }));
}

function servicosDoPlano(plano: PlanoRow, options: AgendaScheduleOptions) {
  const servicoIds = new Set(plano.servicos);
  const byPlan = options.servicos.filter((servico) => servicoIds.has(servico.id));
  if (byPlan.length) return byPlan;

  const planoPilares = new Set([plano.pilar, ...plano.servicosMeta.map((s) => s.pilar)].filter(Boolean) as Pilar[]);
  const byPilar = options.servicos.filter((servico) => planoPilares.has(servico.pilar));
  return byPilar.length ? byPilar : options.servicos;
}

function HorariosPlanoModal({
  sale,
  pessoaNome,
  plano,
  options,
  onClose,
  onDone,
}: {
  sale: CreatedSale;
  pessoaNome: string;
  plano: PlanoRow;
  options: AgendaScheduleOptions;
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const servicos = useMemo(() => servicosDoPlano(plano, options), [plano, options]);
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [salaId, setSalaId] = useState("");
  const [slots, setSlots] = useState(() => defaultScheduleSlots(sale.inicio, sale.sessoesSemana));
  const [error, setError] = useState<string | null>(null);
  const selectedServico = servicos.find((s) => s.id === servicoId) ?? null;

  function setSlot(index: number, patch: Partial<(typeof slots)[number]>) {
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function salvar() {
    setError(null);
    if (!servicoId) { setError("Selecione um serviço para criar os cards da agenda."); return; }
    startTransition(async () => {
      const result = await criarHorariosPlano({
        matricula_id: sale.matriculaId,
        servico_id: servicoId,
        sala_id: salaId || null,
        slots,
      });
      if (!result.success) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      eyebrow="Agenda fixa"
      title="Definir horários das sessões"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Agendar depois</Button>
          <Button onClick={salvar} disabled={pending}>{pending ? "Criando agenda…" : "Confirmar horários"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <p className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}

        <div className="rounded-[var(--radius-md)] border border-border bg-accent-soft/40 px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{pessoaNome}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {plano.nome} · {sale.sessoesSemana}x/semana · {formatDateBR(sale.inicio)} até {formatDateBR(sale.fim)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ScheduleField label="Serviço">
            <Select value={servicoId} onChange={(event) => setServicoId(event.target.value)}>
              {servicos.length === 0 ? <option value="">Nenhum serviço ativo</option> : null}
              {servicos.map((servico) => <option key={servico.id} value={servico.id}>{servico.nome}</option>)}
            </Select>
            {selectedServico ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ServicoBadge nome={selectedServico.nome} corToken={selectedServico.cor_token} pilar={selectedServico.pilar} />
                <span className="text-xs text-text-secondary">{selectedServico.capacidade_slot}/slot</span>
              </div>
            ) : null}
          </ScheduleField>
          <ScheduleField label="Sala">
            <Select value={salaId} onChange={(event) => setSalaId(event.target.value)}>
              <option value="">Sem sala</option>
              {options.salas.map((sala) => <option key={sala.id} value={sala.id}>{sala.nome}</option>)}
            </Select>
          </ScheduleField>
        </div>

        <div className="flex flex-col gap-3">
          {slots.map((slot, index) => (
            <div key={index} className="grid grid-cols-[88px_1fr_120px] items-end gap-3">
              <div className="pb-3 text-xs font-medium text-text-secondary">Sessão {index + 1}</div>
              <ScheduleField label="Dia fixo">
                <Select value={String(slot.weekday)} onChange={(event) => setSlot(index, { weekday: Number(event.target.value) })}>
                  {WEEKDAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </Select>
              </ScheduleField>
              <ScheduleField label="Hora">
                <Select value={String(slot.hour)} onChange={(event) => setSlot(index, { hour: Number(event.target.value) })}>
                  {FULL_HOURS.map((hour) => (
                    <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>
                  ))}
                </Select>
              </ScheduleField>
            </div>
          ))}
        </div>

        <p className="text-xs text-text-secondary">
          Cada sessão será criada com 1h de duração e início em hora cheia.
        </p>
      </div>
    </Dialog>
  );
}

function ScheduleField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">{label}</p>
      {children}
    </div>
  );
}

function SummaryBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="crm-label text-[9px] tracking-[1.5px] text-accent">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">{label}</p>
      {children}
    </div>
  );
}

function RevRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
      <span className="crm-label text-[10px] tracking-[1.2px] text-text-secondary">{label}</span>
      <span className="text-right text-sm text-text-primary">{value}</span>
    </div>
  );
}
