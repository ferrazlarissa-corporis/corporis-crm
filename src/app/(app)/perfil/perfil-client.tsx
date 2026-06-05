"use client";

import { useActionState } from "react";
import { KeyRound, LogOut, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updatePasswordAction, updateProfileAction, signOutAction, type ProfileActionState } from "./actions";

type ProfileData = {
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  createdAt: string | null;
};

const initialState: ProfileActionState = {};

const ROLE_LABEL: Record<string, string> = {
  staff: "Equipe",
  recepcao: "Recepção",
  profissional: "Profissional",
  gestao: "Gestão",
};

function Initials({ nome }: { nome: string }) {
  const parts = nome.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
    : nome.slice(0, 2);

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-xl font-normal uppercase text-text-primary">
      {initials}
    </div>
  );
}

function FormMessage({ state }: { state: ProfileActionState }) {
  if (!state.error && !state.success) return null;

  return (
    <p className={state.error
      ? "rounded-[var(--radius-md)] border border-[var(--color-ui-error)] bg-card px-3 py-2 text-sm text-[var(--color-ui-error)]"
      : "rounded-[var(--radius-md)] border border-[var(--color-verde)] bg-card px-3 py-2 text-sm text-[#5F7948]"
    }>
      {state.error || state.success}
    </p>
  );
}

export default function PerfilClient({ profile }: { profile: ProfileData }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePasswordAction, initialState);

  const roleLabel = ROLE_LABEL[profile.role] ?? profile.role;
  const createdLabel = profile.createdAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(profile.createdAt))
    : "Sem data";

  return (
    <div className="min-h-dvh bg-background px-8 py-8">
      <div className="mx-auto flex max-w-[980px] flex-col gap-6">
        <header className="flex items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <h1 className="font-display text-[34px] leading-none text-text-primary">
              Perfil
            </h1>
            <p className="mt-3 max-w-[620px] text-sm leading-relaxed text-text-secondary">
              Dados da sua conta interna no Corporis CRM.
            </p>
          </div>

          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              <LogOut className="h-4 w-4" strokeWidth={1.6} />
              Sair
            </Button>
          </form>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Initials nome={profile.nome} />
              <div className="min-w-0">
                <p className="truncate text-lg font-medium text-text-primary">
                  {profile.nome}
                </p>
                <p className="mt-1 truncate text-sm text-text-secondary">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">Perfil</span>
                <Badge>{roleLabel}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">Status</span>
                <Badge className={profile.ativo ? "text-[#5F7948]" : "text-[var(--color-ui-error)]"}>
                  {profile.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-secondary">Criado em</span>
                <span className="text-sm text-text-primary">{createdLabel}</span>
              </div>
            </div>
          </Card>

          <div className="grid gap-5">
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-text-primary">
                  <UserRound className="h-4 w-4" strokeWidth={1.6} />
                </span>
                <div>
                  <h2 className="font-display text-2xl leading-none text-text-primary">
                    Dados pessoais
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Nome e e-mail usados no CRM.
                  </p>
                </div>
              </div>

              <form action={profileAction} className="grid gap-4">
                <input type="hidden" name="currentEmail" value={profile.email} />

                <label className="grid gap-2">
                  <span className="crm-label text-text-secondary">Nome</span>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
                    <Input name="nome" defaultValue={profile.nome} className="pl-10" required />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="crm-label text-text-secondary">E-mail</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
                    <Input name="email" type="email" defaultValue={profile.email} className="pl-10" required />
                  </div>
                </label>

                <FormMessage state={profileState} />

                <div className="flex justify-end">
                  <Button type="submit" disabled={profilePending}>
                    <Save className="h-4 w-4" strokeWidth={1.6} />
                    {profilePending ? "Salvando..." : "Salvar dados"}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-text-primary">
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.6} />
                </span>
                <div>
                  <h2 className="font-display text-2xl leading-none text-text-primary">
                    Segurança
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Atualize sua senha de acesso.
                  </p>
                </div>
              </div>

              <form action={passwordAction} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="crm-label text-text-secondary">Nova senha</span>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
                    <Input name="password" type="password" autoComplete="new-password" className="pl-10" required />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="crm-label text-text-secondary">Confirmar senha</span>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" strokeWidth={1.5} />
                    <Input name="confirmPassword" type="password" autoComplete="new-password" className="pl-10" required />
                  </div>
                </label>

                <FormMessage state={passwordState} />

                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordPending}>
                    <Save className="h-4 w-4" strokeWidth={1.6} />
                    {passwordPending ? "Atualizando..." : "Atualizar senha"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
