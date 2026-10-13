import type { PessoaOrigem, PessoaStatus } from "@/types/database";

export const PESSOA_STATUS_LABEL: Record<PessoaStatus, string> = {
  lead: "Lead",
  cliente_ativo: "Ativo",
  inativo: "Inativo",
};

export const CLIENTE_STATUS_LABEL: Record<PessoaStatus | "pausado", string> = {
  ...PESSOA_STATUS_LABEL,
  pausado: "Pausado",
};

export const GENERO_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "outro", label: "Outro" },
  { value: "nao_informar", label: "Prefiro não informar" },
];

export const PESSOA_ORIGEM_OPTIONS: { value: PessoaOrigem; label: string }[] = [
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "parceiro", label: "Parceiro" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

/** Origens que pedem o nome de quem indicou / do parceiro. */
export const ORIGEM_DETALHE_LABEL: Partial<Record<PessoaOrigem, string>> = {
  indicacao: "Quem indicou?",
  parceiro: "Qual parceiro?",
};
