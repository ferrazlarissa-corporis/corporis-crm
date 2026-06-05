import { createClient } from "@/lib/supabase/server";
import type { ConversationMode, ConversationStatus, LeadStage, MessageAuthor } from "@/types/database";

export type ConversationRow = {
  id: string;
  lead: { id: string; nome: string; estagio: LeadStage };
  modo: ConversationMode;
  status: ConversationStatus;
  nao_lida: boolean;
  last_message: { conteudo: string; created_at: string; autor: MessageAuthor } | null;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  direcao: "entrada" | "saida";
  autor: MessageAuthor;
  conteudo: string;
  created_at: string;
  entregue_at: string | null;
  lida_at: string | null;
};

export async function getConversations(): Promise<ConversationRow[]> {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data: convs, error } = await db
    .from("conversations")
    .select("id, modo, status, nao_lida, updated_at, leads!inner(id, nome, estagio)")
    .order("updated_at", { ascending: false });

  if (error || !convs) return [];

  // Fetch last message per conversation
  const ids = convs.map((c) => c.id);
  const { data: msgs } = await db
    .from("messages")
    .select("conversation_id, conteudo, created_at, autor")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false });

  const lastMsgMap = new Map<string, typeof msgs extends (infer T)[] | null ? T : never>();
  for (const msg of msgs ?? []) {
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, msg);
    }
  }

  return convs.map((c) => {
    const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
    const lastMsg = lastMsgMap.get(c.id);
    return {
      id: c.id,
      lead: { id: lead?.id ?? "", nome: lead?.nome ?? "", estagio: lead?.estagio ?? "novo" },
      modo: c.modo,
      status: c.status,
      nao_lida: c.nao_lida,
      last_message: lastMsg ? { conteudo: lastMsg.conteudo, created_at: lastMsg.created_at, autor: lastMsg.autor } : null,
      updated_at: c.updated_at,
    };
  });
}

export async function getConversationWithMessages(conversationId: string) {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const [{ data: conv }, { data: msgs }] = await Promise.all([
    db.from("conversations")
      .select("id, modo, status, nao_lida, leads!inner(id, nome, estagio, telefone)")
      .eq("id", conversationId)
      .single(),
    db.from("messages")
      .select("id, direcao, autor, conteudo, created_at, entregue_at, lida_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ]);

  if (!conv) return null;

  const lead = Array.isArray(conv.leads) ? conv.leads[0] : conv.leads;

  return {
    id: conv.id,
    modo: conv.modo,
    status: conv.status,
    nao_lida: conv.nao_lida,
    lead: lead ? { id: lead.id, nome: lead.nome, estagio: lead.estagio, telefone: (lead as { telefone?: string }).telefone ?? "" } : null,
    messages: (msgs ?? []) as MessageRow[],
  };
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.schema("crm")
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("nao_lida", true);
  return count ?? 0;
}
