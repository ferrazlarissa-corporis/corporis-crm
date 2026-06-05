import { createClient } from "@/lib/supabase/server";
import SistemaClient from "./sistema-client";

export default async function SistemaPage() {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const [{ data: { user } }, { data: profiles }, { data: templates }] = await Promise.all([
    supabase.auth.getUser(),
    db.from("profiles").select("id, nome, email, role, ativo").order("nome"),
    db.from("message_templates")
      .select("id, nome, categoria, conteudo, aprovado_whatsapp, whatsapp_template_name")
      .order("categoria")
      .order("nome"),
  ]);

  return (
    <SistemaClient
      currentUserId={user?.id ?? null}
      initialProfiles={profiles ?? []}
      initialTemplates={templates ?? []}
    />
  );
}
