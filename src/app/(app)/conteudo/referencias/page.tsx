import { createClient } from "@/lib/supabase/server";
import { ReferenciasBoard } from "./referencias-board";

export const metadata = { title: "Referências · Corporis Conteúdo" };

export default async function ReferenciasPage() {
  const supabase = await createClient();

  const [{ data: referencias }, { data: pilares }] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("referencia")
      .select("id, titulo, fonte, tipo_fonte, pilar_id, tags, por_que_funciona")
      .order("created_at", { ascending: false }),
    supabase
      .schema("conteudo")
      .from("pilar_editorial")
      .select("id, nome, cor_token, ativo")
      .order("nome"),
  ]);

  return <ReferenciasBoard initialReferencias={referencias ?? []} pilares={pilares ?? []} />;
}
