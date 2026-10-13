"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveStaff } from "@/lib/auth/staff";
import type { ActiveStaff } from "@/lib/auth/staff";
import { settleIncome } from "@/lib/finance/post-income";
import { gerarCorpoContrato } from "@/lib/contrato/gerar";
import type { ContratoStatus, Database } from "@/types/database";

export type FichaResult = { success: true; id?: string } | { success: false; error: string };

const uuid = z.string().uuid();

/** Registra acesso ao dado clínico (LGPD/auditoria). Best-effort. */
async function logAcesso(
  auth: Extract<ActiveStaff, { success: true }>,
  pessoaId: string,
  tabela: string,
  acao: "select" | "insert" | "update",
) {
  await auth.supabase.schema("clinico").from("acesso_log").insert({
    pessoa_id: pessoaId, tabela, acao, ator_id: auth.profile.id,
  });
}

// ─── Financeiro ─────────────────────────────────────────────────────────────────

export async function marcarLancamentoRecebido(id: string, pessoaId: string): Promise<FichaResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const recebidoAt = new Date().toISOString();
  const { error } = await auth.supabase.schema("financeiro").from("lancamento")
    .update({ status: "recebido", recebido_at: recebidoAt }).eq("id", id);
  if (error) return { success: false, error: error.message };

  // Ponte Finance: liquida a tx correspondente (best-effort, não bloqueia a baixa).
  try { await settleIncome(id, recebidoAt); } catch { /* no-op se ponte off */ }

  revalidatePath(`/clientes/${pessoaId}`);
  return { success: true, id };
}

export async function pausarMatricula(id: string, pessoaId: string): Promise<FichaResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const hoje = new Date().toISOString().slice(0, 10);
  const { error } = await auth.supabase.schema("vendas").from("matricula")
    .update({ status: "pausada", pausada_em: hoje }).eq("id", id).eq("status", "ativa");
  if (error) return { success: false, error: error.message };

  // Agendamentos futuros saem da agenda (a agenda oculta status "cancelado").
  const { error: agendaError } = await auth.supabase.schema("crm").from("appointments")
    .update({ status: "cancelado" })
    .eq("matricula_id", id)
    .gte("inicio", new Date().toISOString())
    .in("status", ["agendado", "confirmado"]);
  if (agendaError) return { success: false, error: agendaError.message };
  revalidatePath("/agenda");

  revalidatePath(`/clientes/${pessoaId}`);
  revalidatePath("/clientes");
  return { success: true, id };
}

export async function retomarMatricula(id: string, pessoaId: string): Promise<FichaResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: m, error: readError } = await auth.supabase.schema("vendas").from("matricula")
    .select("status, pausada_em, fim, dias_pausados").eq("id", id).single();
  if (readError || !m) return { success: false, error: readError?.message ?? "Plano não encontrado." };
  if (m.status !== "pausada" || !m.pausada_em) return { success: false, error: "Plano não está pausado." };

  const hoje = new Date();
  const dias = Math.max(0, Math.round((Date.parse(hoje.toISOString().slice(0, 10)) - Date.parse(m.pausada_em)) / 86_400_000));
  let novoFim: string | null = m.fim;
  if (m.fim) {
    const d = new Date(`${m.fim}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    novoFim = d.toISOString().slice(0, 10);
  }

  const { error } = await auth.supabase.schema("vendas").from("matricula")
    .update({ status: "ativa", pausada_em: null, fim: novoFim, dias_pausados: (m.dias_pausados ?? 0) + dias })
    .eq("id", id).eq("status", "pausada");
  if (error) return { success: false, error: error.message };

  revalidatePath(`/clientes/${pessoaId}`);
  revalidatePath("/clientes");
  return { success: true, id };
}

// ─── Anamnese (link público de preenchimento) ───────────────────────────────────

const ANAMNESE_LINK_TTL_DIAS = 7;

export type AnamneseLinkResult = { success: true; url: string; expiraEm: string } | { success: false; error: string };

export async function gerarLinkAnamnese(pessoaId: string): Promise<AnamneseLinkResult> {
  if (!uuid.safeParse(pessoaId).success) return { success: false, error: "Cliente inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const expiraEm = new Date(Date.now() + ANAMNESE_LINK_TTL_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await auth.supabase.schema("clinico").from("anamnese_convite").insert({
    pessoa_id: pessoaId,
    expira_em: expiraEm,
    criado_por: auth.profile.id,
  }).select("token").single();

  if (error) return { success: false, error: error.message };
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return { success: true, url: `${baseUrl}/anamnese/${data.token}`, expiraEm };
}

export async function getAnamnesePdfUrl(pessoaId: string, path: string): Promise<SignedUrlResult> {
  if (!uuid.safeParse(pessoaId).success) return { success: false, error: "Cliente inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase.storage.from("clinico").createSignedUrl(path, 120);
  if (error || !data) return { success: false, error: error?.message ?? "Não foi possível gerar o link." };
  await logAcesso(auth, pessoaId, "anamnese", "select");
  return { success: true, url: data.signedUrl };
}

// ─── Evolução ───────────────────────────────────────────────────────────────────

const evolucaoSchema = z.object({
  pessoa_id: uuid,
  texto: z.string().trim().min(3).max(8000),
  agendamento_id: uuid.nullable().default(null),
});

export async function adicionarEvolucao(input: z.infer<typeof evolucaoSchema>): Promise<FichaResult> {
  const parsed = evolucaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Texto da evolução muito curto." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  // Liga ao profissional do staff logado, se houver registro em core.profissional.
  const { data: prof } = await auth.supabase.schema("core").from("profissional")
    .select("id").eq("profile_id", auth.profile.id).maybeSingle();

  const { data, error } = await auth.supabase.schema("clinico").from("evolucao").insert({
    pessoa_id: parsed.data.pessoa_id,
    texto: parsed.data.texto,
    agendamento_id: parsed.data.agendamento_id,
    profissional_id: prof?.id ?? null,
  }).select("id").single();

  if (error) return { success: false, error: error.message };
  await logAcesso(auth, parsed.data.pessoa_id, "evolucao", "insert");
  revalidatePath(`/clientes/${parsed.data.pessoa_id}`);
  return { success: true, id: data?.id };
}

// ─── Documentos ─────────────────────────────────────────────────────────────────

const MAX_DOC_BYTES = 15 * 1024 * 1024;
const DOC_TIPOS = ["exame", "atestado", "laudo", "outro"] as const;

export async function uploadDocumento(formData: FormData): Promise<FichaResult> {
  const pessoaId = String(formData.get("pessoa_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "outro");
  const file = formData.get("file");

  if (!uuid.safeParse(pessoaId).success) return { success: false, error: "Cliente inválido." };
  if (!DOC_TIPOS.includes(tipo as (typeof DOC_TIPOS)[number])) return { success: false, error: "Tipo inválido." };
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Arquivo inválido." };
  if (file.size > MAX_DOC_BYTES) return { success: false, error: "O arquivo deve ter até 15 MB." };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${pessoaId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await auth.supabase.storage.from("clinico").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { success: false, error: upErr.message };

  const { error } = await auth.supabase.schema("clinico").from("documento").insert({
    pessoa_id: pessoaId,
    tipo: tipo as (typeof DOC_TIPOS)[number],
    nome: file.name,
    storage_path: path,
    tamanho: file.size,
    uploaded_by: auth.profile.id,
  });
  if (error) return { success: false, error: error.message };

  await logAcesso(auth, pessoaId, "documento", "insert");
  revalidatePath(`/clientes/${pessoaId}`);
  return { success: true };
}

export type SignedUrlResult = { success: true; url: string } | { success: false; error: string };

export async function getDocumentoUrl(pessoaId: string, path: string): Promise<SignedUrlResult> {
  if (!uuid.safeParse(pessoaId).success) return { success: false, error: "Cliente inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase.storage.from("clinico").createSignedUrl(path, 120);
  if (error || !data) return { success: false, error: error?.message ?? "Não foi possível gerar o link." };
  await logAcesso(auth, pessoaId, "documento", "select");
  return { success: true, url: data.signedUrl };
}

// ─── Contrato / matrícula ───────────────────────────────────────────────────────

export async function gerarContrato(pessoaId: string, modeloId: string): Promise<FichaResult> {
  if (!uuid.safeParse(pessoaId).success || !uuid.safeParse(modeloId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase.schema("vendas").from("contrato").insert({
    pessoa_id: pessoaId, modelo_id: modeloId, status: "rascunho",
  }).select("id").single();
  if (error) return { success: false, error: error.message };

  const corpo = await gerarCorpoContrato(auth.supabase, data.id);
  if (!corpo.success) return { success: false, error: corpo.error };

  revalidatePath(`/clientes/${pessoaId}`);
  return { success: true, id: data.id };
}

/** Remescla o modelo com os dados atuais da cliente (só rascunho). */
export async function regenerarContrato(id: string, pessoaId: string): Promise<FichaResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const r = await gerarCorpoContrato(auth.supabase, id);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath(`/clientes/${pessoaId}`);
  return { success: true, id };
}

const contratoStatusSchema = z.enum(["enviado", "assinado", "cancelado"]);

// Transições permitidas: rascunho → enviado → assinado; cancelar qualquer um que ainda não foi assinado.
const CONTRATO_ORIGENS: Record<"enviado" | "assinado" | "cancelado", ContratoStatus[]> = {
  enviado: ["rascunho"],
  assinado: ["rascunho", "enviado"],
  cancelado: ["rascunho", "enviado"],
};

export async function atualizarStatusContrato(
  id: string,
  pessoaId: string,
  status: "enviado" | "assinado" | "cancelado",
): Promise<FichaResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const parsed = contratoStatusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Status inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const agora = new Date().toISOString();
  const patch: Database["vendas"]["Tables"]["contrato"]["Update"] = { status: parsed.data };
  if (parsed.data === "enviado") patch.enviado_at = agora;
  if (parsed.data === "assinado") patch.assinado_at = agora;

  const { data, error } = await auth.supabase.schema("vendas").from("contrato")
    .update(patch).eq("id", id).eq("pessoa_id", pessoaId)
    .in("status", CONTRATO_ORIGENS[parsed.data]).select("id").maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Este contrato não pode mais mudar para esse status." };

  revalidatePath(`/clientes/${pessoaId}`);
  return { success: true, id };
}

const MAX_VIA_BYTES = 15 * 1024 * 1024;
const VIA_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Anexa a via assinada (PDF/foto do papel) e marca o contrato como assinado. */
export async function anexarViaAssinada(formData: FormData): Promise<FichaResult> {
  const id = String(formData.get("contrato_id") ?? "");
  const pessoaId = String(formData.get("pessoa_id") ?? "");
  const file = formData.get("file");

  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Arquivo inválido." };
  if (file.size > MAX_VIA_BYTES) return { success: false, error: "O arquivo deve ter até 15 MB." };
  if (!VIA_MIMES.includes(file.type)) return { success: false, error: "Envie um PDF ou uma imagem (JPG, PNG, WebP)." };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: atual } = await auth.supabase.schema("vendas").from("contrato")
    .select("status").eq("id", id).eq("pessoa_id", pessoaId).maybeSingle();
  if (!atual) return { success: false, error: "Contrato não encontrado." };
  if (atual.status === "cancelado") return { success: false, error: "Contrato cancelado não recebe via assinada." };

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${pessoaId}/contratos/${id}-${Date.now()}-${safeName}`;
  const { error: upErr } = await auth.supabase.storage.from("clinico").upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (upErr) return { success: false, error: upErr.message };

  const { error } = await auth.supabase.schema("vendas").from("contrato").update({
    via_assinada_url: path,
    status: "assinado",
    assinado_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/clientes/${pessoaId}`);
  return { success: true, id };
}

/** `via_assinada_url` guarda um caminho do bucket (envio manual) ou uma URL http (ZapSign, fase 2). */
export async function getViaAssinadaUrl(id: string, pessoaId: string): Promise<SignedUrlResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: c } = await auth.supabase.schema("vendas").from("contrato")
    .select("via_assinada_url").eq("id", id).eq("pessoa_id", pessoaId).maybeSingle();
  const ref = c?.via_assinada_url;
  if (!ref) return { success: false, error: "Este contrato ainda não tem via assinada." };
  if (/^https?:\/\//.test(ref)) return { success: true, url: ref };

  const { data, error } = await auth.supabase.storage.from("clinico").createSignedUrl(ref, 120);
  if (error || !data) return { success: false, error: error?.message ?? "Não foi possível gerar o link." };
  return { success: true, url: data.signedUrl };
}

export async function cancelarMatricula(id: string, pessoaId: string): Promise<FichaResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(pessoaId).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("matricula").update({ status: "cancelada" }).eq("id", id);
  if (error) return { success: false, error: error.message };

  const { error: agendaError } = await auth.supabase.schema("crm").from("appointments")
    .update({ status: "cancelado" })
    .eq("matricula_id", id)
    .gte("inicio", new Date().toISOString())
    .in("status", ["agendado", "confirmado"]);
  if (agendaError) return { success: false, error: agendaError.message };

  revalidatePath(`/clientes/${pessoaId}`);
  revalidatePath("/agenda");
  return { success: true, id };
}
