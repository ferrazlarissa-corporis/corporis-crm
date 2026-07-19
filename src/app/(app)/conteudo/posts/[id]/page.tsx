import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostEditor } from "./post-editor";

export const metadata = { title: "Editor de post · Corporis Conteúdo" };

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: slides }, { data: geracoes }, { data: pilares }, { data: templates }, { data: ctaLead }] =
    await Promise.all([
      supabase
        .schema("conteudo")
        .from("post")
        .select("id, titulo, formato, pilar_id, briefing, publico_alvo, legenda, hashtags, status")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .schema("conteudo")
        .from("post_slide")
        .select("id, ordem, template_id, texto_titulo, texto_corpo, fundo_geracao_id, imagem_url")
        .eq("post_id", id)
        .order("ordem"),
      supabase
        .schema("conteudo")
        .from("geracao_imagem")
        .select("id, slide_id, versao, status, imagem_url, provedor")
        .eq("post_id", id)
        .order("versao"),
      supabase.schema("conteudo").from("pilar_editorial").select("id, nome, cor_token, ativo").order("nome"),
      supabase.schema("conteudo").from("template_slide").select("id, nome, tipo"),
      supabase.schema("conteudo").from("cta_lead").select("short_code").eq("post_id", id).maybeSingle(),
    ]);

  if (!post) notFound();

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
  const trackedLink = ctaLead?.short_code ? `${baseUrl}/l/${ctaLead.short_code}` : null;

  return (
    <PostEditor
      post={post}
      initialSlides={slides ?? []}
      geracoes={(geracoes ?? []).filter((g) => g.slide_id && g.status === "pronto")}
      pilares={pilares ?? []}
      templates={templates ?? []}
      trackedLink={trackedLink}
    />
  );
}
