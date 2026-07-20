import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { MetricasClient } from "./metricas-client";

export const metadata = { title: "Métricas · Corporis Conteúdo" };

export default async function MetricasPage() {
  const supabase = await createClient();

  const [{ data: posts }, { data: ctaLeads }, { data: metricas }, { data: pilares }] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("post")
      .select("id, titulo, pilar_id, status")
      .not("status", "in", "(rascunho,arquivado)")
      .order("created_at", { ascending: false }),
    supabase
      .schema("conteudo")
      .from("cta_lead")
      .select("id, post_id, cliques, pessoa_id, virou_agendamento, created_at"),
    supabase.schema("conteudo").from("metrica").select("post_id, data, alcance, impressoes, saves, curtidas, comentarios, visitas_perfil, cliques_link"),
    supabase.schema("conteudo").from("pilar_editorial").select("id, nome, cor_token"),
  ]);

  // PostgREST não resolve embed entre schemas (conteudo.cta_lead -> core.pessoa) — busca à parte e junta em JS.
  const pessoaIds = [...new Set((ctaLeads ?? []).map((c) => c.pessoa_id).filter((id): id is string => Boolean(id)))];
  const { data: pessoas } = pessoaIds.length
    ? await supabase.schema("core").from("pessoa").select("id, nome, telefone").in("id", pessoaIds)
    : { data: [] };
  const pessoaById = new Map((pessoas ?? []).map((p) => [p.id, p]));

  return (
    <MetricasClient
      posts={posts ?? []}
      ctaLeads={(ctaLeads ?? []).map((c) => ({
        id: c.id,
        post_id: c.post_id,
        cliques: c.cliques,
        pessoa_id: c.pessoa_id,
        virou_agendamento: c.virou_agendamento,
        pessoa: c.pessoa_id ? (pessoaById.get(c.pessoa_id) ?? null) : null,
      }))}
      metricas={metricas ?? []}
      pilares={pilares ?? []}
      hoje={format(new Date(), "yyyy-MM-dd")}
    />
  );
}
