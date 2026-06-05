'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, FileText, Building2, Download, Plus, Search,
  User, Pencil, Mail, Lock, XCircle, Copy,
  Check, Clock, RotateCcw, HelpCircle, Save, Upload, Trash2,
} from 'lucide-react';
import { createTemplate, deleteTemplate, toggleUserActive } from '../actions';

// ─── types ────────────────────────────────────────────────────────────────────
type TabId = 'usuarios' | 'whatsapp' | 'templates' | 'clinica';

type Profile = {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
};

type DBTemplate = {
  id: string;
  nome: string;
  categoria: 'lembrete' | 'confirmacao' | 'reativacao' | 'boas_vindas';
  conteudo: string;
  aprovado_whatsapp: boolean;
  whatsapp_template_name: string | null;
};

type Categoria = DBTemplate['categoria'];

// ─── constants ────────────────────────────────────────────────────────────────
const TONE_STYLE: Record<1|2|3|4|5, { bg: string; color: string }> = {
  1: { bg: '#EAD7AC',                      color: '#6B5526' },
  2: { bg: 'rgba(240, 131, 83, 0.20)',     color: '#B85A2E' },
  3: { bg: 'rgba(172, 192, 149, 0.30)',    color: '#5F7948' },
  4: { bg: 'rgba(210, 176, 110, 0.30)',    color: '#7A5E1F' },
  5: { bg: 'var(--bg-2)',                  color: 'var(--color-texto-medio)' },
};

const CATEGORIA_META: Record<Categoria, { name: string; color: string; bg: string; meta: string; icon: React.ReactNode }> = {
  lembrete:    { name: 'Lembrete',    color: '#7A5E1F', bg: 'rgba(210, 176, 110, 0.20)', meta: 'Envio automático · 24h e 2h antes da sessão',       icon: <Clock size={14} strokeWidth={1.6} /> },
  confirmacao: { name: 'Confirmação', color: '#5F7948', bg: 'rgba(172, 192, 149, 0.22)', meta: 'Resposta automática · novos agendamentos',          icon: <Check size={14} strokeWidth={2.2} /> },
  reativacao:  { name: 'Reativação',  color: '#B85A2E', bg: 'rgba(240, 131, 83, 0.16)', meta: 'Disparo manual · alunas inativas há 30+ dias',       icon: <RotateCcw size={14} strokeWidth={1.6} /> },
  boas_vindas: { name: 'Boas-vindas', color: '#6B5526', bg: 'var(--color-bege-claro)',   meta: 'Resposta automática da Corá · primeiro contato',    icon: <MessageSquare size={14} strokeWidth={1.6} /> },
};

const CATEGORIAS: Categoria[] = ['lembrete', 'confirmacao', 'reativacao', 'boas_vindas'];

const ROLE_LABEL: Record<string, string> = {
  staff: 'Equipe', recepcao: 'Recepção', profissional: 'Profissional', gestao: 'Gestão',
};

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
function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getTone(idx: number): 1|2|3|4|5 {
  return ((idx % 5) + 1) as 1|2|3|4|5;
}

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
function Btn({ children, primary, ghost, sm, onClick, disabled }: { children: React.ReactNode; primary?: boolean; ghost?: boolean; sm?: boolean; onClick?: () => void; disabled?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        appearance: 'none',
        border: primary ? `0.6px solid ${h ? 'var(--color-tangerina)' : 'var(--color-alaranjado)'}` : ghost ? '0.6px solid transparent' : '0.6px solid var(--color-cinza)',
        background: primary ? (h ? 'var(--color-tangerina)' : 'var(--color-alaranjado)') : ghost ? (h ? 'var(--bg-2)' : 'transparent') : (h ? 'var(--color-bege-claro)' : '#fff'),
        color: primary ? '#fff' : ghost ? (h ? 'var(--color-texto-escuro)' : 'var(--color-texto-medio)') : 'var(--color-texto-escuro)',
        borderRadius: 'var(--radius-pill)',
        padding: sm ? '6px 12px' : '9px 16px',
        fontFamily: 'var(--font-body)', fontSize: sm ? 12 : 13, fontWeight: 500, letterSpacing: '0.2px',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 7,
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

function MenuBtn({ children, icon, danger, onClick }: { children: React.ReactNode; icon: React.ReactNode; danger?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ appearance: 'none', background: h ? (danger ? 'rgba(192, 80, 74, 0.06)' : 'var(--color-bege-claro)') : 'transparent', border: 0, textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 13, color: danger ? 'var(--color-ui-error)' : 'var(--color-texto-escuro)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span style={{ color: danger ? 'var(--color-ui-error)' : h ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)', display: 'flex' }}>{icon}</span>
      {children}
    </button>
  );
}

function TplCard({ tpl, onDelete }: { tpl: DBTemplate; onDelete: () => void }) {
  const [h, setH] = useState(false);
  const approvedLabel = tpl.aprovado_whatsapp ? (tpl.whatsapp_template_name ?? 'Aprovado no WhatsApp') : 'Não aprovado';
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: '#fff', border: `0.6px solid ${h ? 'var(--color-tangerina)' : 'var(--color-cinza)'}`, borderRadius: 'var(--radius-md)', padding: '16px 18px 14px', transition: 'all var(--duration-fast) var(--ease-soft)', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: h ? 'var(--shadow-sm)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>{tpl.nome}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <IconBtn title="Duplicar"><Copy size={13} strokeWidth={1.7} /></IconBtn>
          <IconBtn title="Excluir" onClick={onDelete}><Trash2 size={13} strokeWidth={1.7} /></IconBtn>
        </div>
      </div>
      <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-escuro)', lineHeight: 1.55, borderLeft: '2px solid var(--color-bege-claro)' }}>
        {renderPreview(tpl.conteudo)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.4px', padding: '3px 9px 3px 7px', borderRadius: 'var(--radius-pill)', background: tpl.aprovado_whatsapp ? 'rgba(172, 192, 149, 0.22)' : 'var(--bg-2)', color: tpl.aprovado_whatsapp ? '#5F7948' : 'var(--color-texto-medio)' }}>
          {tpl.aprovado_whatsapp ? <Check size={10} strokeWidth={2.2} /> : <Clock size={10} strokeWidth={2} />}
          {approvedLabel}
        </span>
      </div>
    </div>
  );
}

function TplAddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ border: `0.6px ${h ? 'solid' : 'dashed'} ${h ? 'var(--color-tangerina)' : 'var(--color-bege)'}`, background: h ? 'var(--color-bege-claro)' : 'transparent', color: 'var(--color-alaranjado)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all var(--duration-fast) var(--ease-soft)' }}>
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

// ─── main ─────────────────────────────────────────────────────────────────────
export default function SistemaClient({ currentUserId, initialProfiles, initialTemplates }: {
  currentUserId: string | null;
  initialProfiles: Profile[];
  initialTemplates: DBTemplate[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabId>('usuarios');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [newTplCategoria, setNewTplCategoria] = useState<Categoria>('lembrete');
  const [newTplNome, setNewTplNome] = useState('');
  const [newTplConteudo, setNewTplConteudo] = useState('');
  const [newTplAprovado, setNewTplAprovado] = useState(false);
  const [saving, setSaving] = useState(false);

  const grouped = CATEGORIAS.reduce((acc, cat) => {
    acc[cat] = initialTemplates.filter(t => t.categoria === cat);
    return acc;
  }, {} as Record<Categoria, DBTemplate[]>);

  const filteredProfiles = initialProfiles.filter(p =>
    p.nome.toLowerCase().includes(searchQ.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  async function handleToggleUser(userId: string, currentActive: boolean) {
    const res = await toggleUserActive(userId, !currentActive);
    if (res.success) startTransition(() => router.refresh());
  }

  async function handleCreateTemplate() {
    if (!newTplNome.trim() || !newTplConteudo.trim()) return;
    setSaving(true);
    const res = await createTemplate({
      nome: newTplNome,
      categoria: newTplCategoria,
      conteudo: newTplConteudo,
      aprovado_whatsapp: newTplAprovado,
    });
    setSaving(false);
    if (res.success) {
      setShowNewTpl(false);
      setNewTplNome(''); setNewTplConteudo(''); setNewTplAprovado(false);
      startTransition(() => router.refresh());
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm('Excluir este template? Ação irreversível.')) return;
    const res = await deleteTemplate(id);
    if (res.success) startTransition(() => router.refresh());
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500,
    letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)',
    padding: '14px 20px', background: 'var(--bg-1)', borderBottom: '0.6px solid var(--color-cinza)',
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'usuarios',  label: 'Usuários',  icon: <Users size={14} strokeWidth={1.6} />,       count: initialProfiles.length },
    { id: 'whatsapp',  label: 'WhatsApp',  icon: <MessageSquare size={14} strokeWidth={1.6} /> },
    { id: 'templates', label: 'Templates', icon: <FileText size={14} strokeWidth={1.6} />,     count: initialTemplates.length },
    { id: 'clinica',   label: 'Clínica',   icon: <Building2 size={14} strokeWidth={1.6} /> },
  ];

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
              {t.icon}{t.label}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <label style={{ flex: 1, maxWidth: 320, position: 'relative', display: 'block' }}>
                  <Search size={14} strokeWidth={1.7} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-texto-medio)', pointerEvents: 'none' }} />
                  <input
                    type="text" placeholder="Buscar por nome ou e-mail…" value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    style={{ width: '100%', background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-pill)', padding: '8px 14px 8px 36px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-escuro)', outline: 'none' }}
                  />
                </label>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"' }}>
                  {filteredProfiles.length} usuários · {filteredProfiles.filter(p => p.ativo).length} ativos
                </span>
              </div>

              <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', color: 'var(--color-texto-escuro)' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nome</th>
                      <th style={thStyle}>E-mail</th>
                      <th style={thStyle}>Papel</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, width: 56 }} aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-medio)' }}>
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    ) : filteredProfiles.map((profile, i) => {
                      const tone = getTone(i);
                      const ts = TONE_STYLE[tone];
                      const isLast = i === filteredProfiles.length - 1;
                      const isMenuOpen = openMenuId === profile.id;
                      const isYou = profile.id === currentUserId;
                      const status: 'on' | 'off' = profile.ativo ? 'on' : 'off';
                      return (
                        <tr key={profile.id}
                          style={{ background: isMenuOpen ? '#F7F1E5' : undefined, transition: 'background var(--duration-fast) var(--ease-soft)', position: 'relative' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F7F1E5'; }}
                          onMouseLeave={e => { if (!isMenuOpen) (e.currentTarget as HTMLElement).style.background = ''; }}>
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-pill)', background: ts.bg, color: ts.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, flexShrink: 0 }}>
                                {getInitials(profile.nome)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 13.5 }}>
                                  {profile.nome}
                                  {isYou && <span style={{ background: 'var(--color-bege-claro)', color: '#6B5526', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 'var(--radius-pill)', marginLeft: 6 }}>você</span>}
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--color-texto-medio)', lineHeight: 1.3, marginTop: 2 }}>
                                  {ROLE_LABEL[profile.role] ?? profile.role}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>
                            {profile.email}
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.3px', background: 'var(--bg-2)', color: 'var(--color-texto-escuro)', borderRadius: 'var(--radius-pill)', padding: '3px 10px 3px 8px' }}>
                              <User size={12} strokeWidth={1.8} style={{ color: 'var(--color-bege)' }} />
                              {ROLE_LABEL[profile.role] ?? profile.role}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle' }}>
                            <StatusPill status={status} />
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: isLast ? 0 : '0.6px solid var(--color-cinza)', verticalAlign: 'middle', textAlign: 'right', position: 'relative' }}>
                            <div onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : profile.id); }} style={{ display: 'inline-flex' }}>
                            <IconBtn>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                              </svg>
                            </IconBtn>
                            </div>
                            {isMenuOpen && (
                              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 16, top: 50, background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', minWidth: 196, padding: 6, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', padding: '6px 12px 4px' }}>{profile.nome}</div>
                                <MenuBtn icon={<Pencil size={14} strokeWidth={1.6} />}>Editar dados</MenuBtn>
                                <MenuBtn icon={<Mail size={14} strokeWidth={1.6} />}>Reenviar convite</MenuBtn>
                                <MenuBtn icon={<Lock size={14} strokeWidth={1.6} />}>Redefinir senha</MenuBtn>
                                <div style={{ height: '0.6px', background: 'var(--color-cinza)', margin: '4px 6px' }} />
                                <MenuBtn icon={<XCircle size={14} strokeWidth={1.6} />} danger
                                  onClick={() => { setOpenMenuId(null); handleToggleUser(profile.id, profile.ativo); }}>
                                  {profile.ativo ? 'Desativar usuário' : 'Reativar usuário'}
                                </MenuBtn>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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

              <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '28px', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-texto-medio)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                  Configure a Evolution API nas variáveis de ambiente para ver o status da conexão aqui.
                </div>
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
                    Mensagens prontas que o sistema dispara automaticamente. Use{' '}
                    <code style={{ background: 'rgba(240, 131, 83, 0.14)', color: '#B85A2E', fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: 12, fontWeight: 500, padding: '1px 6px', borderRadius: 3 }}>{'{{'+'nome}}'}</code>{' '}e{' '}
                    <code style={{ background: 'rgba(240, 131, 83, 0.14)', color: '#B85A2E', fontFamily: '"Ubuntu Mono", ui-monospace, monospace', fontSize: 12, fontWeight: 500, padding: '1px 6px', borderRadius: 3 }}>{'{{'+'data}}'}</code>{' '}para personalizar.
                  </p>
                </div>
                <Btn primary onClick={() => setShowNewTpl(true)}><Plus size={12} strokeWidth={2.2} />Novo template</Btn>
              </div>

              {CATEGORIAS.map(catId => {
                const meta = CATEGORIA_META[catId];
                const catTemplates = grouped[catId];
                return (
                  <div key={catId} style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.bg, color: meta.color }}>
                          {meta.icon}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--color-texto-escuro)' }}>{meta.name}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>{catTemplates.length}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"' }}>{meta.meta}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                      {catTemplates.map(tpl => (
                        <TplCard key={tpl.id} tpl={tpl} onDelete={() => handleDeleteTemplate(tpl.id)} />
                      ))}
                      <TplAddBtn
                        label={`Novo template em ${meta.name}`}
                        onClick={() => { setNewTplCategoria(catId); setShowNewTpl(true); }}
                      />
                    </div>
                  </div>
                );
              })}
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
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--color-bege)', letterSpacing: '-0.02em' }}>Corporis</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
                    <Btn sm><Upload size={12} strokeWidth={1.8} />Trocar logo</Btn>
                    <Btn sm ghost>Variações</Btn>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22 }}>
                  {[
                    { lbl: 'Razão social',   val: 'Corporis Fisioterapia e Pilates LTDA', muted: 'CNPJ 47.612.358/0001-09 · CREFITO-10 / 21.345-F' },
                    { lbl: 'Nome comercial', val: 'Corporis · Fisioterapia e Pilates' },
                    { lbl: 'Endereço',       val: 'Rua Coronel Santos Marinho, 347 — Sala 903', muted: 'Centro Médico Xanxerê · Centro · Xanxerê / SC · CEP 89820-000' },
                    { lbl: 'Telefone',       val: '+55 49 99183-1900', muted: 'WhatsApp da clínica · também recebe ligações' },
                    { lbl: 'E-mail',         val: 'contato@corporisxre.com.br' },
                  ].map(field => (
                    <div key={field.lbl} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 16, padding: '16px 4px', borderBottom: '0.6px solid var(--color-cinza)', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>{field.lbl}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', lineHeight: 1.45 }}>
                        {field.val}
                        {field.muted && <span style={{ color: 'var(--color-texto-medio)', fontSize: 12.5, display: 'block', marginTop: 3 }}>{field.muted}</span>}
                      </span>
                      <EditInlineBtn />
                    </div>
                  ))}
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
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Novo template ─────────────────────────────────────────── */}
      {showNewTpl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(42, 31, 26, 0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowNewTpl(false)}>
          <div
            style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 18 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>
              Novo template
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>Nome</label>
              <input
                type="text" value={newTplNome} onChange={e => setNewTplNome(e.target.value)}
                placeholder="Ex: Lembrete — véspera"
                style={{ border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', outline: 'none', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>Categoria</label>
              <select
                value={newTplCategoria} onChange={e => setNewTplCategoria(e.target.value as Categoria)}
                style={{ border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', outline: 'none', background: '#fff', width: '100%' }}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_META[c].name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>
                Conteúdo <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--color-texto-medio)' }}>— use {'{{nome}}'}, {'{{data}}'}, {'{{horario}}'}</span>
              </label>
              <textarea
                value={newTplConteudo} onChange={e => setNewTplConteudo(e.target.value)}
                rows={4} placeholder="Oi, {{nome}}! Sua avaliação está confirmada para {{data}} às {{horario}}."
                style={{ border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', outline: 'none', resize: 'vertical', width: '100%', lineHeight: 1.55 }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)' }}>
              <input
                type="checkbox" checked={newTplAprovado} onChange={e => setNewTplAprovado(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-alaranjado)' }}
              />
              Aprovado no WhatsApp Business
            </label>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <Btn onClick={() => setShowNewTpl(false)}>Cancelar</Btn>
              <Btn primary onClick={handleCreateTemplate} disabled={saving || !newTplNome.trim() || !newTplConteudo.trim()}>
                {saving ? 'Salvando…' : 'Criar template'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
