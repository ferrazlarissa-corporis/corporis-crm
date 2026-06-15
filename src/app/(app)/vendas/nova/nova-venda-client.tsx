"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PILAR_LABEL } from "@/lib/cadastros-labels";
import { PERIODICIDADE_LABEL, PLANO_TIPO_LABEL, formatBRL } from "@/lib/vendas-labels";
import type { PessoaListItem } from "@/lib/queries/pessoa";
import type { PlanoRow } from "@/lib/queries/planos";
import type { Pilar } from "@/types/database";
import { criarVenda } from "../actions";

type Modelo = { id: string; nome: string; pilares: Pilar[]; planos: string[] };

const FORMAS = ["Pix recorrente", "Cartão recorrente", "Boleto", "Dinheiro"];
const STEPS = ["Cliente", "Plano", "Condições", "Revisão"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NovaVendaClient({
  pessoas,
  planos,
  modelos,
}: {
  pessoas: PessoaListItem[];
  planos: PlanoRow[];
  modelos: Modelo[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pessoaId, setPessoaId] = useState<string | null>(null);
  const [planoId, setPlanoId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [diaVencimento, setDiaVencimento] = useState("10");
  const [inicio, setInicio] = useState(today());
  const [forma, setForma] = useState(FORMAS[0]);
  const [parcelas, setParcelas] = useState("6");
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pessoa = useMemo(() => pessoas.find((p) => p.id === pessoaId) ?? null, [pessoas, pessoaId]);
  const plano = useMemo(() => planos.find((p) => p.id === planoId) ?? null, [planos, planoId]);
  const totalLiquido = Math.max(0, (Number(valor) || 0) - (Number(desconto) || 0));

  const pessoasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pessoas.slice(0, 30);
    return pessoas.filter(
      (p) => p.nome.toLowerCase().includes(q) || (p.telefone ?? "").includes(q),
    ).slice(0, 30);
  }, [pessoas, busca]);

  const modelosCompativeis = useMemo(() => {
    if (!plano) return modelos;
    return modelos.filter(
      (m) =>
        m.planos.includes(plano.id) ||
        (plano.pilar && m.pilares.includes(plano.pilar)) ||
        (m.planos.length === 0 && m.pilares.length === 0),
    );
  }, [modelos, plano]);

  function selectPlano(p: PlanoRow) {
    setPlanoId(p.id);
    setValor(String(p.valor));
  }

  function canContinue(): boolean {
    if (step === 1) return Boolean(pessoaId);
    if (step === 2) return Boolean(planoId);
    if (step === 3) return Number(valor) >= 0 && Number(diaVencimento) >= 1 && Number(diaVencimento) <= 28 && Boolean(inicio);
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
        desconto: Number(desconto) || 0,
        dia_vencimento: Number(diaVencimento),
        inicio,
        modelo_contrato_id: modeloId,
      });
      if (!r.success) { setError(r.error); return; }
      router.push("/vendas");
      router.refresh();
    });
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
              />
            ) : null}
            {step === 2 ? <Step2 planos={planos} planoId={planoId} onSelect={selectPlano} /> : null}
            {step === 3 ? (
              <Step3
                valor={valor} setValor={setValor}
                desconto={desconto} setDesconto={setDesconto}
                diaVencimento={diaVencimento} setDiaVencimento={setDiaVencimento}
                inicio={inicio} setInicio={setInicio}
                forma={forma} setForma={setForma}
                parcelas={parcelas} setParcelas={setParcelas}
              />
            ) : null}
            {step === 4 ? (
              <Step4
                pessoa={pessoa} plano={plano}
                valor={valor} desconto={desconto} diaVencimento={diaVencimento} inicio={inicio}
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
                  <p className="text-xs text-text-secondary">
                    {PLANO_TIPO_LABEL[plano.tipo]} · {PERIODICIDADE_LABEL[plano.periodicidade]}
                  </p>
                </>
              ) : <p className="text-xs text-text-secondary">Nenhum plano selecionado</p>}
            </SummaryBlock>

            <SummaryBlock label="Financeiro">
              {plano ? (
                <>
                  <p className="text-sm text-text-primary">{formatBRL(Number(valor) || 0)} · vencimento dia {diaVencimento}</p>
                  <p className="text-xs text-text-secondary">{parcelas} parcelas · {forma}</p>
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
    </div>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────────

function Step1({
  pessoas, pessoaId, onSelect, busca, setBusca,
}: {
  pessoas: PessoaListItem[]; pessoaId: string | null; onSelect: (id: string) => void;
  busca: string; setBusca: (v: string) => void;
}) {
  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Escolha a cliente para iniciar a adesão.</h1>
      <p className="mt-2 text-sm text-text-secondary">Busque uma cliente já cadastrada por nome ou telefone.</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" />
      </div>

      <div className="mt-4 flex max-h-[46vh] flex-col gap-2 overflow-y-auto crm-scrollbar pr-1">
        {pessoas.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhuma cliente encontrada.</p>
        ) : pessoas.map((p) => (
          <button key={p.id} type="button" onClick={() => onSelect(p.id)}
            className={cn("flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
              pessoaId === p.id ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft")}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{p.nome}</p>
              <p className="text-xs text-text-secondary">
                {p.telefone ?? "sem telefone"}{p.pilar_principal ? ` · ${PILAR_LABEL[p.pilar_principal]}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-[var(--radius-pill)] bg-card px-2.5 py-0.5 text-[11px] text-text-secondary">
              {p.status === "cliente_ativo" ? "Cliente ativa" : p.status === "lead" ? "Lead" : "Inativa"}
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
        ) : planos.map((p) => (
          <button key={p.id} type="button" onClick={() => onSelect(p)}
            className={cn("rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
              planoId === p.id ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft")}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-text-primary">{p.nome}</p>
              <span className="shrink-0 rounded-[var(--radius-pill)] bg-card px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                {PLANO_TIPO_LABEL[p.tipo]}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {formatBRL(p.valor)} · {PERIODICIDADE_LABEL[p.periodicidade]}
              {p.sessoes_semana != null ? ` · ${p.sessoes_semana}x/semana` : ""}
              {p.pilar ? ` · ${PILAR_LABEL[p.pilar]}` : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3(props: {
  valor: string; setValor: (v: string) => void;
  desconto: string; setDesconto: (v: string) => void;
  diaVencimento: string; setDiaVencimento: (v: string) => void;
  inicio: string; setInicio: (v: string) => void;
  forma: string; setForma: (v: string) => void;
  parcelas: string; setParcelas: (v: string) => void;
}) {
  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Ajuste as condições comerciais com clareza.</h1>
      <p className="mt-2 text-sm text-text-secondary">Valor, desconto, vencimento e parcelas alimentam os lançamentos a receber.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Labeled label="Valor do plano (R$)">
          <Input type="number" min={0} step="0.01" value={props.valor} onChange={(e) => props.setValor(e.target.value)} />
        </Labeled>
        <Labeled label="Desconto (R$)">
          <Input type="number" min={0} step="0.01" value={props.desconto} onChange={(e) => props.setDesconto(e.target.value)} />
        </Labeled>
        <Labeled label="Dia de vencimento">
          <Input type="number" min={1} max={28} value={props.diaVencimento} onChange={(e) => props.setDiaVencimento(e.target.value)} />
        </Labeled>
        <Labeled label="Início">
          <Input type="date" value={props.inicio} onChange={(e) => props.setInicio(e.target.value)} />
        </Labeled>
        <Labeled label="Forma de pagamento">
          <Select value={props.forma} onChange={(e) => props.setForma(e.target.value)}>
            {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </Labeled>
        <Labeled label="Número de parcelas">
          <Input type="number" min={1} max={48} value={props.parcelas} onChange={(e) => props.setParcelas(e.target.value)} />
        </Labeled>
      </div>
      <p className="mt-3 text-xs text-text-secondary">
        Forma de pagamento e parcelas são informativas nesta fase (sem gateway). O 1º lançamento a receber
        é criado na competência do início.
      </p>
    </div>
  );
}

function Step4({
  pessoa, plano, valor, desconto, diaVencimento, inicio, modelos, modeloId, setModeloId,
}: {
  pessoa: PessoaListItem | null; plano: PlanoRow | null;
  valor: string; desconto: string; diaVencimento: string; inicio: string;
  modelos: Modelo[]; modeloId: string | null; setModeloId: (id: string | null) => void;
}) {
  const liquido = Math.max(0, (Number(valor) || 0) - (Number(desconto) || 0));
  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight text-text-primary">Revise o que será criado antes de confirmar.</h1>
      <p className="mt-2 text-sm text-text-secondary">A confirmação cria matrícula, lançamento a receber e contrato em rascunho.</p>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-md)] border border-border">
        <RevRow label="Cliente" value={pessoa?.nome ?? "—"} />
        <RevRow label="Plano" value={plano?.nome ?? "—"} />
        <RevRow label="Condição" value={`${formatBRL(liquido)} · vencimento dia ${diaVencimento} · início ${inicio}`} />
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

function RevRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
      <span className="crm-label text-[10px] tracking-[1.2px] text-text-secondary">{label}</span>
      <span className="text-right text-sm text-text-primary">{value}</span>
    </div>
  );
}
