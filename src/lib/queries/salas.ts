import { createClient } from "@/lib/supabase/server";
import type { Database, Pilar } from "@/types/database";

type SalaRaw = Database["core"]["Tables"]["sala"]["Row"];

export type SalaRow = Omit<SalaRaw, "equipamentos" | "pilares"> & {
  equipamentos: string[];
  pilares: Pilar[];
};

export type SalaStats = {
  ativas: number;
  capacidadeTotal: number;
  equipamentos: number;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function getSalas(): Promise<SalaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("core")
    .from("sala")
    .select("*")
    .order("nome", { ascending: true });

  if (error || !data) return [];
  return (data as SalaRaw[]).map((s) => ({
    ...s,
    equipamentos: toStringArray(s.equipamentos),
    pilares: toStringArray(s.pilares) as Pilar[],
  }));
}

export function getSalaStats(salas: SalaRow[]): SalaStats {
  const ativas = salas.filter((s) => s.ativo);
  const equipamentos = new Set<string>();
  ativas.forEach((s) => s.equipamentos.forEach((e) => equipamentos.add(e.toLowerCase())));
  return {
    ativas: ativas.length,
    capacidadeTotal: ativas.reduce((sum, s) => sum + s.capacidade, 0),
    equipamentos: equipamentos.size,
  };
}
