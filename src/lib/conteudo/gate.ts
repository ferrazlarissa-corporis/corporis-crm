import type { ResultadoConformidade } from "@/types/database";

export type ChecklistItem = {
  regra: string;
  label: string;
  resultado: ResultadoConformidade;
  detalhe: string | null;
};

export type GateInput = {
  legenda: string | null;
  slides: { texto_titulo: string | null; texto_corpo: string | null }[];
  lgpdUsaDepoimento: boolean;
  lgpdConsentimentoRef: string | null;
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Heurística por palavra-chave (CLAUDE_1.md §8) — não é NLP, é um filtro literal
// sobre os exemplos e o espírito de cada regra. Objetivo é pegar os casos óbvios
// antes da aprovação humana, não substituir revisão.
const PROMESSA_CURA = ["cura garantida", "garantia de resultado", "resultado garantido", "elimina a dor", "elimina definitivamente", "garantimos a cura", "resultado 100%", "fim da dor"];
const SENSACIONALISMO = ["antes e depois", "nao deixe para depois", "pode ser tarde demais", "se voce nao cuidar agora", "ultima chance"];
const AUTOPROMOCAO = ["somos os melhores", "a melhor clinica", "a unica clinica", "ninguem faz melhor", "sem concorrencia", "referencia numero 1"];
const AUTODIAGNOSTICO = ["isso significa que voce tem", "com certeza voce tem", "voce definitivamente tem", "esse e o seu diagnostico"];
const AFIRMACAO_CLINICA = ["estudos comprovam", "cientificamente comprovado", "esta comprovado que", "e cientificamente"];
const RESSALVA_INDIVIDUAL = ["avaliacao individual", "cada caso e avaliado", "cada corpo e unico", "avaliacao com fisioterapeuta"];

function findMatch(haystack: string, keywords: string[]): string | null {
  return keywords.find((k) => haystack.includes(k)) ?? null;
}

export function avaliarConformidade(input: GateInput): ChecklistItem[] {
  const textoCompleto = [input.legenda ?? "", ...input.slides.flatMap((s) => [s.texto_titulo ?? "", s.texto_corpo ?? ""])].join(" \n ");
  const haystack = normalize(textoCompleto);

  const items: ChecklistItem[] = [];

  const cura = findMatch(haystack, PROMESSA_CURA);
  items.push({
    regra: "coffito_promessa_cura",
    label: "Promessa de cura ou resultado garantido",
    resultado: cura ? "bloqueio" : "ok",
    detalhe: cura ? `Trecho encontrado: "${cura}"` : null,
  });

  const sensacionalismo = findMatch(haystack, SENSACIONALISMO);
  items.push({
    regra: "coffito_sensacionalismo",
    label: "Sensacionalismo ou apelo ao medo",
    resultado: sensacionalismo ? "bloqueio" : "ok",
    detalhe: sensacionalismo ? `Trecho encontrado: "${sensacionalismo}"` : null,
  });

  const autopromocao = findMatch(haystack, AUTOPROMOCAO);
  items.push({
    regra: "coffito_autopromocao",
    label: "Autopromoção como \"a melhor/única\"",
    resultado: autopromocao ? "bloqueio" : "ok",
    detalhe: autopromocao ? `Trecho encontrado: "${autopromocao}"` : null,
  });

  const autodiagnostico = findMatch(haystack, AUTODIAGNOSTICO);
  items.push({
    regra: "coffito_autodiagnostico",
    label: "Indução a autodiagnóstico",
    resultado: autodiagnostico ? "alerta" : "ok",
    detalhe: autodiagnostico ? `Trecho encontrado: "${autodiagnostico}" — confirme que o texto orienta avaliação profissional.` : null,
  });

  const afirmacao = findMatch(haystack, AFIRMACAO_CLINICA);
  const temRessalva = findMatch(haystack, RESSALVA_INDIVIDUAL) !== null;
  items.push({
    regra: "coffito_sem_ressalva",
    label: "Afirmação clínica sem ressalva de avaliação individual",
    resultado: afirmacao && !temRessalva ? "alerta" : "ok",
    detalhe: afirmacao && !temRessalva ? `Trecho encontrado: "${afirmacao}" — sem menção a avaliação individual.` : null,
  });

  const precisaConsentimento = input.lgpdUsaDepoimento;
  const temRef = Boolean(input.lgpdConsentimentoRef?.trim());
  items.push({
    regra: "lgpd_consentimento",
    label: "Consentimento de uso de imagem/depoimento",
    resultado: precisaConsentimento && !temRef ? "bloqueio" : "ok",
    detalhe: precisaConsentimento && !temRef ? "Post usa depoimento/imagem real sem referência de autorização registrada." : null,
  });

  items.push({
    regra: "lgpd_dado_sensivel",
    label: "Dado sensível de saúde identificável",
    resultado: precisaConsentimento ? "alerta" : "ok",
    detalhe: precisaConsentimento ? "Post usa depoimento/imagem real — confirme que não expõe mais do que o consentido." : null,
  });

  return items;
}

export function resumoGate(items: ChecklistItem[]) {
  const bloqueios = items.filter((i) => i.resultado === "bloqueio");
  const alertas = items.filter((i) => i.resultado === "alerta");
  const coffitoItems = items.filter((i) => i.regra.startsWith("coffito_"));
  const lgpdItems = items.filter((i) => i.regra.startsWith("lgpd_"));

  const piorResultado = (list: ChecklistItem[]): ResultadoConformidade =>
    list.some((i) => i.resultado === "bloqueio") ? "bloqueio" : list.some((i) => i.resultado === "alerta") ? "alerta" : "ok";

  return {
    coffito: piorResultado(coffitoItems),
    lgpd: piorResultado(lgpdItems),
    podeEnviar: bloqueios.length === 0,
    motivoBloqueio: bloqueios[0]?.detalhe ?? bloqueios[0]?.label ?? null,
    totalAlertas: alertas.length,
  };
}
