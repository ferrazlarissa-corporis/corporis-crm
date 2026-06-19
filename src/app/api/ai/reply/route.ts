import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendTextMessage, sendPresence } from "@/lib/evolution/client";
import { AGENT_TOOLS, HANDOFF_RULE_AGENDAMENTO, executeTool, type ToolInput } from "@/lib/ai/tools";
import { resolveModel, type AgentProvider } from "@/lib/ai/model";
import { isPhoneInBypassList } from "@/lib/phone";
import type { Json } from "@/types/database";

// Separador que o modelo usa para quebrar a resposta em mensagens curtas (bursts).
const BURST_DELIMITER = "---";
const MAX_BURSTS = 4;
const INBOUND_SETTLE_DELAY_MS = 3000;

interface ConversaExemplo {
  titulo?: string;
  dialogo?: { autor: "lead" | "clara"; texto: string }[];
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  conversation_id: z.string().uuid(),
  trigger_message_id: z.string().uuid().optional(),
});

// ─── Business hours ───────────────────────────────────────────────────────────

function isWithinBusinessHours(schedule: Json): boolean {
  const s = schedule as Record<string, string>;
  // Vercel runs UTC — convert to São Paulo time before checking hours
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0) return false;

  const range = day === 6 ? s.sabado : s.segunda_sexta;
  if (!range) return false;

  const [startStr, endStr] = range.split("-");
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM]     = endStr.split(":").map(Number);
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins   = endH * 60 + endM;
  return nowMins >= startMins && nowMins < endMins;
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  personaPrompt: string,
  boasPraticas: Json,
  faq: Json,
  regrasHandoff: Json,
  exemplos: Json,
  lead: { nome: string; interesse: string; gestante: boolean; estagio: string; score_qualificacao: number | null }
): string {
  const boasPraticasStr = Array.isArray(boasPraticas) && boasPraticas.length > 0
    ? "\n\n## Boas práticas de tom e marca\n" + (boasPraticas as { title?: string; detail?: string }[])
        .filter((item) => item.title?.trim() || item.detail?.trim())
        .map((item) => {
          const title = item.title?.trim();
          const detail = item.detail?.trim();
          return title && detail ? `- ${title} ${detail}` : `- ${title ?? detail}`;
        })
        .join("\n")
    : "";

  const faqStr = Array.isArray(faq) && faq.length > 0
    ? "\n\n## FAQ\n" + (faq as { q: string; a: string }[])
        .map((item) => `P: ${item.q}\nR: ${item.a}`)
        .join("\n\n")
    : "";

  const handoffStr = Array.isArray(regrasHandoff)
    ? `\n\n## Gatilhos de handoff (use a tool solicitar_handoff nestes casos)\n- ${(regrasHandoff as string[]).join("\n- ")}`
    : "";

  const exemplosArr = Array.isArray(exemplos) ? (exemplos as ConversaExemplo[]) : [];
  const exemplosStr = exemplosArr.length > 0
    ? "\n\n## Exemplos do jeito da Larissa (imite o tom e o ritmo, NÃO copie literalmente)\n" +
      exemplosArr
        .filter((ex) => Array.isArray(ex.dialogo) && ex.dialogo.length > 0)
        .map((ex) => {
          const head = ex.titulo ? `### ${ex.titulo}\n` : "";
          const body = (ex.dialogo ?? [])
            .map((t) => `${t.autor === "lead" ? "Lead" : "Clara"}: ${t.texto}`)
            .join("\n");
          return head + body;
        })
        .join("\n\n")
    : "";

  return `${personaPrompt}

## Contexto da aluna
- Nome: ${lead.nome}
- Interesse (área): ${lead.interesse}
- Gestante: ${lead.gestante ? "sim" : "não identificado"}
- Estágio no funil: ${lead.estagio}
- Score de qualificação: ${lead.score_qualificacao ?? "não avaliado"}

## Quem é você
- Seu nome é Clara. Fale de forma natural, calorosa e pessoal — como a Larissa falaria no WhatsApp.
- NÃO se apresente espontaneamente como IA, robô, assistente virtual ou atendimento automático.
- Se a pessoa perguntar DIRETAMENTE se você é uma IA/robô/atendente automático, responda com honestidade e leveza, sem drama.

## Como escrever no WhatsApp (estilo humano)
- Responda em mensagens curtas, como uma pessoa digitando — não em um parágrafo único e longo.
- Separe cada mensagem por uma linha contendo apenas "${BURST_DELIMITER}".
- Use no máximo ${MAX_BURSTS} mensagens por resposta. Frases curtas, tom de conversa.
- Cada mensagem precisa acrescentar algo novo. Não envie duas versões alternativas da mesma frase, acolhimento ou pergunta.
- Se fizer uma pergunta de qualificação, faça apenas uma pergunta clara e espere a resposta da aluna.
- Interprete disponibilidade pelo contexto: se você acabou de perguntar "durante o dia ou após às 18h?" e a lead responder "depois das 6/seis", entenda como após às 18h, registre essa disponibilidade e não pergunte a mesma coisa de novo. Se não houver contexto claro de 18h/noite, confirme em uma frase curta se ela quis dizer 18h.
- Em gestantes, quando a pessoa perguntar sobre valores do acompanhamento, não responda com "avaliação inicial gratuita" ou "50 minutos". Antes de falar valores, explique que o acompanhamento é separado por trimestre gestacional, que a frequência depende da semana gestacional e das necessidades avaliadas na consulta inicial, e convide para agendar essa consulta.
- Evite emojis em excesso (no máximo um, e só quando soar natural).

## Qualificação proativa (obrigatório)
- Assim que identificar a área de interesse da aluna (pilates, fisio pélvica ou acupuntura), use IMEDIATAMENTE a tool **atualizar_interesse** — mesmo que ela não tenha pedido para agendar ainda. Se perceber que ela é gestante, marque também o campo gestante=true (gestante cruza com qualquer área: Gestar em movimento, Fisio pélvica gestante, Mamãe ativa).
- Após 2 ou mais trocas de mensagens, use a tool **registrar_score** com uma nota de 0–100 e uma justificativa breve. Critérios: clareza do interesse (0–30), urgência/motivação (0–30), disponibilidade de agenda (0–20), perfil de aluna (0–20). Atualize o score se a conversa trouxer informação relevante nova.
- Sempre que descobrir algo sobre a queixa/incômodo, objetivo, histórico, restrições/pontos de atenção, disponibilidade ou motivação da aluna, use a tool **registrar_contexto_avaliacao** para registrar — envie só os campos que descobriu. Isso prepara a fisioterapeuta para a avaliação. Atualize conforme a conversa evolui.
- Essas ações são silenciosas: execute-as sempre que houver informação suficiente, sem mencionar ao lead.

## Guardrails obrigatórios
- NUNCA prometa cura, resultado em prazo ou faça diagnóstico.
- NUNCA faça diagnóstico pelo WhatsApp. Você pode dizer que, na consulta inicial presencial, a fisioterapeuta avalia a região pélvica e pode chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado.
- Em fisioterapia pélvica, NUNCA diga que a consulta é gratuita ou dura 50 minutos. A consulta inicial dura aproximadamente 1h20; se falar de valores, use R$ 350,00 e condição especial de R$ 100,00 fechando tratamento.
- NUNCA use "paciente" ou "patologia". Use "aluna" e "incômodo".
- Comunicação sobre fisioterapia pélvica: discreta e respeitosa.
- Sem urgência fabricada, sem "últimas vagas", sem CAPS LOCK.
- Em caso de dúvida clínica específica: use solicitar_handoff.
- Responda sempre em português brasileiro.
${boasPraticasStr}${exemplosStr}${faqStr}${handoffStr}`;
}

// Quebra a resposta do modelo em mensagens curtas (bursts).
function splitIntoBursts(text: string): string[] {
  const bursts = text
    .split(new RegExp(`\\n?\\s*${BURST_DELIMITER}\\s*\\n?`, "g"))
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, MAX_BURSTS);

  return dedupeBursts(bursts);
}

const BURST_STOPWORDS = new Set([
  "a", "agora", "ainda", "algum", "alguma", "ao", "aos", "as", "com", "como",
  "da", "de", "depois", "do", "dos", "e", "em", "entao", "eu", "isso", "me",
  "na", "nas", "no", "nos", "o", "os", "ou", "para", "por", "pra", "que",
  "se", "sem", "so", "sua", "suas", "te", "tem", "um", "uma", "voce",
]);

function normalizeBurst(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function burstTokens(text: string): Set<string> {
  return new Set(
    normalizeBurst(text)
      .split(" ")
      .filter((token) => token.length > 2 && !BURST_STOPWORDS.has(token))
  );
}

function isDuplicateBurst(candidate: string, previous: string): boolean {
  const a = normalizeBurst(candidate);
  const b = normalizeBurst(previous);
  if (!a || !b) return false;
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 12 && longer.includes(shorter)) return true;
  if (shorter.length >= 25 && longer.includes(shorter)) return true;

  const candidateTokens = burstTokens(candidate);
  const previousTokens = burstTokens(previous);
  const smallerSize = Math.min(candidateTokens.size, previousTokens.size);
  if (smallerSize < 5) return false;

  let intersection = 0;
  for (const token of candidateTokens) {
    if (previousTokens.has(token)) intersection++;
  }

  const overlap = intersection / smallerSize;
  const bothAsk = candidate.includes("?") && previous.includes("?");
  return overlap >= 0.7 || (bothAsk && smallerSize >= 4 && overlap >= 0.5);
}

function dedupeBursts(bursts: string[]): string[] {
  const kept: string[] = [];

  for (const burst of bursts) {
    if (!kept.some((previous) => isDuplicateBurst(burst, previous))) {
      kept.push(burst);
    }
  }

  return kept;
}

type ConversationMessageRow = {
  direcao: string;
  conteudo: string;
};

function mentionsAfterSix(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:depois|apos|apartir|a partir)\s+(?:d[ae]s|as|a)?\s*(?:6|seis)\b/.test(normalized);
}

function mentions18hContext(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /(?:^|\s)18\s*h?\b/.test(normalized) ||
    normalized.includes("dezoito horas") ||
    normalized.includes("seis da tarde") ||
    normalized.includes("seis da noite");
}

function buildAvailabilityContextNote(messages: ConversationMessageRow[]): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsAfterSix(lastUserMessage.conteudo)) return null;

  const previousAssistantMessages = messages
    .slice(Math.max(0, lastUserIndex - 6), lastUserIndex)
    .filter((message) => message.direcao === "saida");
  const previousAsked18h = previousAssistantMessages.some((message) =>
    mentions18hContext(message.conteudo)
  );

  if (previousAsked18h) {
    return "\n\n## Contexto imediato de disponibilidade\n" +
      "A última mensagem da lead disse \"depois das 6\" depois de a Clara oferecer a opção após às 18h. " +
      "Interprete como disponibilidade após às 18h, registre essa disponibilidade e não pergunte novamente se é depois das 18h.";
  }

  return "\n\n## Contexto imediato de disponibilidade\n" +
    "A última mensagem da lead disse \"depois das 6\", mas não há contexto recente suficiente para saber se é 6h ou 18h. " +
    "Confirme em uma frase curta: \"Quando você diz depois das 6, seria depois das 18h?\"";
}

function mentionsValues(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:valor|valores|preco|precos|quanto|custa|custaria|investimento|plano|planos)\b/.test(normalized);
}

function mentionsGestanteContext(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:gestante|gravida|gravidez|gestacao|gestacional|parto|semanas|semana|trimestre|tri|lombar|gestar|mamae ativa)\b/.test(normalized);
}

function mentionsExplicitGestanteContext(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:gestante|gravida|gravidez|gestacao|gestacional|parto|semanas|semana|trimestre|tri|gestar|mamae ativa)\b/.test(normalized);
}

function mentionsMamaeAtiva(text: string): boolean {
  return /\bmamae ativa\b/.test(normalizeBurst(text));
}

function mentionsSpecificService(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:pilates|gestante|gravida|gravidez|gestacao|gestacional|parto|semanas|semana|trimestre|tri|gestar|mamae ativa|pelvica|perineo|perineal|assoalho pelvico)\b/.test(normalized);
}

function mentionsGenericFisioterapiaValues(text: string): boolean {
  const normalized = normalizeBurst(text);
  if (!mentionsValues(text)) return false;
  if (!/\b(?:fisioterapia|fisio)\b/.test(normalized)) return false;
  return !mentionsSpecificService(text);
}

function buildGenericFisioterapiaValuesContextNote(
  messages: ConversationMessageRow[],
  lead: { nome: string }
): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsGenericFisioterapiaValues(lastUserMessage.conteudo)) return null;
  if (mentionsBackPainOrLombalgia(lastUserMessage.conteudo)) return null;

  const firstName = lead.nome?.trim().split(/\s+/)[0] || "";
  const nameSuffix = firstName ? `, ${firstName}` : "";

  return "\n\n## Contexto imediato de valor de fisioterapia sem tipo definido\n" +
    "A última mensagem da lead pergunta genericamente o valor da fisioterapia, sem dizer se é fisioterapia pélvica, gestante, pilates ou outro serviço. " +
    "Antes de falar de valores ou consulta, apresente-se e descubra o tipo de fisioterapia. Use esta direção, em mensagens curtas: " +
    `\"Oii${nameSuffix}! Aqui é a Clara, da Corporis. Prazer em falar com você!\" ` +
    `Depois pergunte: \"E seria para qual tipo de fisioterapia${nameSuffix}?\" ` +
    "Depois explique: \"Por aqui o acompanhamento é bem personalizado, então o valor depende do plano que a gente traça pra você depois da consulta inicial. Mas quero entender primeiro o que você tá sentindo pra te explicar melhor como funciona.\" " +
    "Não ofereça agendamento ainda e não cite valores específicos nessa resposta.";
}

function mentionsBackPainOrLombalgia(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:dor nas costas|costas travad[ao]s?|dor lombar|lombalgia|coluna|lombar)\b/.test(normalized);
}

function mentionsMedicalReferral(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:encaminhamento medico|encaminhamento|pedido medico|indicacao medica|medico indicou|medica indicou|fisioterapia)\b/.test(normalized);
}

function buildNonPelvicPhysioBackPainContextNote(
  messages: ConversationMessageRow[],
  lead: { nome: string }
): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsBackPainOrLombalgia(lastUserMessage.conteudo)) return null;

  const recentText = messages
    .slice(Math.max(0, lastUserIndex - 8), lastUserIndex + 1)
    .map((message) => message.conteudo)
    .join(" ");
  if (mentionsExplicitGestanteContext(recentText) || isFisioPelvicaFlowText(recentText, { interesse: "" })) return null;

  const isGenericPhysioContext = /\b(?:fisioterapia|fisio)\b/.test(normalizeBurst(recentText)) ||
    mentionsMedicalReferral(recentText);
  if (!isGenericPhysioContext) return null;

  const firstName = lead.nome?.trim().split(/\s+/)[0] || "";
  const nameSuffix = firstName ? `, ${firstName}` : "";

  return "\n\n## Contexto imediato de fisioterapia não pélvica com lombalgia\n" +
    "A lead explicou que busca fisioterapia por dor nas costas, dor lombar ou lombalgia, possivelmente com encaminhamento médico. " +
    "A Corporis só atende fisioterapia pélvica, então não ofereça avaliação gratuita, consulta inicial, agenda ou valores de fisioterapia para esse caso. " +
    "Redirecione com cuidado para Pilates como opção possível. Use esta direção em mensagens curtas: " +
    `\"Entendi${nameSuffix}. Dor lombar é muito comum. Aqui nós atendemos muitas mulheres que chegam pra gente no Pilates com essa mesma queixa que você e têm ótimos resultados após algumas aulas.\" ` +
    "\"Caso queira conhecer, posso te explicar como funciona um pouco melhor.\" " +
    "\"Sobre a fisioterapia, aqui só atendemos fisioterapia pélvica. Mesmo o médico indicando a fisioterapia, acredito que o Pilates seja uma opção para você.\" " +
    "\"Caso queira conhecer, me avisa que te explico certinho.\"";
}

function buildMamaeAtivaContextNote(messages: ConversationMessageRow[]): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsMamaeAtiva(lastUserMessage.conteudo)) return null;

  return "\n\n## Contexto imediato de Mamãe Ativa\n" +
    "A lead perguntou como funciona o Mamãe Ativa. Não responda de forma genérica como apenas \"pilates gestante + fisioterapia pélvica\". " +
    "Explique com uma linguagem acolhedora e específica nesta direção: " +
    "\"O Mamãe Ativa é o queridinho das mamães aqui. O programa reúne cuidados com a sua saúde íntima e também com a sua saúde física de modo geral. " +
    "Trabalhamos com aulas de pilates específicas para a sua necessidade, de acordo com o trimestre em que você está e seus objetivos, e também com atendimentos de fisioterapia pélvica. " +
    "A fisioterapia pélvica tem um olhar mais direcionado para sua saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor.\" " +
    "Depois, se a lead ainda não informou, pergunte com quantas semanas de gestação ela está.";
}

function mentionsFisioPelvicaComplaint(text: string): boolean {
  const normalized = normalizeBurst(text);
  return /\b(?:endometriose|dor|dores|relacao|penetracao|vaginismo|escape|escapes|perda|perdas|urina|incontinencia|urgencia|xixi|pelvica|perineo|perineal|assoalho pelvico|musculos intimos|musculatura intima|diastase|prolapso|bexiga|constipacao|intestino|pos parto|puerperio|indicacao medica)\b/.test(normalized);
}

function mentionsFisioPelvicaTreatmentValues(text: string): boolean {
  const normalized = normalizeBurst(text);
  if (!mentionsValues(text)) return false;
  const hasTreatmentTerm = /\b(?:sessao|sessoes|atendimento|atendimentos|tratamento|acompanhamento|frequencia|plano|planos)\b/.test(normalized);
  if (/\bconsulta\b/.test(normalized) && !hasTreatmentTerm) return false;
  return hasTreatmentTerm;
}

function mentionsFisioPelvicaSchedulingCostObjection(text: string): boolean {
  const normalized = normalizeBurst(text);
  if (!mentionsFisioPelvicaTreatmentValues(text)) return false;

  const resistsScheduling = /\b(?:nao vou agendar|nao consigo agendar|nao quero agendar|vou agendar nao|nao vou marcar|nao consigo marcar|nao quero marcar|sem saber|antes preciso|preciso saber|preciso ter uma nocao|preciso ver|se vou conseguir|se consigo fazer|se vai caber|cabe no orcamento|consigo pagar|condicao|condicoes)\b/.test(normalized);
  return resistsScheduling;
}

function isFisioPelvicaFlowText(text: string, lead: { interesse: string }): boolean {
  return lead.interesse === "fisio_pelvica" ||
    /\b(?:fisio pelvica|fisioterapia pelvica|pelvica|regiao pelvica|assoalho pelvico)\b/.test(normalizeBurst(text));
}

function buildFisioPelvicaSchedulingCostObjectionContextNote(
  messages: ConversationMessageRow[],
  lead: { interesse: string; nome: string }
): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsFisioPelvicaSchedulingCostObjection(lastUserMessage.conteudo)) return null;

  const recentText = messages
    .slice(Math.max(0, lastUserIndex - 12), lastUserIndex + 1)
    .map((message) => message.conteudo)
    .join(" ");
  if (mentionsExplicitGestanteContext(recentText) || !isFisioPelvicaFlowText(recentText, lead)) return null;

  const firstName = lead.nome?.trim().split(/\s+/)[0] || "";
  const invite = firstName
    ? `\"Vamos agendar uma primeira consulta para avaliação, ${firstName}?\"`
    : "\"Vamos agendar uma primeira consulta para avaliação?\"";

  return "\n\n## Contexto imediato de objeção sobre valor da sessão de fisio pélvica\n" +
    "A lead disse que não vai agendar ou está travando o agendamento porque precisa saber o valor da sessão/tratamento para decidir se consegue fazer. " +
    "Não diga que a avaliação é gratuita, não fale em 50 minutos, não diga que ela pode ir sem custo e não responda \"sem compromisso\". " +
    "Também não repita que só dá para saber depois da consulta sem oferecer referência financeira. Responda nesta direção: " +
    "\"Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização.\" " +
    `Depois pergunte: ${invite}`;
}

function buildFisioPelvicaTreatmentValuesContextNote(
  messages: ConversationMessageRow[],
  lead: { interesse: string }
): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsFisioPelvicaTreatmentValues(lastUserMessage.conteudo)) return null;
  if (mentionsFisioPelvicaSchedulingCostObjection(lastUserMessage.conteudo)) return null;

  const recentText = messages
    .slice(Math.max(0, lastUserIndex - 12), lastUserIndex + 1)
    .map((message) => message.conteudo)
    .join(" ");
  if (mentionsExplicitGestanteContext(recentText) || !isFisioPelvicaFlowText(recentText, lead)) return null;

  return "\n\n## Contexto imediato de valores das sessões de fisio pélvica\n" +
    "A última mensagem da lead pergunta o valor das sessões, atendimentos ou tratamento em um fluxo de fisioterapia pélvica fora da gestação. " +
    "Não diga que a avaliação inicial é gratuita, não fale em 50 minutos e não repita a explicação inteira da consulta inicial. " +
    "Também não passe um valor fechado das sessões antes da consulta. Responda nesta direção: " +
    "\"Os valores das sessões dependem do plano de tratamento que a fisioterapeuta vai montar para você. Mas podem variar de 4 a 12 atendimentos. Ao final da consulta, as meninas já conseguem te passar certinho o plano de tratamento para você, com o número de atendimentos e a frequência.\" " +
    "Depois puxe para o agendamento da consulta inicial de forma curta.";
}

function buildFisioPelvicaNaoGestanteContextNote(
  messages: ConversationMessageRow[],
  lead: { interesse: string; nome: string }
): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (mentionsValues(lastUserMessage.conteudo)) return null;

  const recentText = messages
    .slice(Math.max(0, lastUserIndex - 8), lastUserIndex + 1)
    .map((message) => message.conteudo)
    .join(" ");
  if (mentionsExplicitGestanteContext(recentText)) return null;

  if (!isFisioPelvicaFlowText(recentText, lead) || !mentionsFisioPelvicaComplaint(recentText)) return null;

  const firstName = lead.nome?.trim().split(/\s+/)[0] || "";

  return "\n\n## Contexto imediato de fisio pélvica não gestante\n" +
    "A lead relatou uma queixa de fisioterapia pélvica fora de um fluxo de gestação. " +
    "Não explique mecanismo clínico pelo WhatsApp, não prometa melhora/controle e não chame de avaliação inicial. " +
    "Responda com prova social cuidadosa e depois explique a consulta inicial. Use esta direção: " +
    `\"Entendi${firstName ? `, ${firstName}` : ""}. Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você.\" ` +
    "Depois: \"O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen. E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso.\" " +
    "Não pergunte disponibilidade nessa mesma resposta, a menos que a lead já tenha pedido para agendar.";
}

function mentionsThirdTrimester(text: string): boolean {
  const normalized = normalizeBurst(text);
  if (/\b(?:terceiro|3|3o|3a)\s+(?:tri|trimestre)\b/.test(normalized)) return true;
  if (/\b(?:7|8|9)\s+mes(?:es)?\b/.test(normalized)) return true;

  const weekMatches = [...normalized.matchAll(/\b(\d{1,2})\s+semanas?\b/g)];
  return weekMatches.some((match) => Number(match[1]) >= 28);
}

function buildGestanteValuesContextNote(
  messages: ConversationMessageRow[],
  lead: { interesse: string; gestante?: boolean }
): string | null {
  const lastUserIndex = messages.findLastIndex((message) => message.direcao === "entrada");
  if (lastUserIndex < 0) return null;

  const lastUserMessage = messages[lastUserIndex];
  if (!mentionsValues(lastUserMessage.conteudo)) return null;

  const recentText = messages
    .slice(Math.max(0, lastUserIndex - 12), lastUserIndex + 1)
    .map((message) => message.conteudo)
    .join(" ");
  const isExplicitGestanteFlow = lead.gestante === true || mentionsExplicitGestanteContext(recentText);
  if (!isExplicitGestanteFlow && isFisioPelvicaFlowText(recentText, lead)) return null;

  const isGestanteFlow = lead.gestante === true || mentionsGestanteContext(recentText);
  if (!isGestanteFlow) return null;

  const thirdTrimesterLine = mentionsThirdTrimester(recentText)
    ? "Como o contexto indica terceiro trimestre, mencione que no terceiro tri o atendimento costuma ser semanal, mas pode variar de pessoa para pessoa. "
    : "Se o histórico indicar o trimestre atual, mencione esse trimestre; se não indicar, fale de forma geral que a frequência varia por trimestre e por pessoa. ";

  return "\n\n## Contexto imediato de valores para gestante\n" +
    "A última mensagem da lead pede valores dentro de um fluxo de gestante. Não use o script genérico de avaliação inicial gratuita/50 minutos e não repita uma tentativa de agendamento já feita. " +
    "Responda nesta direção: \"Antes de falar em valores, deixa eu te explicar como funciona o processo.\" " +
    "Explique que o acompanhamento é separado por trimestre gestacional, que cada trimestre tem um número de atendimentos de acordo com a semana gestacional e as necessidades avaliadas na consulta. " +
    thirdTrimesterLine +
    "Feche dizendo que por isso a consulta inicial é importante para avaliar as individualidades e preparar um plano personalizado. Termine perguntando: \"Podemos agendar essa consulta inicial para você?\"";
}

function dedupeBurstsAgainstRecentMessages(
  bursts: string[],
  messages: ConversationMessageRow[]
): string[] {
  const recentOutbound = messages
    .filter((message) => message.direcao === "saida")
    .slice(-6)
    .map((message) => message.conteudo);

  const kept: string[] = [];
  for (const burst of bursts) {
    const alreadySaid = [...recentOutbound, ...kept].some((previous) =>
      isDuplicateBurst(burst, previous)
    );
    if (!alreadySaid) kept.push(burst);
  }

  return kept;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Human-like delay before sending a burst.
 * First burst = reading + thinking + composing (longer).
 * Subsequent = proportional to message length.
 * 30% chance of an extra "distraction" pause on top.
 */
function humanDelay(text: string, isFirst: boolean): number {
  const base = isFirst
    ? randomDelay(8000, 18000)
    : Math.min(9000, Math.max(2000, text.length * 55));
  const extra = Math.random() < 0.3 ? randomDelay(1500, 5000) : 0;
  return base + extra;
}

/**
 * Sleep `totalMs` ms while continuously re-sending the "composing" presence
 * so WhatsApp keeps showing the typing indicator throughout — inclusive nos
 * gaps curtos entre bursts.
 *
 * Detalhe importante: logo após enviar uma mensagem o WhatsApp volta a presença
 * para "available". Um único "composing" disparado imediatamente depois é
 * frequentemente engolido. Por isso reasseramos o "composing" cedo (~700ms) e
 * mantemos um tick denso para que a digitação apareça mesmo em gaps de 2-3s.
 */
async function sleepWithPresence(phone: string, totalMs: number): Promise<void> {
  const TICK = 2500;
  const end = Date.now() + totalMs;

  await sendPresence(phone, "composing").catch(() => {});

  // Reassert cedo para vencer o "available" deixado pelo envio anterior.
  if (totalMs > 900) {
    await sleep(700);
    await sendPresence(phone, "composing").catch(() => {});
  }

  let remaining = end - Date.now();
  while (remaining > 0) {
    await sleep(Math.min(TICK, remaining));
    remaining = end - Date.now();
    if (remaining > 0) {
      await sendPresence(phone, "composing").catch(() => {});
    }
  }
}

async function generateTextOnlyFallback(
  provider: AgentProvider,
  modelId: string,
  systemPrompt: string,
  msgRows: ConversationMessageRow[],
): Promise<string> {
  const finalInstruction =
    "\n\n## Resposta obrigatoria agora\n" +
    "As ferramentas silenciosas ja foram usadas quando necessario. Agora responda a ultima mensagem da lead com texto final para WhatsApp. " +
    `Nao use ferramentas. Separe mensagens curtas com uma linha contendo apenas \"${BURST_DELIMITER}\". ` +
    "Se a lead pediu valores, responda objetivamente dentro das regras acima e mantenha o tom da Clara.";

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt + finalInstruction },
          ...msgRows.map((m) => ({
            role: (m.direcao === "entrada" ? "user" : "assistant") as "user" | "assistant",
            content: m.conteudo,
          })),
        ],
      }),
    });

    if (!res.ok) {
      console.error("[ai/reply] OpenAI fallback error", res.status, await res.text().catch(() => ""));
      return "";
    }

    const data = await res.json() as { choices?: { message?: { content?: string | null } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 512,
    system: systemPrompt + finalInstruction,
    messages: msgRows.map((m) => ({
      role: m.direcao === "entrada" ? ("user" as const) : ("assistant" as const),
      content: m.conteudo,
    })),
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.Messages.TextBlock).text)
    .join(" ")
    .trim();
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Accept calls from internal webhook (via CRON_SECRET) or without auth in dev
  const auth = request.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { conversation_id, trigger_message_id } = parsed.data;
  const supabase = createServiceRoleClient();
  const db = supabase.schema("crm");

  // Load agent config
  const { data: config } = await db.from("agent_config").select("*").single();

  // Load conversation + lead (needed before bypass/ativo checks)
  const { data: conv } = await db
    .from("conversations")
    .select("id, modo, leads!inner(id, nome, telefone, interesse, gestante, estagio, score_qualificacao)")
    .eq("id", conversation_id)
    .single();

  if (!conv) return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });

  const leadRow = Array.isArray(conv.leads) ? conv.leads[0] : conv.leads;
  if (!leadRow) return NextResponse.json({ error: "lead_not_found" }, { status: 404 });

  const lead = leadRow as {
    id: string; nome: string; telefone: string;
    interesse: string; gestante: boolean; estagio: string; score_qualificacao: number | null;
  };

  // Numbers in bypass list always get Clara — ignore ativo and business hours
  const bypassList = Array.isArray(config?.numeros_bypass)
    ? (config.numeros_bypass as string[])
    : [];
  const isBypassed = isPhoneInBypassList(lead.telefone, bypassList);

  if (conv.modo !== "ia" && !isBypassed) {
    return NextResponse.json({ ok: true, skipped: "not_ia_mode" });
  }

  if (!isBypassed) {
    if (!config?.ativo) {
      return NextResponse.json({ ok: true, skipped: "agent_inactive" });
    }
    if (!isWithinBusinessHours(config.horario_atendimento)) {
      if (config.mensagem_fora_horario) {
        await sendTextMessage({ phone: lead.telefone, text: config.mensagem_fora_horario });
      }
      return NextResponse.json({ ok: true, skipped: "outside_hours" });
    }
  }

  if (trigger_message_id) {
    await sleep(INBOUND_SETTLE_DELAY_MS);

    const { data: latestInboundMessage } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("direcao", "entrada")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestInboundMessage || latestInboundMessage.id !== trigger_message_id) {
      return NextResponse.json({ ok: true, skipped: "superseded_by_newer_inbound" });
    }
  }

  // Show "typing..." immediately while the LLM generates the reply
  sendPresence(lead.telefone, "composing").catch(() => {});

  // Load last 20 messages and restore chronological order for the model.
  const { data: recentMsgRows } = await db
    .from("messages")
    .select("id, direcao, conteudo")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(20);
  const msgRows = [...(recentMsgRows ?? [])].reverse();

  const anthropicMessages: Anthropic.Messages.MessageParam[] = msgRows.map((m) => ({
    role: m.direcao === "entrada" ? ("user" as const) : ("assistant" as const),
    content: m.conteudo,
  }));

  if (
    anthropicMessages.length === 0 ||
    anthropicMessages[anthropicMessages.length - 1].role !== "user"
  ) {
    return NextResponse.json({ ok: true, skipped: "no_user_message" });
  }

  const latestInboundMessageId = [...msgRows]
    .reverse()
    .find((message) => message.direcao === "entrada")?.id;

  const { provider, modelId } = resolveModel(config.model_provider, config.model_id);

  const regrasHandoffArr = Array.isArray(config.regras_handoff)
    ? (config.regras_handoff as string[])
    : [];
  const agendamentoHandoffAtivo = regrasHandoffArr.includes(HANDOFF_RULE_AGENDAMENTO);

  let systemPrompt = buildSystemPrompt(
    config.persona_prompt,
    config.boas_praticas,
    config.faq,
    config.regras_handoff,
    config.exemplos_conversa,
    lead
  );

  const availabilityContextNote = buildAvailabilityContextNote(msgRows);
  if (availabilityContextNote) {
    systemPrompt += availabilityContextNote;
  }
  const genericFisioterapiaValuesContextNote = buildGenericFisioterapiaValuesContextNote(msgRows, lead);
  if (genericFisioterapiaValuesContextNote) {
    systemPrompt += genericFisioterapiaValuesContextNote;
  }
  const nonPelvicPhysioBackPainContextNote = buildNonPelvicPhysioBackPainContextNote(msgRows, lead);
  if (nonPelvicPhysioBackPainContextNote) {
    systemPrompt += nonPelvicPhysioBackPainContextNote;
  }
  const mamaeAtivaContextNote = buildMamaeAtivaContextNote(msgRows);
  if (mamaeAtivaContextNote) {
    systemPrompt += mamaeAtivaContextNote;
  }
  const fisioPelvicaSchedulingCostObjectionContextNote = buildFisioPelvicaSchedulingCostObjectionContextNote(msgRows, lead);
  if (fisioPelvicaSchedulingCostObjectionContextNote) {
    systemPrompt += fisioPelvicaSchedulingCostObjectionContextNote;
  }
  const fisioPelvicaTreatmentValuesContextNote = buildFisioPelvicaTreatmentValuesContextNote(msgRows, lead);
  if (fisioPelvicaTreatmentValuesContextNote) {
    systemPrompt += fisioPelvicaTreatmentValuesContextNote;
  }
  const fisioPelvicaNaoGestanteContextNote = buildFisioPelvicaNaoGestanteContextNote(msgRows, lead);
  if (fisioPelvicaNaoGestanteContextNote) {
    systemPrompt += fisioPelvicaNaoGestanteContextNote;
  }
  const gestanteValuesContextNote = buildGestanteValuesContextNote(msgRows, lead);
  if (gestanteValuesContextNote) {
    systemPrompt += gestanteValuesContextNote;
  }

  if (agendamentoHandoffAtivo) {
    systemPrompt +=
      "\n\n## Restrição crítica — agendamento de avaliações\n" +
      "Você NÃO agenda avaliações diretamente. Quando o lead demonstrar interesse em agendar " +
      "(ou perguntar sobre horários/disponibilidade), use OBRIGATORIAMENTE a ferramenta " +
      "solicitar_handoff com motivo \"agendamento_avaliacao\". " +
      "A equipe fará o agendamento. Nunca use a ferramenta agendar_avaliacao.";
  }

  const notificacaoHandoff = config.notificacao_handoff as { ativo?: boolean; numero?: string } | null;
  const toolCtx = {
    leadId: lead.id,
    conversationId: conversation_id,
    agentConfig: {
      mensagem_handoff_agendamento: config.mensagem_handoff_agendamento ?? null,
      notificacao_handoff: notificacaoHandoff?.ativo && notificacaoHandoff.numero
        ? { ativo: true, numero: notificacaoHandoff.numero }
        : null,
    },
  };

  const activeTools = agendamentoHandoffAtivo
    ? AGENT_TOOLS.filter((t) => t.name !== "agendar_avaliacao")
    : AGENT_TOOLS;

  let finalText = "";
  let handoffRequested = false;

  if (provider === "openai") {
    // ─── OpenAI agentic loop ──────────────────────────────────────────────────
    type OAIToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
    type OAIMsg =
      | { role: "system" | "user" | "assistant"; content: string }
      | { role: "assistant"; content: null; tool_calls: OAIToolCall[] }
      | { role: "tool"; tool_call_id: string; content: string };

    const oaiTools = activeTools.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));

    const oaiMessages: OAIMsg[] = [
      { role: "system", content: systemPrompt },
      ...msgRows.map((m) => ({
        role: (m.direcao === "entrada" ? "user" : "assistant") as "user" | "assistant",
        content: m.conteudo,
      })),
    ];

    for (let turn = 0; turn < 5; turn++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: modelId, max_tokens: 1024, messages: oaiMessages, tools: oaiTools, tool_choice: "auto" }),
      });

      if (!res.ok) {
        console.error("[ai/reply] OpenAI error", res.status, await res.text().catch(() => ""));
        break;
      }

      const data = await res.json() as { choices: [{ finish_reason: string; message: { content: string | null; tool_calls?: OAIToolCall[] } }] };
      const msg = data.choices[0].message;

      if (msg.content) finalText = msg.content;

      if (data.choices[0].finish_reason === "stop" || !msg.tool_calls?.length) break;

      oaiMessages.push({ role: "assistant", content: null, tool_calls: msg.tool_calls });
      for (const tc of msg.tool_calls) {
        const input = JSON.parse(tc.function.arguments) as ToolInput;
        const result = await executeTool(tc.function.name, input, toolCtx);
        if (tc.function.name === "solicitar_handoff") handoffRequested = true;
        oaiMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }
  } else {
    // ─── Anthropic agentic loop ───────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let messages = [...anthropicMessages];

    for (let turn = 0; turn < 5; turn++) {
      const response = await anthropic.messages.create({
        model:      modelId,
        max_tokens: 1024,
        system:     systemPrompt,
        tools:      activeTools,
        messages,
      });

      const textBlocks    = response.content.filter((b) => b.type === "text");
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b) => (b as Anthropic.Messages.TextBlock).text).join(" ");
      }

      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) break;

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input as ToolInput, toolCtx);
        if (block.name === "solicitar_handoff") handoffRequested = true;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }

      messages = [
        ...messages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const,      content: toolResults },
      ];
    }
  }

  if (!finalText.trim() && !handoffRequested) {
    finalText = await generateTextOnlyFallback(provider, modelId, systemPrompt, msgRows);
  }

  // Send and store reply — em mensagens curtas (bursts), como uma pessoa digitando.
  const candidateBursts = splitIntoBursts(finalText);
  let bursts = dedupeBurstsAgainstRecentMessages(candidateBursts, msgRows);
  if (candidateBursts.length > 0 && bursts.length === 0) {
    console.warn("[ai/reply] all candidate bursts were deduped; sending one to avoid silent reply", {
      conversation_id,
    });
    bursts = [candidateBursts[0]];
  }
  if (bursts.length > 0) {
    const { data: latestInboundMessage } = await db
      .from("messages")
      .select("id")
      .eq("conversation_id", conversation_id)
      .eq("direcao", "entrada")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      latestInboundMessageId &&
      (!latestInboundMessage || latestInboundMessage.id !== latestInboundMessageId)
    ) {
      return NextResponse.json({ ok: true, skipped: "stale_reply" });
    }

    for (let i = 0; i < bursts.length; i++) {
      const chunk = bursts[i];

      // Sleep mantendo "digitando" visível; delay proporcional + variância aleatória.
      await sleepWithPresence(lead.telefone, humanDelay(chunk, i === 0));

      const { data: currentLatestInboundMessage } = await db
        .from("messages")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("direcao", "entrada")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        latestInboundMessageId &&
        (!currentLatestInboundMessage || currentLatestInboundMessage.id !== latestInboundMessageId)
      ) {
        return NextResponse.json({ ok: true, skipped: "stale_reply_before_send" });
      }

      await sendTextMessage({ phone: lead.telefone, text: chunk });

      await db.from("messages").insert({
        conversation_id,
        direcao:  "saida",
        autor:    "ia",
        conteudo: chunk,
        tipo:     "texto",
      });
    }
    // Respostas da IA não viram marco na timeline — vivem na tabela messages (aba Conversa).
  }

  return NextResponse.json({ ok: true, model: modelId, bursts: bursts.length });
}
