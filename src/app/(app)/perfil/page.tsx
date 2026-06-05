import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilClient from "./perfil-client";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .schema("crm")
    .from("profiles")
    .select("nome, email, role, ativo, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <PerfilClient
      profile={{
        nome: profile?.nome ?? user.email?.split("@")[0] ?? "Usuário",
        email: profile?.email ?? user.email ?? "",
        role: profile?.role ?? "staff",
        ativo: profile?.ativo ?? true,
        createdAt: profile?.created_at ?? null,
      }}
    />
  );
}
