"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import {
  Bell,
  Bot,
  CalendarDays,
  CheckCheck,
  Clock3,
  FileText,
  Filter,
  MoreHorizontal,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
  Smile,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { ConversationRow, MessageRow } from "@/lib/queries/conversations";
import type { LeadStage } from "@/types/database";
import { toggleHandoff, markConversationRead, sendMessage } from "./actions";

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE, d 'de' MMM", { locale: ptBR });
}

function groupMessagesByDay(msgs: MessageRow[]) {
  const groups: { dayLabel: string; messages: MessageRow[] }[] = [];
  let lastDay = "";
  for (const msg of msgs) {
    const day = format(new Date(msg.created_at), "yyyy-MM-dd");
    if (day !== lastDay) {
      groups.push({ dayLabel: dayLabel(msg.created_at), messages: [] });
      lastDay = day;
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// ─── Tone palette for avatars ─────────────────────────────────────────────────

const AVATAR_TONES = [
  "bg-accent-soft text-[#6B5526]",
  "bg-[rgba(240,131,83,0.18)] text-[#B85A2E]",
  "bg-[rgba(172,192,149,0.30)] text-[#5F7948]",
  "bg-[rgba(210,176,110,0.30)] text-[#7A5E1F]",
  "bg-[rgba(122,110,104,0.18)] text-text-secondary",
];

function avatarTone(nome: string) {
  return AVATAR_TONES[nome.charCodeAt(0) % AVATAR_TONES.length];
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const STAGE_LABEL: Record<LeadStage, string> = {
  novo:               "Novo",
  qualificacao:       "Qualificação",
  avaliacao_agendada: "Agendada",
  no_show:            "No-show",
  negociacao:         "Negociação",
  convertido:         "Convertido",
  perdido:            "Perdido",
};

// ─── Mock messages (replaced in Fase 3 with real data) ───────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

function IconButton({ label, children, dot }: { label: string; children: ReactNode; dot?: boolean }) {
  return (
    <button type="button" aria-label={label} className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-border bg-card text-text-secondary transition-colors hover:bg-accent-soft hover:text-primary">
      {children}
      {dot ? <span className="absolute right-[9px] top-2 h-[7px] w-[7px] rounded-[var(--radius-pill)] border border-card bg-primary" /> : null}
    </button>
  );
}

function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-soft font-display text-sm leading-none text-text-primary", className)}>
      {initials}
    </span>
  );
}

function ModePill({ mode }: { mode: "ia" | "humano" }) {
  const humano = mode === "humano";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-[7px] py-0.5 text-[10px] font-medium tracking-[0.4px]", humano ? "bg-[rgba(240,131,83,0.12)] text-[#B85A2E]" : "bg-accent-soft text-[#6B5526]")}>
      <span className="h-[5px] w-[5px] rounded-[var(--radius-pill)] bg-current" />
      {humano ? "Humano" : "IA"}
    </span>
  );
}

function StagePill({ children }: { children: ReactNode }) {
  return (
    <span className="max-w-full truncate rounded-[var(--radius-xs)] border border-border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.9px] text-text-secondary">
      {children}
    </span>
  );
}

function HandoffControl({ compact = false, modo, onToggle }: { compact?: boolean; modo: "ia" | "humano"; onToggle: (m: "ia" | "humano") => void }) {
  const isHumano = modo === "humano";
  return (
    <div className={cn("flex items-center gap-3 border border-border bg-background", compact ? "w-full justify-between rounded-[var(--radius-lg)] px-3 py-2" : "rounded-[var(--radius-pill)] py-2 pl-3.5 pr-2.5")}>
      <div className={cn("leading-none", compact ? "flex items-center gap-2.5" : "flex flex-col items-end")}>
        <span className="text-[10px] font-medium uppercase tracking-[1.4px] text-text-secondary">Atendimento</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
          <span className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_0_3px_rgba(240,131,83,0.18)]", isHumano ? "bg-primary" : "bg-accent")} />
          {isHumano ? "Você está respondendo" : "Agente IA respondendo"}
        </span>
      </div>
      <div className="inline-flex shrink-0 rounded-[var(--radius-pill)] bg-muted p-[3px]">
        <button type="button" aria-pressed={!isHumano} onClick={() => onToggle("ia")} className={cn("inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-[7px] text-xs font-medium", !isHumano ? "bg-card text-primary shadow-[var(--shadow-sm)]" : "text-text-secondary")}>
          <Bot className="h-[13px] w-[13px]" strokeWidth={1.6} />IA
        </button>
        <button type="button" aria-pressed={isHumano} onClick={() => onToggle("humano")} className={cn("inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-[7px] text-xs font-medium", isHumano ? "bg-card text-primary shadow-[var(--shadow-sm)]" : "text-text-secondary")}>
          <UserRound className="h-[13px] w-[13px]" strokeWidth={1.6} />Humano
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxClient({ initialConversations }: { initialConversations: ConversationRow[] }) {
  const [isContactPanelOpen, setContactPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [convs, setConvs] = useState(initialConversations);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setConvs((prev) => prev.map((c) => c.id === id ? { ...c, nao_lida: false } : c));
    markConversationRead({ conversationId: id });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !selectedId || isSending) return;

    setIsSending(true);
    setMessageText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: MessageRow = {
      id: optimisticId,
      direcao: "saida",
      autor: "humano",
      conteudo: text,
      created_at: new Date().toISOString(),
      entregue_at: null,
      lida_at: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const result = await sendMessage({ conversationId: selectedId, text });
    setIsSending(false);

    if (result.success) {
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? result.message : m));
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  }, [messageText, selectedId, isSending]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear message text when conversation changes
  useEffect(() => {
    setMessageText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [selectedId]);

  // Load messages + Realtime subscription when conversation selected
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    const supabase = createClient();
    setLoadingMsgs(true);

    supabase.schema("crm")
      .from("messages")
      .select("id, direcao, autor, conteudo, created_at, entregue_at, lida_at")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => { setMessages((data as MessageRow[]) ?? []); setLoadingMsgs(false); });

    const channel = supabase
      .channel(`messages_${selectedId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "crm", table: "messages",
        filter: `conversation_id=eq.${selectedId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as MessageRow]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  // Realtime: update conversation list on changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("conversations_changes")
      .on("postgres_changes", {
        event: "*", schema: "crm", table: "conversations",
      }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setConvs((prev) => prev.map((c) =>
            c.id === (payload.new as { id: string }).id
              ? { ...c, ...(payload.new as Partial<ConversationRow>) }
              : c
          ));
        }
        if (payload.eventType === "INSERT") {
          const newId = (payload.new as { id: string }).id;
          supabase.schema("crm")
            .from("conversations")
            .select("id, modo, status, nao_lida, updated_at, leads!inner(id, nome, estagio)")
            .eq("id", newId)
            .single()
            .then(({ data: nc }) => {
              if (!nc) return;
              const lead = Array.isArray(nc.leads) ? nc.leads[0] : nc.leads;
              const full: ConversationRow = {
                id: nc.id,
                lead: { id: lead?.id ?? "", nome: lead?.nome ?? "", estagio: (lead?.estagio ?? "novo") as ConversationRow["lead"]["estagio"] },
                modo: nc.modo,
                status: nc.status,
                nao_lida: nc.nao_lida,
                last_message: null,
                updated_at: nc.updated_at,
              };
              setConvs((prev) => prev.some((c) => c.id === full.id) ? prev : [full, ...prev]);
            });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleToggleHandoff = async (conversationId: string, modo: "ia" | "humano") => {
    setConvs((prev) => prev.map((c) => c.id === conversationId ? { ...c, modo } : c));
    await toggleHandoff({ conversationId, modo });
  };

  const selectedConv = convs.find((c) => c.id === selectedId);
  const unreadTotal = convs.filter((c) => c.nao_lida).length;
  const abertas = convs.filter((c) => c.status === "aberta").length;

  return (
    <div className="grid h-dvh min-w-0 grid-rows-[64px_1fr] overflow-hidden bg-background">
      <header className="flex items-center justify-between border-b border-border px-8">
        <div className="flex items-baseline gap-3.5">
          <div className="font-display text-[28px] leading-none tracking-[-0.005em] text-text-primary">Inbox</div>
          <span className="text-[13px] text-text-secondary">
            <strong className="font-medium text-text-primary">{abertas}</strong>{" "}
            conversas em aberto ·{" "}
            <strong className="font-medium text-text-primary">{unreadTotal}</strong>{" "}
            aguardando você
          </span>
        </div>
        <div className="flex items-center gap-4">
          <IconButton label="Buscar"><Search className="h-4 w-4" strokeWidth={1.5} /></IconButton>
          <IconButton label="Notificações" dot={unreadTotal > 0}><Bell className="h-4 w-4" strokeWidth={1.5} /></IconButton>
          <Avatar initials="CF" className="h-8 w-8 text-[13px]" />
        </div>
      </header>

      <div className={cn("grid min-h-0 overflow-hidden", isContactPanelOpen ? "grid-cols-[320px_1fr_308px]" : "grid-cols-[320px_1fr]")}>
        {/* ── Conversation list ── */}
        <section className="grid min-h-0 grid-rows-[auto_auto_1fr] overflow-hidden border-r border-border bg-card">
          <div className="border-b border-border px-3 pb-2.5 pt-3">
            <label className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-text-secondary" strokeWidth={1.6} />
              <input className="h-8 w-full rounded-[var(--radius-md)] border border-border bg-background py-1.5 pl-7 pr-2.5 text-[11px] leading-none text-text-primary shadow-[var(--shadow-sm)] placeholder:text-text-secondary focus:border-primary focus:outline-none" placeholder="Buscar conversa" />
            </label>
          </div>

          <div className="crm-scrollbar flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
            {[
              ["Todas", String(convs.length), true],
              ["Não lidas", String(unreadTotal), false],
              ["IA",     String(convs.filter((c) => c.modo === "ia").length),     false],
              ["Humano", String(convs.filter((c) => c.modo === "humano").length), false],
            ].map(([label, count, active]) => (
              <button key={label as string} type="button" aria-pressed={Boolean(active)} className={cn("inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-[var(--radius-pill)] border border-border px-2 text-[8px] font-medium leading-none text-text-secondary transition-colors hover:border-primary-hover hover:bg-accent-soft hover:text-text-primary", active && "border-transparent bg-accent-soft text-text-primary")}>
                {label}
                <span className="text-[8px] font-normal leading-none text-text-secondary">{count}</span>
              </button>
            ))}
          </div>

          <div className="crm-scrollbar min-h-0 overflow-y-auto">
            {convs.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-text-secondary">
                Nenhuma conversa ainda.<br />
                <span className="text-xs">As conversas do WhatsApp aparecerão aqui.</span>
              </div>
            ) : (
              convs.map((conv) => {
                const initials = getInitials(conv.lead.nome);
                const tone = avatarTone(conv.lead.nome);
                const preview = conv.last_message?.conteudo ?? "Sem mensagens ainda";
                const timeLabel = formatDistanceToNow(new Date(conv.updated_at), { locale: ptBR, addSuffix: false });
                const isSelected = conv.id === selectedId;

                return (
                  <button key={conv.id} type="button" onClick={() => handleSelectConversation(conv.id)} className={cn("relative grid w-full grid-cols-[32px_minmax(0,1fr)_34px] gap-2.5 border-b border-border px-3.5 py-3 text-left transition-colors hover:bg-[#F7F1E5]", isSelected && "bg-[#F1E7D3]", conv.nao_lida && "font-medium")}>
                    {isSelected ? <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" /> : null}
                    <Avatar initials={initials} className={cn("h-8 w-8 text-xs", tone)} />
                    <span className="min-w-0">
                      <span className="block min-w-0">
                        <span className="block truncate text-[13px] font-medium leading-tight text-text-primary">{conv.lead.nome}</span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-snug text-text-secondary">{preview}</span>
                      <span className="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
                        <ModePill mode={conv.modo} />
                        <StagePill>{STAGE_LABEL[conv.lead.estagio]}</StagePill>
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1 pt-0.5">
                      <span className={cn("text-[10px] leading-none text-text-secondary", conv.nao_lida && "font-medium text-primary")}>{timeLabel}</span>
                      {conv.nao_lida ? (
                        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--radius-pill)] bg-primary px-1.5 text-[10px] font-medium text-[var(--color-fundo-claro)]">1</span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ── Message thread (mock until Fase 3) ── */}
        <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] overflow-hidden bg-background">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-border bg-card px-7 py-3.5">
            <button type="button" aria-controls="contact-panel" aria-expanded={isContactPanelOpen} onClick={() => setContactPanelOpen(true)} className="-m-2 grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3.5 rounded-[var(--radius-md)] p-2 text-left transition-colors hover:bg-accent-soft">
              <Avatar initials={selectedConv ? getInitials(selectedConv.lead.nome) : "—"} className="h-10 w-10 bg-accent-soft text-[#6B5526]" />
              <div className="grid min-w-0 gap-1">
                <span className="min-w-0 truncate font-display text-xl leading-tight text-text-primary">
                  {selectedConv?.lead.nome ?? "Selecione uma conversa"}
                </span>
                {selectedConv && (
                  <span className="w-fit rounded-[var(--radius-pill)] bg-[rgba(240,131,83,0.12)] px-2.5 py-1 text-[9px] font-medium uppercase leading-none tracking-[1.2px] text-[#B85A2E]">
                    {STAGE_LABEL[selectedConv.lead.estagio]}
                  </span>
                )}
              </div>
            </button>
            <div className="flex items-center gap-2.5">
              {!isContactPanelOpen && selectedConv ? (
                <HandoffControl modo={selectedConv.modo} onToggle={(m) => handleToggleHandoff(selectedConv.id, m)} />
              ) : null}
              <IconButton label="Mais opções"><MoreHorizontal className="h-4 w-4" strokeWidth={1.5} /></IconButton>
            </div>
            {isContactPanelOpen && selectedConv ? <div className="col-span-2"><HandoffControl compact modo={selectedConv.modo} onToggle={(m) => handleToggleHandoff(selectedConv.id, m)} /></div> : null}
          </header>

          <div className="flex items-center gap-2.5 border-b border-[rgba(210,176,110,0.4)] bg-[rgba(210,176,110,0.14)] px-7 py-2.5 text-xs text-[#7A5E1F]">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.6} />
            <span>Janela de resposta livre do WhatsApp expira em <strong className="font-medium text-[#5C481A]">—</strong> — após isso, somente templates aprovados.</span>
          </div>

          <div className="crm-scrollbar min-h-0 overflow-y-auto bg-[radial-gradient(900px_600px_at_20%_0%,rgba(234,215,172,0.18),transparent_65%)] px-7 py-6">
            <div className="mx-auto flex max-w-[760px] flex-col gap-3">
              {!selectedId || convs.length === 0 ? (
                <div className="self-center text-center text-[13px] text-text-secondary">
                  Selecione uma conversa para ver as mensagens.
                </div>
              ) : loadingMsgs ? (
                <div className="self-center text-[12px] text-text-secondary">Carregando mensagens…</div>
              ) : messages.length === 0 ? (
                <div className="self-center text-[13px] text-text-secondary">Nenhuma mensagem ainda.</div>
              ) : (
                groupMessagesByDay(messages).flatMap((group) => [
                  <div key={group.dayLabel} className="self-center rounded-[var(--radius-pill)] border border-border bg-card px-3 py-1 text-[10px] font-medium uppercase tracking-[1.8px] text-text-secondary shadow-[var(--shadow-sm)]">
                    {group.dayLabel}
                  </div>,
                  ...group.messages.map((msg) => {
                    const incoming = msg.direcao === "entrada";
                    const isSystem = msg.autor === "sistema";
                    const timeStr  = format(new Date(msg.created_at), "HH:mm");
                    const senderLabel = msg.autor === "ia" ? "Agente IA" : msg.autor === "humano" ? "Equipe" : null;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="my-1 inline-flex max-w-[60%] items-center gap-2 self-center rounded-[var(--radius-pill)] border border-border bg-card px-4 py-2 text-center text-xs leading-normal text-text-secondary shadow-[var(--shadow-sm)]">
                          <RefreshCcw className="h-3 w-3 text-primary" strokeWidth={1.6} />
                          {msg.conteudo}
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={cn("flex max-w-[78%] gap-2.5", incoming ? "self-start" : "self-end flex-row-reverse")}>
                        <Avatar initials={incoming ? getInitials(selectedConv?.lead.nome ?? "?") : (msg.autor === "ia" ? "IA" : "CF")} className={cn("mt-auto h-7 w-7 text-[11px]", incoming ? "bg-[rgba(122,110,104,0.14)] text-text-secondary" : "bg-accent-soft text-[#6B5526]")} />
                        <div className={cn("flex min-w-0 flex-col gap-1", !incoming && "items-end")}>
                          {!incoming && senderLabel ? (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[0.3px] text-text-secondary">
                              <span className="rounded-[var(--radius-xs)] bg-accent-soft px-1.5 py-0.5 text-[9px] uppercase tracking-[0.8px] text-[#6B5526]">{senderLabel}</span>
                            </div>
                          ) : null}
                          <div className={cn("rounded-[var(--radius-lg)] px-3.5 py-[11px] text-sm leading-relaxed text-text-primary shadow-[var(--shadow-sm)]", incoming ? "rounded-bl-[4px] border border-border bg-card" : "rounded-br-[4px] bg-accent-soft")}>
                            {msg.conteudo}
                          </div>
                          <div className="flex items-center gap-1.5 px-1 text-[10px] text-text-secondary">
                            {timeStr}
                            {!incoming ? <CheckCheck className="h-3 w-3 text-primary" strokeWidth={1.8} /> : null}
                          </div>
                        </div>
                      </div>
                    );
                  }),
                ])
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-border bg-card px-7 pb-[18px] pt-3.5">
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-end gap-2.5 rounded-[var(--radius-lg)] border border-border bg-background px-2 pb-2 pt-2 shadow-[var(--shadow-sm)] focus-within:border-primary">
              <button type="button" aria-label="Anexar arquivo" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary">
                <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={messageText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={!selectedId || isSending}
                className="max-h-[140px] min-h-[38px] resize-none bg-transparent px-1 py-[9px] text-sm leading-normal text-text-primary outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={selectedConv ? `Escreva uma mensagem para ${selectedConv.lead.nome.split(" ")[0]}… Enter para enviar` : "Selecione uma conversa"}
              />
              <button type="button" aria-label="Inserir emoji" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary">
                <Smile className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!messageText.trim() || !selectedId || isSending}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-pill)] bg-primary px-4 text-[13px] font-medium tracking-[0.3px] text-[var(--color-fundo-claro)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "Enviando…" : "Enviar"} <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Contact panel ── */}
        {isContactPanelOpen && selectedConv ? (
          <aside id="contact-panel" className="crm-scrollbar relative min-h-0 overflow-y-auto border-l border-border bg-card px-[22px] pb-7 pt-[22px]">
            <button type="button" aria-label="Fechar ficha do contato" onClick={() => setContactPanelOpen(false)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] text-text-secondary transition-colors hover:bg-accent-soft hover:text-text-primary">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <div className="flex flex-col items-center border-b border-border pb-[22px] text-center">
              <Avatar initials={getInitials(selectedConv.lead.nome)} className="h-12 w-12 bg-accent-soft text-lg text-[#6B5526]" />
              <div className="mt-3 font-display text-xl leading-tight text-text-primary">{selectedConv.lead.nome}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border py-[18px]">
              {[
                ["Estágio", STAGE_LABEL[selectedConv.lead.estagio]],
                ["Modo",    selectedConv.modo === "ia" ? "Agente IA" : "Humano"],
                ["Status",  selectedConv.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 text-[9px] font-medium uppercase tracking-[1.6px] text-text-secondary">{label}</div>
                  <div className="text-[13px] font-medium leading-snug text-text-primary">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 border-b border-border py-[18px]">
              <a href={`/leads/${selectedConv.lead.id}`} className="inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-[13px] font-medium text-text-primary no-underline transition-colors hover:border-primary-hover hover:bg-accent-soft">
                <FileText className="h-3.5 w-3.5 text-accent" strokeWidth={1.6} />
                Abrir ficha completa
              </a>
              <a href={`/funil`} className="inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-[13px] font-medium text-text-primary no-underline transition-colors hover:border-primary-hover hover:bg-accent-soft">
                <Filter className="h-3.5 w-3.5 text-accent" strokeWidth={1.6} />
                Mover no funil
              </a>
              <a href={`/agenda`} className="inline-flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-[13px] font-medium text-text-primary no-underline transition-colors hover:border-primary-hover hover:bg-accent-soft">
                <CalendarDays className="h-3.5 w-3.5 text-accent" strokeWidth={1.6} />
                Agendar avaliação
              </a>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
