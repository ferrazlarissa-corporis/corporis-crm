import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { AnamnesePublicaForm } from "./form";
import styles from "./anamnese.module.css";

export const metadata = { title: "Ficha de Anamnese — Corporis" };

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.bg}>
      <div className={styles.sheet} style={{ padding: "48px 40px", textAlign: "center" }}>
        <p className={styles.avisoTexto}>{children}</p>
      </div>
    </div>
  );
}

export default async function AnamnesePublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceRoleClient();

  const { data: convite } = await supabase
    .schema("clinico")
    .from("anamnese_convite")
    .select("id, pessoa_id, expira_em, usado_at")
    .eq("token", token)
    .maybeSingle();

  if (!convite) {
    return <Aviso>Este link não é válido. Peça à recepção da Corporis para gerar um novo.</Aviso>;
  }
  if (convite.usado_at) {
    return <Aviso>Esta ficha já foi enviada. Se precisar atualizar alguma informação, peça um novo link à recepção.</Aviso>;
  }
  if (new Date(convite.expira_em).getTime() < Date.now()) {
    return <Aviso>Este link expirou. Peça à recepção da Corporis para gerar um novo.</Aviso>;
  }

  const { data: pessoa } = await supabase.schema("core").from("pessoa").select("nome").eq("id", convite.pessoa_id).maybeSingle();

  return <AnamnesePublicaForm token={token} nomeConhecido={pessoa?.nome ?? ""} />;
}
