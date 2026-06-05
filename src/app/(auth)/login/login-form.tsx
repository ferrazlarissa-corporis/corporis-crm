"use client";

import { useActionState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2">
        <label className="crm-label text-text-secondary" htmlFor="email">
          E-mail
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            strokeWidth={1.5}
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="pl-10"
            placeholder="recepcao@corporis.com.br"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="crm-label text-text-secondary" htmlFor="password">
          Senha
        </label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            strokeWidth={1.5}
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="pl-10"
            required
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-ui-error)] bg-card px-3 py-2 text-sm text-[var(--color-ui-error)]">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando..." : "Entrar no CRM"}
      </Button>
    </form>
  );
}
