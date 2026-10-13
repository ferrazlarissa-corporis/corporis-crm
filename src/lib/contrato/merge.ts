export type ContratoCampo = { token: string; label: string };

/** Campos de mesclagem aceitos nos modelos de contrato. */
export const CONTRATO_CAMPOS: ContratoCampo[] = [
  { token: "{{cliente}}", label: "Cliente" },
  { token: "{{cpf}}", label: "CPF" },
  { token: "{{profissao}}", label: "Profissão" },
  { token: "{{endereco_cliente}}", label: "Endereço da cliente" },
  { token: "{{plano}}", label: "Plano" },
  { token: "{{objeto_plano}}", label: "Objeto do plano (automático)" },
  { token: "{{condicao_pagamento}}", label: "Condição de pagamento (automático)" },
  { token: "{{clausula_pacote}}", label: "Cláusula de pacote (automática, só plano personalizado)" },
  { token: "{{valor}}", label: "Valor" },
  { token: "{{sessoes}}", label: "Sessões" },
  { token: "{{vigencia}}", label: "Vigência" },
  { token: "{{data_inicio}}", label: "Data de início" },
  { token: "{{dia_vencimento}}", label: "Vencimento" },
  { token: "{{forma_pagamento}}", label: "Forma de pagamento" },
  { token: "{{servicos}}", label: "Serviços" },
  { token: "{{clinica}}", label: "Clínica" },
  { token: "{{clinica_documento}}", label: "CNPJ da clínica" },
  { token: "{{clinica_endereco}}", label: "Endereço da clínica" },
  { token: "{{clinica_email}}", label: "E-mail da clínica" },
  { token: "{{data}}", label: "Data" },
];

export const CONTRATO_CAMPO_VAZIO = "____________";

/** Campos que, sem valor, somem do texto (em vez de virar linha em branco). */
const CAMPOS_OPCIONAIS = new Set(["clausula_pacote"]);

/**
 * Substitui {{campos}} pelo valor. Campo conhecido sem valor vira linha em branco
 * (para preencher à mão na impressão); campo desconhecido é mantido como escrito.
 */
export function mesclarContrato(corpo: string, valores: Record<string, string | null | undefined>): string {
  return corpo.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, nome: string) => {
    const token = `{{${nome}}}`;
    if (!CONTRATO_CAMPOS.some((c) => c.token === token)) return match;
    const v = valores[nome]?.trim();
    if (v) return v;
    return CAMPOS_OPCIONAIS.has(nome) ? "" : CONTRATO_CAMPO_VAZIO;
  }).replace(/\n{3,}/g, "\n\n");
}
