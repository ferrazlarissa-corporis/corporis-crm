"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { avaliarConformidade, resumoGate } from "@/lib/conteudo/gate";

export type ActionResult = { success: true } | { success: false; error: string };

async function getActiveStaffClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false as const, error: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const { data: profile, error: profileError } = await supabase
    .schema("crm")
    .from("profiles")
    .select("id, ativo, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { success: false as const, error: profileError.message };
  if (!profile?.ativo || !["staff", "recepcao", "profissional", "gestao"].includes(profile.role)) {
    return { success: false as const, error: "Você não tem permissão para aprovar posts." };
  }

  return { success: true as const, supabase };
}

function revalidate(postId: string) {
  revalidatePath(`/conteudo/posts/${postId}/aprovacao`);
  revalidatePath(`/conteudo/posts/${postId}`);
}

export async function aprovarPost(postId: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(postId);
  if (!parsedId.success) return { success: false, error: "Post inválido." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: post, error: postError } = await auth.supabase
    .schema("conteudo")
    .from("post")
    .select("status, legenda, lgpd_usa_depoimento, lgpd_consentimento_ref")
    .eq("id", postId)
    .single();
  if (postError || !post) return { success: false, error: postError?.message ?? "Post não encontrado." };
  if (post.status !== "em_aprovacao") {
    return { success: false, error: "Este post não está aguardando aprovação." };
  }

  const { data: slides } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .select("texto_titulo, texto_corpo")
    .eq("post_id", postId);

  // Nunca confia no estado do client — revalida o gate contra o banco antes de aprovar,
  // caso o texto tenha mudado entre o envio pra aprovação e este clique.
  const { podeEnviar } = resumoGate(
    avaliarConformidade({
      legenda: post.legenda,
      slides: slides ?? [],
      lgpdUsaDepoimento: post.lgpd_usa_depoimento,
      lgpdConsentimentoRef: post.lgpd_consentimento_ref,
    }),
  );
  if (!podeEnviar) {
    return { success: false, error: "Gate de conformidade com bloqueio aberto — volte ao editor." };
  }

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("post")
    .update({ status: "aprovado", motivo_reprovacao: null })
    .eq("id", postId);
  if (error) return { success: false, error: error.message };

  revalidate(postId);
  return { success: true };
}

export async function reprovarPost(input: { postId: string; motivo: string }): Promise<ActionResult> {
  const parsed = z.object({ postId: z.string().uuid(), motivo: z.string().trim().min(3).max(500) }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Informe o motivo da reprovação." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("post")
    .update({ status: "reprovado", motivo_reprovacao: parsed.data.motivo })
    .eq("id", parsed.data.postId);
  if (error) return { success: false, error: error.message };

  revalidate(parsed.data.postId);
  return { success: true };
}
