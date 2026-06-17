"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveStaff } from "@/lib/auth/staff";

export type ClienteResult = { success: true; id?: string } | { success: false; error: string };

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revise os dados do cadastro.";
}

const PILAR = z.enum(["pilates", "fisio_pelvica", "acupuntura"]);
const TIPO = z.enum(["aluna", "paciente", "ambos"]);

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);

const clienteSchema = z.object({
  nome: z.string().trim().min(2).max(140),
  cpf: optionalText(20),
  nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  telefone: optionalText(30),
  email: z.string().trim().email().max(140).optional().or(z.literal("")).transform((v) => v || null),
  genero: optionalText(30),
  tipo: TIPO,
  pilar_principal: PILAR.nullable().default(null),
  // endereço
  cep: optionalText(15),
  logradouro: optionalText(160),
  numero: optionalText(20),
  complemento: optionalText(120),
  bairro: optionalText(120),
  cidade: optionalText(120),
  uf: optionalText(2),
  // contexto clínico inicial (vira anamnese v1)
  queixa: optionalText(2000),
  objetivo: optionalText(2000),
  // consentimento
  consentimento: z.boolean().default(false),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export async function createCliente(input: ClienteInput): Promise<ClienteResult> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { data: pessoa, error: pessoaErr } = await auth.supabase
    .schema("core")
    .from("pessoa")
    .insert({
      nome: d.nome,
      cpf: d.cpf,
      nascimento: d.nascimento,
      telefone: d.telefone,
      email: d.email,
      genero: d.genero,
      tipo: d.tipo,
      pilar_principal: d.pilar_principal,
      status: "cliente_ativo",
      responsavel_id: auth.profile.id,
      consentimento_lgpd_at: d.consentimento ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (pessoaErr || !pessoa) return { success: false, error: pessoaErr?.message ?? "Falha ao criar cliente." };

  const hasEndereco = d.cep || d.logradouro || d.numero || d.bairro || d.cidade || d.uf;
  if (hasEndereco) {
    await auth.supabase.schema("core").from("endereco").insert({
      pessoa_id: pessoa.id,
      cep: d.cep, logradouro: d.logradouro, numero: d.numero,
      complemento: d.complemento, bairro: d.bairro, cidade: d.cidade, uf: d.uf,
    });
  }

  if (d.queixa || d.objetivo) {
    await auth.supabase.schema("clinico").from("anamnese").insert({
      pessoa_id: pessoa.id,
      versao: 1,
      dados: { queixa_principal: d.queixa ?? "", objetivo: d.objetivo ?? "" },
      autor_id: auth.profile.id,
    });
  }

  revalidatePath("/clientes");
  return { success: true, id: pessoa.id };
}

const updateSchema = z.object({
  nome: z.string().trim().min(2).max(140),
  cpf: optionalText(20),
  nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  telefone: optionalText(30),
  email: z.string().trim().email().max(140).optional().or(z.literal("")).transform((v) => v || null),
  genero: optionalText(30),
  tipo: TIPO,
  pilar_principal: PILAR.nullable().default(null),
});

export type ClienteUpdateInput = z.infer<typeof updateSchema>;

export async function updateCliente(id: string, input: ClienteUpdateInput): Promise<ClienteResult> {
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "ID inválido." };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstError(parsed.error) };

  const auth = await requireActiveStaff();
  if (!auth.success) return { success: false, error: auth.error };

  const { error } = await auth.supabase.schema("core").from("pessoa").update(parsed.data).eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  return { success: true, id };
}
