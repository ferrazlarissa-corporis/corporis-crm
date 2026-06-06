'use client';

import { useRef, useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, FileText, Building2, Download, Plus, Search,
  User, XCircle, Copy,
  Check, Clock, RotateCcw, Save, Upload, Trash2, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';
import {
  CLINIC_LOGO_ACCEPT_ATTRIBUTE,
  CLINIC_LOGO_EXT_BY_MIME,
  CLINIC_LOGO_MAX_BYTES,
  DEFAULT_CLINIC_INFO,
  normalizeClinicHours,
  type ClinicHoursRow,
  type ClinicInfo,
} from '@/lib/clinic-config';
import {
  createTemplate, deleteTemplate, toggleUserActive, updateClinicInfo, uploadClinicLogo,
  fetchWhatsAppStatus, generateWhatsAppQR,
  type WhatsAppStatus,
} from '../actions';

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

type ClinicConfig = Partial<Omit<ClinicInfo, 'funcionamento'>> & {
  id: string;
  logo_url: string | null;
  logo_path: string | null;
  logo_mime_type: string | null;
  logo_updated_at: string | null;
  funcionamento?: unknown;
};

type ClinicFieldId = 'legal' | 'commercial' | 'address' | 'phone' | 'email' | 'hours';

type WaPhase = 'idle' | 'loading' | 'open' | 'close' | 'connecting' | 'qr' | 'qr_expired' | 'unknown';

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

function hydrateClinicInfo(config: ClinicConfig | null): ClinicInfo {
  return {
    ...DEFAULT_CLINIC_INFO,
    razao_social: config?.razao_social ?? DEFAULT_CLINIC_INFO.razao_social,
    documento: config?.documento ?? DEFAULT_CLINIC_INFO.documento,
    nome_comercial: config?.nome_comercial ?? DEFAULT_CLINIC_INFO.nome_comercial,
    endereco: config?.endereco ?? DEFAULT_CLINIC_INFO.endereco,
    endereco_complemento: config?.endereco_complemento ?? DEFAULT_CLINIC_INFO.endereco_complemento,
    telefone: config?.telefone ?? DEFAULT_CLINIC_INFO.telefone,
    telefone_observacao: config?.telefone_observacao ?? DEFAULT_CLINIC_INFO.telefone_observacao,
    email: config?.email ?? DEFAULT_CLINIC_INFO.email,
    funcionamento: normalizeClinicHours(config?.funcionamento),
  };
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

function EditInlineBtn({ children = 'Editar', onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ appearance: 'none', background: h ? 'var(--color-bege-claro)' : 'transparent', border: 0, color: h ? 'var(--color-alaranjado)' : 'var(--color-texto-medio)', fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap', transition: 'all var(--duration-fast) var(--ease-soft)' }}>
      {children}
    </button>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function SistemaClient({ currentUserId, initialProfiles, initialTemplates, initialClinicConfig }: {
  currentUserId: string | null;
  initialProfiles: Profile[];
  initialTemplates: DBTemplate[];
  initialClinicConfig: ClinicConfig | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<TabId>('usuarios');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [newTplCategoria, setNewTplCategoria] = useState<Categoria>('lembrete');
  const [newTplNome, setNewTplNome] = useState('');
  const [newTplConteudo, setNewTplConteudo] = useState('');
  const [newTplAprovado, setNewTplAprovado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialClinicConfig?.logo_url ?? '');
  const [logoError, setLogoError] = useState('');
  const [logoStatus, setLogoStatus] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(() => hydrateClinicInfo(initialClinicConfig));
  const [editingClinicField, setEditingClinicField] = useState<ClinicFieldId | null>(null);
  const [clinicSaving, setClinicSaving] = useState(false);
  const [clinicError, setClinicError] = useState('');
  const [clinicStatus, setClinicStatus] = useState('');

  // WhatsApp tab state
  const [waPhase, setWaPhase] = useState<WaPhase>('idle');
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [waQrBase64, setWaQrBase64] = useState('');
  const [waQrExpiresAt, setWaQrExpiresAt] = useState(0);
  const [waQrCountdown, setWaQrCountdown] = useState(0);
  const [waQrLoading, setWaQrLoading] = useState(false);
  const waTabLoadedRef = useRef(false);

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

  async function handleLogoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoError('');
    setLogoStatus('');

    if (file.size > CLINIC_LOGO_MAX_BYTES) {
      setLogoError('A logo deve ter até 2 MB.');
      event.target.value = '';
      return;
    }

    if (!CLINIC_LOGO_EXT_BY_MIME[file.type]) {
      setLogoError('Use PNG, JPG, WebP ou SVG.');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    try {
      const res = await uploadClinicLogo(formData);
      if (res.success) {
        setLogoUrl(res.logoUrl);
        setLogoStatus('Logo atualizada.');
        startTransition(() => router.refresh());
      } else {
        setLogoError(res.error);
      }
    } catch {
      setLogoError('Não foi possível subir a logo.');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  }

  function updateClinicField(key: keyof Omit<ClinicInfo, 'funcionamento'>, value: string) {
    setClinicInfo(prev => ({ ...prev, [key]: value }));
    setClinicError('');
    setClinicStatus('');
  }

  function updateClinicHour(index: number, patch: Partial<ClinicHoursRow>) {
    setClinicInfo(prev => ({
      ...prev,
      funcionamento: prev.funcionamento.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, ...patch };
        if (patch.off === true) return { ...next, h: 'Fechado' };
        if (patch.off === false && next.h === 'Fechado') return { ...next, h: '' };
        return next;
      }),
    }));
    setClinicError('');
    setClinicStatus('');
  }

  async function handleSaveClinicInfo() {
    setClinicSaving(true);
    setClinicError('');
    setClinicStatus('');

    const res = await updateClinicInfo(clinicInfo);

    setClinicSaving(false);
    if (res.success) {
      setEditingClinicField(null);
      setClinicStatus('Dados salvos.');
      startTransition(() => router.refresh());
    } else {
      setClinicError(res.error);
    }
  }

  const loadWaStatus = useCallback(async () => {
    setWaPhase('loading');
    const status = await fetchWhatsAppStatus();
    setWaStatus(status);
    if (!status.configured) { setWaPhase('unknown'); return; }
    setWaPhase(status.state === 'open' ? 'open' : status.state === 'connecting' ? 'connecting' : status.state === 'close' ? 'close' : 'unknown');
  }, []);

  // Load on first visit to WhatsApp tab
  useEffect(() => {
    if (tab === 'whatsapp' && !waTabLoadedRef.current) {
      waTabLoadedRef.current = true;
      loadWaStatus();
    }
  }, [tab, loadWaStatus]);

  // Poll while connecting or QR visible
  useEffect(() => {
    if (waPhase !== 'connecting' && waPhase !== 'qr') return;
    const id = setInterval(async () => {
      const status = await fetchWhatsAppStatus();
      setWaStatus(status);
      if (status.state === 'open') {
        setWaPhase('open');
        setWaQrBase64('');
      }
    }, 3000);
    return () => clearInterval(id);
  }, [waPhase]);

  // QR countdown timer
  useEffect(() => {
    if (waPhase !== 'qr' || !waQrExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((waQrExpiresAt - Date.now()) / 1000));
      setWaQrCountdown(left);
      if (left === 0) setWaPhase('qr_expired');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waPhase, waQrExpiresAt]);

  async function handleGenerateQR() {
    setWaQrLoading(true);
    const res = await generateWhatsAppQR();
    setWaQrLoading(false);
    if (!res.success) return;
    const base64 = res.base64.startsWith('data:') ? res.base64 : `data:image/png;base64,${res.base64}`;
    setWaQrBase64(base64);
    setWaQrExpiresAt(Date.now() + 60_000);
    setWaQrCountdown(60);
    setWaPhase('qr');
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

  const clinicInputStyle: React.CSSProperties = {
    border: '0.6px solid var(--color-cinza)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 10px',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--color-texto-escuro)',
    outline: 'none',
    width: '100%',
    background: '#fff',
  };

  const clinicRows: {
    id: Exclude<ClinicFieldId, 'hours'>;
    lbl: string;
    primary: keyof Omit<ClinicInfo, 'funcionamento'>;
    secondary?: keyof Omit<ClinicInfo, 'funcionamento'>;
    type?: 'email';
  }[] = [
    { id: 'legal', lbl: 'Razão social', primary: 'razao_social', secondary: 'documento' },
    { id: 'commercial', lbl: 'Nome comercial', primary: 'nome_comercial' },
    { id: 'address', lbl: 'Endereço', primary: 'endereco', secondary: 'endereco_complemento' },
    { id: 'phone', lbl: 'Telefone', primary: 'telefone', secondary: 'telefone_observacao' },
    { id: 'email', lbl: 'E-mail', primary: 'email', type: 'email' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateRows: '64px auto 1fr', height: '100dvh', overflow: 'hidden' }}>

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--bg-1)', borderBottom: '0.6px solid var(--color-cinza)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1, color: 'var(--color-texto-escuro)', letterSpacing: '-0.005em', margin: 0 }}>
            Configurações
          </h1>
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
                    Quem tem acesso ao Corporis CRM.
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
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                if (isYou) {
                                  router.push('/perfil');
                                } else {
                                  setOpenMenuId(isMenuOpen ? null : profile.id);
                                }
                              }}
                              style={{ display: 'inline-flex' }}>
                            <IconBtn title={isYou ? 'Abrir meu perfil' : 'Ações do usuário'}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                              </svg>
                            </IconBtn>
                            </div>
                            {!isYou && isMenuOpen && (
                              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 16, top: 50, background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', minWidth: 196, padding: 6, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--color-bege)', padding: '6px 12px 4px' }}>{profile.nome}</div>
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
                <Btn onClick={loadWaStatus} disabled={waPhase === 'loading'}>
                  <RefreshCw size={13} strokeWidth={1.8} style={{ opacity: waPhase === 'loading' ? 0.5 : 1 }} />
                  Atualizar status
                </Btn>
              </div>

              {/* Loading skeleton */}
              {waPhase === 'idle' || waPhase === 'loading' ? (
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'var(--bg-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 14, width: 160, background: 'var(--bg-2)', borderRadius: 4 }} />
                    <div style={{ height: 11, width: 100, background: 'var(--bg-2)', borderRadius: 4 }} />
                  </div>
                </div>
              ) : null}

              {/* Not configured */}
              {waPhase === 'unknown' && !waStatus?.configured ? (
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <WifiOff size={20} strokeWidth={1.5} style={{ color: 'var(--color-texto-medio)' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--color-texto-escuro)', marginBottom: 6 }}>Evolution API não configurada</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-medio)', lineHeight: 1.6 }}>
                        Defina as variáveis de ambiente <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>EVOLUTION_API_URL</code>, <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>EVOLUTION_API_KEY</code> e <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>EVOLUTION_INSTANCE</code> para ativar a integração.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Unknown / error */}
              {waPhase === 'unknown' && waStatus?.configured ? (
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'rgba(192, 80, 74, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <WifiOff size={20} strokeWidth={1.5} style={{ color: 'var(--color-ui-error)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--color-texto-escuro)', marginBottom: 6 }}>Não foi possível conectar à Evolution API</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-medio)', lineHeight: 1.6, marginBottom: 14 }}>
                        Verifique se a instância <code style={{ background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>{waStatus.instance}</code> está online e acessível.
                      </div>
                      <Btn onClick={loadWaStatus}><RefreshCw size={12} strokeWidth={1.8} />Tentar novamente</Btn>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Connected */}
              {waPhase === 'open' && waStatus ? (
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'rgba(172, 192, 149, 0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Wifi size={20} strokeWidth={1.5} style={{ color: '#5F7948' }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>Linha principal da clínica</div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.3px', padding: '3px 11px 3px 9px', borderRadius: 'var(--radius-pill)', background: 'rgba(172, 192, 149, 0.20)', color: '#5F7948' }}>
                          <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: 'var(--color-verde)', boxShadow: '0 0 0 3px rgba(172, 192, 149, 0.30)', flexShrink: 0 }} />
                          Conectado
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Btn onClick={handleGenerateQR} disabled={waQrLoading}>
                        <RefreshCw size={12} strokeWidth={1.8} />Reconectar
                      </Btn>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 0', borderTop: '0.6px solid var(--color-cinza)' }}>
                    {[
                      { lbl: 'Número', val: waStatus.number ? `+${waStatus.number.replace(/^\+/, '')}` : '—' },
                      { lbl: 'Instância', val: waStatus.instance ?? '—', mono: true },
                      { lbl: 'Webhook', val: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhook/whatsapp`, mono: true },
                    ].map(({ lbl, val, mono }) => (
                      <div key={lbl} style={{ padding: '16px 0 14px', paddingRight: 24 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', marginBottom: 6 }}>{lbl}</div>
                        <div style={{ fontFamily: mono ? '"Ubuntu Mono", ui-monospace, monospace' : 'var(--font-body)', fontSize: 13, color: 'var(--color-texto-escuro)', wordBreak: 'break-all' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Disconnected */}
              {waPhase === 'close' ? (
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'rgba(192, 80, 74, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <WifiOff size={20} strokeWidth={1.5} style={{ color: 'var(--color-ui-error)' }} />
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--color-texto-escuro)', lineHeight: 1.3 }}>
                          {waStatus?.number ? `+${waStatus.number.replace(/^\+/, '')}` : 'Linha principal'}
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.3px', padding: '3px 11px 3px 9px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-2)', color: 'var(--color-texto-medio)' }}>
                          <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: 'var(--color-cinza)', flexShrink: 0 }} />
                          Desconectado
                        </span>
                      </div>
                    </div>
                    <Btn primary onClick={handleGenerateQR} disabled={waQrLoading}>
                      <Wifi size={13} strokeWidth={1.8} />{waQrLoading ? 'Gerando QR…' : 'Reconectar agora'}
                    </Btn>
                  </div>
                </div>
              ) : null}

              {/* Connecting */}
              {waPhase === 'connecting' ? (
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'rgba(210, 176, 110, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RefreshCw size={20} strokeWidth={1.5} style={{ color: '#7A5E1F' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, color: 'var(--color-texto-escuro)', marginBottom: 4 }}>Conectando…</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>Verificando status a cada 3 segundos.</div>
                  </div>
                </div>
              ) : null}

              {/* QR Code */}
              {(waPhase === 'qr' || waPhase === 'qr_expired') && waQrBase64 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: 20, alignItems: 'start', marginTop: 0 }}>
                  <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--color-texto-escuro)', alignSelf: 'flex-start' }}>Parear aparelho</div>
                    <div style={{ position: 'relative', width: 220, height: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={waQrBase64} alt="QR Code WhatsApp" width={220} height={220} style={{ borderRadius: 'var(--radius-sm)', display: 'block', opacity: waPhase === 'qr_expired' ? 0.3 : 1, transition: 'opacity var(--duration-fast) var(--ease-soft)' }} />
                      {waPhase === 'qr_expired' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-texto-escuro)' }}>QR expirado</span>
                          <Btn sm primary onClick={handleGenerateQR} disabled={waQrLoading}><RefreshCw size={11} strokeWidth={2} />Gerar novo QR</Btn>
                        </div>
                      )}
                    </div>
                    {waPhase === 'qr' && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', fontFeatureSettings: '"tnum"' }}>
                        Expira em {String(Math.floor(waQrCountdown / 60)).padStart(2, '0')}:{String(waQrCountdown % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 24 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--color-texto-escuro)', marginBottom: 16 }}>Como parear</div>
                    {[
                      'Abra o WhatsApp no aparelho da clínica',
                      'Toque em Menu (⋮) → Aparelhos conectados',
                      'Toque em Conectar aparelho',
                      'Aponte a câmera para o QR ao lado',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-pill)', background: 'var(--color-bege-claro)', color: '#6B5526', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', lineHeight: 1.55 }}>{step}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', lineHeight: 1.5 }}>
                      Após escanear, aguarde a confirmação — a tela atualiza automaticamente.
                    </div>
                  </div>
                </div>
              ) : null}

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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <Btn primary onClick={handleSaveClinicInfo} disabled={clinicSaving}>
                    <Save size={13} strokeWidth={1.8} />{clinicSaving ? 'Salvando...' : 'Salvar alterações'}
                  </Btn>
                  {(clinicError || clinicStatus) && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: clinicError ? 'var(--color-ui-error)' : '#5F7948' }}>
                      {clinicError || clinicStatus}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: '100%', aspectRatio: '1 / 1', background: 'var(--bg-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {logoUrl ? (
                      <div
                        role="img"
                        aria-label="Logo da clínica"
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url("${logoUrl}")`,
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: 'contain',
                        }}
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--color-bege)', letterSpacing: '-0.02em' }}>Corporis</span>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={CLINIC_LOGO_ACCEPT_ATTRIBUTE}
                    onChange={handleLogoSelected}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'center' }}>
                    <Btn sm onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      <Upload size={12} strokeWidth={1.8} />{uploadingLogo ? 'Enviando...' : 'Trocar logo'}
                    </Btn>
                    <Btn sm ghost>Variações</Btn>
                  </div>
                  {(logoError || logoStatus) && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: logoError ? 'var(--color-ui-error)' : '#5F7948', lineHeight: 1.4, margin: 0, textAlign: 'center' }}>
                      {logoError || logoStatus}
                    </p>
                  )}
                </div>

                <div style={{ background: '#fff', border: '0.6px solid var(--color-cinza)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22 }}>
                  {clinicRows.map(field => {
                    const editing = editingClinicField === field.id;
                    return (
                    <div key={field.lbl} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 16, padding: '16px 4px', borderBottom: '0.6px solid var(--color-cinza)', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)' }}>{field.lbl}</span>
                      {editing ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            type={field.type ?? 'text'}
                            value={clinicInfo[field.primary]}
                            onChange={e => updateClinicField(field.primary, e.target.value)}
                            style={clinicInputStyle}
                          />
                          {field.secondary && (
                            <input
                              type="text"
                              value={clinicInfo[field.secondary]}
                              onChange={e => updateClinicField(field.secondary!, e.target.value)}
                              style={{ ...clinicInputStyle, fontSize: 12.5, color: 'var(--color-texto-medio)' }}
                            />
                          )}
                        </div>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--color-texto-escuro)', lineHeight: 1.45 }}>
                          {clinicInfo[field.primary]}
                          {field.secondary && <span style={{ color: 'var(--color-texto-medio)', fontSize: 12.5, display: 'block', marginTop: 3 }}>{clinicInfo[field.secondary]}</span>}
                        </span>
                      )}
                      <EditInlineBtn onClick={() => setEditingClinicField(editing ? null : field.id)}>{editing ? 'Concluir' : 'Editar'}</EditInlineBtn>
                    </div>
                    );
                  })}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 16, padding: '16px 4px', alignItems: 'start' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 500, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--color-bege)', paddingTop: 3 }}>Funcionamento</span>
                    <div style={{ display: 'grid', gridTemplateColumns: editingClinicField === 'hours' ? '90px minmax(0, 1fr) 92px' : '90px 1fr', rowGap: 6, columnGap: 10, marginTop: 2, alignItems: 'center' }}>
                      {clinicInfo.funcionamento.map((row, index) => (
                        editingClinicField === 'hours' ? (
                          <div key={row.day} style={{ display: 'contents' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>{row.day}</span>
                            <input
                              type="text"
                              value={row.h}
                              disabled={row.off}
                              onChange={e => updateClinicHour(index, { h: e.target.value })}
                              style={{ ...clinicInputStyle, padding: '6px 9px', fontSize: 12.5, opacity: row.off ? 0.6 : 1 }}
                            />
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-texto-medio)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={row.off}
                                onChange={e => updateClinicHour(index, { off: e.target.checked })}
                                style={{ width: 14, height: 14, accentColor: 'var(--color-alaranjado)' }}
                              />
                              Fechado
                            </label>
                          </div>
                        ) : (
                          <div key={row.day} style={{ display: 'contents' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--color-texto-medio)' }}>{row.day}</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: row.off ? 'var(--color-texto-medio)' : 'var(--color-texto-escuro)', fontStyle: row.off ? 'italic' : 'normal', fontFeatureSettings: '"tnum"' }}>{row.h}</span>
                          </div>
                        )
                      ))}
                    </div>
                    <EditInlineBtn onClick={() => setEditingClinicField(editingClinicField === 'hours' ? null : 'hours')}>
                      {editingClinicField === 'hours' ? 'Concluir' : 'Editar'}
                    </EditInlineBtn>
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
