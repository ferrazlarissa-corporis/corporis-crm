"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

const profileSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(160),
  currentEmail: z.string().trim().email(),
});

export async function updateProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    currentEmail: formData.get("currentEmail"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise seus dados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const emailChanged = parsed.data.email.toLowerCase() !== parsed.data.currentEmail.toLowerCase();

  const { error: authError } = await supabase.auth.updateUser({
    ...(emailChanged ? { email: parsed.data.email } : {}),
    data: { nome: parsed.data.nome },
  });

  if (authError) return { error: authError.message };

  const { error: profileError } = await supabase
    .schema("crm")
    .from("profiles")
    .update({
      nome: parsed.data.nome,
      email: parsed.data.email,
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath("/perfil");
  revalidatePath("/config/sistema");

  return {
    success: emailChanged
      ? "Dados salvos. Confirme o novo e-mail se o Supabase enviar uma mensagem."
      : "Dados salvos.",
  };
}

const passwordSchema = z.object({
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

export async function updatePasswordAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise a nova senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  return { success: "Senha atualizada." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
