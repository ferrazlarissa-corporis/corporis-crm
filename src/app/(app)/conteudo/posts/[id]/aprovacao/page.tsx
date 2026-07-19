import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AprovacaoClient } from "./aprovacao-client";

export const metadata = { title: "Prévia & aprovação · Corporis Conteúdo" };

export default async function AprovacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: slides }, { data: slot }, { data: ctaLead }] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("post")
      .select("id, titulo, pilar_id, legenda, hashtags, lgpd_usa_depoimento, lgpd_consentimento_ref, motivo_reprovacao, status")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .schema("conteudo")
      .from("post_slide")
      .select("id, ordem, template_id, texto_titulo, texto_corpo, imagem_url, template:template_id(tipo)")
      .eq("post_id", id)
      .order("ordem"),
    supabase.schema("conteudo").from("slot_calendario").select("data, horario").eq("post_id", id).maybeSingle(),
    supabase.schema("conteudo").from("cta_lead").select("short_code").eq("post_id", id).maybeSingle(),
  ]);

  if (!post) notFound();

  const { data: pilar } = post.pilar_id
    ? await supabase.schema("conteudo").from("pilar_editorial").select("nome, cor_token").eq("id", post.pilar_id).maybeSingle()
    : { data: null };

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";
  const trackedLink = ctaLead?.short_code ? `${baseUrl}/l/${ctaLead.short_code}` : null;

  return (
    <AprovacaoClient
      post={post}
      slides={(slides ?? []).map((s) => ({
        id: s.id,
        ordem: s.ordem,
        tipo: (s.template as unknown as { tipo: "capa" | "conteudo" | "citacao" | "cta" } | null)?.tipo ?? "conteudo",
        texto_titulo: s.texto_titulo,
        texto_corpo: s.texto_corpo,
        imagem_url: s.imagem_url,
      }))}
      pilar={pilar}
      slot={slot ?? null}
      trackedLink={trackedLink}
    />
  );
}
