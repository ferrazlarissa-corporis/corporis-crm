import type { PessoaStatus, PessoaTipo, Pilar } from "@/types/database";

export const PESSOA_TIPO_LABEL: Record<PessoaTipo, string> = {
  aluna: "Aluna",
  paciente: "Paciente",
  ambos: "Aluna e paciente",
};

export const PESSOA_TIPO_OPTIONS: { value: PessoaTipo; label: string }[] = [
  { value: "aluna", label: "Aluna" },
  { value: "paciente", label: "Paciente" },
  { value: "ambos", label: "Aluna e paciente" },
];

export const PESSOA_STATUS_LABEL: Record<PessoaStatus, string> = {
  lead: "Lead",
  cliente_ativo: "Ativo",
  inativo: "Inativo",
};

/** Termo a exibir na UI conforme tipo/pilar (CLAUDE-OS §7). */
export function termoCliente(tipo: PessoaTipo, pilar: Pilar | null): string {
  if (tipo === "paciente" || pilar === "fisio_pelvica") return "paciente";
  if (tipo === "aluna") return "aluna";
  return "cliente";
}

export const GENERO_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
  { value: "nao_informar", label: "Prefiro não informar" },
];
