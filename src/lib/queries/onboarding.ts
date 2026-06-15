import { createClient } from "@/lib/supabase/server";

export type OnboardingItem = {
  id: string;
  nome: string;
  createdAt: string;
  passos: { lgpd: boolean; anamnese: boolean; plano: boolean; contrato: boolean; agendamento: boolean };
  concluidos: number;
  total: number;
};

const TOTAL_PASSOS = 5;

export async function getOnboardingPendentes(): Promise<OnboardingItem[]> {
  const supabase = await createClient();

  const { data: pessoas } = await supabase
    .schema("core").from("pessoa")
    .select("id, nome, created_at, consentimento_lgpd_at")
    .eq("status", "cliente_ativo").is("archived_at", null)
    .order("created_at", { ascending: false });

  const ids = (pessoas ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [anamneseRes, matriculaRes, contratoRes, agendaRes] = await Promise.all([
    supabase.schema("clinico").from("anamnese").select("pessoa_id").in("pessoa_id", ids),
    supabase.schema("vendas").from("matricula").select("pessoa_id").eq("status", "ativa").in("pessoa_id", ids),
    supabase.schema("vendas").from("contrato").select("pessoa_id").eq("status", "assinado").in("pessoa_id", ids),
    supabase.schema("crm").from("appointments").select("pessoa_id").in("pessoa_id", ids),
  ]);

  const setOf = (rows: { pessoa_id: string | null }[] | null) =>
    new Set((rows ?? []).map((r) => r.pessoa_id).filter((v): v is string => Boolean(v)));
  const comAnamnese = setOf(anamneseRes.data);
  const comMatricula = setOf(matriculaRes.data);
  const comContrato = setOf(contratoRes.data);
  const comAgenda = setOf(agendaRes.data);

  return (pessoas ?? [])
    .map((p) => {
      const passos = {
        lgpd: Boolean(p.consentimento_lgpd_at),
        anamnese: comAnamnese.has(p.id),
        plano: comMatricula.has(p.id),
        contrato: comContrato.has(p.id),
        agendamento: comAgenda.has(p.id),
      };
      const concluidos = Object.values(passos).filter(Boolean).length;
      return { id: p.id, nome: p.nome, createdAt: p.created_at, passos, concluidos, total: TOTAL_PASSOS };
    })
    .filter((item) => item.concluidos < TOTAL_PASSOS)
    .sort((a, b) => a.concluidos - b.concluidos);
}
