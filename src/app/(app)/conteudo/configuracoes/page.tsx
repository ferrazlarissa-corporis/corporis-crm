import { createClient } from "@/lib/supabase/server";
import { MARCA_CONFIG_ID } from "./constants";
import { ConfiguracoesClient } from "./configuracoes-client";

export const metadata = { title: "Configurações · Corporis Conteúdo" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const [{ data: pilares }, { data: marca }] = await Promise.all([
    supabase
      .schema("conteudo")
      .from("pilar_editorial")
      .select("id, nome, descricao, publico_alvo, cor_token, ativo")
      .order("nome"),
    supabase
      .schema("conteudo")
      .from("marca_config")
      .select("tom_voz, tom_tags")
      .eq("id", MARCA_CONFIG_ID)
      .maybeSingle(),
  ]);

  return (
    <ConfiguracoesClient
      pilares={pilares ?? []}
      tomVoz={marca?.tom_voz ?? ""}
      tomTags={marca?.tom_tags ?? []}
    />
  );
}
