import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { buildImagePrompt } from "./prompt-builder";
import { gerarImagem, type ImagemProvedor } from "./router";

const BUCKET = "corporis-conteudo";

export type GerarImagemInput = {
  postId: string;
  slideId?: string | null;
  briefing: string;
  pilarNome: string;
  templateTipo: "capa" | "conteudo" | "citacao" | "cta";
  provedor?: ImagemProvedor;
};

export type GerarImagemResult =
  | { success: true; geracaoId: string; imagemUrl: string; versao: number; provedor: ImagemProvedor; modelo: string }
  | { success: false; geracaoId: string; error: string };

/**
 * Orquestra um job de geração de imagem: monta o prompt, chama o router de
 * provedor (Gemini → fallback OpenAI), sobe o resultado pro bucket público e
 * grava/atualiza a linha em conteudo.geracao_imagem. Cada chamada cria uma
 * nova versão — nunca sobrescreve nem apaga gerações anteriores.
 */
export async function gerarImagemParaPost(
  supabase: SupabaseClient<Database>,
  input: GerarImagemInput,
): Promise<GerarImagemResult> {
  const prompt = buildImagePrompt({
    briefing: input.briefing,
    pilarNome: input.pilarNome,
    templateTipo: input.templateTipo,
  });

  let countQuery = supabase
    .schema("conteudo")
    .from("geracao_imagem")
    .select("id", { count: "exact", head: true })
    .eq("post_id", input.postId);
  countQuery = input.slideId ? countQuery.eq("slide_id", input.slideId) : countQuery.is("slide_id", null);
  const { count } = await countQuery;
  const versao = (count ?? 0) + 1;

  const { data: job, error: jobError } = await supabase
    .schema("conteudo")
    .from("geracao_imagem")
    .insert({
      post_id: input.postId,
      slide_id: input.slideId ?? null,
      prompt,
      provedor: input.provedor ?? "gemini",
      versao,
      status: "processando",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return { success: false, geracaoId: "", error: jobError?.message ?? "Falha ao criar job de geração." };
  }

  try {
    const imagem = await gerarImagem(prompt, input.provedor);

    let ordemSegment = "post";
    if (input.slideId) {
      const { data: slide } = await supabase
        .schema("conteudo")
        .from("post_slide")
        .select("ordem")
        .eq("id", input.slideId)
        .maybeSingle();
      if (slide) ordemSegment = String(slide.ordem);
    }

    const ext = imagem.mimeType.includes("jpeg") ? "jpg" : "png";
    const path = `posts/${input.postId}/slide-${ordemSegment}-v${versao}.${ext}`;
    const bytes = Buffer.from(imagem.base64, "base64");

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: imagem.mimeType, upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const imagemUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .schema("conteudo")
      .from("geracao_imagem")
      .update({ status: "pronto", imagem_url: imagemUrl, modelo: imagem.modelo, provedor: imagem.provedor })
      .eq("id", job.id);

    if (updateError) throw new Error(updateError.message);

    return { success: true, geracaoId: job.id, imagemUrl, versao, provedor: imagem.provedor, modelo: imagem.modelo };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida na geração de imagem.";
    await supabase.schema("conteudo").from("geracao_imagem").update({ status: "erro" }).eq("id", job.id);
    return { success: false, geracaoId: job.id, error: message };
  }
}
