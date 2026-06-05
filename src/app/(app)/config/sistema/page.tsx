'use client';

import { useState } from 'react';
import {
  Users,
  MessageSquare,
  FileText,
  Building2,
  Download,
  Plus,
  Search,
  ChevronDown,
  Star,
  User,
  Pencil,
  Mail,
  Lock,
  XCircle,
  Copy,
  Settings,
  RefreshCw,
  Check,
  Clock,
  RotateCcw,
  HelpCircle,
  Save,
  Upload,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────
type TabId = 'usuarios' | 'whatsapp' | 'templates' | 'clinica';

interface UserRow {
  id: number;
  initials: string;
  tone: 1 | 2 | 3 | 4 | 5;
  name: string;
  sub: string;
  isYou?: boolean;
  email: string;
  role: string;
  isOwner?: boolean;
  status: 'on' | 'off' | 'pending';
  lastAccess: string;
}

interface Template {
  id: number;
  name: string;
  preview: string; // with {{placeholder}} markers
  approved: boolean;
  approvedLabel?: string;
  stats: string;
}

interface TplCategory {
  id: string;
  name: string;
  count: number;
  color: string;
  bg: string;
  meta: string;
  icon: React.ReactNode;
  templates: Template[];
}

// ─── data ─────────────────────────────────────────────────────────────────────
const USERS: UserRow[] = [
  { id: 1, initials: 'LF', tone: 1, name: 'Larissa Ferraz',  sub: 'Fisioterapeuta · Sócia', isYou: true, email: 'larissa@corporisxre.com.br',       role: 'Equipe · Proprietária', isOwner: true,  status: 'on',      lastAccess: 'agora · sessão atual' },
  { id: 2, initials: 'TC', tone: 2, name: 'Tainara Cordeiro', sub: 'Fisioterapeuta · Sócia', email: 'tainara@corporisxre.com.br',                     role: 'Equipe',                isOwner: false, status: 'on',      lastAccess: 'há 12 min · Inbox' },
  { id: 3, initials: 'MS', tone: 3, name: 'Marília Soares',   sub: 'Recepção',               email: 'marilia@corporisxre.com.br',                     role: 'Equipe',                isOwner: false, status: 'on',      lastAccess: 'há 2h · Agenda' },
  { id: 4, initials: 'JP', tone: 4, name: 'Júlia Pacheco',    sub: 'Fisioterapeuta · contratada', email: 'julia.pacheco@corporisxre.com.br',           role: 'Equipe',                isOwner: false, status: 'pending', lastAccess: 'aguardando · há 3 dias' },
  { id: 5, initials: 'CB', tone: 5, name: 'Camila Bonato',    sub: 'Estagiária · 2024.1',    email: 'camila.bonato@corporisxre.com.br',               role: 'Equipe',                isOwner: false, status: 'off',     lastAccess: 'há 4 meses' },
];

const TONE_STYLE: Record<1|2|3|4|5, { bg: string; color: string }> = {
  1: { bg: '#EAD7AC',                      color: '#6B5526' },
  2: { bg: 'rgba(240, 131, 83, 0.20)',     color: '#B85A2E' },
  3: { bg: 'rgba(172, 192, 149, 0.30)',    color: '#5F7948' },
  4: { bg: 'rgba(210, 176, 110, 0.30)',    color: '#7A5E1F' },
  5: { bg: 'var(--bg-2)',                  color: 'var(--color-texto-medio)' },
};

const TPL_CATEGORIES: TplCategory[] = [
  {
    id: 'lembrete', name: 'Lembrete', count: 3,
    color: '#7A5E1F', bg: 'rgba(210, 176, 110, 0.20)',
    meta: 'Envio automático · 24h e 2h antes da sessão',
    icon: <Clock size={14} strokeWidth={1.6} />,
    templates: [
      { id: 1, name: 'Lembrete — véspera',          preview: 'Oi, {{nome}}! Passando pra lembrar da sua sessão de pilates amanhã, {{data}} às {{horario}}. Tudo certo por aí? 🌿',                                                   approved: true,  approvedLabel: 'Aprovado no WhatsApp', stats: 'enviado 312× · 91% lido' },
      { id: 2, name: 'Lembrete — 2h antes',         preview: '{{nome}}, te espero hoje às {{horario}} aqui no Centro Médico Xanxerê (sala 903). Se precisar mudar, é só me avisar.',                                                  approved: true,  approvedLabel: 'Aprovado no WhatsApp', stats: 'enviado 287× · 88% lido' },
      { id: 3, name: 'Lembrete — avaliação inicial', preview: 'Olá, {{nome}}! Sua avaliação inicial gratuita está marcada para {{data}} com a {{profissional}}. Use roupa confortável — não precisa trazer nada.', approved: false, approvedLabel: 'Em revisão · Meta',    stats: 'enviado 64×' },
    ],
  },
  {
    id: 'confirmacao', name: 'Confirmação', count: 3,
    color: '#5F7948', bg: 'rgba(172, 192, 149, 0.22)',
    meta: 'Resposta automática · novos agendamentos',
    icon: <Check size={14} strokeWidth={2.2} />,
    templates: [
      { id: 4, name: 'Agendamento confirmado',          preview: 'Prontinho, {{nome}}! Sua avaliação está confirmada para {{data}} às {{horario}}. Endereço: R. Coronel Santos Marinho, 347 — sala 903.',        approved: true,  approvedLabel: 'Aprovado no WhatsApp',   stats: 'enviado 198×' },
      { id: 5, name: 'Remarcação confirmada',            preview: 'Combinado, {{nome}} — remarquei para {{data}} às {{horario}}. Qualquer coisa, é só me chamar por aqui mesmo.',                                   approved: true,  approvedLabel: 'Aprovado no WhatsApp',   stats: 'enviado 73×' },
      { id: 6, name: 'Cancelamento — pedido pela aluna', preview: 'Sem problema, {{nome}}. Cancelei seu horário de {{data}}. Quando quiser remarcar, é só responder aqui que a gente acha uma nova data.',           approved: false, approvedLabel: 'Não-template · uso da equipe', stats: 'enviado 41×' },
    ],
  },
  {
    id: 'reativacao', name: 'Reativação', count: 2,
    color: '#B85A2E', bg: 'rgba(240, 131, 83, 0.16)',
    meta: 'Disparo manual · alunas inativas há 30+ dias',
    icon: <RotateCcw size={14} strokeWidth={1.6} />,
    templates: [
      { id: 7, name: 'Cadê você? — 30 dias',  preview: 'Oi, {{nome}}! Faz um tempo que a gente não se vê por aqui — tá tudo bem? Se quiser retomar, separei um horário pensando em você na {{data}}.', approved: true,  approvedLabel: 'Aprovado no WhatsApp',       stats: 'enviado 88× · 34% volta' },
      { id: 8, name: 'Pós-parto · convite gentil', preview: '{{nome}}, espero que esteja tudo lindo aí com o bebê. Quando se sentir pronta, a fisio pélvica pós-parto pode ajudar muito — sem pressa, no seu tempo.',                     approved: false, approvedLabel: 'Rascunho · revisar com Tainara', stats: 'não enviado' },
    ],
  },
  {
    id: 'boas-vindas', name: 'Boas-vindas', count: 3,
    color: '#6B5526', bg: 'var(--color-bege-claro)',
    meta: 'Resposta automática da Corá · primeiro contato',
    icon: <MessageSquare size={14} strokeWidth={1.6} />,
    templates: [
      { id: 9,  name: 'Primeira saudação',           preview: 'Oi, {{nome}}! Aqui é a Corá, da Corporis Fisioterapia e Pilates 🌿 Que bom te receber por aqui. Me conta — o que te trouxe até nós?',                                    approved: true, approvedLabel: 'Aprovado no WhatsApp', stats: 'enviado 412× · 96% lido' },
      { id: 10, name: 'Fora do horário',             preview: 'Oi! No momento estamos fechadas — funcionamos de seg. a sex., 7h às 20h. Me deixa sua mensagem aqui que respondo assim que abrirmos. 🌿',                              approved: true, approvedLabel: 'Aprovado no WhatsApp', stats: 'enviado 156×' },
      { id: 11, name: 'Apresentação dos serviços',   preview: 'Atendemos pilates clínico, fisioterapia pélvica e acompanhamento de gestantes — sempre individual, com fisioterapeuta. A primeira avaliação é gratuita.', approved: true, approvedLabel: 'Aprovado no WhatsApp', stats: 'enviado 203×' },
    ],
  },
];

const CLINIC_HOURS = [
  { day: 'Segunda', h: '07:00 – 20:00', off: false },
  { day: 'Terça',   h: '07:00 – 20:00', off: false },
  { day: 'Quarta',  h: '07:00 – 20:00', off: false },
  { day: 'Quinta',  h: '07:00 – 20:00', off: false },
  { day: 'Sexta',   h: '07:00 – 18:00', off: false },
  { day: 'Sábado',  h: 'Fechado',        off: true  },
  { day: 'Domingo', h: 'Fechado',        off: true  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function renderPreview(text: string) {
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((p, i) =>
    p.startsWith('{{') ? (
      <code key={i} style={{ background: 'rgba(240, 131, 83, 0.14)', color: '#B85A2E', fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: 11.5, fontWeight: 500, padding: '1px 5px', borderRadius: 3 }}>
        {p}
      </code>
    ) : <span key={i}>{p}</span>
  );
}

// ─── small components ─────────────────────────────────────────────────────────
function Btn({ children, primary, ghost, sm, onClick }: { children: React.ReactNode; primary?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        appearance: 'none',
        border: primary ? `0.6px solid ${h ? 'var(--color-tangerina)' : 'var(--color-alaranjado)'}` : ghost ? '0.6px solid transparent' : '0.6px solid var(--color-cinza)',
        background: primary ? (h ? 'var(--color-tangerina)' : 'var(--color-alaranjado)') : ghost ? (h ? 'var(--bg-2)' : 'transparent') : (h ? 'var(--color-bege-claro)' : '#fff'),
        color: primary ? '#fff' : ghost ? (h ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)') : 'var(--color-texto-escuro)',
        borderRadius: 'var(--radius-pill)',
        padding: sm ? '6px 12px' : '9px 16px',
        fontFamily: 'var(--font-body)', fontSize: sm ? 12 : 13, fontWeight: 500, letterSpacing: '0.2px',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
        transition: 'all var(--duration-fast) var(--ease-soft)', whiteSpace: 'nowrap', flexShrink: 0,
      }}>{children}</button>
  );
}

function GhostTopBtn({ children }: { children: React.ReactNode }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        appearance: 'none', border: '0.6px solid var(--color-cinza)', borderColor: h ? 'var(--color-tangerina)' : 'var(--color-cinza)',
        background: h ? 'var(--color-bege-claro)' : '#fff', color: h ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)',
        borderRadius: 'var(--radius-pill)', padding: '7px 14px',
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'all var(--duration-fast) var(--ease-soft)',
      }}>{children}</button>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: 30, height: 30, borderRadius: 'var(--radius-pill)', border: 0, background: h ? 'var(--color-bege-claro)' : 'transparent', color: h ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all var(--duration-fast) var(--ease-soft)', flexShrink: 0 }}>
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: 'on' | 'off' | 'pending' }) {
  const cfg = {
    on:      { bg: 'rgba(172, 192, 149, 0.20)', color: '#5F7948', dot: 'var(--color-verde)', shadow: '0 0 0 3px rgba(172, 192, 149, 0.22)', label: 'Ativo' },
    off:     { bg: 'var(--bg-2)', color: 'var(--color-texto-medio)', dot: 'var(--color-cinza)', shadow: 'none', label: 'Inativo' },
    pending: { bg: 'rgba(210, 176, 110, 0.20)', color: '#7A5E1F', dot: 'var(--color-bege)', shadow: '0 0 0 3px rgba(210, 176, 110, 0.22)', label: 'Convite enviado' },
  }[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.3px', padding: '3px 11px 3px 9px', borderRadius: 'var(--radius-pill)', background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: cfg.dot, boxShadow: cfg.shadow, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function SistemaPage() {
  const [tab, setTab] = useState<TabId>('usuarios');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const filteredUsers = USERS.filter(u =>
    u.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'usuarios',   label: 'Usuários',  icon: <Users size={14} strokeWidth={1.6} />, count: USERS.length },
    { id: 'whatsapp',   label: 'WhatsApp',  icon: <MessageSquare size={14} strokeWidth={1.6} /> },
    { id: 'templates',  label: 'Templates', icon: <FileText size={14} strokeWidth={1.6} />, count: 11 },
    { id: 'clinica',    label: 'Clínica',   icon: <Building2 size={14} strokeWidth={1.6} /> },
  ];

  const thStyle: React.CSSProperties = {
    textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500,
    letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)',
    padding: '14px 20px', background: 'var(--bg-1)', borderBottom: '0.6px solid var(--color-cinza)',
  };

  return (
    <div style={{ display: 'grid', gridTemplateRows: '64px auto 1fr', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--bg-1)', borderBottom: '0.6px solid var(--color-cinza)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>
            Configurações
          </h1>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '0.2px' }}>
            <span>Administração</span>
            <span style={{ width: 3, height: 3, borderRadius: 'var(--radius-pill)', background: 'var(--color-cinza)' }} />
            <span>Corporis · Xanxerê</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GhostTopBtn><Clock size={13} strokeWidth={1.8} />Histórico de alterações</GhostTopBtn>
          <GhostTopBtn><HelpCircle size={13} strokeWidth={1.8} />Ajuda</GhostTopBtn>
        </div>
      </header>

      {/* ── Tabs bar ───────────────────────────────────────────────────────── */}
      <nav role="tablist" style={{ background: 'var(--bg-1)', borderBottom: '0.6px solid var(--color-cinza)', padding: '0 32px', display: 'flex', alignItems: 'stretch', gap: 4 }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={active} type="button" onClick={() => setTab(t.id)}
              style={{
                appearance: 'none', background: 'transparent', border: 0,
                color: active ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)',
                fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, letterSpacing: '0.1px',
                padding: '14px 16px 13px',
                borderBottom: `1.5px solid ${active ? 'var(--color-alaranjado)' : 'transparent'}`,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'color var(--duration-fast) var(--ease-soft), border-color var(--duration-fast) var(--ease-soft)',
              }}>
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span style={{ fontFeatureSettings: '"tnum"', background: active ? 'var(--color-bege-claro)' : 'var(--bg-2)', color: active ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)', fontSize: 10.5, fontWeight: 500, padding: '1px 7px', borderRadius: 'var(--radius-pill)', marginLeft: 2 }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Scroll area ────────────────────────────────────────────────────── */}
      <div style={{ overflow: 'auto', background: 'var(--bg-1)', scrollbarColor: 'var(--color-cinza) transparent', scrollbarWidth: 'thin' }}
        onClick={() => setOpenMenuId(null)}>

        {/* ══ Panel: Usuários ══════════════════════════════════════════════ */}
        {tab === 'usuarios' && (
          <div style={{ padding: '32px 32px 64px' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.15, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>Usuários</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-medio)', lineHeight: 1.55, marginTop: 8 }}>
                    Quem tem acesso ao Corporis CRM. <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>No MVP todos compartilham o mesmo nível de acesso</strong> — papéis diferenciados chegam na próxima fase.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Btn><Download size={13} strokeWidth={1.8} />Exportar</Btn>
                  <Btn primary><Plus size={12} strokeWidth={2.2} />Convidar usuário</Btn>
                </div>
              </div>

              {/* toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <label style={{ flex: 1, maxWidth: 320, position: 'relative', display: 'block' }}>
                  <Search size={14} strokeWidth={1.7} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-medio)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    style={{ width: '100%', background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-pill)', padding: '8px 14px 8px 36px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-escuro)', outline: 'none' }}
                  />
                </label>
                {(['Status: Todos', 'Papel: Todos'] as const).map(label => (
                  <button key={label} type="button" style={{ appearance: 'none', background: '#fff', border: '0.6px solid var(--color-cinza)', color: 'var(--color-texto-medio)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-pill)', padding: '7px 13px', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    {label.split(': ')[0]}: <span style={{ color: 'var(--color-texto-escuro)', fontWeight: 400 }}>{label.split(': ')[1]}</span>
                    <ChevronDown size={11} strokeWidth={1.8} />
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"' }}>
                  {filteredUsers.length} usuários · {filteredUsers.filter(u => u.status === 'on').length} ativos
                </span>
              </div>

              {/* table */}
              <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', color: 'var(--color-texto-escuro)' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nome</th>
                      <th style={thStyle}>E-mail</th>
                      <th style={thStyle}>Papel</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Último acesso</th>
                      <th style={{ ...thStyle, width: 56 }} aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => {
                      const ts = TONE_STYLE[u.tone];
                      const isLast = i === filteredUsers.length - 1;
                      const isMenuOpen = openMenuId === u.id;
                      return (
                        <tr key={u.id} style={{ background: isMenuOpen ? '#F7F1E5' : undefined, transition: 'background var(--duration-fast) var(--ease-soft)', position: 'relative' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F7F1E5'; }}
                          onMouseLeave={e => { if (!isMenuOpen) (e.currentTarget as HTMLElement).style.background = ''; }}>
                          {/* name */}
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-pill)', background: ts.bg, color: ts.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, flexShrink: 0 }}>
                                {u.initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{u.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.3, marginTop: 2 }}>
                                  {u.sub}
                                  {u.isYou && <span style={{ background: 'var(--color-bege-claro)', color: '#6B5526', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 'var(--radius-pill)', marginLeft: 4 }}>você</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* email */}
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>
                            {u.email}
                          </td>
                          {/* role */}
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.3px', background: u.isOwner ? 'var(--color-bege-claro)' : 'var(--bg-2)', color: u.isOwner ? '#6B5526' : 'var(--color-texto-escuro)', borderRadius: 'var(--radius-pill)', padding: '3px 10px 3px 8px' }}>
                              <span style={{ width: 12, height: 12, color: u.isOwner ? '#B85A2E' : 'var(--color-bege)', display: 'flex', alignItems: 'center' }}>
                                {u.isOwner ? <Star size={12} strokeWidth={1.8} /> : <User size={12} strokeWidth={1.8} />}
                              </span>
                              {u.role}
                            </span>
                          </td>
                          {/* status */}
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle' }}>
                            <StatusPill status={u.status} />
                          </td>
                          {/* last access */}
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>
                            {u.lastAccess.includes('agora') || u.lastAccess.includes('há') && !u.lastAccess.includes('meses') && !u.lastAccess.includes('dias')
                              ? <><strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>{u.lastAccess.split(' · ')[0]}</strong>{u.lastAccess.includes(' · ') ? ' · ' + u.lastAccess.split(' · ')[1] : ''}</>
                              : u.lastAccess.startsWith('aguardando')
                                ? <>aguardando · <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>{u.lastAccess.split(' · ')[1]}</strong></>
                                : u.lastAccess
                            }
                          </td>
                          {/* actions */}
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle', textAlign: 'right', position: 'relative' }}>
                            <IconBtn onClick={() => setOpenMenuId(isMenuOpen ? null : u.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                              </svg>
                            </IconBtn>
                            {isMenuOpen && (
                              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 16, top: 50, background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', minWidth: 196, padding: 6, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', padding: '6px 12px 4px' }}>{u.name}</div>
                                {[
                                  { icon: <Pencil size={14} strokeWidth={1.6} />, label: 'Editar dados' },
                                  { icon: <Mail size={14} strokeWidth={1.6} />, label: 'Reenviar convite' },
                                  { icon: <Lock size={14} strokeWidth={1.6} />, label: 'Redefinir senha' },
                                ].map(item => (
                                  <MenuBtn key={item.label} icon={item.icon}>{item.label}</MenuBtn>
                                ))}
                                <div style={{ height: '0.6px', background: 'var(--color-cinza)', margin: '4px 6px' }} />
                                <MenuBtn icon={<XCircle size={14} strokeWidth={1.6} />} danger>Desativar usuário</MenuBtn>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* future roles note */}
              <div style={{ marginTop: 18, padding: '14px 18px', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-pill)', background: '#fff', border: '0.6px solid var(--color-cinza)', color: 'var(--color-bege)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HelpCircle size={13} strokeWidth={1.8} />
                </span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Próxima fase — papéis diferenciados.</strong> Os perfis{' '}
                  {['Recepção', 'Profissional', 'Gestão'].map(r => (
                    <span key={r} style={{ background: '#fff', border: '0.6px dashed var(--color-cinza)', color: 'var(--color-texto-medio)', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.4px', padding: '1px 8px', borderRadius: 'var(--radius-pill)', marginLeft: 4 }}>{r}</span>
                  ))}{' '}
                  vão controlar acesso a financeiro, edição de agenda e dados de outras profissionais. No MVP todo mundo é <em>Equipe</em>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ Panel: WhatsApp ══════════════════════════════════════════════ */}
        {tab === 'whatsapp' && (
          <div style={{ padding: '32px 32px 64px' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.15, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>WhatsApp</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-medio)', lineHeight: 1.55, marginTop: 8 }}>
                    O número da clínica conversa com as alunas via <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Evolution API</strong>. Aqui você acompanha a conexão e gera um novo QR quando o aparelho desconecta.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Btn>Testar envio</Btn>
                  <Btn>Logs da API</Btn>
                </div>
              </div>

              {/* grid: main card + QR */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20, alignItems: 'stretch' }}>

                {/* main */}
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(172, 192, 149, 0.30)', color: '#5F7948', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor">
                        <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.9-.4-1.7-1-2.4-1.7-.5-.5-1-1.1-1.4-1.8-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4 0-.1-.6-1.5-.9-2.1-.2-.5-.5-.4-.6-.4h-.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.1 2 3 4.8 4.2.4.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.1-.2-.3-.2zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.2 }}>Linha principal da clínica</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', marginTop: 4 }}>Conectada via Evolution API · sincronizada há 2 min</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(172, 192, 149, 0.20)', color: '#5F7948', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '5px 11px 5px 9px', borderRadius: 'var(--radius-pill)', flexShrink: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: 'var(--color-verde)', boxShadow: '0 0 0 4px rgba(172, 192, 149, 0.25)', flexShrink: 0 }} />
                      Conectado
                    </span>
                  </div>

                  {/* data grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, padding: '18px 0', borderTop: '0.6px solid var(--color-cinza)', borderBottom: '0.6px solid var(--color-cinza)' }}>
                    {[
                      { lbl: 'Número',           val: '+55 49 99183-1900', mono: false },
                      { lbl: 'Instância',         val: 'corporis-xre-01',    mono: true  },
                      { lbl: 'Aparelho pareado',  val: 'Samsung A54',        muted: '· iPhone Larissa (2º)', mono: false },
                      { lbl: 'Webhook',           val: 'corporis.app/wh/v2', mono: true  },
                      { lbl: 'Mensagens / 24h',   val: '312',                muted: '· 184 enviadas', mono: false },
                      { lbl: 'Última desconexão', val: '21/mai · 03:14',     mono: false },
                    ].map(item => (
                      <div key={item.lbl}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', marginBottom: 6 }}>{item.lbl}</div>
                        <div style={{ fontFamily: item.mono ? '"Ubuntu Mono", ui-monospace, monospace' : 'var(--font-body)', fontSize: item.mono ? 12.5 : 13.5, color: 'var(--color-texto-escuro)', fontFeatureSettings: '"tnum"', lineHeight: 1.35 }}>
                          {item.val}
                          {item.muted && <span style={{ color: 'var(--color-texto-medio)' }}> {item.muted}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.5, maxWidth: 380 }}>
                      Se a conexão cair, leads continuam chegando no Inbox — mas <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>sem resposta automática</strong> da Corá.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn><Settings size={13} strokeWidth={1.8} />Configurações avançadas</Btn>
                      <Btn primary><RefreshCw size={13} strokeWidth={1.8} />Reconectar</Btn>
                    </div>
                  </div>
                </div>

                {/* QR card */}
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>Reparear aparelho</div>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', padding: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <svg viewBox="0 0 29 29" width={184} height={184} style={{ display: 'block', borderRadius: 4 }} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
                      <rect width="29" height="29" fill="#FFFFFF"/>
                      <g fill="#3A3530">
                        <path d="M0 0h7v7h-7zM1 1v5h5v-5z M2 2h3v3h-3z"/>
                        <path d="M22 0h7v7h-7zM23 1v5h5v-5z M24 2h3v3h-3z"/>
                        <path d="M0 22h7v7h-7zM1 23v5h5v-5z M2 24h3v3h-3z"/>
                        <rect x="8" y="6" width="1" height="1"/><rect x="10" y="6" width="1" height="1"/><rect x="12" y="6" width="1" height="1"/><rect x="14" y="6" width="1" height="1"/><rect x="16" y="6" width="1" height="1"/><rect x="18" y="6" width="1" height="1"/><rect x="20" y="6" width="1" height="1"/>
                        <rect x="6" y="8" width="1" height="1"/><rect x="6" y="10" width="1" height="1"/><rect x="6" y="12" width="1" height="1"/><rect x="6" y="14" width="1" height="1"/><rect x="6" y="16" width="1" height="1"/><rect x="6" y="18" width="1" height="1"/><rect x="6" y="20" width="1" height="1"/>
                        <rect x="8" y="8" width="2" height="2"/><rect x="11" y="8" width="1" height="1"/><rect x="13" y="8" width="1" height="1"/><rect x="16" y="8" width="1" height="1"/><rect x="18" y="9" width="2" height="1"/>
                        <rect x="9" y="10" width="1" height="1"/><rect x="12" y="10" width="2" height="1"/><rect x="15" y="10" width="1" height="2"/><rect x="17" y="11" width="2" height="1"/><rect x="20" y="10" width="1" height="2"/>
                        <rect x="8" y="11" width="1" height="2"/><rect x="11" y="12" width="2" height="1"/><rect x="14" y="13" width="1" height="2"/><rect x="16" y="12" width="1" height="2"/><rect x="19" y="13" width="2" height="1"/>
                        <rect x="9" y="13" width="2" height="1"/><rect x="13" y="14" width="2" height="2"/><rect x="17" y="14" width="2" height="1"/><rect x="21" y="14" width="2" height="2"/>
                        <rect x="8" y="15" width="2" height="1"/><rect x="11" y="15" width="1" height="2"/><rect x="15" y="15" width="1" height="2"/><rect x="18" y="16" width="2" height="1"/>
                        <rect x="9" y="17" width="1" height="2"/><rect x="13" y="17" width="2" height="1"/><rect x="17" y="18" width="1" height="2"/><rect x="20" y="18" width="2" height="1"/>
                        <rect x="11" y="19" width="2" height="1"/><rect x="14" y="20" width="1" height="2"/><rect x="16" y="20" width="2" height="1"/><rect x="19" y="20" width="1" height="2"/>
                        <rect x="8" y="20" width="2" height="1"/><rect x="9" y="22" width="2" height="2"/><rect x="12" y="22" width="1" height="1"/><rect x="14" y="23" width="2" height="1"/>
                        <rect x="8" y="24" width="1" height="2"/><rect x="11" y="25" width="2" height="1"/><rect x="14" y="25" width="1" height="2"/>
                      </g>
                    </svg>
                    <div style={{ position: 'absolute', width: 36, height: 36, background: '#fff', borderRadius: 'var(--radius-sm)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(58, 53, 48, 0.10)' }} aria-hidden>
                      <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-pill)', background: 'var(--color-alaranjado)', position: 'relative', display: 'block' }}>
                        <span style={{ position: 'absolute', right: -4, top: -3, width: 9, height: 9, borderRadius: 'var(--radius-pill)', background: 'var(--color-bege)' }} />
                      </span>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', lineHeight: 1.5, maxWidth: 240 }}>
                    Abra o WhatsApp no aparelho da clínica → <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Aparelhos conectados</strong> → Conectar aparelho.
                  </p>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--color-texto-medio)', letterSpacing: '1.4px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6, fontFeatureSettings: '"tnum"' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-bege)' }} />
                    Expira em 02:47
                  </span>
                </div>
              </div>

              {/* offline alt */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Estado de referência — desconectado
                  <span style={{ flex: 1, height: '0.6px', background: 'var(--color-cinza)' }} />
                </div>
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--bg-2)', color: 'var(--color-texto-medio)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor">
                      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.9-.4-1.7-1-2.4-1.7-.5-.5-1-1.1-1.4-1.8-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4 0-.1-.6-1.5-.9-2.1-.2-.5-.5-.4-.6-.4h-.6c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.1 2 3 4.8 4.2.4.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.1-.2-.3-.2zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--color-texto-escuro)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      +55 49 99183-1900
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(192, 80, 74, 0.10)', color: 'var(--color-ui-error)', fontFamily: 'var(--font-body)', fontSize: 9.5, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 9px 3px 7px', borderRadius: 'var(--radius-pill)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-ui-error)', boxShadow: '0 0 0 3px rgba(192, 80, 74, 0.18)' }} />
                        Desconectado há 6 min
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)', marginTop: 4, lineHeight: 1.5 }}>
                      O aparelho saiu do ar. Mensagens que chegarem agora ficam na fila e são entregues quando reconectarmos. Sem resposta automática até lá.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn sm>Ver fila (3)</Btn>
                    <Btn sm primary><RefreshCw size={12} strokeWidth={1.8} />Reconectar agora</Btn>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18, padding: '0 4px', fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-verde)' }} />
                Conexão estável nos últimos 7 dias · 99,4% de uptime
              </div>
            </div>
          </div>
        )}

        {/* ══ Panel: Templates ═════════════════════════════════════════════ */}
        {tab === 'templates' && (
          <div style={{ padding: '32px 32px 64px' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.15, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>Templates de mensagem</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-medio)', lineHeight: 1.55, marginTop: 8 }}>
                    Mensagens prontas que o sistema dispara automaticamente. Use <code style={{ background: 'rgba(240, 131, 83, 0.14)', color: '#B85A2E', fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: 12, fontWeight: 500, padding: '1px 6px', borderRadius: 3 }}>{'{{nome}}'}</code> e <code style={{ background: 'rgba(240, 131, 83, 0.14)', color: '#B85A2E', fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: 12, fontWeight: 500, padding: '1px 6px', borderRadius: 3 }}>{'{{data}}'}</code> para personalizar.
                  </p>
                </div>
                <Btn primary><Plus size={12} strokeWidth={2.2} />Novo template</Btn>
              </div>

              {TPL_CATEGORIES.map(cat => (
                <div key={cat.id} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, color: cat.color }}>
                        {cat.icon}
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--color-texto-escuro)' }}>{cat.name}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>{cat.count}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"' }}>{cat.meta}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                    {cat.templates.map(tpl => (
                      <TplCard key={tpl.id} tpl={tpl} />
                    ))}
                    {cat.id === 'boas-vindas' && (
                      <TplAddBtn label={`Novo template em ${cat.name}`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Panel: Clínica ════════════════════════════════════════════════ */}
        {tab === 'clinica' && (
          <div style={{ padding: '32px 32px 64px' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.15, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>Dados da clínica</h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-medio)', lineHeight: 1.55, marginTop: 8 }}>
                    Identidade, endereço e funcionamento da <strong style={{ color: 'var(--color-texto-escuro)', fontWeight: 500 }}>Corporis Fisioterapia e Pilates</strong>. Esses dados alimentam respostas da Corá, lembretes, faturamento e comprovantes.
                  </p>
                </div>
                <Btn primary><Save size={13} strokeWidth={1.8} />Salvar alterações</Btn>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

                {/* logo card */}
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-cores.png" alt="Corporis logo" style={{ width: '70%', height: 'auto', display: 'block' }} />
                  </div>
                  <span style={{ fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: 11, color: 'var(--color-texto-medio)', letterSpacing: '0.2px' }}>corporis-logo-cores.svg · 184 KB</span>
                  <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
                    <Btn sm><Upload size={12} strokeWidth={1.8} />Trocar logo</Btn>
                    <Btn sm ghost>Variações</Btn>
                  </div>
                </div>

                {/* info fields */}
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22 }}>
                  {[
                    { lbl: 'Razão social',    val: 'Corporis Fisioterapia e Pilates LTDA', muted: 'CNPJ 47.612.358/0001-09 · CREFITO-10 / 21.345-F' },
                    { lbl: 'Nome comercial',  val: 'Corporis · Fisioterapia e Pilates' },
                    { lbl: 'Endereço',        val: 'Rua Coronel Santos Marinho, 347 — Sala 903', muted: 'Centro Médico Xanxerê · Centro · Xanxerê / SC · CEP 89820-000' },
                    { lbl: 'Telefone',        val: '+55 49 99183-1900', muted: 'WhatsApp da clínica · também recebe ligações' },
                    { lbl: 'E-mail',          val: 'contato@corporisxre.com.br' },
                  ].map((field) => (
                    <div key={field.lbl} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 16, padding: '16px 4px', borderBottom: '0.6px solid var(--color-cinza)', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>{field.lbl}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', lineHeight: 1.45 }}>
                        {field.val}
                        {field.muted && <span style={{ color: 'var(--color-texto-medio)', fontSize: 12.5, display: 'block', marginTop: 3 }}>{field.muted}</span>}
                      </span>
                      <EditInlineBtn />
                    </div>
                  ))}

                  {/* hours field */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 16, padding: '16px 4px', alignItems: 'start' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', paddingTop: 3 }}>Funcionamento</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 6, marginTop: 2 }}>
                      {CLINIC_HOURS.map(row => (
                        <>
                          <span key={row.day + 'd'} style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>{row.day}</span>
                          <span key={row.day + 'h'} style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: row.off ? 'var(--color-texto-medio)' : 'var(--color-texto-escuro)', fontStyle: row.off ? 'italic' : 'normal', fontFeatureSettings: '"tnum"' }}>{row.h}</span>
                        </>
                      ))}
                    </div>
                    <EditInlineBtn />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 18, padding: '0 4px', fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--color-verde)', flexShrink: 0 }} />
                Última atualização em 18/mai por Larissa · Os campos públicos aparecem nos lembretes e na assinatura da Corá.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── panel-level helpers ──────────────────────────────────────────────────────
function MenuBtn({ children, icon, danger }: { children: React.ReactNode; icon: React.ReactNode; danger?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ appearance: 'none', background: h ? (danger ? 'rgba(192, 80, 74, 0.06)' : 'var(--color-bege-claro)') : 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 13, color: danger ? 'var(--color-ui-error)' : 'var(--color-texto-escuro)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span style={{ color: danger ? 'var(--color-ui-error)' : h ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)', display: 'flex' }}>{icon}</span>
      {children}
    </button>
  );
}

function TplCard({ tpl }: { tpl: Template }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: '#fff', border: `0.6px solid ${h ? 'var(--color-tangerina)' : 'var(--color-cinza)'}`, borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', transition: 'all var(--duration-fast) var(--ease-soft)', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: h ? 'var(--shadow-sm)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>{tpl.name}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn title="Duplicar"><Copy size={13} strokeWidth={1.7} /></IconBtn>
          <IconBtn title="Editar"><Pencil size={13} strokeWidth={1.7} /></IconBtn>
        </div>
      </div>
      <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-escuro)', lineHeight: 1.55, borderLeft: '2px solid var(--color-bege-claro)' }}>
        {renderPreview(tpl.preview)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.4px', padding: '3px 9px 3px 7px', borderRadius: 'var(--radius-pill)', background: tpl.approved ? 'rgba(172, 192, 149, 0.22)' : 'var(--bg-2)', color: tpl.approved ? '#5F7948' : 'var(--color-texto-medio)' }}>
            {tpl.approved ? <Check size={10} strokeWidth={2.2} /> : <Clock size={10} strokeWidth={2} />}
            {tpl.approvedLabel}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{tpl.stats}</span>
      </div>
    </div>
  );
}

function TplAddBtn({ label }: { label: string }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ gridColumn: 'span 2', border: `0.6px ${h ? 'solid' : 'dashed'} ${h ? 'var(--color-tangerina)' : 'var(--color-bege)'}`, background: h ? 'var(--color-bege-claro)' : 'transparent', color: 'var(--color-alaranjado)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all var(--duration-fast) var(--ease-soft)' }}>
      <Plus size={13} strokeWidth={2} />{label}
    </button>
  );
}

function EditInlineBtn() {
  const [h, setH] = useState(false);
  return (
    <button type="button" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ appearance: 'none', background: h ? 'var(--color-bege-claro)' : 'transparent', border: 0, color: h ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)', fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap', transition: 'all var(--duration-fast) var(--ease-soft)' }}>
      Editar
    </button>
  );
}
