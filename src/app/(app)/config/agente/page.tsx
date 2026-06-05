'use client';

import { useState, useRef, useEffect, useCallback, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateAgentConfig } from '../actions';
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

// ─── initial data ─────────────────────────────────────────────────────────────
const INITIAL_FAQ: FaqItem[] = [
  {
    id: 1,
    q: 'Qual o valor da avaliação?',
    a: 'A primeira avaliação é gratuita e dura cerca de 50 minutos. Nela a fisioterapeuta entende seu histórico, suas queixas e seu objetivo. Os valores das aulas só são apresentados depois da avaliação, porque dependem do plano que vamos desenhar para você.',
  },
  {
    id: 2,
    q: 'Vocês atendem gestantes?',
    a: 'Atendemos sim — em qualquer trimestre e também no puerpério. Nossas fisioterapeutas têm especialização em pilates para gestantes e fisioterapia pélvica pós-parto. Você pode trazer o pedido médico se já tiver um, mas não é obrigatório para a avaliação inicial.',
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

const PERSONA_DEFAULT = `Você é a Corá, recepcionista virtual da Corporis Fisioterapia e Pilates, em Xanxerê (SC). Você fala em nome da Larissa e da Tainara — duas fisioterapeutas que fundaram a clínica.

Tom: cuidadosa, técnica e acolhedora. Você escuta antes de informar. Você nunca promete cura, nunca diagnostica, nunca prescreve. Quando o assunto for clínico específico, encaminhe para uma das fisioterapeutas.

Linguagem: trate quem chega por "você", nunca "paciente" — aqui dizemos "aluna". Fisioterapia pélvica é assunto íntimo: trate com discrição, sem eufemismos infantis e sem soar clínica demais.

Objetivo principal: acolher o primeiro contato, entender o que a pessoa busca (pilates, gestante, fisio pélvica), oferecer a avaliação inicial gratuita de 50 minutos e ajudar a marcar um horário. Nunca venda pacote no primeiro contato.`;

const OFF_HOURS_DEFAULT = `Oi! Aqui é a Corá, da Corporis 🌿 No momento estamos fora do horário de atendimento — a Larissa e a Tainara respondem pessoalmente assim que abrirmos.

Se quiser, já me conta o que você procura (pilates, gestante ou fisio pélvica?) que deixo tudo encaminhado para a primeira hora da manhã.

Voltamos a responder: segunda a sexta, 7h–19h · sábado, 8h–12h.`;

const TOC_ITEMS = [
  { label: 'Status do agente' },
  { label: 'Persona e tom' },
  { label: 'Perguntas frequentes' },
  { label: 'Regras de handoff' },
  { label: 'Horário de atendimento' },
];

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
}: {
  children: React.ReactNode;
  primary?: boolean;
  ghost?: boolean;
  sm?: boolean;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        appearance: 'none',
        border: primary
          ? `0.6px solid ${hov ? 'var(--color-tangerina)' : 'var(--color-alaranjado)'}`
          : ghost
            ? '0.6px solid transparent'
            : '0.6px solid var(--color-cinza)',
        background: primary
          ? hov ? 'var(--color-tangerina)' : 'var(--color-alaranjado)'
          : ghost
            ? hov ? 'var(--bg-2)' : 'transparent'
            : hov ? 'var(--color-bege-claro)' : '#fff',
        color: primary ? '#fff' : ghost ? hov ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)' : 'var(--color-texto-escuro)',
        borderRadius: 'var(--radius-pill)',
        padding: sm ? '5px 11px' : '8px 16px',
        fontFamily: 'var(--font-body)',
        fontSize: sm ? 12 : 13,
        fontWeight: 500,
        letterSpacing: '0.2px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        transition: 'all var(--duration-fast) var(--ease-soft)',
        flexShrink: 0,
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

// ─── main page ────────────────────────────────────────────────────────────────
export default function AgentePage() {
  // state
  const [agentActive, setAgentActive] = useState(true);
  const [personaText, setPersonaText] = useState(PERSONA_DEFAULT);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(INITIAL_FAQ);
  const [editingId, setEditingId] = useState<number | 'new' | null>(4); // editing "Preciso de pedido?"
  const [editBuf, setEditBuf] = useState({
    q: 'Preciso de pedido médico?',
    a: 'Para a avaliação inicial não é necessário pedido médico. Se você já tem um (do ginecologista, ortopedista ou obstetra), pode trazer — ajuda a fisioterapeuta a desenhar o plano. Para alguns convênios o pedido pode ser solicitado depois — a gente avisa.',
  });
  const [handoffRules, setHandoffRules] = useState<HandoffRule[]>([
    { id: 1, enabled: true,  title: 'Lead pede para falar com uma pessoa',          icon: <MessageSquare size={17} strokeWidth={1.6} />, desc: 'Frases como "quero falar com alguém", "tem uma humana aí?", "prefiro falar com a Larissa". Encaminha imediatamente.' },
    { id: 2, enabled: true,  title: 'Pergunta clínica específica',                   icon: <FileQuestion  size={17} strokeWidth={1.6} />, desc: 'Dor persistente, sintoma novo, dúvida sobre diagnóstico médico, gestação de risco. A Corá nunca responde — sempre encaminha.' },
    { id: 3, enabled: true,  title: 'Reclamação ou insatisfação',                    icon: <AlertCircle   size={17} strokeWidth={1.6} />, desc: 'Detecta tom negativo, palavras como "decepcionada", "horrível", "cancelar". Encaminha em até 1 minuto e marca como prioritário.' },
    { id: 4, enabled: true,  title: 'Agente não sabe responder com confiança',       icon: <HelpCircle    size={17} strokeWidth={1.6} />, desc: 'Quando a IA não encontra resposta no FAQ ou na persona e teria que improvisar. Prefere passar para humano a inventar.' },
    { id: 5, enabled: false, title: 'Conversa passou de 8 mensagens sem agendar',   icon: <Clock         size={17} strokeWidth={1.6} />, desc: 'Se o agente trocou muitas mensagens e a lead ainda não marcou avaliação, chama você para empurrar pessoalmente.' },
  ]);
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
  const [activeToc, setActiveToc] = useState(0);
  const [savePending, startSave] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load real config from DB
  useEffect(() => {
    const supabase = createClient();
    supabase.schema('crm').from('agent_config').select('*').single().then(({ data }) => {
      if (!data) return;
      setAgentActive(data.ativo);
      if (data.persona_prompt) setPersonaText(data.persona_prompt);
      if (data.mensagem_fora_horario) setOffHoursText(data.mensagem_fora_horario);
      if (Array.isArray(data.faq) && (data.faq as unknown[]).length > 0) {
        setFaqItems((data.faq as { q: string; a: string }[]).map((item, i) => ({ id: i + 1, ...item })));
      }
    });
  }, []);

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
      const result = await updateAgentConfig({
        ativo:                agentActive,
        persona_prompt:       personaText,
        mensagem_fora_horario: offHoursText,
        horario_atendimento:  horarioAtendimento,
        faq:                  faqItems.map(({ q, a }) => ({ q, a })),
        regras_handoff:       handoffRules.filter((r) => r.enabled).map((r) => r.title),
      });
      setSaveStatus(result.success ? 'saved' : 'error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    });
  }

  // refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

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

            {/* Page intro */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-medio)', lineHeight: 1.55, maxWidth: 520 }}>
                O <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>agente cuida do primeiro contato no WhatsApp</strong> — apresenta a clínica, responde dúvidas comuns e marca a avaliação inicial. Aqui você define o tom, o que ele sabe e quando ele deve te chamar.
              </p>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#fff',
                border: '0.6px solid var(--color-cinza)',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px 6px 6px',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--color-texto-escuro)',
                flexShrink: 0,
              }}>
                <span style={{
                  width: 26, height: 26,
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-alaranjado)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 10,
                }}>co</span>
                <span style={{ color: 'var(--color-texto-medio)' }}>agente</span>
                &nbsp;<strong style={{ fontWeight: 500 }}>Corá</strong>
              </span>
            </div>

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
                      A <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Corá</strong> está respondendo novos contatos no WhatsApp. Conversas com lead já em atendimento humano <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>não</strong> são interrompidas.
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ background: 'var(--color-cinza)', width: '0.6px' }} aria-hidden />

                  {/* WhatsApp connection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>
                      Conexão
                    </div>
                    <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(172, 192, 149, 0.30)', color: '#5F7948', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {/* WhatsApp SVG */}
                        <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
                          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.9-.4-1.7-1-2.4-1.7-.5-.5-1-1.1-1.4-1.8-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4 0-.1-.6-1.5-.9-2.1-.2-.5-.5-.4-.6-.4h-.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.1 2 3 4.8 4.2.4.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.1-.2-.3-.2zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.2 }}>
                          +55 49 99183-1900
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 6, fontFeatureSettings: '"tnum"' }}>
                          <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-verde)', boxShadow: '0 0 0 3px rgba(172, 192, 149, 0.25)', flexShrink: 0 }} />
                          Conectado · Evolution API · sincronizado há 2 min
                        </div>
                      </div>
                      <Btn sm>
                        <RefreshCw size={12} strokeWidth={1.8} />
                        Reconectar
                      </Btn>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.5 }}>
                      Se a conexão cair, leads continuam chegando no Inbox — mas sem resposta automática.
                    </p>
                  </div>
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text="Salvo automaticamente · há 4 min" />
                <div />
              </div>
            </section>

            {/* ─── Section 2: Persona ────────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[1] = el; }}
              id="sec-persona"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>02</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={secTitle}>Persona e tom</h2>
                  <p style={secSub}>O texto-base que ensina o agente como falar. Pense que você está escrevendo um briefing para uma recepcionista nova.</p>
                </div>
              </div>

              <div style={secBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 24, alignItems: 'stretch' }}>
                  <div>
                    {/* persona tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {['Cuidadosa', 'Técnica', 'Acolhedora'].map(tag => (
                        <span key={tag} style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 10.5,
                          fontWeight: 500,
                          letterSpacing: '1.2px',
                          textTransform: 'uppercase',
                          background: 'var(--bg-2)',
                          color: 'var(--color-texto-medio)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-pill)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: 'var(--radius-pill)', background: 'var(--color-bege)' }} />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={fieldLabel}>
                      <span>Prompt da persona</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--color-texto-medio)', letterSpacing: '0.3px', textTransform: 'none', fontWeight: 400, fontFeatureSettings: '"tnum"' }}>
                        {personaText.length} / 2000 caracteres
                      </span>
                    </div>
                    <textarea
                      className="crm-config-ta"
                      style={{ minHeight: 280 }}
                      value={personaText}
                      onChange={e => setPersonaText(e.target.value)}
                      spellCheck={false}
                    />
                  </div>

                  <aside style={{
                    background: 'var(--bg-2)',
                    borderLeft: '2px solid var(--color-bege)',
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    padding: '16px 18px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12.5,
                    color: 'var(--color-texto-escuro)',
                    lineHeight: 1.6,
                  }}>
                    <h4 style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', margin: '0 0 10px' }}>
                      Boas práticas
                    </h4>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        ['Acolha antes de informar.', 'Antes de mandar valor ou link, demonstre que entendeu o que a aluna trouxe.'],
                        ['Nunca prometa cura.', 'Evite "vai resolver". Prefira "podemos te ajudar a entender melhor".'],
                        ['"Aluna", não "paciente".', 'É um valor da marca.'],
                        ['Fisio pélvica é íntimo.', 'Discrição sempre — sem eufemismo, sem clínica demais.'],
                        ['Sem venda forçada.', 'O primeiro objetivo é a avaliação gratuita, não fechar pacote.'],
                      ].map(([bold, rest], i) => (
                        <li key={i} style={{ paddingLeft: 16, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 0, top: 8, width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-bege)' }} />
                          <strong style={{ fontWeight: 500 }}>{bold}</strong>{' '}{rest}
                        </li>
                      ))}
                    </ul>
                  </aside>
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text="Última edição há 2 dias · por Larissa" />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Btn ghost>Pré-visualizar conversa</Btn>
                  <Btn primary onClick={handleSaveAll}>{savePending ? 'Salvando…' : 'Salvar configuração'}</Btn>
                  {saveStatus === 'saved' && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-verde)' }}>✓ Salvo</span>}
                  {saveStatus === 'error' && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-ui-error)' }}>Erro ao salvar</span>}
                </div>
              </div>
            </section>

            {/* ─── Section 3: FAQ ────────────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[2] = el; }}
              id="sec-faq"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>03</span>
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
              ref={el => { sectionRefs.current[3] = el; }}
              id="sec-handoff"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>04</span>
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

                <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>
                    Encaminhar para
                  </span>
                  {[
                    { initials: 'LF', bg: 'var(--color-bege-claro)', color: '#6B5526', name: 'Larissa Ferraz' },
                    { initials: 'TF', bg: 'rgba(240, 131, 83, 0.18)', color: '#B85A2E', name: 'Tainara Fracasso' },
                  ].map(p => (
                    <span key={p.name} style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-escuro)', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '0.6px solid var(--color-cinza)', padding: '5px 11px 5px 5px', borderRadius: 'var(--radius-pill)' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-pill)', background: p.bg, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 9 }}>
                        {p.initials}
                      </span>
                      {p.name}
                    </span>
                  ))}
                  <Btn sm ghost>
                    <Plus size={12} strokeWidth={2} />
                    Adicionar pessoa
                  </Btn>
                </div>
              </div>

              <div style={secFoot}>
                <SavedNote text={`${handoffRules.filter(r => r.enabled).length} de ${handoffRules.length} gatilhos ativos · salvo há 6 min`} />
                <Btn primary>Salvar regras</Btn>
              </div>
            </section>

            {/* ─── Section 5: Horários ───────────────────────────────────── */}
            <section
              ref={el => { sectionRefs.current[4] = el; }}
              id="sec-hours"
              style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', marginBottom: 24, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={secHead}>
                <span style={secNum}>05</span>
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
                            <span className="crm-time-pill">{row.from}</span>
                            <span style={{ color: 'var(--color-texto-medio)', fontSize: 12 }}>até</span>
                            <span className="crm-time-pill">{row.to}</span>
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
                <SavedNote text={`Atende ${hours.filter(r => r.open).length} dias por semana · 70h semanais`} />
                <Btn primary>Salvar horários</Btn>
              </div>
            </section>

            {/* ─── Bottom bar ────────────────────────────────────────────── */}
            <div style={{ marginTop: 8, padding: '18px 28px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Tudo certo por aqui.</strong> Cada seção é salva separadamente — você pode sair desta página a qualquer momento sem perder nada.
              </div>
              <Btn>
                <Check size={13} strokeWidth={1.8} />
                Voltar para o Dashboard
              </Btn>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
