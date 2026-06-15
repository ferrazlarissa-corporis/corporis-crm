import { createClient } from "@/lib/supabase/server";
import type { Database, Pilar } from "@/types/database";

type ModeloRaw = Database["vendas"]["Tables"]["contrato_modelo"]["Row"];

export type ContratoModeloRow = Omit<ModeloRaw, "pilares" | "planos"> & {
  pilares: Pilar[];
  planos: string[];
};

export type PlanoOption = { id: string; nome: string };

export type ContratoModeloStats = {
  ativos: number;
  planosVinculados: number;
  total: number;
};

function toPilares(value: unknown): Pilar[] {
  return Array.isArray(value)
    ? value.filter((v): v is Pilar => v === "pilates" || v === "pilates_gestante" || v === "fisio_pelvica")
    : [];
}
function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function getContratoModelos(): Promise<ContratoModeloRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("vendas")
    .from("contrato_modelo")
    .select("*")
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return (data as ModeloRaw[]).map((m) => ({
    ...m,
    pilares: toPilares(m.pilares),
    planos: toStringArray(m.planos),
  }));
}

export async function getPlanoOptions(): Promise<PlanoOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("vendas")
    .from("plano")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return data as PlanoOption[];
}

export function getContratoModeloStats(modelos: ContratoModeloRow[]): ContratoModeloStats {
  const ativos = modelos.filter((m) => m.ativo);
  const planos = new Set<string>();
  ativos.forEach((m) => m.planos.forEach((p) => planos.add(p)));
  return { ativos: ativos.length, planosVinculados: planos.size, total: modelos.length };
}
