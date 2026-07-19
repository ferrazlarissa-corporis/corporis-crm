"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { TipoTemplate } from "@/types/database";
import { gerarImagemParaPost, type GerarImagemInput } from "@/lib/ai/imagem/gerar";
import { comporSlide } from "@/lib/ai/imagem/compor";

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
    return { success: false as const, error: "Você não tem permissão para editar posts." };
  }

  return { success: true as const, supabase };
}

function revalidate(postId: string) {
  revalidatePath(`/conteudo/posts/${postId}`);
}

export async function updatePostBriefing(input: {
  postId: string;
  pilar_id?: string | null;
  publico_alvo?: string | null;
  briefing?: string | null;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      postId: z.string().uuid(),
      pilar_id: z.string().uuid().nullable().optional(),
      publico_alvo: z.string().trim().max(120).nullable().optional(),
      briefing: z.string().trim().max(2000).nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { postId, ...fields } = parsed.data;
  const { error } = await auth.supabase.schema("conteudo").from("post").update(fields).eq("id", postId);
  if (error) return { success: false, error: error.message };

  revalidate(postId);
  return { success: true };
}

export type SlideResult = ActionResult & { slideId?: string; imagemUrl?: string };

export async function createSlide(input: {
  postId: string;
  templateId: string;
}): Promise<SlideResult> {
  const parsed = z.object({ postId: z.string().uuid(), templateId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: existentes } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .select("ordem")
    .eq("post_id", parsed.data.postId)
    .order("ordem", { ascending: false })
    .limit(1);
  const proximaOrdem = (existentes?.[0]?.ordem ?? 0) + 1;

  const { data: slide, error } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .insert({
      post_id: parsed.data.postId,
      ordem: proximaOrdem,
      template_id: parsed.data.templateId,
      texto_titulo: "Novo slide",
      texto_corpo: "Escreva o corpo deste slide.",
    })
    .select("id")
    .single();
  if (error || !slide) return { success: false, error: error?.message ?? "Falha ao criar slide." };

  const compose = await comporSlide(auth.supabase, slide.id);
  revalidate(parsed.data.postId);
  return compose.success
    ? { success: true, slideId: slide.id, imagemUrl: compose.imagemUrl }
    : { success: true, slideId: slide.id };
}

export async function deleteSlide(input: { slideId: string; postId: string }): Promise<ActionResult> {
  const parsed = z.object({ slideId: z.string().uuid(), postId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("conteudo").from("post_slide").delete().eq("id", parsed.data.slideId);
  if (error) return { success: false, error: error.message };

  revalidate(parsed.data.postId);
  return { success: true };
}

export async function reorderSlides(input: { postId: string; orderedIds: string[] }): Promise<ActionResult> {
  const parsed = z.object({ postId: z.string().uuid(), orderedIds: z.array(z.string().uuid()) }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  // Two fases pra não colidir com a unique (post_id, ordem) durante a troca.
  const { orderedIds } = parsed.data;
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await auth.supabase
      .schema("conteudo")
      .from("post_slide")
      .update({ ordem: 1000 + i })
      .eq("id", orderedIds[i]);
    if (error) return { success: false, error: error.message };
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await auth.supabase
      .schema("conteudo")
      .from("post_slide")
      .update({ ordem: i + 1 })
      .eq("id", orderedIds[i]);
    if (error) return { success: false, error: error.message };
  }

  revalidate(parsed.data.postId);
  return { success: true };
}

export async function updateSlideTemplate(input: {
  slideId: string;
  postId: string;
  templateId: string;
}): Promise<SlideResult> {
  const parsed = z
    .object({ slideId: z.string().uuid(), postId: z.string().uuid(), templateId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .update({ template_id: parsed.data.templateId })
    .eq("id", parsed.data.slideId);
  if (error) return { success: false, error: error.message };

  const compose = await comporSlide(auth.supabase, parsed.data.slideId);
  revalidate(parsed.data.postId);
  return compose.success ? { success: true, imagemUrl: compose.imagemUrl } : { success: false, error: compose.error };
}

export async function updateSlideTexto(input: {
  slideId: string;
  postId: string;
  texto_titulo: string;
  texto_corpo: string;
}): Promise<SlideResult> {
  const parsed = z
    .object({
      slideId: z.string().uuid(),
      postId: z.string().uuid(),
      texto_titulo: z.string().trim().max(280),
      texto_corpo: z.string().trim().max(600),
    })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .update({ texto_titulo: parsed.data.texto_titulo, texto_corpo: parsed.data.texto_corpo })
    .eq("id", parsed.data.slideId);
  if (error) return { success: false, error: error.message };

  const compose = await comporSlide(auth.supabase, parsed.data.slideId);
  revalidate(parsed.data.postId);
  return compose.success ? { success: true, imagemUrl: compose.imagemUrl } : { success: false, error: compose.error };
}

export type GerarFundoResult =
  | { success: true; imagemUrl: string; geracaoId: string; versao: number }
  | { success: false; error: string };

export async function gerarFundo(input: {
  slideId: string;
  postId: string;
  provedor?: GerarImagemInput["provedor"];
}): Promise<GerarFundoResult> {
  const parsed = z
    .object({ slideId: z.string().uuid(), postId: z.string().uuid(), provedor: z.enum(["gemini", "openai"]).optional() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: slide, error: slideError } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .select("texto_titulo, template_id")
    .eq("id", parsed.data.slideId)
    .single();
  if (slideError || !slide) return { success: false, error: slideError?.message ?? "Slide não encontrado." };

  const { data: post, error: postError } = await auth.supabase
    .schema("conteudo")
    .from("post")
    .select("briefing, titulo, pilar_id")
    .eq("id", parsed.data.postId)
    .single();
  if (postError || !post) return { success: false, error: postError?.message ?? "Post não encontrado." };

  const [{ data: template }, { data: pilar }] = await Promise.all([
    slide.template_id
      ? auth.supabase.schema("conteudo").from("template_slide").select("tipo").eq("id", slide.template_id).single()
      : Promise.resolve({ data: null }),
    post.pilar_id
      ? auth.supabase.schema("conteudo").from("pilar_editorial").select("nome").eq("id", post.pilar_id).single()
      : Promise.resolve({ data: null }),
  ]);
  if (!template) return { success: false, error: "Slide sem template definido." };

  const briefingTexto = [post.briefing, slide.texto_titulo].filter(Boolean).join(" — ") || post.titulo;

  const geracao = await gerarImagemParaPost(auth.supabase, {
    postId: parsed.data.postId,
    slideId: parsed.data.slideId,
    briefing: briefingTexto,
    pilarNome: pilar?.nome ?? "Corporis",
    templateTipo: template.tipo as TipoTemplate,
    provedor: parsed.data.provedor,
  });
  if (!geracao.success) return { success: false, error: geracao.error };

  const { error: linkError } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .update({ fundo_geracao_id: geracao.geracaoId })
    .eq("id", parsed.data.slideId);
  if (linkError) return { success: false, error: linkError.message };

  const compose = await comporSlide(auth.supabase, parsed.data.slideId);
  revalidate(parsed.data.postId);
  if (!compose.success) return { success: false, error: compose.error };

  return { success: true, imagemUrl: compose.imagemUrl, geracaoId: geracao.geracaoId, versao: geracao.versao };
}

export async function selecionarVersaoFundo(input: {
  slideId: string;
  postId: string;
  geracaoId: string;
}): Promise<SlideResult> {
  const parsed = z
    .object({ slideId: z.string().uuid(), postId: z.string().uuid(), geracaoId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };

  const auth = await getActiveStaffClient();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("conteudo")
    .from("post_slide")
    .update({ fundo_geracao_id: parsed.data.geracaoId })
    .eq("id", parsed.data.slideId);
  if (error) return { success: false, error: error.message };

  const compose = await comporSlide(auth.supabase, parsed.data.slideId);
  revalidate(parsed.data.postId);
  return compose.success ? { success: true, imagemUrl: compose.imagemUrl } : { success: false, error: compose.error };
}
