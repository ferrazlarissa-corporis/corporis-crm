"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados." };
  }

  if (!hasSupabaseBrowserEnv()) {
    return {
      error:
        "Supabase ainda não foi configurado neste ambiente. Preencha o .env.local para ativar o login.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        "Não foi possível entrar. Confira seu e-mail e senha, por gentileza.",
    };
  }

  redirect("/dashboard");
}
