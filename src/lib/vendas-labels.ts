import type { Periodicidade, PlanoTipo, MatriculaStatus } from "@/types/database";

export const PERIODICIDADE_LABEL: Record<Periodicidade, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  avulso: "Avulso",
};

export const PERIODICIDADE_OPTIONS: { value: Periodicidade; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
  { value: "avulso", label: "Avulso" },
];

/** Meses cobertos por uma cobrança da periodicidade — usado pra normalizar MRR. */
export const PERIODICIDADE_MESES: Record<Periodicidade, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
  avulso: 1,
};

export const PLANO_TIPO_LABEL: Record<PlanoTipo, string> = {
  fixo: "Fixo",
  personalizado: "Personalizado",
  avulso: "Avulso",
};

export const PLANO_TIPO_OPTIONS: { value: PlanoTipo; label: string }[] = [
  { value: "fixo", label: "Fixo" },
  { value: "personalizado", label: "Personalizado" },
  { value: "avulso", label: "Avulso" },
];

export const MATRICULA_STATUS_LABEL: Record<MatriculaStatus, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
  concluida: "Concluída",
};

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Tabela de preços dos planos fixos de Pilates (mensalidade por frequência × periodicidade).
 * Fonte: clinicacorporis.app/planos. Valores são o custo mensal de cada compromisso.
 */
export const PILATES_PRECO: Record<1 | 2 | 3, Partial<Record<Periodicidade, number>>> = {
  1: { mensal: 240, trimestral: 210, semestral: 195 },
  2: { mensal: 400, trimestral: 360, semestral: 325 },
  3: { mensal: 495, trimestral: 450, semestral: 400 },
};

/** Preço sugerido de Pilates fixo, ou null se a combinação não estiver na tabela. */
export function pilatesPreco(periodicidade: Periodicidade, sessoesSemana: number): number | null {
  const linha = PILATES_PRECO[sessoesSemana as 1 | 2 | 3];
  return linha?.[periodicidade] ?? null;
}
