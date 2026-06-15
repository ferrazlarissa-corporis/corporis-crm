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
  recorrente: "Recorrente",
  personalizado: "Personalizado",
};

export const MATRICULA_STATUS_LABEL: Record<MatriculaStatus, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
