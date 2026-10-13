const PARTICULAS = new Set(["a", "e", "o", "da", "de", "do", "das", "dos", "di", "du"]);

const ABREVIACOES_LOGRADOURO: [RegExp, string][] = [
  [/^r\.?\s+/i, "Rua "],
  [/^av\.?\s+/i, "Avenida "],
  [/^trav\.?\s+/i, "Travessa "],
  [/^rod\.?\s+/i, "Rodovia "],
  [/^al\.?\s+/i, "Alameda "],
  [/^pç\.?\s+|^pca\.?\s+/i, "Praça "],
];

function limpar(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

/** "MARIA da SILVA" → "Maria da Silva". Partículas ficam em minúscula, exceto no início. */
export function nomeProprio(v: string | null | undefined): string {
  return limpar(v)
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, i) =>
      i > 0 && PARTICULAS.has(palavra)
        ? palavra
        : palavra.replace(/(^|[-'’./])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toLocaleUpperCase("pt-BR")),
    )
    .join(" ");
}

/** Nome da cliente para o contrato: só letras, espaço, hífen e apóstrofo (descarta emoji e símbolos do WhatsApp). */
export function nomePessoa(v: string | null | undefined): string {
  return nomeProprio((v ?? "").replace(/[^\p{L}\s'’-]/gu, " "));
}

export function frase(v: string | null | undefined): string {
  const s = limpar(v).toLocaleLowerCase("pt-BR");
  return s ? s[0].toLocaleUpperCase("pt-BR") + s.slice(1) : "";
}

/** CPF no formato 000.000.000-00; entrada que não tem 11 dígitos volta vazia (sai em branco no contrato). */
export function formatarCpf(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : "";
}

/** CEP no formato 00000-000; entrada que não tem 8 dígitos volta vazia. */
export function formatarCep(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : "";
}

export type EnderecoBruto = {
  logradouro: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; uf: string | null; cep: string | null;
};

/** "Rua Dirceu Giordani, nº 697, Bloco E, apto 103, Bairro São Pedro, Xanxerê/SC, CEP 89820-000". */
export function formatarEndereco(e: EnderecoBruto | null): string {
  if (!e) return "";
  let logradouro = limpar(e.logradouro);
  for (const [re, nome] of ABREVIACOES_LOGRADOURO) logradouro = logradouro.replace(re, nome);
  logradouro = nomeProprio(logradouro);

  const numero = limpar(e.numero);
  const bairro = nomeProprio(limpar(e.bairro).replace(/^bairro\s+/i, ""));
  const complemento = limpar(e.complemento);
  const cidade = nomeProprio(e.cidade);
  const uf = limpar(e.uf).toLocaleUpperCase("pt-BR");
  const cep = formatarCep(e.cep);

  return [
    logradouro,
    numero ? (/^s\/?n$/i.test(numero) ? "s/nº" : `nº ${numero}`) : "",
    complemento ? complemento[0].toLocaleUpperCase("pt-BR") + complemento.slice(1) : "",
    bairro ? `Bairro ${bairro}` : "",
    [cidade, uf].filter(Boolean).join("/"),
    cep ? `CEP ${cep}` : "",
  ].filter(Boolean).join(", ");
}

const FORMA_PAGAMENTO_CONTRATO: Record<string, string> = {
  "pix recorrente": "PIX recorrente",
  "cartão recorrente": "Cartão de crédito recorrente",
  "pix (total)": "PIX, pelo valor total",
  "crédito total do plano": "Cartão de crédito, pelo valor total do plano",
  boleto: "Boleto bancário",
  dinheiro: "Dinheiro",
};

/** Rótulo interno da venda → texto de contrato. Desconhecido passa como veio. */
export function formaPagamentoContrato(v: string | null | undefined): string {
  const s = limpar(v);
  return FORMA_PAGAMENTO_CONTRATO[s.toLocaleLowerCase("pt-BR")] ?? s;
}
