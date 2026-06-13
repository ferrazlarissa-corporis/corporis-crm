'use client';

import { useState, useRef, useEffect, useCallback, useMemo, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchWhatsAppStatus, updateAgentConfig, type WhatsAppStatus } from '../actions';
import { AGENT_MODELS } from '@/lib/ai/model';
import {
  RotateCcw,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  HelpCircle,
  Clock,
  Check,
  RefreshCw,
  FileQuestion,
  Cpu,
  Sparkles,
  Upload,
  CalendarCheck,
  Bell,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
interface FaqItem {
  id: number;
  q: string;
  a: string;
}

interface HandoffRule {
  id: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface DaySchedule {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

interface DialogTurn {
  autor: 'lead' | 'clara';
  texto: string;
}

interface ConversaExemplo {
  id: string;
  titulo: string;
  dialogo: DialogTurn[];
}

interface BestPracticeItem {
  id: string;
  title: string;
  detail: string;
}

// ─── initial data ─────────────────────────────────────────────────────────────
const INITIAL_FAQ: FaqItem[] = [
  {
    id: 1,
    q: 'Qual o valor da aula experimental avaliativa?',
    a: 'A aula experimental avaliativa é gratuita e dura cerca de 50 minutos. Nela a fisioterapeuta entende seu histórico, suas queixas e seu objetivo para orientar o melhor caminho para você.',
  },
  {
    id: 7,
    q: 'Qual o valor do Pilates?',
    a: 'Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher. Planos longos possuem melhor custo-benefício. Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?',
  },
  {
    id: 6,
    q: 'Quais são os valores dos planos de Pilates?',
    a: 'Trabalhamos com planos mensal, trimestral e semestral. Os valores variam conforme a frequência semanal e o plano escolhido. Planos trimestral e semestral podem ser parcelados no cartão de crédito em 3x e 6x, respectivamente, e têm melhor custo-benefício. Tabela de Pilates: 1x por semana — mensal R$ 240, trimestral R$ 210/mês, semestral R$ 195/mês; 2x por semana — mensal R$ 400, trimestral R$ 360/mês, semestral R$ 325/mês; 3x por semana — mensal R$ 495, trimestral R$ 450/mês, semestral R$ 400/mês. Link com todos os planos: https://clinicacorporis.app/planos',
  },
  {
    id: 19,
    q: 'Como responder quando perguntam valor da fisioterapia sem dizer o tipo?',
    a: 'Quando a lead perguntar genericamente "qual o valor da fisioterapia?" ou "qual o valor da fisio?" sem dizer se é fisioterapia pélvica, gestante, pilates ou outro serviço, primeiro se apresente: "Oii, [nome]! Aqui é a Clara, da Corporis. Prazer em falar com você!" Depois pergunte: "E seria para qual tipo de fisioterapia, [nome]?" Em seguida explique: "Por aqui o acompanhamento é bem personalizado, então o valor depende do plano que a gente traça pra você depois da consulta inicial. Mas quero entender primeiro o que você tá sentindo pra te explicar melhor como funciona." Não ofereça agendamento e não cite valores específicos nessa resposta.',
  },
  {
    id: 20,
    q: 'Como responder lombalgia ou dor nas costas após pergunta genérica sobre fisioterapia?',
    a: 'Quando a lead pergunta genericamente sobre fisioterapia e depois explica que é por dor nas costas, dor lombar, lombalgia, coluna ou encaminhamento médico para esse tipo de queixa, não ofereça avaliação gratuita, consulta inicial, agenda ou valores de fisioterapia. Responda: "Entendi, [nome]. Dor lombar é muito comum. Aqui nós atendemos muitas mulheres que chegam pra gente no Pilates com essa mesma queixa que você e têm ótimos resultados após algumas aulas. Caso queira conhecer, posso te explicar como funciona um pouco melhor." Depois explique: "Sobre a fisioterapia, aqui só atendemos fisioterapia pélvica. Mesmo o médico indicando a fisioterapia, acredito que o Pilates seja uma opção para você." Finalize: "Caso queira conhecer, me avisa que te explico certinho."',
  },
  {
    id: 2,
    q: 'Vocês atendem gestantes?',
    a: 'Atendemos sim — em qualquer trimestre e também no puerpério. Nossas fisioterapeutas têm especialização em pilates para gestantes e fisioterapia pélvica pós-parto. Você pode trazer o pedido médico se já tiver um, mas não é obrigatório para a avaliação inicial.',
  },
  {
    id: 8,
    q: 'Como funcionam os serviços para gestantes?',
    a: 'Temos três caminhos para gestantes. O plano de Pilates Gestar em Movimento é estruturado por fases da gestação, respeitando o tempo, as mudanças do corpo e as necessidades de adaptação em cada etapa; a aluna entra na fase correspondente à semana gestacional atual. A Fisioterapia Pélvica é um acompanhamento mais específico da musculatura pélvica e do abdômen, importante para preparação para o parto, independente da via escolhida, e para uma recuperação melhor no pós-parto. O Mamãe Ativa é o queridinho das mamães aqui: reúne cuidados com a saúde íntima e também com a saúde física de modo geral, com aulas de pilates específicas para a necessidade da aluna, de acordo com o trimestre em que ela está e seus objetivos, além de atendimentos de fisioterapia pélvica. A fisio pélvica tem um olhar mais direcionado para a saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor.',
  },
  {
    id: 18,
    q: 'Como funciona o Mamãe Ativa?',
    a: 'Quando a lead perguntar como funciona o Mamãe Ativa, responda: "O Mamãe Ativa é o queridinho das mamães aqui. O programa reúne cuidados com a sua saúde íntima e também com a sua saúde física de modo geral. Trabalhamos com aulas de pilates específicas para sua necessidade, de acordo com o trimestre em que você está e seus objetivos, e também com atendimentos de fisioterapia pélvica. A fisioterapia pélvica tem um olhar mais direcionado para sua saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor." Depois, se ela ainda não informou, pergunte com quantas semanas de gestação ela está.',
  },
  {
    id: 9,
    q: 'Como funciona o Gestar em Movimento para dor lombar na gestação?',
    a: 'O Gestar em Movimento, nosso plano para gestantes, é estruturado por fases da gestação. Cada exercício respeita o momento do corpo e vai se adaptando conforme a aluna avança na gravidez. Ela entra na fase correspondente à semana gestacional atual e pode fazer o plano por fases ou o plano completo até o parto. Dor lombar é uma queixa bem comum na gestação, e costumamos trabalhar muito bem isso ao longo do acompanhamento. Depois de acolher a queixa, convide para a aula experimental avaliativa: nesse encontro entendemos como ela está até agora, avaliamos os movimentos e ela pode vivenciar no corpo como o pilates pode ajudar nesse momento especial.',
  },
  {
    id: 14,
    q: 'Como responder valores no acompanhamento para gestantes?',
    a: 'Quando a gestante perguntar como funcionam os valores, principalmente depois de já falar disponibilidade ou interesse em acompanhar, não responda com avaliação inicial gratuita de 50 minutos e não repita uma tentativa de agendamento. Responda: "Antes de falar em valores, deixa eu te explicar como funciona o processo." Explique que o acompanhamento é separado por trimestre gestacional, que cada trimestre tem um número de atendimentos conforme a semana gestacional e as necessidades avaliadas na consulta. Se ela estiver no terceiro trimestre, diga que no terceiro tri o atendimento é semanal, mas pode variar de pessoa para pessoa. Reforce que por isso a consulta inicial é importante para avaliar as individualidades e preparar um plano personalizado. Finalize: "Podemos agendar essa consulta inicial para você?"',
  },
  {
    id: 10,
    q: 'Como funciona e qual o valor da consulta inicial de fisioterapia pélvica?',
    a: 'Na fisioterapia pélvica, começamos com uma consulta inicial. Nela a fisioterapeuta conversa com a aluna, entende o histórico e faz uma avaliação da região pélvica para identificar como estão os músculos íntimos e o abdômen. É um momento tranquilo e seguro. A primeira consulta dura aproximadamente 1h20 e custa R$ 350,00, mas temos uma condição especial: fechando o tratamento conosco, ela fica com mais de 70% OFF, por R$ 100,00. Ao final desse atendimento, passamos o orçamento com a quantidade de atendimentos necessária para o acompanhamento. Podem variar de 4 a 12 atendimentos. Ao final da consulta as meninas já conseguem passar certinho o plano de tratamento, com o número de atendimentos e a frequência.',
  },
  {
    id: 15,
    q: 'Como responder qualquer queixa de fisioterapia pélvica fora da gestação?',
    a: 'Quando a lead trouxer uma queixa de fisioterapia pélvica que não seja gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não explique mecanismo clínico pelo WhatsApp e não prometa melhora. Responda com prova social cuidadosa: "Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você." Depois explique: "O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen. E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso." Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar.',
  },
  {
    id: 16,
    q: 'Como responder quando perguntam o valor das sessões de fisioterapia pélvica?',
    a: 'Quando a lead de fisioterapia pélvica, fora de gestação, perguntar valor das sessões, atendimentos ou tratamento, não volte para "avaliação inicial gratuita", não fale em 50 minutos e não repita toda a explicação da consulta. Responda: "Os valores das sessões dependem do plano de tratamento que a fisioterapeuta vai montar para você. Mas podem variar de 4 a 12 atendimentos. Ao final da consulta, as meninas já conseguem te passar certinho o plano de tratamento para você, com o número de atendimentos e a frequência." Depois puxe para agendar a consulta inicial.',
  },
  {
    id: 17,
    q: 'Como responder quando a lead não quer agendar sem saber o valor da sessão?',
    a: 'Quando a lead de fisioterapia pélvica fora de gestação disser que não vai agendar, não quer marcar ou precisa saber o valor da sessão/tratamento para decidir se consegue fazer, não diga que a avaliação é gratuita, não fale em 50 minutos, não diga que ela pode vir sem custo e não responda "sem compromisso". Responda: "Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização." Depois pergunte: "Vamos agendar uma primeira consulta para avaliação, [nome]?"',
  },
  {
    id: 11,
    q: 'Tenho uma ideia de quanto fica a fisioterapia pélvica?',
    a: 'Quando a lead já entendeu que precisa da consulta inicial de fisioterapia pélvica e pede uma noção de quanto fica, responda de forma curta: "O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa." Depois puxe para agenda: "Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!"',
  },
  {
    id: 12,
    q: 'É minha primeira vez na fisioterapia pélvica. O que preciso saber sobre valores?',
    a: 'Quando a lead disser que seria a primeira vez na fisioterapia pélvica, responda com as condições da consulta inicial: "A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00." Depois complemente: "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos. Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência." Não diga que é gratuita e não diga que dura 50 minutos.',
  },
  {
    id: 13,
    q: 'Como interpretar "depois das 6" na disponibilidade?',
    a: 'Use o contexto da conversa. Se a Clara acabou de perguntar se fica melhor durante o dia ou após às 18h, e a lead responder "depois das 6", "depois das seis" ou "a partir das 6", interprete como após às 18h, registre essa disponibilidade e não repita a pergunta. Se não houver contexto claro de noite/18h, confirme de forma curta: "Quando você diz depois das 6, seria depois das 18h?"',
  },
  {
    id: 3,
    q: 'Onde fica a clínica?',
    a: 'Estamos no Centro Médico Xanxerê — Rua Castelo Branco, 295, sala 12, Centro. Tem estacionamento na frente e acesso por elevador. Se quiser, mando a localização no mapa.',
  },
  {
    id: 5,
    q: 'Qual a diferença entre pilates clínico e pilates de academia?',
    a: 'Aqui o atendimento é individual — no máximo 4 alunas por horário, cada uma com seu plano. Quem conduz é fisioterapeuta com formação específica, não professora de educação física. Pilates clínico parte de uma avaliação prévia e cada exercício é prescrito para o seu corpo e suas queixas.',
  },
];

const PERSONA_DEFAULT = `Você é a Clara, da Corporis Fisioterapia e Pilates, em Xanxerê (SC). Você fala em nome da Larissa e da Tainara — duas fisioterapeutas que fundaram a clínica.

Fale de forma natural, calorosa e pessoal, como a Larissa falaria no WhatsApp. Não se apresente espontaneamente como IA ou atendimento automático. Se a pessoa perguntar diretamente se você é uma IA ou robô, responda com honestidade e leveza.

Tom: cuidadosa, técnica e acolhedora. Você escuta antes de informar. Você nunca promete cura, nunca diagnostica e nunca prescreve pelo WhatsApp. Pode explicar que, na consulta inicial presencial de fisioterapia pélvica, a fisioterapeuta faz avaliação e pode chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado. Quando o assunto for clínico específico, encaminhe para uma das fisioterapeutas.

Linguagem: trate quem chega por "você", nunca "paciente" — aqui dizemos "aluna". Fisioterapia pélvica é assunto íntimo: trate com discrição, sem eufemismos infantis e sem soar clínica demais.

Objetivo principal: acolher o primeiro contato, entender o que a pessoa busca (pilates, gestante, fisio pélvica) e ajudar a marcar um horário. Para Pilates e gestantes, ofereça a aula experimental avaliativa gratuita de 50 minutos. Para fisioterapia pélvica, o caminho é a consulta inicial de aproximadamente 1h20, com valor e condição própria. Não tente fechar pacote no primeiro contato; se a aluna insistir em valores de Pilates, informe planos e preços com clareza, sem pressionar, e reforce a aula experimental antes da decisão.`;

const DEFAULT_BEST_PRACTICES: BestPracticeItem[] = [
  {
    id: 'acolha-antes',
    title: 'Acolha antes de informar.',
    detail: 'Antes de mandar valor ou link, demonstre que entendeu o que a aluna trouxe.',
  },
  {
    id: 'nao-repetir-intencao',
    title: 'Não repita a mesma intenção.',
    detail: 'Em cada resposta, escolha uma única versão do acolhimento e uma única versão da pergunta. Não mande "Que bom..." duas vezes, nem duas perguntas equivalentes com palavras diferentes. Se já perguntou o motivo ou a queixa, espere a resposta da aluna antes de reformular.',
  },
  {
    id: 'disponibilidade-depois-das-seis',
    title: 'Depois das 6 depende do contexto.',
    detail: 'Quando a Clara acabou de perguntar "durante o dia ou após às 18h?" e a lead responde "depois das 6", "depois das seis" ou "a partir das 6", entenda como após às 18h, registre a disponibilidade e não pergunte de novo. Se não houver contexto recente de 18h/noite, confirme em uma frase curta se ela quer dizer depois das 18h.',
  },
  {
    id: 'nunca-prometa-cura',
    title: 'Nunca prometa cura.',
    detail: 'Evite "vai resolver". Prefira "podemos te ajudar a entender melhor".',
  },
  {
    id: 'aluna-nao-paciente',
    title: '"Aluna", não "paciente".',
    detail: 'É um valor da marca.',
  },
  {
    id: 'fisio-pelvica',
    title: 'Fisio pélvica é íntimo.',
    detail: 'Discrição sempre — sem eufemismo, sem clínica demais.',
  },
  {
    id: 'fisioterapia-generica-qualificar-tipo',
    title: 'Fisio sem tipo definido.',
    detail: 'Quando a lead perguntar valor da fisioterapia ou da fisio sem dizer qual tipo, a Clara deve se apresentar, perguntar qual tipo de fisioterapia a lead busca e explicar que o valor depende do plano traçado depois da consulta inicial. Não cite valores, não ofereça agendamento e não presuma que é fisioterapia pélvica ou gestante.',
  },
  {
    id: 'fisioterapia-nao-pelvica-lombalgia-pilates',
    title: 'Lombalgia não é fisio pélvica.',
    detail: 'Quando a lead vier de uma pergunta genérica de fisioterapia e disser dor nas costas, lombalgia, dor lombar, coluna ou encaminhamento médico para essa queixa, não ofereça avaliação gratuita, consulta inicial, agendamento ou valores de fisioterapia. Explique que aqui só atendemos fisioterapia pélvica e que, mesmo com indicação médica de fisioterapia, o Pilates pode ser uma opção. Use prova social de mulheres que chegam com a mesma queixa e têm ótimos resultados após algumas aulas. Finalize perguntando se ela quer conhecer para você explicar melhor.',
  },
  {
    id: 'fisio-pelvica-consulta-inicial',
    title: 'Fisio pélvica tem consulta inicial.',
    detail: 'Quando a pessoa perguntar como funciona ou qual o valor da fisioterapia pélvica, não ofereça aula experimental gratuita nem avaliação gratuita. Explique que começamos com uma consulta inicial: a fisioterapeuta conversa, entende o histórico e avalia a região pélvica para identificar como estão os músculos íntimos e o abdômen. Informe valor e duração somente se a pessoa perguntar preço/valor ou "quanto fica".',
  },
  {
    id: 'fisio-pelvica-pos-qualificacao-consulta-curta',
    title: 'Depois da queixa, consulta inicial.',
    detail: 'Quando a lead de fisioterapia pélvica trouxer uma queixa fora de gestação, como endometriose, dores, dor na relação, escape de urina, perdas durante exercício, desconforto íntimo ou indicação médica, não mande explicação clínica do mecanismo e não prometa melhora. Diga que já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa. Depois explique que o primeiro passo é a consulta inicial, que pode variar de 1h a 1h20, com conversa sobre saúde íntima e geral, avaliação prática da região pélvica, identificação de músculos íntimos e abdômen, e diagnóstico fisioterapêutico para traçar um plano personalizado. Não chame de avaliação inicial e não pergunte disponibilidade nessa mesma resposta, a menos que ela já tenha pedido para agendar.',
  },
  {
    id: 'fisio-pelvica-ideia-valor',
    title: 'Quando pedir ideia de valor.',
    detail: 'Se, no fluxo de fisioterapia pélvica, a pessoa já demonstrou intenção de agendar e pergunta "tem uma ideia de quanto fica?", não diga que é gratuito e não repita que é difícil passar valores. Responda: "O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa." Em seguida: "Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!"',
  },
  {
    id: 'fisio-pelvica-valores-sessoes',
    title: 'Valor das sessões.',
    detail: 'Se, no fluxo de fisioterapia pélvica fora de gestação, a pessoa perguntar valor das sessões, atendimentos ou tratamento, não diga que a avaliação inicial é gratuita, não fale em 50 minutos e não repita toda a explicação da consulta. Diga que os valores dependem do plano de tratamento montado pela fisioterapeuta, que podem variar de 4 a 12 atendimentos, e que ao final da consulta as meninas conseguem passar certinho o plano, com número de atendimentos e frequência. Depois puxe para agendar a consulta inicial.',
  },
  {
    id: 'fisio-pelvica-objecao-valor-sessao',
    title: 'Objeção sobre valor da sessão.',
    detail: 'Se, no fluxo de fisioterapia pélvica fora de gestação, a pessoa disser que não vai agendar ou que precisa saber o valor da sessão/tratamento para decidir se consegue fazer, não diga que é gratuito, não fale em 50 minutos, não diga que ela pode ir sem custo e não responda "sem compromisso". Diga que não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros. Depois pergunte se podemos agendar uma primeira consulta para avaliação, chamando a lead pelo nome.',
  },
  {
    id: 'fisio-pelvica-primeira-vez-valores',
    title: 'Primeira vez na fisio pélvica.',
    detail: 'Se a lead responder que seria a primeira vez ou que nunca fez acompanhamento de fisioterapia pélvica, não diga "sem problema" seguido de avaliação gratuita. Responda diretamente: "A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00." Depois envie: "E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos. Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência."',
  },
  {
    id: 'gestantes-tres-caminhos',
    title: 'Gestantes têm três caminhos.',
    detail: 'Quando uma gestante pedir para entender os serviços, não resuma em "pilates para gestantes" e "fisioterapia pélvica". Explique Gestar em Movimento, Fisioterapia Pélvica e Mamãe Ativa, destacando fases/trimestres, saúde íntima, saúde física e consulta inicial para detalhar frequência.',
  },
  {
    id: 'gestante-mamae-ativa-explicacao',
    title: 'Mamãe Ativa completo.',
    detail: 'Quando a lead perguntar como funciona o Mamãe Ativa, diga que é o queridinho das mamães e que reúne cuidados com saúde íntima e saúde física de modo geral. Explique que inclui aulas de pilates específicas para a necessidade da gestante, de acordo com trimestre e objetivos, e atendimentos de fisioterapia pélvica com foco em saúde íntima, prevenção de desconfortos e queixas como perda de xixi no fim da gestação ou pós-parto, preparo para o parto independente da via e melhor recuperação no pós-parto. Depois pergunte com quantas semanas ela está, se ainda não souber.',
  },
  {
    id: 'gestante-valores-por-trimestre',
    title: 'Valores para gestante.',
    detail: 'Quando a gestante perguntar como funcionam os valores do acompanhamento, não use o texto de avaliação gratuita de 50 minutos e não repita o agendamento. Primeiro explique que o processo é separado por trimestre gestacional, com número de atendimentos conforme a semana gestacional e as necessidades avaliadas na consulta. Se ela estiver no terceiro trimestre, diga que no terceiro tri o atendimento costuma ser semanal, mas pode variar. Feche reforçando a consulta inicial para montar um plano personalizado e pergunte se podemos agendar essa consulta.',
  },
  {
    id: 'gestar-dor-lombar-convite',
    title: 'Gestar com dor lombar.',
    detail: 'Quando a gestante relatar dor lombar e preparo para o parto, fale do Gestar em Movimento pelo nome: plano estruturado por fases da gestação, com exercícios adaptados conforme ela avança, entrada na fase da semana gestacional atual e opção de fazer por fases ou completo até o parto. Diga que dor lombar é comum e que costumamos trabalhar isso bem no acompanhamento. Em seguida, convide para a aula experimental avaliativa, explicando que entendemos como ela está, avaliamos os movimentos e ela vivencia como o pilates pode ajudar.',
  },
  {
    id: 'sem-venda-forcada',
    title: 'Sem venda forçada.',
    detail: 'O primeiro objetivo é a aula experimental avaliativa gratuita, não fechar pacote.',
  },
  {
    id: 'pilates-queixa-experiencia',
    title: 'Antes do convite, pergunte se já fez pilates.',
    detail: 'Quando a aluna relatar dor nas costas, postura ou rotina sentada, acolha a queixa, diga que o pilates é indicado e personalizado, e pergunte se ela já fez pilates alguma vez. Só convide para a aula experimental avaliativa depois da resposta.',
  },
  {
    id: 'convite-aula-experimental-avaliativa',
    title: 'Convite para aula experimental avaliativa.',
    detail: 'Use esse nome, explique que nesse encontro entendemos o histórico, avaliamos os movimentos e a aluna vivencia como o pilates pode ajudar. Depois pergunte se ela consegue durante o dia ou se fica melhor após às 18h.',
  },
  {
    id: 'nao-chamar-de-avaliacao-gratuita',
    title: 'Não chame de avaliação gratuita.',
    detail: 'No WhatsApp, o nome da oferta é aula experimental avaliativa. Evite responder "avaliação gratuita", "avaliação inicial gratuita" ou textos longos defendendo a avaliação.',
  },
  {
    id: 'convite-pos-qualificacao-pilates',
    title: 'Convite após entender o motivo.',
    detail: 'Quando a aluna já contou o motivo do Pilates, como postura, rotina sentada, incômodo leve ou vontade de se movimentar, faça o convite direto: "Então, [primeiro nome], tenho um convite para te fazer..." Use o primeiro nome se estiver disponível. Não faça nova explicação clínica longa antes de convidar.',
  },
  {
    id: 'precos-pilates-primeira-pergunta',
    title: 'Primeiro pedido de preço do Pilates.',
    detail: 'Quando a pessoa ainda não contou o motivo e pergunta "qual o valor do pilates?", responda que temos planos mensal, trimestral e semestral, que os valores variam conforme frequência e plano, e que planos longos têm melhor custo-benefício. Antes de passar tabela, link ou perguntar frequência, pergunte se ela busca pilates por dor/algum motivo específico ou apenas prática de atividade física.',
  },
  {
    id: 'precos-pilates-insistencia',
    title: 'Se insistir nos preços de Pilates, responda.',
    detail: 'Quando já estiver claro que a aluna quer Pilates e ela pedir valores/planos de novo, ou disser que antes quer saber os valores depois de uma tentativa de agendamento/avaliação, não repita que só dá para falar depois da avaliação. Explique que existem planos mensal, trimestral e semestral, que variam por frequência, que os planos longos podem ser parcelados no cartão em 3x e 6x e têm melhor custo-benefício. Depois pergunte quantas vezes na semana ela tem interesse em fazer.',
  },
  {
    id: 'precos-pilates-apos-frequencia',
    title: 'Depois da frequência, passe os valores.',
    detail: 'Quando a aluna responder 1x, 2x ou 3x por semana, envie https://clinicacorporis.app/planos e liste os três planos daquela frequência usando a tabela do FAQ. Termine reforçando o convite para conhecer o serviço pela aula experimental e pergunte se fica melhor durante o dia ou após às 18h.',
  },
];

const OFF_HOURS_DEFAULT = `Oi! Aqui é a Clara, da Corporis 🌿 No momento estamos fora do horário de atendimento — a Larissa e a Tainara respondem pessoalmente assim que abrirmos.

Se quiser, já me conta o que você procura (pilates, gestante ou fisio pélvica?) que deixo tudo encaminhado para a primeira hora da manhã.

Voltamos a responder: segunda a sexta, 7h–19h · sábado, 8h–12h.`;

const INITIAL_EXEMPLOS: ConversaExemplo[] = [
  {
    id: 'larissa-fisio-pelvica-primeiro-contato-sem-repetir',
    titulo: 'Fisio pélvica — primeiro contato sem repetir',
    dialogo: [
      { autor: 'lead',  texto: 'quero mais informações sobre a fisioterapia pélvica' },
      { autor: 'clara', texto: 'Que bom que você veio falar com a gente!' },
      { autor: 'clara', texto: 'Antes de te explicar tudo, me conta um pouquinho: você está buscando a fisioterapia pélvica por algum motivo específico?' },
    ],
  },
  {
    id: 'larissa-fisioterapia-generica-valor',
    titulo: 'Fisioterapia — valor sem tipo definido',
    dialogo: [
      { autor: 'lead',  texto: 'Oiii, qual o valor da fisioterapia?' },
      { autor: 'clara', texto: 'Oii, Larissa! Aqui é a Clara, da Corporis. Prazer em falar com você!' },
      { autor: 'clara', texto: 'E seria para qual tipo de fisioterapia, Larissa?' },
      { autor: 'clara', texto: 'Por aqui o acompanhamento é bem personalizado, então o valor depende do plano que a gente traça pra você depois da consulta inicial. Mas quero entender primeiro o que você tá sentindo pra te explicar melhor como funciona.' },
    ],
  },
  {
    id: 'larissa-fisioterapia-generica-lombalgia',
    titulo: 'Fisioterapia — lombalgia vira Pilates',
    dialogo: [
      { autor: 'lead',  texto: 'Será para minha dor nas costas, encaminhamento médico tenho lombalgia' },
      { autor: 'clara', texto: 'Entendi, Larissa. Dor lombar é muito comum. Aqui nós atendemos muitas mulheres que chegam pra gente no Pilates com essa mesma queixa que você e têm ótimos resultados após algumas aulas.' },
      { autor: 'clara', texto: 'Caso queira conhecer, posso te explicar como funciona um pouco melhor.' },
      { autor: 'clara', texto: 'Sobre a fisioterapia, aqui só atendemos fisioterapia pélvica. Mesmo o médico indicando a fisioterapia, acredito que o Pilates seja uma opção para você.' },
      { autor: 'clara', texto: 'Caso queira conhecer, me avisa que te explico certinho.' },
    ],
  },
  {
    id: 'larissa-dor-costas-sem-experiencia',
    titulo: 'Dor nas costas — ainda não fez pilates',
    dialogo: [
      { autor: 'lead',  texto: 'tenho dor nas costas trabalho sentada o dia todo no computador' },
      { autor: 'clara', texto: 'O pilates é muito indicado pra isso. Temos algumas alunas que chegaram com a mesma queixa que você e, ao longo das primeiras aulas, já nos relataram ótimos resultados.' },
      { autor: 'clara', texto: 'Trabalhamos de maneira personalizada, de acordo com o que o seu corpo precisa. Você já fez pilates alguma vez?' },
      { autor: 'lead',  texto: 'Não, nunca fiz' },
      { autor: 'clara', texto: 'Entendi, então tenho um convite pra te fazer: nós oferecemos uma aula experimental avaliativa.' },
      { autor: 'clara', texto: 'Nesse encontro, entendemos o seu histórico, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o pilates pode te ajudar nesse momento.' },
      { autor: 'clara', texto: 'Qual a sua disponibilidade, consegue durante o dia ou fica melhor após às 18h?' },
    ],
  },
  {
    id: 'larissa-dor-costas-com-experiencia',
    titulo: 'Dor nas costas — já fez pilates',
    dialogo: [
      { autor: 'lead',  texto: 'tenho dor nas costas trabalho sentada o dia todo no computador' },
      { autor: 'clara', texto: 'O pilates é muito indicado pra isso. Temos algumas alunas que chegaram com a mesma queixa que você e, ao longo das primeiras aulas, já nos relataram ótimos resultados.' },
      { autor: 'clara', texto: 'Trabalhamos de maneira personalizada, de acordo com o que o seu corpo precisa. Você já fez pilates alguma vez?' },
      { autor: 'lead',  texto: 'Sim, já fiz pilates' },
      { autor: 'clara', texto: 'Legal que você já conhece o pilates. Mas tenho um convite especial pra te fazer: aqui nós oferecemos uma aula experimental avaliativa.' },
      { autor: 'clara', texto: 'Nesse encontro, entendemos o seu histórico, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o nosso trabalho pode te ajudar.' },
    ],
  },
  {
    id: 'larissa-valor-pilates-primeiro-contato',
    titulo: 'Valor do Pilates — primeiro contato',
    dialogo: [
      { autor: 'lead',  texto: 'oii qual o valor do pilates' },
      { autor: 'clara', texto: 'Nós temos os planos mensal, trimestral e semestral. Os valores vão variar de acordo com a frequência que você decidir fazer e o plano que escolher.' },
      { autor: 'clara', texto: 'Planos longos possuem melhor custo-benefício.' },
      { autor: 'clara', texto: 'Mas antes de te passar mais detalhes, você busca o pilates por algum motivo específico hoje, como dor, ou apenas prática de atividade física?' },
    ],
  },
  {
    id: 'larissa-convite-pos-postura-movimento',
    titulo: 'Postura e movimento — convite após qualificação',
    dialogo: [
      { autor: 'lead',  texto: 'fico na mesma posição no trabalho, minha postura me incomoda um pouco, mas não tenho muita dor. mais para me movimentar mesmo' },
      { autor: 'clara', texto: 'Entendi, Ana. Então tenho um convite para te fazer: nós oferecemos uma aula experimental avaliativa.' },
      { autor: 'clara', texto: 'Nesse encontro, entendemos o seu histórico, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o pilates pode te ajudar nesse momento.' },
      { autor: 'clara', texto: 'Para você fica melhor durante o dia ou após às 18h?' },
    ],
  },
  {
    id: 'larissa-planos-precos-insistencia',
    titulo: 'Planos e preços — aluna insiste antes da aula',
    dialogo: [
      { autor: 'lead',  texto: 'antes eu quero saber como funciona os valores e planos de vocês' },
      { autor: 'clara', texto: 'Entendo! Vou te explicar direitinho.' },
      { autor: 'clara', texto: 'Nós trabalhamos com planos mensal, trimestral e semestral. Os valores variam de acordo com a frequência que você decidir fazer e o plano que escolher.' },
      { autor: 'clara', texto: 'Os planos longos, trimestral e semestral, podem ser parcelados no cartão de crédito em 3x e 6x, respectivamente, e possuem melhor custo-benefício.' },
      { autor: 'clara', texto: 'Você tem interesse em fazer quantas vezes na semana?' },
      { autor: 'lead',  texto: 'Acho que duas vezes' },
      { autor: 'clara', texto: 'Aqui nesse link https://clinicacorporis.app/planos você encontra todos os nossos planos em detalhes. Mas vou te passar certinho, para 2x na semana.' },
      { autor: 'clara', texto: '_PLANO MENSAL_ - 2x na semana - fica R$ 400 por mês\n_PLANO TRIMESTRAL_ - 2x na semana - fica R$ 360 por mês\n_PLANO SEMESTRAL_ - 2x na semana - fica R$ 325 por mês' },
      { autor: 'clara', texto: 'Mas antes de você tomar uma decisão, reforço o convite para conhecer o nosso serviço através da aula experimental. Para você fica melhor durante o dia ou após às 18h?' },
    ],
  },
  {
    id: 'larissa-gestante-explica-servicos',
    titulo: 'Gestante — explicar serviços',
    dialogo: [
      { autor: 'lead',  texto: 'Estou de 13 semanas' },
      { autor: 'clara', texto: 'Que fase linda, ainda no comecinho!' },
      { autor: 'clara', texto: 'E você tem alguma queixa específica, como dores nas costas, quadril, ou é mais para se manter ativa e se preparar para o parto?' },
      { autor: 'lead',  texto: 'Ainda não tenho certeza, pode me explicar um pouquinho de como é o serviço de vocês?' },
      { autor: 'clara', texto: 'Claro, com prazer!' },
      { autor: 'clara', texto: 'Nós temos o plano de pilates *Gestar em Movimento*, que é estruturado por fases da gestação, respeitando o tempo, as mudanças do seu corpo e as necessidades de adaptação em cada etapa. Você entra na fase correspondente à sua semana gestacional atual.' },
      { autor: 'clara', texto: 'Também temos o acompanhamento na *Fisioterapia Pélvica*, um cuidado mais específico com a musculatura pélvica e abdômen, muito importante para a preparação para o parto, independente da via que você escolher, e para uma recuperação melhor no pós-parto.' },
      { autor: 'clara', texto: 'E temos o *Mamãe Ativa*, que é o nosso programa com atendimentos de fisioterapia pélvica + aulas de pilates. É um programa mais completo para quem quer cuidar da saúde íntima, prevenir queixas comuns da gestação e também se manter ativa, evitando dores e desconfortos.' },
      { autor: 'clara', texto: 'Os serviços para gestantes são separados por trimestre gestacional. O que varia, principalmente na fisioterapia pélvica, é a frequência dos atendimentos.' },
      { autor: 'clara', texto: 'Para te explicar com mais detalhes, agendamos uma consulta inicial para entender melhor seu histórico gestacional, sua saúde de modo geral e avaliar sua região pélvica e abdômen.' },
    ],
  },
  {
    id: 'larissa-mamae-ativa-explicacao',
    titulo: 'Gestante — Mamãe Ativa',
    dialogo: [
      { autor: 'lead',  texto: 'Como funciona o mamãe ativa' },
      { autor: 'clara', texto: 'O Mamãe Ativa é o queridinho das mamães aqui.' },
      { autor: 'clara', texto: 'O programa reúne cuidados com a sua saúde íntima e também com a sua saúde física de modo geral.' },
      { autor: 'clara', texto: 'Trabalhamos com aulas de pilates específicas para sua necessidade, de acordo com o trimestre em que você está e seus objetivos, e também com atendimentos de fisioterapia pélvica.' },
      { autor: 'clara', texto: 'A fisioterapia pélvica tem um olhar mais direcionado para sua saúde íntima, ajudando a prevenir desconfortos e queixas como perda de xixi ao final da gestação ou no pós-parto, preparar para o parto independente da via escolhida e favorecer uma recuperação no pós-parto muito melhor.' },
      { autor: 'clara', texto: 'Me conta, com quantas semanas de gestação você está?' },
    ],
  },
  {
    id: 'larissa-gestar-dor-lombar-preparo-parto',
    titulo: 'Gestante — dor lombar e preparo para o parto',
    dialogo: [
      { autor: 'lead',  texto: 'tenho dor na lombar e quero fazer atividade pra me preparar para o parto' },
      { autor: 'clara', texto: 'O Gestar em Movimento, nosso plano para gestantes, aqui é bem específico: ele é estruturado por fases da gestação, cada exercício respeita o momento do seu corpo e vai se adaptando conforme você avança na gravidez.' },
      { autor: 'clara', texto: 'Você entra na fase correspondente à sua semana gestacional atual e pode fazer o plano por fases ou o plano completo até o parto.' },
      { autor: 'clara', texto: 'A dor lombar é uma queixa bem comum, e costumamos conseguir trabalhar muito bem isso ao longo do acompanhamento.' },
      { autor: 'clara', texto: 'Tenho um convite para te fazer: nós oferecemos uma aula experimental avaliativa.' },
      { autor: 'clara', texto: 'Nesse encontro, entendemos como você está até agora, avaliamos os seus movimentos e você pode vivenciar no seu corpo como o pilates pode te ajudar nesse momento tão especial.' },
      { autor: 'clara', texto: 'Qual a sua disponibilidade, consegue durante o dia ou fica melhor após às 18h?' },
    ],
  },
  {
    id: 'larissa-gestante-valores-terceiro-trimestre',
    titulo: 'Gestante — valores no terceiro trimestre',
    dialogo: [
      { autor: 'lead',  texto: 'Faço sim, tenho disponibilidade durante o dia' },
      { autor: 'lead',  texto: 'e como funciona valores' },
      { autor: 'clara', texto: 'Antes de falar em valores, deixa eu te explicar como funciona o processo.' },
      { autor: 'clara', texto: 'Nosso acompanhamento é separado por trimestre gestacional. Cada trimestre tem um número de atendimentos de acordo com a sua semana gestacional e as necessidades que serão avaliadas na consulta.' },
      { autor: 'clara', texto: 'No terceiro tri, que é o trimestre em que você está, o atendimento é semanal, mas pode variar de pessoa para pessoa. Por isso, é tão importante a consulta inicial: assim conseguimos avaliar as suas individualidades e preparar um plano personalizado para você.' },
      { autor: 'clara', texto: 'Podemos agendar essa consulta inicial para você?' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-consulta-inicial-valor',
    titulo: 'Fisio pélvica — consulta inicial e valor',
    dialogo: [
      { autor: 'lead',  texto: 'tenho dor pra ter relação, e ouvi falar q a fisio ajuda' },
      { autor: 'clara', texto: 'Entendi, obrigada por me contar. Eu sei que não é fácil falar sobre isso.' },
      { autor: 'clara', texto: 'Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você.' },
      { autor: 'clara', texto: 'O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen.' },
      { autor: 'clara', texto: 'E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso.' },
      { autor: 'lead',  texto: 'pode me passar qual o valor dessa consulta' },
      { autor: 'clara', texto: 'A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00.' },
      { autor: 'clara', texto: 'Mas temos uma condição especial para você: fechando o tratamento conosco, ela fica com mais de 70% OFF, por R$ 100,00.' },
      { autor: 'clara', texto: 'E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos.' },
      { autor: 'clara', texto: 'Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência.' },
      { autor: 'clara', texto: 'O que acha de já agendarmos a consulta? Você consegue durante o dia ou fica melhor após às 18h?' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-escape-pos-qualificacao',
    titulo: 'Fisio pélvica — escape após qualificação',
    dialogo: [
      { autor: 'lead',  texto: 'Faz alguns meses, e normalmente é fazendo exercício' },
      { autor: 'clara', texto: 'Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você.' },
      { autor: 'clara', texto: 'O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen.' },
      { autor: 'clara', texto: 'E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso.' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-queixa-nao-gestante-consulta',
    titulo: 'Fisio pélvica — queixa não gestante',
    dialogo: [
      { autor: 'lead',  texto: 'tenho endometriose e dores, busco por isso, foi indicação médica' },
      { autor: 'clara', texto: 'Entendi. Inclusive já tivemos ótimos resultados com alunas que nos procuraram com a mesma queixa que você.' },
      { autor: 'clara', texto: 'O primeiro passo é a nossa consulta inicial. Esse encontro pode variar de 1h a 1h20, e é onde a gente consegue entender melhor como você está, investigar algumas questões da sua saúde íntima e geral e fazer uma avaliação prática da sua região pélvica, para identificar como estão os seus músculos íntimos e abdômen.' },
      { autor: 'clara', texto: 'E assim chegar a um diagnóstico fisioterapêutico para traçar um plano personalizado para o seu caso.' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-primeira-vez-valores',
    titulo: 'Fisio pélvica — primeira vez e valores',
    dialogo: [
      { autor: 'lead',  texto: 'Seria a primeira vez' },
      { autor: 'clara', texto: 'A primeira consulta tem duração de aproximadamente 1h20 e é R$ 350,00. Mas temos uma condição especial para você: fechando o tratamento conosco, está com mais de 70% OFF, ficando por R$ 100,00.' },
      { autor: 'clara', texto: 'E ao final desse atendimento, passamos o orçamento de quantos atendimentos serão necessários para o seu acompanhamento. Podem variar de 4 a 12 atendimentos.' },
      { autor: 'clara', texto: 'Ao final da consulta as meninas já conseguem te passar certinho o plano de tratamento, com o número de atendimentos e a frequência.' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-valor-sessoes',
    titulo: 'Fisio pélvica — valor das sessões',
    dialogo: [
      { autor: 'lead',  texto: 'Entendi. E qual o valor das sessões?' },
      { autor: 'clara', texto: 'Os valores das sessões dependem do plano de tratamento que a fisioterapeuta vai montar para você.' },
      { autor: 'clara', texto: 'Mas podem variar de 4 a 12 atendimentos. Ao final da consulta, as meninas já conseguem te passar certinho o plano de tratamento para você, com o número de atendimentos e a frequência.' },
      { autor: 'clara', texto: 'Vamos ver um horário para sua consulta inicial? Você consegue durante o dia ou fica melhor após às 18h?' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-objecao-valor-sessao',
    titulo: 'Fisio pélvica — objeção sobre valor da sessão',
    dialogo: [
      { autor: 'lead',  texto: 'Entendi. Então muito obrigada, não vou agendar, pois preciso saber quanto é o valor da sessão depois se vou conseguir fazer.' },
      { autor: 'clara', texto: 'Não cobramos o valor avulso de cada atendimento, que é R$ 170,00, mas sim o valor total do plano parcelado no cartão de crédito em até 10x sem juros, o que ajuda bastante na organização.' },
      { autor: 'clara', texto: 'Vamos agendar uma primeira consulta para avaliação, Larissa?' },
    ],
  },
  {
    id: 'larissa-fisio-pelvica-ideia-quanto-fica',
    titulo: 'Fisio pélvica — pede uma ideia de valor',
    dialogo: [
      { autor: 'lead',  texto: 'Vamos sim, mas você tem uma ideia de quanto fica?' },
      { autor: 'clara', texto: 'O que posso te dizer é que a consulta em si é R$ 100,00, e depois disso você sai com um plano claro e os valores certinhos, sem surpresa.' },
      { autor: 'clara', texto: 'Vamos ver um horário, só me confirma se consegue durante o dia ou após às 18h que eu vejo a disponibilidade da agenda para você!' },
    ],
  },
  {
    id: 'larissa-disponibilidade-depois-das-6-contexto-18h',
    titulo: 'Disponibilidade — depois das 6 com contexto de 18h',
    dialogo: [
      { autor: 'clara', texto: 'Para você fica melhor durante o dia ou após às 18h?' },
      { autor: 'lead',  texto: 'Pode ser depois das 6' },
      { autor: 'clara', texto: 'Perfeito, então deixo anotado que fica melhor após às 18h.' },
      { autor: 'clara', texto: 'Vou verificar a disponibilidade da agenda para você.' },
    ],
  },
  {
    id: 'larissa-disponibilidade-depois-das-6-sem-contexto',
    titulo: 'Disponibilidade — depois das 6 sem contexto',
    dialogo: [
      { autor: 'lead',  texto: 'Consigo depois das 6' },
      { autor: 'clara', texto: 'Quando você diz depois das 6, seria depois das 18h?' },
    ],
  },
];

const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_MODEL_ID = 'claude-sonnet-4-6';

const TOC_ITEMS = [
  { label: 'Status do agente' },
  { label: 'Modelo de IA' },
  { label: 'Persona e tom' },
  { label: 'Exemplos de conversa' },
  { label: 'Perguntas frequentes' },
  { label: 'Regras de handoff' },
  { label: 'Horário de atendimento' },
];

function formatRelativeEdit(value: string | Date | null): string {
  if (!value) return 'Ainda não salvo';
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return 'Última edição salva';
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Última edição agora';
  if (minutes < 60) return `Última edição há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Última edição há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Última edição há ${days} dia${days === 1 ? '' : 's'}`;
}

function buildPersonaPreview(persona: string, practices: BestPracticeItem[]): string[] {
  const source = `${persona}\n${practices.map(item => `${item.title} ${item.detail}`).join('\n')}`.toLowerCase();
  const personWord = source.includes('aluna') ? 'aluna' : 'pessoa';
  const asksFirst = source.includes('acolh') || source.includes('escuta');
  const noCurePromise = source.includes('cura') || source.includes('diagnostic');
  const hasAssessment = source.includes('avalia');

  return [
    'Oi, queria saber sobre pilates. Estou com dor nas costas.',
    asksFirst
      ? `Oi! Entendo, dor nas costas atrapalha bastante a rotina. Me conta: esse incômodo aparece mais em algum horário ou movimento?`
      : `Oi! Posso te ajudar. Me conta um pouco mais sobre essa dor nas costas?`,
    hasAssessment
      ? `A gente costuma começar com uma aula experimental avaliativa para entender melhor o corpo da ${personWord} e orientar o caminho com calma${noCurePromise ? ', sem prometer nada antes da fisio avaliar.' : '.'}`
      : `Com essas informações eu consigo te orientar melhor e, se fizer sentido, encaminhar para a equipe.`
  ];
}

// ─── small components ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  size = 'sm',
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: 'sm' | 'lg';
  label: string;
}) {
  const w = size === 'lg' ? 52 : 38;
  const h = size === 'lg' ? 30 : 22;
  const thumbSize = size === 'lg' ? 24 : 16;
  const translateX = size === 'lg' ? 22 : 16;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: w,
        height: h,
        borderRadius: 'var(--radius-pill)',
        background: checked ? 'var(--color-verde)' : 'var(--color-cinza)',
        border: 0,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background var(--duration-base) var(--ease-soft)',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 3 + (checked ? translateX : 0),
          top: 3,
          width: thumbSize,
          height: thumbSize,
          background: '#fff',
          borderRadius: 'var(--radius-pill)',
          boxShadow: '0 1px 3px rgba(58, 53, 48, 0.18)',
          transition: 'left var(--duration-base) var(--ease-soft)',
        }}
      />
    </button>
  );
}

function Btn({
  children,
  primary,
  ghost,
  sm,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  primary?: boolean;
  ghost?: boolean;
  sm?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const activeHover = hov && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        appearance: 'none',
        border: primary
          ? `0.6px solid ${activeHover ? 'var(--color-tangerina)' : 'var(--color-alaranjado)'}`
          : ghost
            ? '0.6px solid transparent'
            : '0.6px solid var(--color-cinza)',
        background: primary
          ? activeHover ? 'var(--color-tangerina)' : 'var(--color-alaranjado)'
          : ghost
            ? activeHover ? 'var(--bg-2)' : 'transparent'
            : activeHover ? 'var(--color-bege-claro)' : '#fff',
        color: primary ? '#fff' : ghost ? activeHover ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)' : 'var(--color-texto-escuro)',
        borderRadius: 'var(--radius-pill)',
        padding: sm ? '5px 11px' : '8px 16px',
        fontFamily: 'var(--font-body)',
        fontSize: sm ? 12 : 13,
        fontWeight: 500,
        letterSpacing: '0.2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        transition: 'all var(--duration-fast) var(--ease-soft)',
        flexShrink: 0,
        opacity: disabled ? 0.62 : 1,
      }}
    >
      {children}
    </button>
  );
}

function GhostTopBtn({ children }: { children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        appearance: 'none',
        border: '0.6px solid var(--color-cinza)',
        background: hov ? 'var(--color-bege-claro)' : '#fff',
        color: hov ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)',
        borderColor: hov ? 'var(--color-tangerina)' : 'var(--color-cinza)',
        borderRadius: 'var(--radius-pill)',
        padding: '7px 14px',
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all var(--duration-fast) var(--ease-soft)',
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({ onClick, danger, title, children }: { onClick?: () => void; danger?: boolean; title?: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-pill)',
        border: 0,
        background: danger && hov ? 'rgba(192, 80, 74, 0.08)' : hov ? 'var(--color-bege-claro)' : 'transparent',
        color: danger && hov ? 'var(--color-ui-error)' : hov ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all var(--duration-fast) var(--ease-soft)',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function AddBtn({ onClick }: { onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        appearance: 'none',
        border: `0.6px ${hov ? 'solid' : 'dashed'} ${hov ? 'var(--color-tangerina)' : 'var(--color-bege)'}`,
        background: hov ? 'var(--color-bege-claro)' : 'transparent',
        color: 'var(--color-alaranjado)',
        borderRadius: 'var(--radius-md)',
        padding: '11px 16px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all var(--duration-fast) var(--ease-soft)',
      }}
    >
      <Plus size={14} strokeWidth={2} />
      Adicionar pergunta
    </button>
  );
}

function SavedNote({ text, success }: { text: string; success?: boolean }) {
  return (
    <span style={{
      fontFamily: 'var(--font-body)',
      fontSize: 11.5,
      color: success ? 'var(--color-verde)' : 'var(--color-texto-medio)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      letterSpacing: '0.1px',
      fontWeight: success ? 500 : 400,
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-verde)',
        flexShrink: 0,
      }} />
      {text}
    </span>
  );
}

function formatWhatsAppNumber(raw?: string) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55') && digits.length === 13) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith('55') && digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return raw.trim().startsWith('+') ? raw.trim() : `+${digits}`;
}

function getWhatsAppStatusMeta(status: WhatsAppStatus | null, loading: boolean) {
  if (loading && !status) {
    return {
      label: 'Verificando conexão',
      detail: 'Consultando a Evolution API.',
      dot: 'var(--color-bege)',
      badgeBg: 'var(--bg-2)',
    };
  }

  if (!status) {
    return {
      label: 'Status indisponível',
      detail: 'Não foi possível consultar a conexão agora.',
      dot: 'var(--color-bege)',
      badgeBg: 'var(--bg-2)',
    };
  }

  if (!status.configured) {
    return {
      label: 'Configuração incompleta',
      detail: 'Revise as variáveis da Evolution API no ambiente.',
      dot: 'var(--color-ui-error)',
      badgeBg: 'rgba(192, 80, 74, 0.08)',
    };
  }

  if (status.state === 'open') {
    return {
      label: 'Conectado',
      detail: 'Evolution API pronta para respostas automáticas.',
      dot: 'var(--color-verde)',
      badgeBg: 'rgba(172, 192, 149, 0.18)',
    };
  }

  if (status.state === 'connecting') {
    return {
      label: 'Conectando',
      detail: 'A instância está tentando restabelecer a sessão.',
      dot: 'var(--color-alaranjado)',
      badgeBg: 'rgba(240, 131, 83, 0.10)',
    };
  }

  if (status.state === 'close') {
    return {
      label: 'Desconectado',
      detail: 'Leads chegam no Inbox, mas sem resposta automática.',
      dot: 'var(--color-ui-error)',
      badgeBg: 'rgba(192, 80, 74, 0.08)',
    };
  }

  return {
    label: 'Status indisponível',
    detail: 'A Evolution API não retornou o estado da conexão.',
    dot: 'var(--color-bege)',
    badgeBg: 'var(--bg-2)',
  };
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function AgentePage() {
  // state
  const [agentActive, setAgentActive] = useState(true);
  const [apenasDesconhecidos, setApenasDesconhecidos] = useState(true);
  // Stored as E.164, edited as newline-separated text
  const [numerosbypassText, setNumerosbypassText] = useState('+5547991719570');
  const [personaText, setPersonaText] = useState(PERSONA_DEFAULT);
  const [bestPractices, setBestPractices] = useState<BestPracticeItem[]>(DEFAULT_BEST_PRACTICES);
  const [personaPreviewOpen, setPersonaPreviewOpen] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(INITIAL_FAQ);
  const [editingId, setEditingId] = useState<number | 'new' | null>(4); // editing "Preciso de pedido?"
  const [editBuf, setEditBuf] = useState({
    q: 'Preciso de pedido médico?',
    a: 'Para a aula experimental avaliativa não é necessário pedido médico. Se você já tem um (do ginecologista, ortopedista ou obstetra), pode trazer — ajuda a fisioterapeuta a desenhar o plano. Para alguns convênios o pedido pode ser solicitado depois — a gente avisa.',
  });
  const [handoffRules, setHandoffRules] = useState<HandoffRule[]>([
    { id: 1, enabled: true,  title: 'Lead pede para falar com uma pessoa',                            icon: <MessageSquare  size={17} strokeWidth={1.6} />, desc: 'Frases como "quero falar com alguém", "tem uma humana aí?", "prefiro falar com a Larissa". Encaminha imediatamente.' },
    { id: 2, enabled: true,  title: 'Pergunta clínica específica',                                    icon: <FileQuestion   size={17} strokeWidth={1.6} />, desc: 'Dor persistente, sintoma novo, dúvida sobre diagnóstico médico, gestação de risco. A Clara nunca responde — sempre encaminha.' },
    { id: 3, enabled: true,  title: 'Reclamação ou insatisfação',                                     icon: <AlertCircle    size={17} strokeWidth={1.6} />, desc: 'Detecta tom negativo, palavras como "decepcionada", "horrível", "cancelar". Encaminha em até 1 minuto e marca como prioritário.' },
    { id: 4, enabled: true,  title: 'Agente não sabe responder com confiança',                        icon: <HelpCircle     size={17} strokeWidth={1.6} />, desc: 'Quando a IA não encontra resposta no FAQ ou na persona e teria que improvisar. Prefere passar para humano a inventar.' },
    { id: 5, enabled: false, title: 'Conversa passou de 8 mensagens sem agendar',                    icon: <Clock          size={17} strokeWidth={1.6} />, desc: 'Se o agente trocou muitas mensagens e a lead ainda não marcou avaliação, chama você para empurrar pessoalmente.' },
    { id: 6, enabled: true,  title: 'Quando lead quiser agendar uma avaliação, transferir para humano', icon: <CalendarCheck size={17} strokeWidth={1.6} />, desc: 'A Clara não agenda diretamente. Quando a lead quiser marcar horário, avisa que vai verificar e passa para você. Desative quando a agenda do sistema estiver completa.' },
  ]);
  const [mensagemHandoffAgendamento, setMensagemHandoffAgendamento] = useState(
    'Perfeito! Vou verificar os horários disponíveis com a nossa equipe e entro em contato em breve.',
  );
  const [notificacaoHandoffAtivo, setNotificacaoHandoffAtivo] = useState(false);
  const [notificacaoHandoffNumero, setNotificacaoHandoffNumero] = useState('');
  const [hours, setHours] = useState<DaySchedule[]>([
    { day: 'Segunda', open: true,  from: '07:00', to: '19:00' },
    { day: 'Terça',   open: true,  from: '07:00', to: '19:00' },
    { day: 'Quarta',  open: true,  from: '07:00', to: '19:00' },
    { day: 'Quinta',  open: true,  from: '07:00', to: '19:00' },
    { day: 'Sexta',   open: true,  from: '07:00', to: '19:00' },
    { day: 'Sábado',  open: true,  from: '08:00', to: '12:00' },
    { day: 'Domingo', open: false, from: '',      to: ''      },
  ]);
  const [offHoursText, setOffHoursText] = useState(OFF_HOURS_DEFAULT);
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [exemplos, setExemplos] = useState<ConversaExemplo[]>(INITIAL_EXEMPLOS);
  const [editingExId, setEditingExId] = useState<string | 'new' | null>(null);
  const [exBuf, setExBuf] = useState<{ titulo: string; dialogo: DialogTurn[] }>({ titulo: '', dialogo: [] });
  const [activeToc, setActiveToc] = useState(0);
  const [savePending, startSave] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(null);
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const [currentProfileName, setCurrentProfileName] = useState<string | null>(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(null);
  const [whatsAppStatusLoading, setWhatsAppStatusLoading] = useState(true);
  const [whatsAppStatusCheckedAt, setWhatsAppStatusCheckedAt] = useState<Date | null>(null);

  // Load real config from DB
  useEffect(() => {
    const supabase = createClient();
    supabase.schema('crm').from('agent_config').select('*').single().then(({ data }) => {
      if (!data) return;
      setLastEditedAt(data.updated_at ?? null);
      setAgentActive(data.ativo);
      setApenasDesconhecidos(data.apenas_desconhecidos ?? true);
      if (Array.isArray(data.numeros_bypass) && (data.numeros_bypass as unknown[]).length > 0) {
        setNumerosbypassText((data.numeros_bypass as string[]).join('\n'));
      }
      if (data.persona_prompt) setPersonaText(data.persona_prompt);
      if (Array.isArray(data.boas_praticas) && (data.boas_praticas as unknown[]).length > 0) {
        setBestPractices((data.boas_praticas as BestPracticeItem[]).filter(item => item.title?.trim() && item.detail?.trim()));
      }
      if (data.mensagem_fora_horario) setOffHoursText(data.mensagem_fora_horario);
      if (Array.isArray(data.faq) && (data.faq as unknown[]).length > 0) {
        setFaqItems((data.faq as { q: string; a: string }[]).map((item, i) => ({ id: i + 1, ...item })));
      }
      if (data.model_provider) setProvider(data.model_provider);
      if (data.model_id) setModelId(data.model_id);
      if (Array.isArray(data.exemplos_conversa)) {
        setExemplos(data.exemplos_conversa as unknown as ConversaExemplo[]);
      }
      // Restore hours (DB stores as { segunda_sexta: "HH:MM-HH:MM", sabado: "HH:MM-HH:MM" })
      if (data.horario_atendimento) {
        const h = data.horario_atendimento as { segunda_sexta?: string; sabado?: string };
        const parse = (range?: string) => {
          if (!range) return { open: false, from: '', to: '' };
          const [from, to] = range.split('-');
          return { open: true, from: from ?? '', to: to ?? '' };
        };
        const wday = parse(h.segunda_sexta);
        const sat  = parse(h.sabado);
        setHours(prev => prev.map((r, i) => {
          if (i < 5) return { ...r, open: wday.open, from: wday.from, to: wday.to };
          if (i === 5) return { ...r, open: sat.open, from: sat.from, to: sat.to };
          return { ...r, open: false };
        }));
      }
      // Restore handoff rule enabled states
      if (Array.isArray(data.regras_handoff)) {
        const enabled = new Set(data.regras_handoff as string[]);
        setHandoffRules(prev => prev.map(r => ({ ...r, enabled: enabled.has(r.title) })));
      }
      if (data.mensagem_handoff_agendamento) {
        setMensagemHandoffAgendamento(data.mensagem_handoff_agendamento);
      }
      const notif = data.notificacao_handoff as { ativo?: boolean; numero?: string } | null;
      if (notif) {
        setNotificacaoHandoffAtivo(notif.ativo ?? false);
        setNotificacaoHandoffNumero(notif.numero ?? '');
      }
      if (data.updated_by) {
        supabase
          .schema('crm')
          .from('profiles')
          .select('nome')
          .eq('id', data.updated_by)
          .maybeSingle()
          .then(({ data: profile }) => setLastEditedBy(profile?.nome ?? null));
      }
    });
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      supabase
        .schema('crm')
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data: profile }) => setCurrentProfileName(profile?.nome ?? null));
    });
  }, []);

  const loadWhatsAppStatus = useCallback(async () => {
    setWhatsAppStatusLoading(true);
    try {
      const status = await fetchWhatsAppStatus();
      setWhatsAppStatus(status);
    } catch {
      setWhatsAppStatus({ configured: true, state: 'unknown' });
    } finally {
      setWhatsAppStatusCheckedAt(new Date());
      setWhatsAppStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWhatsAppStatus();
  }, [loadWhatsAppStatus]);

  // Save all config to DB
  async function handleSaveAll() {
    const horariosMap: Record<string, string> = {};
    const weekDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
    hours.forEach((h, i) => {
      if (!h.open) return;
      const key = i < 5 ? weekDays[i] : i === 5 ? 'sabado' : 'domingo';
      horariosMap[key] = `${h.from}-${h.to}`;
    });
    // Simplify to segunda_sexta + sabado pattern that the AI expects
    const horarioAtendimento = {
      segunda_sexta: hours[0].open ? `${hours[0].from}-${hours[0].to}` : '',
      sabado:        hours[5].open ? `${hours[5].from}-${hours[5].to}` : '',
    };

    startSave(async () => {
      setSaveError(null);
      const result = await updateAgentConfig({
        ativo:                agentActive,
        apenas_desconhecidos: apenasDesconhecidos,
        numeros_bypass:       numerosbypassText.split('\n').map(s => s.trim()).filter(Boolean),
        persona_prompt:       personaText,
        boas_praticas:        bestPractices
          .map(item => ({ id: item.id, title: item.title.trim(), detail: item.detail.trim() }))
          .filter(item => item.title && item.detail),
        mensagem_fora_horario: offHoursText,
        horario_atendimento:  horarioAtendimento,
        faq:                  faqItems.map(({ q, a }) => ({ q, a })),
        regras_handoff:       handoffRules.filter((r) => r.enabled).map((r) => r.title),
        exemplos_conversa:    exemplos,
        model_provider:       provider === 'openai' ? 'openai' : 'anthropic',
        model_id:             modelId,
        mensagem_handoff_agendamento: mensagemHandoffAgendamento.trim() || undefined,
        notificacao_handoff:  notificacaoHandoffAtivo && notificacaoHandoffNumero.trim()
          ? { ativo: true, numero: notificacaoHandoffNumero.trim() }
          : null,
      });
      setSaveStatus(result.success ? 'saved' : 'error');
      setSaveError(result.success ? null : result.error);
      if (result.success) {
        setLastEditedAt(new Date().toISOString());
        setLastEditedBy(currentProfileName);
      }
      setTimeout(() => setSaveStatus('idle'), 3000);
    });
  }

  // refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [zipImporting, setZipImporting] = useState(false);
  const [zipImportError, setZipImportError] = useState<string | null>(null);

  // scroll spy
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const top = el.scrollTop + 80;
      let idx = 0;
      sectionRefs.current.forEach((s, i) => {
        if (s && s.offsetTop <= top) idx = i;
      });
      setActiveToc(idx);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const s = sectionRefs.current[idx];
    if (s && scrollRef.current) {
      scrollRef.current.scrollTo({ top: s.offsetTop - 16, behavior: 'smooth' });
    }
  }, []);

  // faq helpers
  function startEdit(item: FaqItem) {
    setEditingId(item.id);
    setEditBuf({ q: item.q, a: item.a });
  }
  function startNew() {
    setEditingId('new');
    setEditBuf({ q: '', a: '' });
  }
  function saveEdit() {
    if (editingId === 'new') {
      setFaqItems(prev => [...prev, { id: Date.now(), q: editBuf.q, a: editBuf.a }]);
    } else {
      setFaqItems(prev => prev.map(f => f.id === editingId ? { ...f, ...editBuf } : f));
    }
    setEditingId(null);
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function deleteItem(id: number) {
    setFaqItems(prev => prev.filter(f => f.id !== id));
  }

  // best practice helpers
  function addBestPractice() {
    setBestPractices(prev => [
      ...prev,
      { id: `bp-${Date.now()}`, title: 'Nova prática.', detail: 'Descreva como a Clara deve agir nesse caso.' },
    ]);
  }
  function updateBestPractice(id: string, patch: Partial<BestPracticeItem>) {
    setBestPractices(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }
  function deleteBestPractice(id: string) {
    setBestPractices(prev => prev.filter(item => item.id !== id));
  }

  // example helpers
  function startEditEx(ex: ConversaExemplo) {
    setEditingExId(ex.id);
    setExBuf({ titulo: ex.titulo, dialogo: ex.dialogo.map(t => ({ ...t })) });
  }
  function startNewEx() {
    setEditingExId('new');
    setExBuf({ titulo: '', dialogo: [{ autor: 'lead', texto: '' }, { autor: 'clara', texto: '' }] });
  }
  function saveEx() {
    const dialogo = exBuf.dialogo.filter(t => t.texto.trim());
    if (editingExId === 'new') {
      setExemplos(prev => [...prev, { id: `ex-${Date.now()}`, titulo: exBuf.titulo.trim() || 'Exemplo sem título', dialogo }]);
    } else {
      setExemplos(prev => prev.map(e => e.id === editingExId ? { ...e, titulo: exBuf.titulo.trim() || 'Exemplo sem título', dialogo } : e));
    }
    setEditingExId(null);
  }
  function cancelEx() {
    setEditingExId(null);
  }
  function deleteEx(id: string) {
    setExemplos(prev => prev.filter(e => e.id !== id));
  }

  async function handleZipImport(file: File) {
    setZipImporting(true);
    setZipImportError(null);
    try {
      const form = new FormData();
      form.append("zip", file);
      const res = await fetch("/api/config/import-whatsapp-zip", { method: "POST", body: form });
      const json = await res.json() as { titulo?: string; dialogo?: { autor: "lead" | "clara"; texto: string }[]; error?: string };
      if (!res.ok || json.error) {
        const msgs: Record<string, string> = {
          no_chat_txt: "ZIP não contém _chat.txt. Exporte a conversa pelo WhatsApp.",
          invalid_zip: "Arquivo inválido. Envie um ZIP exportado pelo WhatsApp.",
          empty_conversation: "Nenhuma mensagem de texto encontrada na conversa.",
        };
        setZipImportError(msgs[json.error ?? ""] ?? "Erro ao importar. Tente novamente.");
        return;
      }
      setExemplos(prev => [...prev, {
        id: `ex-${Date.now()}`,
        titulo: json.titulo ?? "Conversa importada",
        dialogo: json.dialogo ?? [],
      }]);
    } catch {
      setZipImportError("Falha na conexão. Tente novamente.");
    } finally {
      setZipImporting(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  }
  function addTurn() {
    setExBuf(b => ({ ...b, dialogo: [...b.dialogo, { autor: b.dialogo.length % 2 === 0 ? 'lead' : 'clara', texto: '' }] }));
  }
  function updateTurn(i: number, patch: Partial<DialogTurn>) {
    setExBuf(b => ({ ...b, dialogo: b.dialogo.map((t, j) => j === i ? { ...t, ...patch } : t) }));
  }
  function removeTurn(i: number) {
    setExBuf(b => ({ ...b, dialogo: b.dialogo.filter((_, j) => j !== i) }));
  }

  const exLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '1.6px',
    textTransform: 'uppercase', color: 'var(--color-bege)', display: 'block', marginBottom: 6,
  };
  const renderExEditor = () => (
    <div style={{ background: 'var(--bg-1)', border: '0.6px solid var(--color-alaranjado)', borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', boxShadow: '0 0 0 3px rgba(240, 131, 83, 0.08)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={exLabelStyle}>Título do exemplo</label>
          <input className="crm-faq-input" placeholder="Ex.: Primeiro contato — gestante" value={exBuf.titulo} onChange={e => setExBuf(b => ({ ...b, titulo: e.target.value }))} />
        </div>
        <div>
          <label style={exLabelStyle}>Diálogo</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exBuf.dialogo.map((turn, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 8, alignItems: 'start' }}>
                <select
                  className="crm-faq-input"
                  value={turn.autor}
                  onChange={e => updateTurn(i, { autor: e.target.value as 'lead' | 'clara' })}
                  style={{ padding: '8px 10px' }}
                >
                  <option value="lead">Lead</option>
                  <option value="clara">Clara</option>
                </select>
                <textarea
                  className="crm-faq-ans"
                  style={{ minHeight: 44 }}
                  placeholder={turn.autor === 'clara' ? 'O que a Clara responde…' : 'O que a pessoa escreve…'}
                  value={turn.texto}
                  onChange={e => updateTurn(i, { texto: e.target.value })}
                />
                <IconBtn title="Remover fala" danger onClick={() => removeTurn(i)}>
                  <Trash2 size={13} strokeWidth={1.7} />
                </IconBtn>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <Btn ghost sm onClick={addTurn}>
              <Plus size={13} strokeWidth={2} />
              Adicionar fala
            </Btn>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn ghost onClick={cancelEx}>Cancelar</Btn>
          <Btn primary onClick={saveEx}>Salvar exemplo</Btn>
        </div>
      </div>
    </div>
  );

  // shared styles
  const secHead: React.CSSProperties = {
    padding: '22px 28px 18px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    borderBottom: '0.6px solid var(--color-cinza)',
    background: '#fff',
  };
  const secNum: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 22,
    lineHeight: 1,
    color: 'var(--color-bege)',
    fontFeatureSettings: '"tnum"',
    paddingTop: 6,
    minWidth: 28,
  };
  const secTitle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 22,
    lineHeight: 1.15,
    color: 'var(--color-texto-escuro)',
    letterSpacing: '-0.005em',
    margin: 0,
  };
  const secSub: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--color-texto-medio)',
    lineHeight: 1.5,
    marginTop: 6,
  };
  const secBody: React.CSSProperties = { padding: '24px 28px' };
  const secFoot: React.CSSProperties = {
    borderTop: '0.6px solid var(--color-cinza)',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-1)',
  };
  const fieldLabel: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '1.8px',
    textTransform: 'uppercase',
    color: 'var(--color-bege)',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
  const whatsAppStatusMeta = getWhatsAppStatusMeta(whatsAppStatus, whatsAppStatusLoading);
  const whatsAppNumber = formatWhatsAppNumber(whatsAppStatus?.number);
  const whatsAppCheckedLabel = whatsAppStatusCheckedAt
    ? `Atualizado às ${whatsAppStatusCheckedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Ainda não verificado';
  const personaPreviewMessages = useMemo(
    () => buildPersonaPreview(personaText, bestPractices),
    [personaText, bestPractices],
  );
  const lastEditedText = `${formatRelativeEdit(lastEditedAt)}${lastEditedBy ? ` · por ${lastEditedBy}` : ''}`;

  return (
    <div style={{ display: 'grid', gridTemplateRows: '64px 1fr', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg-1)',
        borderBottom: '0.6px solid var(--color-cinza)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1,
            color: 'var(--color-texto-escuro)',
            letterSpacing: '-0.005em',
            margin: 0,
          }}>
            Agente de IA
          </h1>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--color-texto-medio)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '0.2px',
          }}>
            <span>WhatsApp · Evolution API</span>
            <span style={{ width: 3, height: 3, borderRadius: 'var(--radius-pill)', background: 'var(--color-cinza)' }} />
            <span>versão 3.2</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GhostTopBtn>
            <RotateCcw size={13} strokeWidth={1.8} />
            Histórico
          </GhostTopBtn>
          <GhostTopBtn>
            <MessageSquare size={13} strokeWidth={1.8} />
            Testar conversa
          </GhostTopBtn>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '232px 1fr', overflow: 'hidden', minHeight: 0 }}>

        {/* TOC */}
        <nav
          aria-label="Seções da configuração"
          style={{
            borderRight: '0.6px solid var(--color-cinza)',
            padding: '32px 20px 32px 24px',
            background: 'var(--bg-1)',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
            color: 'var(--color-bege)',
            padding: '0 12px',
            marginBottom: 8,
          }}>
            Configurar
          </div>

          {TOC_ITEMS.map((item, i) => {
            const active = activeToc === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  color: active ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)',
                  background: active ? 'var(--color-bege-claro)' : 'transparent',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  border: 0,
                  textAlign: 'left',
                  transition: 'all var(--duration-fast) var(--ease-soft)',
                  width: '100%',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 10,
                    bottom: 10,
                    width: 2,
                    background: 'var(--color-alaranjado)',
                    borderRadius: 2,
                  }} />
                )}
                <span style={{
                  fontFeatureSettings: '"tnum"',
                  fontSize: 10,
                  letterSpacing: '0.3px',
                  color: active ? 'var(--color-alaranjado)' : 'var(--color-bege)',
                  minWidth: 14,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.label}
              </button>
            );
          })}

          <div style={{
            marginTop: 'auto',
            padding: '14px 12px 4px',
            borderTop: '0.6px dashed var(--color-cinza)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--color-texto-medio)',
            lineHeight: 1.55,
          }}>
            <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Cada seção é salva separadamente.</strong>{' '}
            Mudanças entram em vigor na próxima mensagem recebida — conversas em andamento não são afetadas.
          </div>
        </nav>

        {/* Sections */}
        <div
          ref={scrollRef}
          style={{
            overflow: 'auto',
            padding: '32px 48px 64px',
            background: 'var(--bg-1)',
            scrollBehavior: 'smooth',
            scrollbarColor: 'var(--color-cinza) transparent',
            scrollbarWidth: 'thin',
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* ─── Section 1: Status ─────────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[0] = el; }}
              id="sec-status"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>01</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Status do agente</h2>
                  <p style={secSub}>Ligue para deixar o agente respondendo. Pause quando quiser atender pessoalmente todas as conversas.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.6px 1fr', gap: 28, alignItems: 'stretch' }}>
                  {/* Big toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Toggle checked={agentActive} onChange={setAgentActive} size="lg" label="Ativar agente" />
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.2 }}>
                          Agente ativo
                        </div>
                        {agentActive ? (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-verde)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: 'var(--color-verde)', boxShadow: '0 0 0 4px rgba(172, 192, 149, 0.25)' }} />
                            respondendo
                          </div>
                        ) : (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--color-texto-medio)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: 'var(--color-cinza)' }} />
                            pausado
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-medio)', lineHeight: 1.55 }}>
                      A <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Clara</strong> está respondendo novos contatos no WhatsApp. Conversas com lead já em atendimento humano <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>não</strong> são interrompidas.
                    </p>
                    {/* Apenas desconhecidos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.6px solid var(--color-cinza)', paddingTop: 16, marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <Toggle checked={apenasDesconhecidos} onChange={setApenasDesconhecidos} size="sm" label="Apenas contatos não salvos" />
                        <div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>
                            Apenas contatos não salvos
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', marginTop: 3, lineHeight: 1.5 }}>
                            A Clara ignora mensagens de quem está salvo na agenda do WhatsApp — clientes em acompanhamento, contatos pessoais e fornecedores.
                          </div>
                        </div>
                      </div>
                      {apenasDesconhecidos && (
                        <div style={{ marginLeft: 50 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-bege)', marginBottom: 6 }}>
                            Exceções — números que sempre recebem resposta
                          </div>
                          <textarea
                            value={numerosbypassText}
                            onChange={e => setNumerosbypassText(e.target.value)}
                            placeholder="+5549999999999"
                            rows={3}
                            style={{
                              width: '100%',
                              fontFamily: 'var(--font-body)',
                              fontSize: 12,
                              color: 'var(--color-texto-escuro)',
                              background: 'var(--bg-2)',
                              border: '0.6px solid var(--color-cinza)',
                              borderRadius: 'var(--radius-md)',
                              padding: '8px 10px',
                              resize: 'vertical',
                              outline: 'none',
                              lineHeight: 1.6,
                            }}
                          />
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', marginTop: 4 }}>
                            Um número por linha no formato E.164 — ex.: +5547991719570
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ background: 'var(--color-cinza)', width: '0.6px' }} aria-hidden />

                  {/* WhatsApp connection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>
                      Conexão
                    </div>
                    <div style={{
                      background: '#fff',
                      border: '0.6px solid var(--color-cinza)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(172, 192, 149, 0.20)', color: '#5F7948', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden>
                            <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.9-.4-1.7-1-2.4-1.7-.5-.5-1-1.1-1.4-1.8-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4 0-.1-.6-1.5-.9-2.1-.2-.5-.5-.4-.6-.4h-.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.1 2 3 4.8 4.2.4.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.1-.2-.3-.2zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 7,
                              background: whatsAppStatusMeta.badgeBg,
                              borderRadius: 'var(--radius-pill)',
                              padding: '4px 10px',
                              fontFamily: 'var(--font-body)',
                              fontSize: 11,
                              fontWeight: 500,
                              color: 'var(--color-texto-escuro)',
                            }}>
                              <span style={{
                                width: 7,
                                height: 7,
                                borderRadius: 'var(--radius-pill)',
                                background: whatsAppStatusMeta.dot,
                                boxShadow: whatsAppStatus?.state === 'open' ? '0 0 0 3px rgba(172, 192, 149, 0.22)' : 'none',
                                flexShrink: 0,
                              }} />
                              {whatsAppStatusMeta.label}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3, marginTop: 10, overflowWrap: 'anywhere' }}>
                            {whatsAppNumber ?? whatsAppStatus?.instance ?? 'Evolution API'}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.45, marginTop: 4 }}>
                            {whatsAppNumber
                              ? (whatsAppStatus?.instance ? `Instância ${whatsAppStatus.instance}` : 'Número retornado pela Evolution API')
                              : 'Número não informado pela Evolution API'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '0.6px solid var(--color-cinza)', paddingTop: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.45 }}>
                            {whatsAppStatusMeta.detail}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--color-bege)', marginTop: 3, fontFeatureSettings: '"tnum"' }}>
                            {whatsAppCheckedLabel}
                          </div>
                        </div>
                        <Btn sm onClick={loadWhatsAppStatus} disabled={whatsAppStatusLoading}>
                          <RefreshCw size={12} strokeWidth={1.8} />
                          {whatsAppStatusLoading ? 'Atualizando' : 'Atualizar'}
                        </Btn>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.5 }}>
                      A resposta automática só roda quando a instância está conectada. Se cair, as mensagens continuam no Inbox.
                    </p>
                  </div>
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote
                  text={saveStatus === 'saved' ? 'Status salvo agora' : 'Salve para aplicar mudanças no agente'}
                  success={saveStatus === 'saved'}
                />
                <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar status'}</Btn>
              </div>
            </section>

            {/* ─── Section: Modelo de IA ─────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[1] = el; }}
              id="sec-modelo"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>02</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Modelo de IA</h2>
                  <p style={secSub}>O cérebro por trás da Clara. Modelos mais fortes imitam melhor o jeito da Larissa; modelos mais leves respondem mais rápido e custam menos.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {Object.entries(AGENT_MODELS).map(([id, meta]) => {
                    const selected = modelId === id && meta.available;
                    const disabled = !meta.available;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={disabled}
                        onClick={() => { if (!disabled) { setModelId(id); setProvider(meta.provider); } }}
                        style={{
                          textAlign: 'left',
                          appearance: 'none',
                          border: `0.6px solid ${selected ? 'var(--color-alaranjado)' : 'var(--color-cinza)'}`,
                          background: selected ? 'var(--color-bege-claro)' : '#fff',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 16px',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.55 : 1,
                          boxShadow: selected ? '0 0 0 3px rgba(240, 131, 83, 0.10)' : 'none',
                          transition: 'all var(--duration-fast) var(--ease-soft)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: selected ? 'var(--color-alaranjado)' : 'var(--bg-2)', color: selected ? '#fff' : 'var(--color-bege)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {meta.provider === 'openai' ? <Sparkles size={16} strokeWidth={1.7} /> : <Cpu size={16} strokeWidth={1.7} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)' }}>{meta.label}</span>
                            {disabled && (
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: 9.5, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--color-texto-medio)', background: 'var(--bg-2)', padding: '2px 7px', borderRadius: 'var(--radius-pill)' }}>em breve</span>
                            )}
                            {selected && (
                              <Check size={14} strokeWidth={2.2} color="var(--color-alaranjado)" style={{ marginLeft: 'auto' }} />
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', marginTop: 3, textTransform: 'capitalize' }}>{meta.provider}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text="Aplica-se à próxima mensagem recebida" />
                <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar modelo'}</Btn>
              </div>
            </section>

            {/* ─── Section 2: Persona ────────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[2] = el; }}
              id="sec-persona"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>03</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Persona e tom</h2>
                  <p style={secSub}>O texto-base que ensina o agente como falar. Pense que você está escrevendo um briefing para uma recepcionista nova.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)', gap: 28, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={fieldLabel}>
                      <span>Prompt da persona</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--color-texto-medio)', letterSpacing: '0.3px', textTransform: 'none', fontWeight: 400, fontFeatureSettings: '"tnum"' }}>
                        {personaText.length} / 2000 caracteres
                      </span>
                    </div>
                    <textarea
                      className="crm-config-ta"
                      style={{ flex: 1, minHeight: 520 }}
                      value={personaText}
                      onChange={e => setPersonaText(e.target.value)}
                      maxLength={2000}
                      spellCheck={false}
                    />
                  </div>

                  <aside style={{
                    background: 'var(--bg-2)',
                    borderLeft: '2px solid var(--color-bege)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12.5,
                    color: 'var(--color-texto-escuro)',
                    lineHeight: 1.6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', margin: 0 }}>
                        Boas práticas
                      </h4>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"' }}>
                        {bestPractices.length} itens
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {bestPractices.map((item) => (
                        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', gap: 10, alignItems: 'start' }}>
                          <span style={{ width: 6, height: 6, marginTop: 13, borderRadius: 'var(--radius-pill)', background: 'var(--color-bege)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input
                              className="crm-faq-input"
                              value={item.title}
                              onChange={e => updateBestPractice(item.id, { title: e.target.value })}
                              placeholder="Regra curta"
                              style={{ background: '#fff', padding: '8px 10px', fontWeight: 500 }}
                            />
                            <textarea
                              className="crm-faq-ans"
                              value={item.detail}
                              onChange={e => updateBestPractice(item.id, { detail: e.target.value })}
                              placeholder="Como a Clara deve aplicar isso"
                              style={{ background: '#fff', minHeight: 62, fontSize: 12.5 }}
                            />
                          </div>
                          <IconBtn title="Remover prática" danger onClick={() => deleteBestPractice(item.id)}>
                            <Trash2 size={13} strokeWidth={1.7} />
                          </IconBtn>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Btn ghost sm onClick={addBestPractice}>
                        <Plus size={13} strokeWidth={2} />
                        Adicionar prática
                      </Btn>
                    </div>
                  </aside>
                </div>

                {personaPreviewOpen && (
                  <div style={{ marginTop: 20, borderTop: '0.6px solid var(--color-cinza)', paddingTop: 18 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', marginBottom: 12 }}>
                      Prévia do tom
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
                      {personaPreviewMessages.map((message, index) => {
                        const isLead = index === 0;
                        return (
                          <div
                            key={`${index}-${message}`}
                            style={{
                              alignSelf: isLead ? 'flex-start' : 'flex-end',
                              maxWidth: isLead ? 460 : 560,
                              background: isLead ? '#fff' : 'var(--color-bege-claro)',
                              border: isLead ? '0.6px solid var(--color-cinza)' : '0.6px solid rgba(210, 176, 110, 0.45)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 13px',
                              fontFamily: 'var(--font-body)',
                              fontSize: 13,
                              color: 'var(--color-texto-escuro)',
                              lineHeight: 1.55,
                            }}
                          >
                            {message}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div style={secFoot}>
                <SavedNote text={lastEditedText} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Btn ghost onClick={() => setPersonaPreviewOpen(open => !open)}>
                    <MessageSquare size={13} strokeWidth={1.8} />
                    {personaPreviewOpen ? 'Ocultar prévia' : 'Pré-visualizar conversa'}
                  </Btn>
                  <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar configuração'}</Btn>
                  {saveStatus === 'saved' && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-verde)' }}>✓ Salvo</span>}
                  {saveStatus === 'error' && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-ui-error)', maxWidth: 360, lineHeight: 1.35 }}>{saveError ?? 'Erro ao salvar'}</span>}
                </div>
              </div>
            </section>

            {/* ─── Section: Exemplos de conversa ─────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[3] = el; }}
              id="sec-exemplos"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>04</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Exemplos de conversa</h2>
                  <p style={secSub}>Conversas reais da Larissa que ensinam a Clara o jeito de falar — ritmo, calor, mensagens curtas. A Clara imita o tom, não copia o texto. Quanto mais exemplos, mais natural.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {exemplos.map(ex => {
                    if (editingExId === ex.id) {
                      return <div key={ex.id}>{renderExEditor()}</div>;
                    }
                    return (
                      <div key={ex.id} className="crm-faq-item" style={{ background: 'var(--bg-1)', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', transition: 'border var(--duration-fast) var(--ease-soft)' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.4 }}>
                            {ex.titulo}
                          </div>
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {ex.dialogo.map((t, j) => (
                              <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: t.autor === 'clara' ? 'var(--color-alaranjado)' : 'var(--color-bege)', minWidth: 38, flexShrink: 0 }}>
                                  {t.autor === 'clara' ? 'Clara' : 'Lead'}
                                </span>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', lineHeight: 1.5 }}>{t.texto}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <IconBtn title="Editar" onClick={() => startEditEx(ex)}>
                            <Pencil size={13} strokeWidth={1.7} />
                          </IconBtn>
                          <IconBtn title="Remover" danger onClick={() => deleteEx(ex.id)}>
                            <Trash2 size={13} strokeWidth={1.7} />
                          </IconBtn>
                        </div>
                      </div>
                    );
                  })}

                  {editingExId === 'new' && renderExEditor()}
                </div>

                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Btn ghost onClick={startNewEx}>
                    <Plus size={14} strokeWidth={2} />
                    Adicionar exemplo
                  </Btn>
                  <Btn ghost disabled={zipImporting} onClick={() => zipInputRef.current?.click()}>
                    <Upload size={14} strokeWidth={2} />
                    {zipImporting ? 'Importando…' : 'Importar ZIP do WhatsApp'}
                  </Btn>
                  <input
                    ref={zipInputRef}
                    type="file"
                    accept=".zip"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleZipImport(f); }}
                  />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', fontStyle: 'italic' }}>
                    {exemplos.length} {exemplos.length === 1 ? 'exemplo cadastrado' : 'exemplos cadastrados'}
                  </span>
                  {zipImportError && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-ui-error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={12} strokeWidth={2} />
                      {zipImportError}
                    </span>
                  )}
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text="Usado para imitar o tom da Larissa" />
                <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar exemplos'}</Btn>
              </div>
            </section>

            {/* ─── Section 3: FAQ ────────────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[4] = el; }}
              id="sec-faq"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>05</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Perguntas frequentes</h2>
                  <p style={secSub}>Respostas curadas que o agente usa como fonte de verdade. Quando a pergunta da aluna casa com uma destas, ele responde com o texto exato — sem improvisar.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {faqItems.map(item => {
                    const isEditing = editingId === item.id;
                    if (isEditing) {
                      return (
                        <div key={item.id} style={{ background: 'var(--bg-1)', border: '0.6px solid var(--color-alaranjado)', borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', boxShadow: '0 0 0 3px rgba(240, 131, 83, 0.08)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <label style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', display: 'block', marginBottom: 6 }}>Pergunta</label>
                              <input className="crm-faq-input" value={editBuf.q} onChange={e => setEditBuf(b => ({ ...b, q: e.target.value }))} />
                            </div>
                            <div>
                              <label style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', display: 'block', marginBottom: 6 }}>Resposta do agente</label>
                              <textarea className="crm-faq-ans" value={editBuf.a} onChange={e => setEditBuf(b => ({ ...b, a: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                              <Btn ghost onClick={cancelEdit}>Cancelar</Btn>
                              <Btn primary onClick={saveEdit}>Salvar pergunta</Btn>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={item.id} className="crm-faq-item" style={{ background: 'var(--bg-1)', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', transition: 'border var(--duration-fast) var(--ease-soft)' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-alaranjado)', flexShrink: 0, lineHeight: 1 }}>&ldquo;</span>
                            {item.q}
                          </div>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', lineHeight: 1.6, marginTop: 6, paddingLeft: 16, borderLeft: '1.5px solid var(--color-bege-claro)' }}>
                            {item.a}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <IconBtn title="Editar" onClick={() => startEdit(item)}>
                            <Pencil size={13} strokeWidth={1.7} />
                          </IconBtn>
                          <IconBtn title="Remover" danger onClick={() => deleteItem(item.id)}>
                            <Trash2 size={13} strokeWidth={1.7} />
                          </IconBtn>
                        </div>
                      </div>
                    );
                  })}

                  {/* New item inline */}
                  {editingId === 'new' && (
                    <div style={{ background: 'var(--bg-1)', border: '0.6px solid var(--color-alaranjado)', borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', boxShadow: '0 0 0 3px rgba(240, 131, 83, 0.08)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', display: 'block', marginBottom: 6 }}>Pergunta</label>
                          <input className="crm-faq-input" placeholder="Digite a pergunta..." value={editBuf.q} onChange={e => setEditBuf(b => ({ ...b, q: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', display: 'block', marginBottom: 6 }}>Resposta do agente</label>
                          <textarea className="crm-faq-ans" placeholder="Digite a resposta que o agente deve usar..." value={editBuf.a} onChange={e => setEditBuf(b => ({ ...b, a: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                          <Btn ghost onClick={cancelEdit}>Cancelar</Btn>
                          <Btn primary onClick={saveEdit}>Salvar pergunta</Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AddBtn onClick={startNew} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', fontStyle: 'italic' }}>
                    {faqItems.length} perguntas cadastradas · usadas em 73% das conversas do mês
                  </span>
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text="Alterações salvas · agora" success />
                <Btn primary>Salvar FAQ</Btn>
              </div>
            </section>

            {/* ─── Section 4: Handoff ────────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[5] = el; }}
              id="sec-handoff"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>06</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Regras de handoff</h2>
                  <p style={secSub}>Quando o agente deve parar e te chamar. Cada gatilho liga ou desliga independente — a conversa vai para o Inbox e fica marcada como &ldquo;humano necessário&rdquo;.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {handoffRules.map((rule, i) => (
                    <div key={rule.id} style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 16,
                      alignItems: 'center',
                      padding: '14px 4px',
                      borderBottom: i < handoffRules.length - 1 ? '0.6px solid var(--color-cinza)' : 'none',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-2)', color: 'var(--color-bege)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {rule.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>
                          {rule.title}
                        </div>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', lineHeight: 1.5, marginTop: 3 }}>
                          {rule.desc}
                        </p>
                      </div>
                      <Toggle
                        checked={rule.enabled}
                        onChange={v => setHandoffRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: v } : r))}
                        label={`Ativar: ${rule.title}`}
                      />
                    </div>
                  ))}
                </div>

                {/* ── Mensagem ao lead após handoff de agendamento ── */}
                <div style={{ marginTop: 24, borderTop: '0.6px solid var(--color-cinza)', paddingTop: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--bg-2)', color: 'var(--color-bege)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageSquare size={15} strokeWidth={1.6} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>
                        Mensagem enviada ao lead no handoff de agendamento
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', lineHeight: 1.5, marginTop: 2 }}>
                        Quando a regra de agendamento acionar o handoff, a Clara envia essa mensagem antes de passar para você — evita silêncio na conversa.
                      </p>
                    </div>
                  </div>
                  <textarea
                    className="crm-config-ta"
                    style={{ minHeight: 80, marginTop: 10 }}
                    value={mensagemHandoffAgendamento}
                    onChange={e => setMensagemHandoffAgendamento(e.target.value)}
                    placeholder="Ex.: Perfeito! Vou verificar os horários disponíveis com a nossa equipe e entro em contato em breve."
                    spellCheck={false}
                  />
                </div>

                {/* ── Notificação no WhatsApp da equipe ── */}
                <div style={{ marginTop: 24, borderTop: '0.6px solid var(--color-cinza)', paddingTop: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Toggle
                      checked={notificacaoHandoffAtivo}
                      onChange={setNotificacaoHandoffAtivo}
                      size="sm"
                      label="Ativar notificação de handoff"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell size={14} strokeWidth={1.6} color="var(--color-bege)" />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>
                          Notificação de handoff no WhatsApp
                        </span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', lineHeight: 1.5, marginTop: 3 }}>
                        Quando qualquer handoff ocorrer (IA ou manual), esse número recebe uma mensagem com o nome, telefone e motivo do lead — para você agir sem precisar estar no inbox.
                      </p>
                      {notificacaoHandoffAtivo && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-bege)', marginBottom: 6 }}>
                            Número para notificação
                          </div>
                          <input
                            type="tel"
                            className="crm-faq-input"
                            placeholder="+5549999999999"
                            value={notificacaoHandoffNumero}
                            onChange={e => setNotificacaoHandoffNumero(e.target.value)}
                            style={{ maxWidth: 240 }}
                          />
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', marginTop: 4 }}>
                            Formato E.164 — ex.: +5549999999999
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text={`${handoffRules.filter(r => r.enabled).length} de ${handoffRules.length} gatilhos ativos`} />
                <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar regras'}</Btn>
              </div>
            </section>

            {/* ─── Section 5: Horários ───────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[6] = el; }}
              id="sec-hours"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>07</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Horário de atendimento</h2>
                  <p style={secSub}>Quando o agente responde imediatamente e quando ele responde com a mensagem fora do horário. O fuso é o da clínica (Brasília · GMT−3).</p>
                </div>
              </div>

              <div style={secBody}>
                {/* Hours table */}
                <div style={{ border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-1)' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto' }}>
                    {['Dia', 'Horário', 'Aberto'].map(h => (
                      <div key={h} style={{ padding: '10px 16px', background: 'var(--bg-2)', fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', borderBottom: '0.6px solid var(--color-cinza)' }}>
                        {h}
                      </div>
                    ))}
                  </div>

                  {hours.map((row, i) => (
                    <div key={row.day} style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto' }}>
                      {/* Day name */}
                      <div style={{ padding: '12px 16px', borderBottom: i < hours.length - 1 ? '0.6px solid var(--color-cinza)' : 'none', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: row.open ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)' }}>
                        {row.day}
                      </div>
                      {/* Time */}
                      <div style={{ padding: '12px 16px', borderBottom: i < hours.length - 1 ? '0.6px solid var(--color-cinza)' : 'none', display: 'flex', alignItems: 'center' }}>
                        {row.open ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFeatureSettings: '"tnum"' }}>
                            <input
                              type="time"
                              className="crm-time-pill"
                              value={row.from}
                              onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, from: e.target.value } : r))}
                            />
                            <span style={{ color: 'var(--color-texto-medio)', fontSize: 12 }}>até</span>
                            <input
                              type="time"
                              className="crm-time-pill"
                              value={row.to}
                              onChange={e => setHours(prev => prev.map((r, j) => j === i ? { ...r, to: e.target.value } : r))}
                            />
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--color-texto-medio)', background: 'var(--bg-2)', padding: '3px 10px', borderRadius: 'var(--radius-pill)' }}>
                            fechado
                          </span>
                        )}
                      </div>
                      {/* Toggle */}
                      <div style={{ padding: '12px 16px', borderBottom: i < hours.length - 1 ? '0.6px solid var(--color-cinza)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Toggle
                          checked={row.open}
                          onChange={v => setHours(prev => prev.map((r, j) => j === i ? { ...r, open: v } : r))}
                          label={`Aberto ${row.day}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Off hours message */}
                <div style={{ marginTop: 22 }}>
                  <div style={fieldLabel}>
                    <span>Mensagem fora do horário</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--color-bege)', letterSpacing: '0.3px', textTransform: 'none', fontWeight: 400 }}>
                      enviada automaticamente quando estamos fechados
                    </span>
                  </div>
                  <textarea
                    className="crm-config-ta"
                    style={{ minHeight: 130 }}
                    value={offHoursText}
                    onChange={e => setOffHoursText(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text={`Atende ${hours.filter(r => r.open).length} dias por semana`} />
                <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar horários'}</Btn>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
