"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pencil, CalendarPlus, FileSignature, MessageCircle, Phone, Mail, MapPin,
  CheckCircle2, Circle, Upload, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PilarBadge, colorTokenForPlano, taxonomyAccentStyle } from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import { PILAR_OPTIONS } from "@/lib/cadastros-labels";
import { PERIODICIDADE_LABEL, PLANO_TIPO_LABEL, formatBRL, MATRICULA_STATUS_LABEL } from "@/lib/vendas-labels";
import { PESSOA_STATUS_LABEL, PESSOA_TIPO_OPTIONS, termoCliente } from "@/lib/clientes-labels";
import type { FichaCliente } from "@/lib/queries/ficha-cliente";
import type { Pilar, PessoaTipo, LancamentoStatus, ContratoStatus, DocumentoTipo } from "@/types/database";
import { updateCliente, type ClienteUpdateInput } from "../actions";
import {
  marcarLancamentoRecebido, salvarAnamnese, adicionarEvolucao, uploadDocumento,
  getDocumentoUrl, gerarContrato, cancelarMatricula,
} from "./ficha-actions";

type Tab = "visao" | "dados" | "plano" | "financeiro" | "anamnese" | "prontuario" | "documentos" | "contrato";
const TABS: { id: Tab; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "dados", label: "Dados pessoais" },
  { id: "plano", label: "Plano ativo" },
  { id: "financeiro", label: "Financeiro" },
  { id: "anamnese", label: "Anamnese" },
  { id: "prontuario", label: "Prontuário" },
  { id: "documentos", label: "Documentos" },
  { id: "contrato", label: "Contrato" },
];

const ONBOARDING = [
  { key: "cadastro", label: "Cadastro completo" },
  { key: "lgpd", label: "Termo de consentimento LGPD" },
  { key: "anamnese", label: "Anamnese preenchida" },
  { key: "plano", label: "Plano contratado" },
  { key: "contrato", label: "Contrato assinado" },
];

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function fmt(d: string | null, p = "dd/MM/yyyy") {
  return d ? format(new Date(d), p, { locale: ptBR }) : "—";
}

export function FichaClienteClient({
  ficha,
  modelos,
}: {
  ficha: FichaCliente;
  modelos: { id: string; nome: string }[];
}) {
  const [tab, setTab] = useState<Tab>("visao");
  const { pessoa } = ficha;
  const termo = termoCliente(pessoa.tipo, pessoa.pilar_principal);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 pb-0 pt-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-xl text-text-primary">
            {initials(pessoa.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[28px] leading-none text-text-primary">{pessoa.nome}</h1>
              <Badge tone={pessoa.status === "cliente_ativo" ? "verde" : "neutro"}>
                {PESSOA_STATUS_LABEL[pessoa.status]}
              </Badge>
              <Badge tone="neutro">{termo === "paciente" ? "Paciente" : termo === "aluna" ? "Aluna" : "Cliente"}</Badge>
              {pessoa.pilar_principal ? <PilarBadge pilar={pessoa.pilar_principal} /> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
              {pessoa.telefone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" strokeWidth={1.5} />{pessoa.telefone}</span> : null}
              {pessoa.email ? <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" strokeWidth={1.5} />{pessoa.email}</span> : null}
              {ficha.endereco?.cidade ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />{ficha.endereco.cidade}{ficha.endereco.uf ? ` · ${ficha.endereco.uf}` : ""}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTab("dados")}>
              <Pencil className="h-4 w-4" strokeWidth={1.5} />Editar
            </Button>
            <Button size="sm" asChild>
              <Link href="/agenda"><CalendarPlus className="h-4 w-4" strokeWidth={1.5} />Novo agendamento</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setTab("contrato")}>
              <FileSignature className="h-4 w-4" strokeWidth={1.5} />Gerar contrato
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/inbox"><MessageCircle className="h-4 w-4" strokeWidth={1.5} />Mensagem</Link>
            </Button>
          </div>
        </div>

        <nav className="mt-6 flex gap-1 overflow-x-auto crm-scrollbar">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={cn("relative whitespace-nowrap px-3 py-3 text-sm transition-colors",
                tab === t.id ? "font-medium text-text-primary" : "text-text-secondary hover:text-text-primary")}>
              {t.label}
              {tab === t.id ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-[var(--radius-pill)] bg-primary" /> : null}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 px-8 py-6">
        {tab === "visao" ? <VisaoGeral ficha={ficha} /> : null}
        {tab === "dados" ? <DadosPessoais ficha={ficha} /> : null}
        {tab === "plano" ? <PlanoAtivo ficha={ficha} /> : null}
        {tab === "financeiro" ? <Financeiro ficha={ficha} /> : null}
        {tab === "anamnese" ? <Anamnese ficha={ficha} /> : null}
        {tab === "prontuario" ? <Prontuario ficha={ficha} /> : null}
        {tab === "documentos" ? <Documentos ficha={ficha} /> : null}
        {tab === "contrato" ? <Contrato ficha={ficha} modelos={modelos} /> : null}
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "verde" | "bege" | "neutro" }) {
  const cls = tone === "verde" ? "bg-[var(--color-verde)]/15 text-[var(--color-verde)]"
    : tone === "bege" ? "bg-accent-soft text-text-primary"
    : "bg-accent-soft text-text-secondary";
  return <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium", cls)}>{children}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="crm-label text-[10px] tracking-[1.5px] text-accent">{children}</p>;
}

// ─── Visão geral ──────────────────────────────────────────────────────────────

function VisaoGeral({ ficha }: { ficha: FichaCliente }) {
  const emAberto = ficha.lancamentos.filter((l) => l.status !== "recebido");
  const onboardingDone = onboardingStatus(ficha);
  const matriculaPlano = ficha.matricula?.plano
    ? { ...ficha.matricula.plano, periodicidade: ficha.matricula.periodicidade, tipo: ficha.matricula.tipo }
    : null;

  return (
    <div className="grid grid-cols-[1fr_300px] gap-6">
      <div className="flex flex-col gap-4">
        {/* Plano */}
        <Card className="relative overflow-hidden p-5 pt-6">
          <span
            className="absolute inset-x-0 top-0 h-1"
            style={taxonomyAccentStyle(matriculaPlano ? colorTokenForPlano(matriculaPlano) : "bege")}
          />
          <SectionTitle>Plano ativo</SectionTitle>
          {ficha.matricula?.plano ? (
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <p className="font-display text-xl text-text-primary">{ficha.matricula.plano.nome}</p>
                <p className="text-xs text-text-secondary">
                  {ficha.matricula.periodicidade ? PERIODICIDADE_LABEL[ficha.matricula.periodicidade] : PLANO_TIPO_LABEL[ficha.matricula.tipo]} · início {fmt(ficha.matricula.inicio)}
                </p>
              </div>
              <p className="font-display text-2xl text-text-primary">{formatBRL(ficha.matricula.valor_total ?? ficha.matricula.valor ?? 0)}</p>
            </div>
          ) : <p className="mt-2 text-sm text-text-secondary">Sem plano ativo.</p>}
        </Card>

        {/* Próximos agendamentos */}
        <Card className="p-5">
          <SectionTitle>Próximos agendamentos</SectionTitle>
          {ficha.proximosAgendamentos.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">Nenhum agendamento futuro.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {ficha.proximosAgendamentos.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm">
                  <span className="text-text-primary">{fmt(a.inicio, "EEE, dd/MM 'às' HH:mm")}</span>
                  <span className="text-xs text-text-secondary capitalize">{a.categoria}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Situação financeira */}
        <Card className="p-5">
          <SectionTitle>Situação financeira</SectionTitle>
          <p className={cn("mt-2 text-sm font-medium", emAberto.length ? "text-error" : "text-[var(--color-verde)]")}>
            {emAberto.length ? `${emAberto.length} lançamento(s) em aberto` : "Em dia"}
          </p>
          {emAberto.slice(0, 3).map((l) => (
            <div key={l.id} className="mt-2 flex items-center justify-between text-xs">
              <span className="text-text-secondary">{l.descricao} · vence {fmt(l.vencimento)}</span>
              <span className="text-text-primary">{formatBRL(l.valor)}</span>
            </div>
          ))}
        </Card>

        {/* Onboarding */}
        <Card className="p-5">
          <SectionTitle>Onboarding</SectionTitle>
          <ul className="mt-3 flex flex-col gap-2">
            {ONBOARDING.map((o) => {
              const done = onboardingDone[o.key];
              return (
                <li key={o.key} className="flex items-center gap-2 text-sm">
                  {done ? <CheckCircle2 className="h-4 w-4 text-[var(--color-verde)]" strokeWidth={1.5} />
                    : <Circle className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />}
                  <span className={done ? "text-text-primary" : "text-text-secondary"}>{o.label}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Right rail */}
      <aside className="flex flex-col gap-4">
        <Card className="p-5">
          <SectionTitle>Equipe e rotina</SectionTitle>
          <p className="mt-2 text-sm text-text-primary">{ficha.responsavelNome ?? "Sem responsável"}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <Mini label="Cliente desde" value={fmt(ficha.pessoa.created_at, "MMM/yyyy")} />
            <Mini label="Frequência" value={ficha.matricula?.sessoes_semana ? `${ficha.matricula.sessoes_semana}x/semana` : "—"} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Saúde e objetivo</SectionTitle>
          {ficha.anamnese ? (
            <div className="mt-2 space-y-2 text-xs text-text-secondary">
              {String(ficha.anamnese.dados.queixa_principal ?? "") ? (
                <p><span className="text-text-primary">Queixa:</span> {String(ficha.anamnese.dados.queixa_principal)}</p>
              ) : null}
              {String(ficha.anamnese.dados.objetivo ?? "") ? (
                <p><span className="text-text-primary">Objetivo:</span> {String(ficha.anamnese.dados.objetivo)}</p>
              ) : null}
            </div>
          ) : <p className="mt-2 text-xs text-text-secondary">Anamnese ainda não preenchida.</p>}
        </Card>

        <Card className="p-5">
          <SectionTitle>Documentos</SectionTitle>
          <p className="mt-2 text-sm text-text-primary">{ficha.documentos.length} arquivo(s)</p>
        </Card>
      </aside>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label text-[9px] tracking-[1.2px] text-text-secondary">{label}</p>
      <div className="mt-0.5 text-text-primary">{value}</div>
    </div>
  );
}

function onboardingStatus(ficha: FichaCliente): Record<string, boolean> {
  return {
    cadastro: true,
    lgpd: Boolean(ficha.pessoa.consentimento_lgpd_at),
    anamnese: ficha.anamneseVersoes > 0,
    plano: Boolean(ficha.matricula),
    contrato: ficha.contratos.some((c) => c.status === "assinado"),
  };
}

// ─── Dados pessoais ─────────────────────────────────────────────────────────────

function DadosPessoais({ ficha }: { ficha: FichaCliente }) {
  const router = useRouter();
  const { pessoa, endereco } = ficha;
  const [form, setForm] = useState<ClienteUpdateInput>({
    nome: pessoa.nome,
    cpf: pessoa.cpf,
    nascimento: pessoa.nascimento,
    telefone: pessoa.telefone,
    email: pessoa.email,
    genero: pessoa.genero,
    tipo: pessoa.tipo,
    pilar_principal: pessoa.pilar_principal,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateCliente(pessoa.id, form);
      setMsg(r.success ? "Dados salvos." : r.error);
      if (r.success) router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <SectionTitle>Dados pessoais</SectionTitle>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="CPF"><Input value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
          <Field label="Nascimento"><Input type="date" value={form.nascimento ?? ""} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
          <Field label="E-mail"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Gênero"><Input value={form.genero ?? ""} onChange={(e) => setForm({ ...form, genero: e.target.value })} /></Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as PessoaTipo })}>
              {PESSOA_TIPO_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Pilar principal">
            <Select value={form.pilar_principal ?? ""} onChange={(e) => setForm({ ...form, pilar_principal: (e.target.value || null) as Pilar | null })}>
              <option value="">A definir</option>
              {PILAR_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
        </div>

        {endereco ? (
          <div className="mt-6 border-t border-border pt-4">
            <SectionTitle>Endereço</SectionTitle>
            <p className="mt-2 text-sm text-text-secondary">
              {[endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(", ") || "Não informado"}
              {endereco.cep ? ` · CEP ${endereco.cep}` : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          {msg ? <span className="text-xs text-text-secondary">{msg}</span> : null}
          <Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar dados"}</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Plano ativo ────────────────────────────────────────────────────────────────

function PlanoAtivo({ ficha }: { ficha: FichaCliente }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const m = ficha.matricula;
  const planoColor = m?.plano ? { ...m.plano, periodicidade: m.periodicidade, tipo: m.tipo } : null;

  function cancelar() {
    if (!m) return;
    if (!confirm("Cancelar o plano ativo desta cliente?")) return;
    startTransition(async () => {
      await cancelarMatricula(m.id, ficha.pessoa.id);
      router.refresh();
    });
  }

  if (!m?.plano) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-medium text-text-primary">Nenhum plano ativo</p>
        <p className="mt-1 text-xs text-text-secondary">Inicie uma adesão para vincular um plano.</p>
        <Button size="sm" className="mt-4" asChild><Link href="/vendas/nova">Nova venda</Link></Button>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl">
      <Card className="relative overflow-hidden p-6 pt-7">
        <span
          className="absolute inset-x-0 top-0 h-1.5"
          style={taxonomyAccentStyle(planoColor ? colorTokenForPlano(planoColor) : "bege")}
        />
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-display text-2xl text-text-primary">{m.plano.nome}</p>
            <p className="text-xs text-text-secondary">
              {PLANO_TIPO_LABEL[m.tipo]} · {m.periodicidade ? PERIODICIDADE_LABEL[m.periodicidade] : "sem periodicidade"} · {MATRICULA_STATUS_LABEL[m.status]}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[28px] text-text-primary">{formatBRL(m.valor_total ?? m.valor ?? 0)}</p>
            {m.tipo === "fixo" && m.valor != null ? (
              <p className="text-xs text-text-secondary">{formatBRL(m.valor)}/mês normalizado</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4">
          <Mini label="Início" value={fmt(m.inicio)} />
          <Mini label="Término" value={fmt(m.fim)} />
          <Mini label="Vencimento" value={m.dia_vencimento ? `dia ${m.dia_vencimento}` : "—"} />
          <Mini label="Frequência" value={m.sessoes_semana ? `${m.sessoes_semana}x/semana` : "—"} />
          <Mini label="Pagamento" value={m.forma_pagamento ?? "—"} />
          <Mini label="Cobrança" value={m.cobranca_modo ? (m.cobranca_modo === "parcelada_mensal" ? "Parcelada mensal" : "Única") : "—"} />
        </div>

        <div className="mt-6 flex gap-3 border-t border-border pt-4">
          <Button size="sm" asChild><Link href="/vendas/nova">Trocar / renovar</Link></Button>
          <Button size="sm" variant="ghost" onClick={cancelar} disabled={pending}>
            {pending ? "Cancelando…" : "Cancelar plano"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Financeiro ─────────────────────────────────────────────────────────────────

const LANC_STYLE: Record<LancamentoStatus, string> = {
  a_receber: "bg-accent-soft text-text-secondary",
  recebido: "bg-[var(--color-verde)]/15 text-[var(--color-verde)]",
  atrasado: "bg-error/10 text-error",
};
const LANC_LABEL: Record<LancamentoStatus, string> = { a_receber: "A receber", recebido: "Recebido", atrasado: "Atrasado" };

function Financeiro({ ficha }: { ficha: FichaCliente }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const recebido = ficha.lancamentos.filter((l) => l.status === "recebido").reduce((s, l) => s + l.valor, 0);
  const emAberto = ficha.lancamentos.filter((l) => l.status !== "recebido").reduce((s, l) => s + l.valor, 0);

  function marcar(id: string) {
    startTransition(async () => {
      await marcarLancamentoRecebido(id, ficha.pessoa.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5"><SectionTitle>Recebido (total)</SectionTitle><p className="mt-2 font-display text-2xl text-text-primary">{formatBRL(recebido)}</p></Card>
        <Card className="p-5"><SectionTitle>Em aberto</SectionTitle><p className="mt-2 font-display text-2xl text-error">{formatBRL(emAberto)}</p></Card>
        <Card className="p-5"><SectionTitle>Lançamentos</SectionTitle><p className="mt-2 font-display text-2xl text-text-primary">{ficha.lancamentos.length}</p></Card>
      </div>

      <Card className="overflow-hidden">
        {ficha.lancamentos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-secondary">Nenhum lançamento.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Competência", "Descrição", "Valor", "Vencimento", "Status", ""].map((h) => (
                  <th key={h} className="crm-label px-4 py-3 text-[10px] tracking-[1.2px] text-text-secondary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ficha.lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-secondary">{fmt(l.competencia, "MMM/yyyy")}</td>
                  <td className="px-4 py-3 text-text-primary">{l.descricao}</td>
                  <td className="px-4 py-3 text-text-primary">{formatBRL(l.valor)}</td>
                  <td className="px-4 py-3 text-text-secondary">{fmt(l.vencimento)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium", LANC_STYLE[l.status])}>
                      {LANC_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.status !== "recebido" ? (
                      <button onClick={() => marcar(l.id)} disabled={pending}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
                        Marcar recebido
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-text-secondary">
        Marcar como recebido apenas sinaliza a baixa no Corporis — não dispara cobrança nem notifica a cliente.
      </p>
    </div>
  );
}

// ─── Anamnese ───────────────────────────────────────────────────────────────────

const ANAMNESE_CAMPOS = [
  { key: "queixa_principal", label: "Queixa principal" },
  { key: "objetivo", label: "Objetivo" },
  { key: "historico_relevante", label: "Histórico de saúde" },
  { key: "restricoes", label: "Restrições / pontos de atenção" },
];

function Anamnese({ ficha }: { ficha: FichaCliente }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const initial: Record<string, string> = {};
  ANAMNESE_CAMPOS.forEach((c) => { initial[c.key] = String(ficha.anamnese?.dados[c.key] ?? ""); });
  const [dados, setDados] = useState<Record<string, string>>(initial);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await salvarAnamnese({ pessoa_id: ficha.pessoa.id, dados });
      setMsg(r.success ? "Anamnese salva (nova versão)." : r.error);
      if (r.success) router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <SectionTitle>Anamnese</SectionTitle>
          <span className="text-xs text-text-secondary">
            {ficha.anamnese ? `Versão ${ficha.anamnese.versao} · atualizada ${fmt(ficha.anamnese.updated_at)}` : "Nenhuma versão ainda"}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {ANAMNESE_CAMPOS.map((c) => (
            <Field key={c.key} label={c.label}>
              <Textarea value={dados[c.key]} onChange={(e) => setDados({ ...dados, [c.key]: e.target.value })} />
            </Field>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          {msg ? <span className="text-xs text-text-secondary">{msg}</span> : null}
          <Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar anamnese"}</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Prontuário (evoluções) ─────────────────────────────────────────────────────

function Prontuario({ ficha }: { ficha: FichaCliente }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const r = await adicionarEvolucao({ pessoa_id: ficha.pessoa.id, texto, agendamento_id: null });
      if (!r.success) { setError(r.error); return; }
      setTexto(""); router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <SectionTitle>Nova evolução</SectionTitle>
        <Textarea className="mt-3" value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Registre o atendimento, conduta e observações clínicas." />
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={add} disabled={pending || texto.trim().length < 3}>
            {pending ? "Salvando…" : "Adicionar evolução"}
          </Button>
        </div>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        {ficha.evolucoes.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhuma evolução registrada.</p>
        ) : ficha.evolucoes.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{e.profissional?.nome ?? "Profissional"}</span>
              <span>{fmt(e.created_at, "dd/MM/yyyy 'às' HH:mm")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{e.texto}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Documentos ─────────────────────────────────────────────────────────────────

const DOC_TIPO_LABEL: Record<DocumentoTipo, string> = { exame: "Exame", atestado: "Atestado", laudo: "Laudo", outro: "Outro" };

function Documentos({ ficha }: { ficha: FichaCliente }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo, setTipo] = useState<DocumentoTipo>("exame");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upload() {
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("pessoa_id", ficha.pessoa.id);
    fd.set("tipo", tipo);
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadDocumento(fd);
      if (!r.success) { setError(r.error); return; }
      setFile(null); router.refresh();
    });
  }

  function open(path: string) {
    startTransition(async () => {
      const r = await getDocumentoUrl(ficha.pessoa.id, path);
      if (r.success) window.open(r.url, "_blank", "noopener");
      else setError(r.error);
    });
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <SectionTitle>Enviar documento</SectionTitle>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">Tipo</p>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as DocumentoTipo)} className="w-40">
              {(Object.keys(DOC_TIPO_LABEL) as DocumentoTipo[]).map((t) => <option key={t} value={t}>{DOC_TIPO_LABEL[t]}</option>)}
            </Select>
          </div>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-text-secondary file:mr-3 file:rounded-[var(--radius-md)] file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-sm file:text-text-primary" />
          <Button size="sm" onClick={upload} disabled={pending || !file}>
            <Upload className="h-4 w-4" strokeWidth={1.5} />{pending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
        <p className="mt-2 text-xs text-text-secondary">Bucket privado — arquivos servidos por link temporário assinado.</p>
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        {ficha.documentos.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhum documento enviado.</p>
        ) : ficha.documentos.map((d) => (
          <Card key={d.id} className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-text-primary">{d.nome}</p>
              <p className="text-xs text-text-secondary">{DOC_TIPO_LABEL[d.tipo]} · {fmt(d.created_at)}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => open(d.storage_path)} disabled={pending}>
              <Download className="h-4 w-4" strokeWidth={1.5} />Abrir
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Contrato ───────────────────────────────────────────────────────────────────

const CONTRATO_STYLE: Record<ContratoStatus, string> = {
  rascunho: "bg-accent-soft text-text-secondary",
  enviado: "bg-accent-soft text-text-primary",
  assinado: "bg-[var(--color-verde)]/15 text-[var(--color-verde)]",
  cancelado: "bg-error/10 text-error",
};
const CONTRATO_LABEL: Record<ContratoStatus, string> = { rascunho: "Rascunho", enviado: "Enviado", assinado: "Assinado", cancelado: "Cancelado" };

function Contrato({ ficha, modelos }: { ficha: FichaCliente; modelos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modeloId, setModeloId] = useState<string>(modelos[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function gerar() {
    if (!modeloId) return;
    setError(null);
    startTransition(async () => {
      const r = await gerarContrato(ficha.pessoa.id, modeloId);
      if (!r.success) { setError(r.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <SectionTitle>Gerar contrato</SectionTitle>
        {modelos.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Nenhum modelo ativo. Cadastre em Modelos de contrato.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">Modelo</p>
              <Select value={modeloId} onChange={(e) => setModeloId(e.target.value)} className="w-72">
                {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </Select>
            </div>
            <Button size="sm" onClick={gerar} disabled={pending}>
              {pending ? "Gerando…" : "Gerar rascunho"}
            </Button>
          </div>
        )}
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        {ficha.contratos.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhum contrato gerado.</p>
        ) : ficha.contratos.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-text-primary">{c.modelo?.nome ?? "Contrato"}</p>
              <p className="text-xs text-text-secondary">Criado {fmt(c.created_at)}{c.assinado_at ? ` · assinado ${fmt(c.assinado_at)}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              {c.via_assinada_url ? (
                <a href={c.via_assinada_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">Ver via</a>
              ) : null}
              <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium", CONTRATO_STYLE[c.status])}>
                {CONTRATO_LABEL[c.status]}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="crm-label mb-1.5 text-[10px] tracking-[1.5px] text-text-secondary">{label}</p>
      {children}
    </div>
  );
}
