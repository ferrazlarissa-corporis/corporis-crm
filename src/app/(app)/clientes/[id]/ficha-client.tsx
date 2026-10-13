"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pencil, CalendarPlus, FileSignature, MessageCircle, Phone, Mail, MapPin,
  CheckCircle2, Circle, Upload, Download, Link2, Copy, FileText, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { PilarBadge, colorTokenForPlano, taxonomyAccentStyle } from "@/components/corporis/taxonomy-badges";
import { cn } from "@/lib/utils";
import { PILAR_OPTIONS } from "@/lib/cadastros-labels";
import { PERIODICIDADE_LABEL, PLANO_TIPO_LABEL, formatBRL, MATRICULA_STATUS_LABEL } from "@/lib/vendas-labels";
import { PESSOA_STATUS_LABEL, PESSOA_ORIGEM_OPTIONS, ORIGEM_DETALHE_LABEL } from "@/lib/clientes-labels";
import type { FichaCliente } from "@/lib/queries/ficha-cliente";
import type { Pilar, PessoaOrigem, LancamentoStatus, ContratoStatus, DocumentoTipo } from "@/types/database";
import { updateCliente, type ClienteUpdateInput } from "../actions";
import {
  marcarLancamentoRecebido, adicionarEvolucao, uploadDocumento,
  getDocumentoUrl, gerarContrato, cancelarMatricula, pausarMatricula, retomarMatricula,
  gerarLinkAnamnese, getAnamnesePdfUrl,
  regenerarContrato, atualizarStatusContrato, anexarViaAssinada, getViaAssinadaUrl,
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
  initialTab = "visao",
}: {
  ficha: FichaCliente;
  modelos: { id: string; nome: string }[];
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { pessoa } = ficha;

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
              <Badge tone={pessoa.status === "cliente_ativo" && ficha.matricula?.status !== "pausada" ? "verde" : "neutro"}>
                {ficha.matricula?.status === "pausada" ? "Pausado" : PESSOA_STATUS_LABEL[pessoa.status]}
              </Badge>
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
    profissao: pessoa.profissao,
    pilar_principal: pessoa.pilar_principal,
    origem: pessoa.origem,
    origem_detalhe: pessoa.origem_detalhe ?? "",
    cep: endereco?.cep ?? "",
    logradouro: endereco?.logradouro ?? "",
    numero: endereco?.numero ?? "",
    complemento: endereco?.complemento ?? "",
    bairro: endereco?.bairro ?? "",
    cidade: endereco?.cidade ?? "",
    uf: endereco?.uf ?? "",
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
          <Field label="Profissão"><Input value={form.profissao ?? ""} onChange={(e) => setForm({ ...form, profissao: e.target.value })} /></Field>
          <Field label="Onde nos conheceu?">
            <Select value={form.origem ?? ""} onChange={(e) => setForm({ ...form, origem: (e.target.value || null) as PessoaOrigem | null })}>
              <option value="">Não informado</option>
              {PESSOA_ORIGEM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          {form.origem && ORIGEM_DETALHE_LABEL[form.origem] ? (
            <Field label={ORIGEM_DETALHE_LABEL[form.origem]!}>
              <Input value={form.origem_detalhe ?? ""} onChange={(e) => setForm({ ...form, origem_detalhe: e.target.value })} placeholder="Nome" />
            </Field>
          ) : null}
          <Field label="Pilar principal">
            <Select value={form.pilar_principal ?? ""} onChange={(e) => setForm({ ...form, pilar_principal: (e.target.value || null) as Pilar | null })}>
              <option value="">A definir</option>
              {PILAR_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <SectionTitle>Endereço</SectionTitle>
          <p className="mt-1 text-xs text-text-secondary">Usado nos contratos. Confira CEP e número antes de imprimir.</p>
          <div className="mt-3 grid grid-cols-[160px_1fr] gap-4">
            <Field label="CEP"><Input value={form.cep ?? ""} onChange={(e) => setForm({ ...form, cep: e.target.value })} placeholder="89820-000" /></Field>
            <Field label="Logradouro"><Input value={form.logradouro ?? ""} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} placeholder="Rua / Av." /></Field>
          </div>
          <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
            <Field label="Número"><Input value={form.numero ?? ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></Field>
            <Field label="Complemento"><Input value={form.complemento ?? ""} onChange={(e) => setForm({ ...form, complemento: e.target.value })} placeholder="Apto, bloco…" /></Field>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_1fr_80px] gap-4">
            <Field label="Bairro"><Input value={form.bairro ?? ""} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></Field>
            <Field label="Cidade"><Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></Field>
            <Field label="UF"><Input value={form.uf ?? ""} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0, 2) })} /></Field>
          </div>
        </div>

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

  function alternarPausa() {
    if (!m) return;
    const pausada = m.status === "pausada";
    if (!confirm(pausada ? "Retomar o plano? O término será estendido pelos dias pausados." : "Pausar o plano? O prazo fica congelado até retomar.")) return;
    startTransition(async () => {
      await (pausada ? retomarMatricula : pausarMatricula)(m.id, ficha.pessoa.id);
      router.refresh();
    });
  }

  if (!m?.plano) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-medium text-text-primary">Nenhum plano ativo</p>
        <p className="mt-1 text-xs text-text-secondary">Inicie uma adesão para vincular um plano.</p>
        <Button size="sm" className="mt-4" asChild>
          <Link href={`/clientes/${ficha.pessoa.id}/nova-venda`}>Nova venda</Link>
        </Button>
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
          <Mini label="Término" value={m.status === "pausada" ? `${fmt(m.fim)} · congelado desde ${fmt(m.pausada_em)}` : fmt(m.fim)} />
          <Mini label="Vencimento" value={m.dia_vencimento ? `dia ${m.dia_vencimento}` : "—"} />
          <Mini label="Frequência" value={m.sessoes_semana ? `${m.sessoes_semana}x/semana` : "—"} />
          <Mini label="Pagamento" value={m.forma_pagamento ?? "—"} />
          <Mini label="Cobrança" value={m.cobranca_modo ? (m.cobranca_modo === "parcelada_mensal" ? "Parcelada mensal" : "Única") : "—"} />
        </div>

        <div className="mt-6 flex gap-3 border-t border-border pt-4">
          <Button size="sm" asChild>
            <Link href={`/clientes/${ficha.pessoa.id}/nova-venda`}>Trocar / renovar</Link>
          </Button>
          <Button size="sm" variant="secondary" onClick={alternarPausa} disabled={pending}>
            {m.status === "pausada" ? "Retomar plano" : "Pausar plano"}
          </Button>
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

// ─── Anamnese (link público + visualização) ────────────────────────────────────

const ANAMNESE_ORIGEM_LABEL: Record<string, string> = { staff: "Preenchida pela recepção", publico: "Preenchida pelo cliente via link" };

function Anamnese({ ficha }: { ficha: FichaCliente }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expiraEm: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function gerarLink() {
    setError(null);
    startTransition(async () => {
      const r = await gerarLinkAnamnese(ficha.pessoa.id);
      if (!r.success) { setError(r.error); return; }
      setLink({ url: r.url, expiraEm: r.expiraEm });
      setCopied(false);
    });
  }

  function abrirPdf(path: string) {
    startTransition(async () => {
      const r = await getAnamnesePdfUrl(ficha.pessoa.id, path);
      if (r.success) window.open(r.url, "_blank", "noopener");
      else setError(r.error);
    });
  }

  async function copiarLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
  }

  const atual = ficha.anamnese;

  return (
    <div className="max-w-3xl">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Anamnese</SectionTitle>
          <Button size="sm" onClick={gerarLink} disabled={pending}>
            <Link2 className="h-4 w-4" strokeWidth={1.5} />Gerar link para o cliente
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

        {!atual ? (
          <p className="mt-4 py-8 text-center text-sm text-text-secondary">
            Nenhuma ficha de anamnese ainda. Gere um link e envie para o cliente preencher e assinar.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3">
            <div className="text-xs text-text-secondary">
              <p className="text-text-primary">
                Versão {atual.versao} · {ANAMNESE_ORIGEM_LABEL[atual.origem] ?? atual.origem}
              </p>
              <p>
                {atual.assinado_at ? `Assinada em ${fmt(atual.assinado_at, "dd/MM/yyyy 'às' HH:mm")}` : `Atualizada ${fmt(atual.updated_at)}`}
              </p>
            </div>
            {atual.pdf_path ? (
              <Button size="sm" variant="secondary" onClick={() => abrirPdf(atual.pdf_path!)} disabled={pending}>
                <FileText className="h-4 w-4" strokeWidth={1.5} />Ver PDF assinado
              </Button>
            ) : (
              <span className="text-xs text-text-secondary">Ficha antiga, sem PDF assinado</span>
            )}
          </div>
        )}
      </Card>

      {ficha.anamneseHistorico.length > 1 ? (
        <Card className="mt-4 p-6">
          <SectionTitle>Histórico de versões</SectionTitle>
          <div className="mt-3 flex flex-col gap-2">
            {ficha.anamneseHistorico.map((v) => (
              <div key={v.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                <span className="text-text-secondary">
                  Versão {v.versao} · {fmt(v.created_at, "dd/MM/yyyy 'às' HH:mm")} · {ANAMNESE_ORIGEM_LABEL[v.origem] ?? v.origem}
                </span>
                {v.pdf_path ? (
                  <Button size="sm" variant="secondary" onClick={() => abrirPdf(v.pdf_path!)} disabled={pending}>
                    <FileText className="h-4 w-4" strokeWidth={1.5} />PDF
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Dialog open={!!link} onClose={() => setLink(null)} eyebrow="Anamnese" title="Link para o cliente">
        {link ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Envie este link para o cliente preencher e assinar a ficha. Expira em{" "}
              {fmt(link.expiraEm, "dd/MM/yyyy 'às' HH:mm")}.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={link.url} className="text-xs" />
              <Button size="sm" variant="secondary" onClick={copiarLink}>
                <Copy className="h-4 w-4" strokeWidth={1.5} />{copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
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
const CONTRATO_LABEL: Record<ContratoStatus, string> = { rascunho: "Rascunho", enviado: "Entregue", assinado: "Assinado", cancelado: "Cancelado" };

const CONTRATO_ETAPAS: { status: Exclude<ContratoStatus, "cancelado">; label: string }[] = [
  { status: "rascunho", label: "Rascunho" },
  { status: "enviado", label: "Entregue para assinatura" },
  { status: "assinado", label: "Assinado" },
];

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
        <p className="mt-3 text-xs text-text-secondary">
          Os campos do modelo são preenchidos com os dados da cliente, do plano e da matrícula. Revise antes de imprimir.
        </p>
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        {ficha.contratos.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">Nenhum contrato gerado.</p>
        ) : ficha.contratos.map((c) => <ContratoCard key={c.id} contrato={c} pessoaId={ficha.pessoa.id} />)}
      </div>
    </div>
  );
}

function ContratoCard({ contrato: c, pessoaId }: { contrato: FichaCliente["contratos"][number]; pessoaId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cancelado = c.status === "cancelado";
  const etapaAtual = CONTRATO_ETAPAS.findIndex((e) => e.status === c.status);
  const datas: Record<string, string | null> = { rascunho: c.created_at, enviado: c.enviado_at, assinado: c.assinado_at };

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) { setError(r.error ?? "Não foi possível concluir."); return; }
      router.refresh();
    });
  }

  function cancelar() {
    if (!window.confirm("Cancelar este contrato? Essa ação não pode ser desfeita.")) return;
    run(() => atualizarStatusContrato(c.id, pessoaId, "cancelado"));
  }

  function anexar(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("contrato_id", c.id);
    fd.set("pessoa_id", pessoaId);
    fd.set("file", file);
    run(() => anexarViaAssinada(fd));
  }

  function verVia() {
    startTransition(async () => {
      const r = await getViaAssinadaUrl(c.id, pessoaId);
      if (r.success) window.open(r.url, "_blank", "noopener");
      else setError(r.error);
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-primary">{c.modelo?.nome ?? "Contrato"}</p>
          <p className="text-xs text-text-secondary">Criado em {fmt(c.created_at)}</p>
        </div>
        <span className={cn("rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[11px] font-medium", CONTRATO_STYLE[c.status])}>
          {CONTRATO_LABEL[c.status]}
        </span>
      </div>

      {!cancelado ? (
        <ol className="mt-4 flex items-center gap-2">
          {CONTRATO_ETAPAS.map((e, i) => {
            const feito = i <= etapaAtual;
            return (
              <li key={e.status} className="flex flex-1 items-center gap-2">
                {feito ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} /> : <Circle className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.5} />}
                <div className="min-w-0">
                  <p className={cn("text-xs", feito ? "text-text-primary" : "text-text-secondary")}>{e.label}</p>
                  {datas[e.status] ? <p className="text-[11px] text-text-secondary">{fmt(datas[e.status], "dd/MM · HH:mm")}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {c.corpo_gerado ? (
        <details className="mt-4 rounded-[var(--radius-md)] border border-border bg-background">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-secondary">Pré-visualizar texto</summary>
          <div className="max-h-80 overflow-y-auto whitespace-pre-wrap border-t border-border px-4 py-3 text-xs leading-relaxed text-text-primary">
            {c.corpo_gerado}
          </div>
        </details>
      ) : (
        <p className="mt-4 text-xs text-text-secondary">Texto ainda não gerado para este contrato.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => window.open(`/contrato/${c.id}`, "_blank", "noopener")} disabled={pending || !c.modelo}>
          <Printer className="h-4 w-4" strokeWidth={1.5} />Imprimir / PDF
        </Button>

        {c.status === "rascunho" ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => run(() => regenerarContrato(c.id, pessoaId))} disabled={pending}>
              Atualizar com dados atuais
            </Button>
            <Button size="sm" onClick={() => run(() => atualizarStatusContrato(c.id, pessoaId, "enviado"))} disabled={pending}>
              Marcar como entregue
            </Button>
          </>
        ) : null}

        {c.status === "enviado" ? (
          <>
            <label className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] bg-primary px-3 text-xs font-medium text-[var(--color-fundo-claro)]", pending && "pointer-events-none opacity-60")}>
              <Upload className="h-4 w-4" strokeWidth={1.5} />Anexar via assinada
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { anexar(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <Button size="sm" variant="secondary" onClick={() => run(() => atualizarStatusContrato(c.id, pessoaId, "assinado"))} disabled={pending}>
              Marcar como assinado
            </Button>
          </>
        ) : null}

        {c.via_assinada_url ? (
          <Button size="sm" variant="secondary" onClick={verVia} disabled={pending}>
            <FileText className="h-4 w-4" strokeWidth={1.5} />Ver via assinada
          </Button>
        ) : null}

        {c.status === "assinado" && !c.via_assinada_url ? (
          <label className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border border-border px-3 text-xs font-medium text-text-primary", pending && "pointer-events-none opacity-60")}>
            <Upload className="h-4 w-4" strokeWidth={1.5} />Anexar via assinada
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(e) => { anexar(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        ) : null}

        {c.status === "rascunho" || c.status === "enviado" ? (
          <Button size="sm" variant="ghost" onClick={cancelar} disabled={pending} className="ml-auto text-error">
            Cancelar contrato
          </Button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
    </Card>
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
