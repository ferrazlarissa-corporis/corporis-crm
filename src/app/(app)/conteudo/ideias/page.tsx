import { createClient } from "@/lib/supabase/server";
import { IdeiasBoard } from "./ideias-board";

export const metadata = { title: "Banco de ideias · Corporis Conteúdo" };

export default async function IdeiasPage() {
  const supabase = await createClient();

  const [{ data: ideias }, { data: pilares }] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("ideia")
      .select("id, titulo, angulo, publico_alvo, origem, status, pilar_id")
      .order("created_at", { ascending: false }),
    supabase
      .schema("conteudo")
      .from("pilar_editorial")
      .select("id, nome, cor_token, ativo")
      .order("nome"),
  ]);

  return <IdeiasBoard initialIdeias={ideias ?? []} pilares={pilares ?? []} />;
}
