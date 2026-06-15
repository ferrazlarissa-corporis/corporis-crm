import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { getOnboardingPendentes } from "@/lib/queries/onboarding";

export const metadata = { title: "Onboarding · Corporis" };

const PASSO_LABEL: Record<string, string> = {
  lgpd: "Consentimento LGPD",
  anamnese: "Anamnese",
  plano: "Plano",
  contrato: "Contrato assinado",
  agendamento: "1º agendamento",
};

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function OnboardingPage() {
  const itens = await getOnboardingPendentes();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-8 pb-7 pt-8">
        <p className="crm-label text-[10px] tracking-[2.2px] text-accent">Acompanhamento de clientes</p>
        <h1 className="mt-2 font-display text-[34px] leading-tight text-text-primary">
          Onboarding — feche os primeiros cuidados com clareza.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Clientes ativos com etapas pendentes. Conclua consentimento, anamnese, plano, contrato e o
          primeiro agendamento para uma experiência sem retrabalho.
        </p>
      </header>

      <div className="flex-1 px-8 py-6">
        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-verde)]" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-text-primary">Tudo em dia</p>
            <p className="mt-1 text-xs text-text-secondary">Nenhum cliente com onboarding pendente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {itens.map((item) => {
              const pct = Math.round((item.concluidos / item.total) * 100);
              return (
                <Link key={item.id} href={`/clientes/${item.id}`}
                  className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-5 no-underline shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-soft/40">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-sm text-text-primary">
                    {initials(item.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="truncate font-medium text-text-primary">{item.nome}</p>
                      <span className="text-xs text-text-secondary">{item.concluidos}/{item.total} concluídos</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-[var(--radius-pill)] bg-muted">
                      <div className="h-full rounded-[var(--radius-pill)] bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(item.passos).map(([key, done]) => (
                        <span key={key} className="inline-flex items-center gap-1.5 text-xs">
                          {done ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-verde)]" strokeWidth={1.5} />
                            : <Circle className="h-3.5 w-3.5 text-text-secondary" strokeWidth={1.5} />}
                          <span className={done ? "text-text-secondary line-through" : "text-text-primary"}>{PASSO_LABEL[key]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-text-secondary transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
