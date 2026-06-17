import { createClient } from "@/lib/supabase/server";
import type { Database, Pilar } from "@/types/database";
import {
  parseDisponibilidade,
  countTurnos,
  type Disponibilidade,
} from "@/lib/cadastros-labels";

type ProfissionalRaw = Database["core"]["Tables"]["profissional"]["Row"];

export type ProfissionalRow = Omit<ProfissionalRaw, "pilares" | "disponibilidade"> & {
  pilares: Pilar[];
  disponibilidade: Disponibilidade;
};

export type ProfissionalStats = {
  ativos: number;
  turnosDisponiveis: number;
  comAgenda: number;
};

function toPilares(value: unknown): Pilar[] {
  return Array.isArray(value)
    ? value.filter((v): v is Pilar => v === "pilates" || v === "fisio_pelvica" || v === "acupuntura")
    : [];
}

export async function getProfissionais(): Promise<ProfissionalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("core")
    .from("profissional")
    .select("*")
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return (data as ProfissionalRaw[]).map((p) => ({
    ...p,
    pilares: toPilares(p.pilares),
    disponibilidade: parseDisponibilidade(p.disponibilidade),
  }));
}

export function getProfissionalStats(profs: ProfissionalRow[]): ProfissionalStats {
  const ativos = profs.filter((p) => p.ativo);
  return {
    ativos: ativos.length,
    turnosDisponiveis: ativos.reduce((sum, p) => sum + countTurnos(p.disponibilidade), 0),
    comAgenda: ativos.filter((p) => countTurnos(p.disponibilidade) > 0).length,
  };
}
