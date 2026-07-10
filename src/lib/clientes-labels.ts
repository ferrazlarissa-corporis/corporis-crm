import type { PessoaStatus } from "@/types/database";

export const PESSOA_STATUS_LABEL: Record<PessoaStatus, string> = {
  lead: "Lead",
  cliente_ativo: "Ativo",
  inativo: "Inativo",
};

export const GENERO_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
  { value: "nao_informar", label: "Prefiro não informar" },
];
