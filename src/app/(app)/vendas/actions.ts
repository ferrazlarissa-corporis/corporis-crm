"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveStaff } from "@/lib/auth/staff";
import { postAccrual } from "@/lib/finance/post-income";
import type { Pilar } from "@/types/database";

export type VendaResult = { success: true; id?: string } | { success: false; error: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revise os dados do formulário.";
}

const PILAR = z.enum(["pilates", "fisio_pelvica", "acupuntura"]);
const PERIODICIDADE = z.enum(["mensal", "trimestral", "semestral", "anual", "avulso"]);
const PLANO_TIPO = z.enum(["fixo", "personalizado", "avulso"]);

// ─── Planos (vendas.plano) ──────────────────────────────────────────────────────

const planoSchema = z.object({
  nome: z.string().trim().min(2).max(140),
  tipo: PLANO_TIPO,
  valor: z.coerce.number().min(0).max(1_000_000),
  periodicidade: PERIODICIDADE,
  sessoes_semana: z.coerce.number().int().min(0).max(14).nullable().default(null),
  servicos: z.array(z.string().uuid()).max(50).default([]),
  pilar: PILAR.nullable().default(null),
  ativo: z.boolean().default(true),
});

export type PlanoInput = z.infer<typeof planoSchema>;

export async function createPlano(input: PlanoInput): Promise<VendaResult> {
  const parsed = planoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .schema("vendas")
    .from("plano")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/vendas/planos");
  return { success: true, id: data?.id };
}

export async function updatePlano(id: string, input: PlanoInput): Promise<VendaResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = planoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("plano").update(parsed.data).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/vendas/planos");
  return { success: true, id };
}

export async function togglePlanoAtivo(id: string, ativo: boolean): Promise<VendaResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("vendas").from("plano").update({ ativo }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/vendas/planos");
  return { success: true, id };
}

// ─── Adesão / nova venda (vendas.criar_adesao RPC) ──────────────────────────────

const adesaoSchema = z
  .object({
    pessoa_id: z.string().uuid(),
    plano_id: z.string().uuid(),
    valor: z.coerce.number().min(0).max(1_000_000),
    desconto: z.coerce.number().min(0).max(1_000_000).default(0),
    dia_vencimento: z.coerce.number().int().min(1).max(28),
    inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida."),
    modelo_contrato_id: z.string().uuid().nullable().default(null),
    tipo: PLANO_TIPO,
    periodicidade: PERIODICIDADE.nullable().default(null),
    sessoes_semana: z.coerce.number().int().min(0).max(14).nullable().default(null),
    total_sessoes: z.coerce.number().int().min(1).max(500).nullable().default(null),
  })
  .refine((d) => d.tipo !== "fixo" || d.periodicidade != null, {
    message: "Selecione a periodicidade do plano fixo.",
    path: ["periodicidade"],
  })
  .refine((d) => d.tipo !== "personalizado" || (d.total_sessoes != null && d.total_sessoes >= 1), {
    message: "Informe o número de sessões do plano personalizado.",
    path: ["total_sessoes"],
  });

export type AdesaoInput = z.infer<typeof adesaoSchema>;

export async function criarVenda(input: AdesaoInput): Promise<VendaResult> {
  const parsed = adesaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase.schema("vendas").rpc("criar_adesao", {
    p_pessoa_id: parsed.data.pessoa_id,
    p_plano_id: parsed.data.plano_id,
    p_valor: parsed.data.valor,
    p_desconto: parsed.data.desconto,
    p_dia_vencimento: parsed.data.dia_vencimento,
    p_inicio: parsed.data.inicio,
    p_modelo_contrato_id: parsed.data.modelo_contrato_id,
    p_vendedor_id: auth.profile.id,
    p_tipo: parsed.data.tipo,
    p_periodicidade: parsed.data.periodicidade,
    p_sessoes_semana: parsed.data.sessoes_semana,
    p_total_sessoes: parsed.data.total_sessoes,
  });

  if (error) return { success: false, error: error.message };

  // Ponte Finance: reconhece (accrual) o 1º lançamento criado pela RPC. Não bloqueia a venda.
  try {
    const db = auth.supabase;
    const [{ data: pessoa }, { data: lanc }] = await Promise.all([
      db.schema("core").from("pessoa").select("nome, pilar_principal").eq("id", parsed.data.pessoa_id).maybeSingle(),
      db.schema("financeiro").from("lancamento")
        .select("id, competencia, vencimento, valor, descricao")
        .eq("pessoa_id", parsed.data.pessoa_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (pessoa && lanc) {
      await postAccrual({
        lancamentoId: lanc.id,
        competencia: lanc.competencia,
        vencimento: lanc.vencimento,
        valor: lanc.valor,
        pessoaNome: pessoa.nome,
        pilar: (pessoa.pilar_principal as Pilar | null) ?? null,
        descricao: lanc.descricao,
      });
    }
  } catch {
    // posting é best-effort; falha aqui não invalida a adesão já persistida
  }

  revalidatePath("/vendas");
  revalidatePath("/clientes");
  return { success: true, id: typeof data === "string" ? data : undefined };
}
