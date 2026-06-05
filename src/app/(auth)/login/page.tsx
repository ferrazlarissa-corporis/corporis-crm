import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh grid-cols-[55fr_45fr] overflow-hidden bg-background max-lg:grid-cols-1">
      <section className="relative grid grid-rows-[auto_1fr_auto] overflow-hidden bg-brand-espresso px-[72px] py-12 text-[var(--fg-on-dark)] max-lg:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(234,215,172,0.04)_1px,transparent_1px)] [background-size:3px_3px]" />
        <div className="absolute -left-[20%] -top-[20%] h-[80%] w-[80%] rounded-[var(--radius-pill)] bg-[radial-gradient(circle_at_center,rgba(234,215,172,0.06),transparent_60%)]" />

        <div className="relative flex justify-center pt-6">
          <Image
            src="/brand/logo-branco.svg"
            alt="Corporis Fisioterapia e Pilates"
            width={220}
            height={90}
            priority
          />
        </div>

        <div className="relative mx-auto flex max-w-[560px] flex-col items-center justify-center gap-6 text-center">
          <h1 className="font-display text-[clamp(44px,4.6vw,64px)] leading-[1.08] text-[var(--color-fundo-claro)]">
            Captação com cuidado, técnica e acolhimento.
          </h1>
          <svg
            aria-hidden="true"
            className="h-7 w-44 text-primary"
            viewBox="0 0 180 28"
            fill="none"
          >
            <path
              d="M4 18C38 2 74 2 108 16C132 26 153 25 176 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="1 10"
            />
          </svg>
          <p className="max-w-[440px] text-[17px] leading-relaxed text-accent-soft">
            Do primeiro contato no WhatsApp até a avaliação inicial, cada lead
            com o ritmo certo.
          </p>
        </div>

        <footer className="relative flex justify-between text-[10px] uppercase tracking-[1.6px] text-accent-soft/60">
          <span>Corporis CRM</span>
          <span>MVP 0.1</span>
        </footer>
      </section>

      <section className="grid grid-rows-[auto_1fr_auto] px-10 py-8">
        <div className="flex justify-end">
          <div className="inline-flex rounded-[var(--radius-pill)] border border-border bg-card p-1 shadow-sm">
            <span className="rounded-[var(--radius-pill)] bg-accent-soft px-4 py-2 text-[11px] uppercase tracking-[1.8px]">
              Produção
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="crm-card w-full max-w-[420px] p-10">
            <p className="crm-label mb-3 text-accent">Acesso interno</p>
            <h2 className="mb-6 font-display text-[40px] leading-[1.1]">
              Entrar
            </h2>
            <LoginForm />
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary">
          Sem cadastro público. O acesso é criado pela gestão da clínica.
        </p>
      </section>
    </main>
  );
}
