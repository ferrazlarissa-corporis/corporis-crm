"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PILAR_OPTIONS } from "@/lib/cadastros-labels";
import { PESSOA_TIPO_OPTIONS, GENERO_OPTIONS } from "@/lib/clientes-labels";
import type { Pilar, PessoaTipo } from "@/types/database";
import { createCliente, type ClienteInput } from "../actions";

const STEPS = [
  { n: 1, title: "Dados pessoais", hint: "Nome, contato, nascimento" },
  { n: 2, title: "Endereço", hint: "CEP, cidade e bairro" },
  { n: 3, title: "Contexto clínico", hint: "Pilar, queixa e objetivo" },
  { n: 4, title: "Consentimento LGPD", hint: "Autorizações e termo" },
];

type Form = {
  nome: string; nascimento: string; cpf: string; telefone: string; email: string; genero: string;
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
  tipo: PessoaTipo; pilar_principal: "" | Pilar; queixa: string; objetivo: string;
  consentimento: boolean;
};

const EMPTY: Form = {
  nome: "", nascimento: "", cpf: "", telefone: "", email: "", genero: "feminino",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  tipo: "aluna", pilar_principal: "", queixa: "", objetivo: "", consentimento: false,
};

export function CadastroClienteClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canContinue(): boolean {
    if (step === 1) return form.nome.trim().length >= 2;
    if (step === 4) return form.consentimento;
    return true;
  }

  function handleFinish() {
    setError(null);
    const input: ClienteInput = {
      ...form,
      pilar_principal: form.pilar_principal === "" ? null : form.pilar_principal,
    } as ClienteInput;
    startTransition(async () => {
      const r = await createCliente(input);
      if (!r.success) { setError(r.error); return; }
      router.push(r.id ? `/clientes/${r.id}` : "/clientes");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Cadastro de cliente</p>
        <h1 className="mt-2 font-display text-[32px] leading-tight text-text-primary">
          Vamos conhecer a nova cliente.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Quatro etapas curtas. Você pode salvar como rascunho e concluir depois — nada é cobrado nem
          comunicado à cliente neste momento.
        </p>
      </header>

      <div className="grid flex-1 grid-cols-[260px_1fr] gap-6 px-8 py-6">
        {/* Stepper */}
        <aside className="flex flex-col gap-1">
          {STEPS.map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            return (
              <button key={s.n} type="button" onClick={() => s.n <= step && setStep(s.n)}
                className={cn("flex items-start gap-3 rounded-[var(--radius-md)] px-3 py-3 text-left transition-colors",
                  active ? "bg-accent-soft" : "hover:bg-accent-soft/60")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-xs font-medium",
                  done ? "bg-primary text-[var(--color-fundo-claro)]" : active ? "border border-primary text-primary" : "border border-border text-text-secondary")}>
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : s.n}
                </span>
                <span className="min-w-0">
                  <p className={cn("text-sm font-medium", active ? "text-text-primary" : "text-text-secondary")}>{s.title}</p>
                  <p className="text-xs text-text-secondary">{s.hint}</p>
                </span>
              </button>
            );
          })}
        </aside>

        {/* Form */}
        <Card className="flex flex-col p-6">
          <div className="min-h-0 flex-1">
            {step === 1 ? (
              <Section title="Dados pessoais" desc="Como identificamos a cliente em toda a Corporis. Campos com * obrigatórios.">
                <Field label="Nome completo *">
                  <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Amanda Ribeiro de Souza" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Data de nascimento">
                    <Input type="date" value={form.nascimento} onChange={(e) => set("nascimento", e.target.value)} />
                  </Field>
                  <Field label="CPF">
                    <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Telefone / WhatsApp">
                    <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(49) 99999-9999" />
                  </Field>
                  <Field label="E-mail">
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" />
                  </Field>
                </div>
                <Field label="Gênero">
                  <div className="flex flex-wrap gap-2">
                    {GENERO_OPTIONS.map((g) => (
                      <button key={g.value} type="button" onClick={() => set("genero", g.value)}
                        className={cn("rounded-[var(--radius-md)] border px-4 py-2 text-sm transition-colors",
                          form.genero === g.value ? "border-primary bg-accent-soft text-text-primary" : "border-border text-text-secondary hover:bg-accent-soft")}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>
            ) : null}

            {step === 2 ? (
              <Section title="Endereço" desc="Opcional — usado em contratos e documentos fiscais.">
                <div className="grid grid-cols-[160px_1fr] gap-4">
                  <Field label="CEP"><Input value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="89000-000" /></Field>
                  <Field label="Logradouro"><Input value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Rua / Av." /></Field>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-4">
                  <Field label="Número"><Input value={form.numero} onChange={(e) => set("numero", e.target.value)} /></Field>
                  <Field label="Complemento"><Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, bloco…" /></Field>
                </div>
                <div className="grid grid-cols-[1fr_1fr_80px] gap-4">
                  <Field label="Bairro"><Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} /></Field>
                  <Field label="Cidade"><Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} /></Field>
                  <Field label="UF"><Input value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} /></Field>
                </div>
              </Section>
            ) : null}

            {step === 3 ? (
              <Section title="Contexto clínico" desc="Define o pilar e organiza a agenda e o atendimento. Vira a primeira anamnese.">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo de cliente">
                    <Select value={form.tipo} onChange={(e) => set("tipo", e.target.value as PessoaTipo)}>
                      {PESSOA_TIPO_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Pilar principal">
                    <Select value={form.pilar_principal} onChange={(e) => set("pilar_principal", e.target.value as "" | Pilar)}>
                      <option value="">A definir</option>
                      {PILAR_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Queixa principal">
                  <Textarea value={form.queixa} onChange={(e) => set("queixa", e.target.value)} placeholder="O que trouxe a cliente até a Corporis?" />
                </Field>
                <Field label="Objetivo">
                  <Textarea value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="O que ela espera alcançar?" />
                </Field>
              </Section>
            ) : null}

            {step === 4 ? (
              <Section title="Consentimento LGPD" desc="A cliente autoriza o tratamento dos dados pessoais e de saúde pela Corporis.">
                <div className="rounded-[var(--radius-md)] border border-border bg-accent-soft/40 px-4 py-3 text-xs leading-relaxed text-text-secondary">
                  Os dados coletados (cadastrais, clínicos e de evolução) são usados exclusivamente para o
                  acompanhamento na Corporis Fisioterapia e Pilates, guardados com segurança e mantidos pelo
                  prazo legal de retenção do prontuário. A cliente pode solicitar acesso ou correção a qualquer momento.
                </div>
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition-colors",
                  form.consentimento ? "border-primary bg-accent-soft" : "border-border hover:bg-accent-soft")}>
                  <input type="checkbox" className="sr-only" checked={form.consentimento} onChange={(e) => set("consentimento", e.target.checked)} />
                  <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border",
                    form.consentimento ? "border-primary bg-primary" : "border-border")}>
                    {form.consentimento ? <Check className="h-3.5 w-3.5 text-[var(--color-fundo-claro)]" strokeWidth={2.5} /> : null}
                  </span>
                  <span className="text-sm text-text-primary">
                    A cliente consente com o tratamento dos seus dados conforme a LGPD.
                  </span>
                </label>
              </Section>
            ) : null}
          </div>

          {error ? <p className="mt-4 rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-xs text-error">{error}</p> : null}

          <footer className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-text-secondary">Etapa {step} de 4 · {STEPS[step - 1].title}</p>
            <div className="flex gap-3">
              <Button variant="secondary" disabled={step === 1 || pending} onClick={() => setStep((s) => Math.max(1, s - 1))}>Voltar</Button>
              {step < 4 ? (
                <Button disabled={!canContinue()} onClick={() => setStep((s) => Math.min(4, s + 1))}>Avançar</Button>
              ) : (
                <Button disabled={!canContinue() || pending} onClick={handleFinish}>
                  {pending ? "Salvando…" : "Concluir cadastro"}
                </Button>
              )}
            </div>
          </footer>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{desc}</p>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
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
