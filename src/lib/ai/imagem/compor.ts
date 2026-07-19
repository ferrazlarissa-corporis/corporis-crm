import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { composeSlide } from "./compose";

const BUCKET = "corporis-conteudo";

export type ComporSlideResult = { success: true; imagemUrl: string } | { success: false; error: string };

/**
 * Recompõe o PNG final de um slide (fundo já gerado no M7 + texto/marca atuais do banco).
 * Não chama IA — por isso trocar `texto_titulo`/`texto_corpo` e recompor é instantâneo.
 * Sobrescreve sempre o mesmo arquivo (sem versionamento; quem versiona é o fundo, no M7).
 */
export async function comporSlide(
  supabase: SupabaseClient<Database>,
  slideId: string,
): Promise<ComporSlideResult> {
  const { data: slide, error: slideError } = await supabase
    .schema("conteudo")
    .from("post_slide")
    .select("id, post_id, ordem, texto_titulo, texto_corpo, fundo_geracao_id, template_id")
    .eq("id", slideId)
    .single();

  if (slideError || !slide) {
    return { success: false, error: slideError?.message ?? "Slide não encontrado." };
  }

  const { data: post, error: postError } = await supabase
    .schema("conteudo")
    .from("post")
    .select("id, pilar_id")
    .eq("id", slide.post_id)
    .single();

  if (postError || !post) {
    return { success: false, error: postError?.message ?? "Post não encontrado." };
  }

  const [{ data: template }, { data: pilar }, fundo] = await Promise.all([
    slide.template_id
      ? supabase.schema("conteudo").from("template_slide").select("tipo").eq("id", slide.template_id).single()
      : Promise.resolve({ data: null }),
    post.pilar_id
      ? supabase.schema("conteudo").from("pilar_editorial").select("nome, cor_token").eq("id", post.pilar_id).single()
      : Promise.resolve({ data: null }),
    slide.fundo_geracao_id
      ? supabase.schema("conteudo").from("geracao_imagem").select("imagem_url").eq("id", slide.fundo_geracao_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (!template) {
    return { success: false, error: "Slide sem template definido." };
  }

  const png = await composeSlide({
    tipo: template.tipo,
    pilarLabel: pilar?.nome ?? "Corporis",
    pilarCorToken: pilar?.cor_token ?? "pillar-indefinido",
    titulo: slide.texto_titulo ?? "",
    corpo: slide.texto_corpo ?? "",
    backgroundImageUrl: fundo?.data?.imagem_url ?? null,
  });

  const path = `posts/${slide.post_id}/slide-${slide.ordem}-composto.png`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, png, {
    contentType: "image/png",
    upsert: true,
  });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const imagemUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .schema("conteudo")
    .from("post_slide")
    .update({ imagem_url: imagemUrl })
    .eq("id", slide.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, imagemUrl };
}
