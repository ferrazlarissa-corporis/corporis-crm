import { createClient } from "@/lib/supabase/server";
import { CLINIC_CONFIG_ID } from "@/lib/clinic-config";
import SistemaClient from "./sistema-client";

export default async function SistemaPage() {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const [{ data: { user } }, { data: profiles }, { data: templates }, { data: clinicConfig }] = await Promise.all([
    supabase.auth.getUser(),
    db.from("profiles").select("id, nome, email, role, ativo").order("nome"),
    db.from("message_templates")
      .select("id, nome, categoria, conteudo, aprovado_whatsapp, whatsapp_template_name")
      .order("categoria")
      .order("nome"),
    db.from("clinic_config")
      .select("id, razao_social, documento, nome_comercial, endereco, endereco_complemento, telefone, telefone_observacao, email, funcionamento, logo_url, logo_path, logo_mime_type, logo_updated_at")
      .eq("id", CLINIC_CONFIG_ID)
      .maybeSingle(),
  ]);

  return (
    <SistemaClient
      currentUserId={user?.id ?? null}
      initialProfiles={profiles ?? []}
      initialTemplates={templates ?? []}
      initialClinicConfig={clinicConfig ?? null}
    />
  );
}
