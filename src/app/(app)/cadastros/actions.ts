"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveStaff } from "@/lib/auth/staff";

export type CadastroResult = { success: true; id?: string } | { success: false; error: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revise os dados do formulário.";
}

// ─── Serviços (core.servico) ────────────────────────────────────────────────────

const PILAR = z.enum(["pilates", "fisio_pelvica", "acupuntura"]);
const COR_TOKEN = z.enum(["alaranjado", "tangerina", "bege", "bege_claro", "verde"]);

const servicoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  pilar: PILAR,
  gestante: z.boolean().default(false),
  duracao_min: z.coerce.number().int().min(10).max(240),
  capacidade_slot: z.coerce.number().int().min(1).max(8),
  cor_token: COR_TOKEN,
  ativo: z.boolean().default(true),
});

export type ServicoInput = z.infer<typeof servicoSchema>;

export async function createServico(input: ServicoInput): Promise<CadastroResult> {
  const parsed = servicoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("core")
    .from("servico")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/servicos");
  return { success: true, id: data?.id };
}

export async function updateServico(id: string, input: ServicoInput): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = servicoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("core")
    .from("servico")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/servicos");
  return { success: true, id };
}

export async function toggleServicoAtivo(id: string, ativo: boolean): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("core")
    .from("servico")
    .update({ ativo })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/servicos");
  return { success: true, id };
}

export async function deleteServico(id: string): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("servico").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/servicos");
  return { success: true, id };
}

// ─── Salas (core.sala) ──────────────────────────────────────────────────────────

const salaSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  capacidade: z.coerce.number().int().min(1).max(20),
  equipamentos: z.array(z.string().trim().min(1)).max(30).default([]),
  pilares: z.array(PILAR).max(3).default([]),
  ativo: z.boolean().default(true),
});

export type SalaInput = z.infer<typeof salaSchema>;

export async function createSala(input: SalaInput): Promise<CadastroResult> {
  const parsed = salaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("core")
    .from("sala")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/salas");
  return { success: true, id: data?.id };
}

export async function updateSala(id: string, input: SalaInput): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = salaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("sala").update(parsed.data).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/salas");
  return { success: true, id };
}

export async function toggleSalaAtiva(id: string, ativo: boolean): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("sala").update({ ativo }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/salas");
  return { success: true, id };
}

export async function deleteSala(id: string): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("sala").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/salas");
  return { success: true, id };
}

// ─── Profissionais (core.profissional) ──────────────────────────────────────────

const TURNO = z.enum(["manha", "tarde", "noite"]);
const DIA_KEY = z.enum(["seg", "ter", "qua", "qui", "sex", "sab"]);

const profissionalSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  especialidade: z.string().trim().max(120).optional().default(""),
  crefito: z.string().trim().max(40).optional().default(""),
  pilares: z.array(PILAR).max(3).default([]),
  // Mapa esparso dia → turnos; valida chaves/valores sem exigir todos os dias.
  disponibilidade: z
    .record(z.string(), z.array(TURNO))
    .refine((d) => Object.keys(d).every((k) => DIA_KEY.safeParse(k).success), {
      message: "Dia de disponibilidade inválido.",
    })
    .default({}),
  ativo: z.boolean().default(true),
});

export type ProfissionalInput = z.infer<typeof profissionalSchema>;

export async function createProfissional(input: ProfissionalInput): Promise<CadastroResult> {
  const parsed = profissionalSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("core")
    .from("profissional")
    .insert({
      nome: parsed.data.nome,
      especialidade: parsed.data.especialidade || null,
      crefito: parsed.data.crefito || null,
      pilares: parsed.data.pilares,
      disponibilidade: parsed.data.disponibilidade,
      ativo: parsed.data.ativo,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/profissionais");
  return { success: true, id: data?.id };
}

export async function updateProfissional(id: string, input: ProfissionalInput): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = profissionalSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("core")
    .from("profissional")
    .update({
      nome: parsed.data.nome,
      especialidade: parsed.data.especialidade || null,
      crefito: parsed.data.crefito || null,
      pilares: parsed.data.pilares,
      disponibilidade: parsed.data.disponibilidade,
      ativo: parsed.data.ativo,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/profissionais");
  return { success: true, id };
}

export async function toggleProfissionalAtivo(id: string, ativo: boolean): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("profissional").update({ ativo }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/profissionais");
  return { success: true, id };
}

export async function deleteProfissional(id: string): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("profissional").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/profissionais");
  return { success: true, id };
}

// ─── Modelos de contrato (vendas.contrato_modelo) ───────────────────────────────

const contratoModeloSchema = z.object({
  nome: z.string().trim().min(2).max(140),
  corpo: z.string().trim().min(10).max(20000),
  pilares: z.array(PILAR).max(3).default([]),
  planos: z.array(z.string().uuid()).max(50).default([]),
  ativo: z.boolean().default(true),
});

export type ContratoModeloInput = z.infer<typeof contratoModeloSchema>;

export async function createContratoModelo(input: ContratoModeloInput): Promise<CadastroResult> {
  const parsed = contratoModeloSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("vendas")
    .from("contrato_modelo")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/contratos");
  return { success: true, id: data?.id };
}

export async function updateContratoModelo(id: string, input: ContratoModeloInput): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = contratoModeloSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase
    .schema("vendas")
    .from("contrato_modelo")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/contratos");
  return { success: true, id };
}

export async function toggleContratoModeloAtivo(id: string, ativo: boolean): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("contrato_modelo").update({ ativo }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/contratos");
  return { success: true, id };
}

export async function deleteContratoModelo(id: string): Promise<CadastroResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("contrato_modelo").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/cadastros/contratos");
  return { success: true, id };
}
