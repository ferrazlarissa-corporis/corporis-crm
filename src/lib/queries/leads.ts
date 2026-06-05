import { createClient } from "@/lib/supabase/server";
import type { LeadStage, LeadInterest, LeadOrigin } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type FunilLead = {
  id: string;
  nome: string;
  estagio: LeadStage;
  interesse: LeadInterest;
  origem: LeadOrigin;
  score_qualificacao: number;
  daysIn: number;
  stale: boolean;
  lastWhen: string;
  responsavel: { id: string; nome: string } | null;
};

export type LeadDetail = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  estagio: LeadStage;
  origem: LeadOrigin;
  interesse: LeadInterest;
  score_qualificacao: number | null;
  motivo_perda: string | null;
  ultima_interacao_at: string | null;
  created_at: string;
  responsavel: { id: string; nome: string } | null;
};

export async function getLeadsForFunil(): Promise<FunilLead[]> {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db
    .from("leads")
    .select("id, nome, estagio, interesse, origem, score_qualificacao, created_at, ultima_interacao_at, responsavel_id, profiles:responsavel_id(id, nome)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const now = new Date();
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  return data.map((row) => {
    const created = new Date(row.created_at);
    const daysIn = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const interacaoAt = row.ultima_interacao_at ? new Date(row.ultima_interacao_at) : created;
    const stale = now.getTime() - interacaoAt.getTime() > threeDays;
    const lastWhen = formatDistanceToNow(interacaoAt, { locale: ptBR, addSuffix: true });

    const responsavel = Array.isArray(row.profiles) ? row.profiles[0] ?? null : (row.profiles ?? null);

    return {
      id: row.id,
      nome: row.nome,
      estagio: row.estagio,
      interesse: row.interesse,
      origem: row.origem,
      score_qualificacao: row.score_qualificacao ?? 0,
      daysIn,
      stale,
      lastWhen,
      responsavel: responsavel ? { id: responsavel.id, nome: responsavel.nome } : null,
    };
  });
}

export async function getLeadById(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient();
  const db = supabase.schema("crm");

  const { data, error } = await db
    .from("leads")
    .select("*, profiles:responsavel_id(id, nome)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const responsavel = Array.isArray(data.profiles) ? data.profiles[0] ?? null : (data.profiles ?? null);

  return {
    id: data.id,
    nome: data.nome,
    telefone: data.telefone,
    email: data.email,
    estagio: data.estagio,
    origem: data.origem,
    interesse: data.interesse,
    score_qualificacao: data.score_qualificacao,
    motivo_perda: data.motivo_perda,
    ultima_interacao_at: data.ultima_interacao_at,
    created_at: data.created_at,
    responsavel: responsavel ? { id: responsavel.id, nome: responsavel.nome } : null,
  };
}
