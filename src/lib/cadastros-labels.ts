import type { Pilar } from "@/types/database";

// "pilar" passou a significar ÁREA (balde financeiro/operacional). Gestante é flag à parte.
export const PILAR_LABEL: Record<Pilar, string> = {
  pilates: "Pilates",
  fisio_pelvica: "Fisio pélvica",
  acupuntura: "Acupuntura",
};

export const PILAR_OPTIONS: { value: Pilar; label: string }[] = [
  { value: "pilates", label: "Pilates" },
  { value: "fisio_pelvica", label: "Fisio pélvica" },
  { value: "acupuntura", label: "Acupuntura" },
];

/** Cor de agenda sugerida por área (editável por serviço). Verde restrito a fisio pélvica. */
export const PILAR_COR_PADRAO: Record<Pilar, CorToken> = {
  pilates: "alaranjado",
  fisio_pelvica: "verde",
  acupuntura: "bege",
};

export type CorToken = "alaranjado" | "tangerina" | "bege" | "bege_claro" | "verde";

/** Mapeia o token de cor da agenda para a variável CSS canônica do design system. */
export const COR_VAR: Record<CorToken, string> = {
  alaranjado: "var(--color-alaranjado)",
  tangerina: "var(--color-tangerina)",
  bege: "var(--color-bege)",
  bege_claro: "var(--color-bege-claro)",
  verde: "var(--color-verde)",
};

export const COR_OPTIONS: { value: CorToken; label: string; hint: string }[] = [
  { value: "alaranjado", label: "Alaranjado", hint: "recomendado para Pilates" },
  { value: "tangerina", label: "Tangerina", hint: "variação de agenda" },
  { value: "bege", label: "Bege", hint: "apoio neutro" },
  { value: "bege_claro", label: "Bege claro", hint: "discreto" },
  { value: "verde", label: "Verde", hint: "saúde preventiva / fisio pélvica" },
];

export type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
export type Turno = "manha" | "tarde" | "noite";

export const DIAS: { value: DiaSemana; label: string }[] = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
];

export const TURNOS: { value: Turno; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

/** Mapa esparso dia → turnos. Chaves ausentes significam indisponível. */
export type Disponibilidade = Record<string, Turno[]>;

export function parseDisponibilidade(value: unknown): Disponibilidade {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Disponibilidade = {};
  for (const { value: dia } of DIAS) {
    const raw = (value as Record<string, unknown>)[dia];
    if (Array.isArray(raw)) {
      out[dia] = raw.filter((t): t is Turno => t === "manha" || t === "tarde" || t === "noite");
    }
  }
  return out;
}

export function countTurnos(disp: Disponibilidade): number {
  return DIAS.reduce((sum, { value }) => sum + (disp[value]?.length ?? 0), 0);
}
